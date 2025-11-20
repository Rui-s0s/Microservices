use actix_web::{web, App, HttpServer, HttpResponse, Responder, post};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, EncodingKey, Header};
use std::env;
use dotenv::dotenv;

#[derive(Deserialize)]
struct AuthData {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct JwtClaims {
    sub: String,
    username: String,
    exp: usize,
}

#[derive(Serialize)]
struct TokenResponse {
    token: String,
}

#[post("/register")]
async fn register(db: web::Data<sqlx::PgPool>, info: web::Json<AuthData>) -> impl Responder {
    let hashed_password = match hash(&info.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return HttpResponse::InternalServerError().body("Failed to hash password"),
    };
    
    let result = sqlx::query!(
        "INSERT INTO users (username, password) VALUES ($1, $2)",
        info.username,
        hashed_password
    )
    .execute(db.get_ref())
    .await;
    
    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"registered": true})),
        Err(err) => {
            if let Some(db_err) = err.as_database_error() {
                if let Some(code) = db_err.code() {
                    if code == "23505" {
                        return HttpResponse::Conflict().json(serde_json::json!({"error": "Username already exists"}));
                    }
                }
            }
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Database error"}))
        }
    }
}

#[post("/login")]
async fn login(db: web::Data<sqlx::PgPool>, info: web::Json<AuthData>) -> impl Responder {
    let row = sqlx::query!("SELECT id, password FROM users WHERE username = $1", info.username)
        .fetch_optional(db.get_ref())
        .await;
    
    let user = match row {
        Ok(Some(u)) => u,
        Ok(None) => return HttpResponse::NotFound().json(serde_json::json!({"error": "User not found"})),
        Err(_) => return HttpResponse::InternalServerError().json(serde_json::json!({"error": "Database error"})),
    };
    
    let is_valid = verify(&info.password, &user.password).unwrap_or(false);
    if !is_valid {
        return HttpResponse::Forbidden().json(serde_json::json!({"error": "Invalid password"}));
    }
    
    let exp = chrono::Utc::now().timestamp() as usize + 3600;
    let claims = JwtClaims {
        sub: user.id.to_string(),
        username: info.username.clone(),
        exp,
    };
    
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref()))
        .unwrap();
    
    HttpResponse::Ok().json(TokenResponse { token })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to DB");
    
    println!("Auth service running on 3000");
    
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(register)
            .service(login)
    })
    .bind(("127.0.0.1", 3000))?
    .run()
    .await
}