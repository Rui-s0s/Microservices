CREATE DATABASE authdb;
grant all privileges on database auth to postgres;

CREATE TABLE IF NOT EXISTS users (
   id SERIAL PRIMARY KEY,
   username TEXT UNIQUE NOT NULL,
   password TEXT NOT NULL,
   created_at TIMESTAMP DEFAULT NOW()
 );



create database imagesdb;
grant all privileges on database imagesdb to postgres;

CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL
);



create database textdb;
grant all privileges on database textdb to postgres;

CREATE TABLE if not exists texts (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);
