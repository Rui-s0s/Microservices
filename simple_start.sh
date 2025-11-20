#!/bin/bash

echo "Starting Auth service..."
cd services/auth_js
npm install
npm start &

echo "Starting Text services..."
cd ../text_send_js
npm install
npm start &
cd ../text_get_js
npm install
npm start &
cd ../text_update_js
npm install
npm start &
cd ../text_delete_js
npm install
npm start &

echo "Starting Rust image service..."
cd ../image_rust
cargo build      # optional, just builds first
cargo run &

echo "Starting Gateway..."
cd ../gateway
npm install
npm start &

echo "All services started in background."
