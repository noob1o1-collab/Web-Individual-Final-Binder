const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: String(process.env.DB_USER || 'postgres'),
    host: String(process.env.DB_HOST || 'localhost'),
    port: Number(process.env.DB_PORT || 5432),
    database: String(process.env.DB_DATABASE),
    password: String(process.env.DB_PASSWORD)
});

pool.on('connect', () => {
    console.log('PostgreSQL Database connected successfully via Pool!');
});

pool.on('error', (err) => {
    console.error('Unexpected database connection loss:', err.message);
});

module.exports = pool;