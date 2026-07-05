-- BINDER RELATIONSHIP APP DATABASE SCHEMA
DROP TABLE IF EXISTS game_logs CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS diaries CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    uid SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    firstname VARCHAR(100) NOT NULL CONSTRAINT unique_username UNIQUE,
    lastname VARCHAR(100) NULL,
    email VARCHAR(100) NOT NULL CONSTRAINT unique_email UNIQUE,
    password TEXT NOT NULL,
    birthday DATE NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CONNECTIONS TABLE
CREATE TABLE connections (
    cid SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', 
    relationship_type VARCHAR(20) NOT NULL,       
    anniversary_date DATE NULL,                   
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP NULL,
    
    -- Technical Guardrails
    CONSTRAINT prevent_self_connection CHECK (sender_id <> receiver_id),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted')),
    CONSTRAINT valid_type CHECK (relationship_type IN ('friend', 'lover'))
);

-- 3. DIARIES & JOURNALS TABLE
CREATE TABLE diaries (
    did SERIAL PRIMARY KEY,
    diary_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    creator INT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    connection_id INT NULL REFERENCES connections(cid) ON DELETE CASCADE,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- 4. PHOTOS TABLE
CREATE TABLE photos (
    pid SERIAL PRIMARY KEY,
    connection_id INT NOT NULL REFERENCES connections(cid) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_users_username ON users(firstname);
CREATE INDEX idx_connections_lookup ON connections(sender_id, receiver_id);

CREATE INDEX idx_connections_lookup ON connections(sender_id, receiver_id);
