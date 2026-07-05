const db = require('../config/db');

const findUserByEmail = async (email) => {
    try {
        const query = 'SELECT uid, firstname AS username, email, password, birthday FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw new Error('Database user lookup by email failed');
    }
};

const findUserByUsername = async (username) => {
    try {
        const query = 'SELECT uid, firstname AS username, email, password, birthday FROM users WHERE firstname = $1';
        const result = await db.query(query, [username]);
        return result.rows[0];
    } catch (error) {
        console.error('Error finding user by username:', error);
        throw new Error('Database user lookup by username failed');
    }
};

const registerUser = async (user) => {
    try {
        const { firstName, email, password, birthday } = user;
        const query = `
            INSERT INTO users (firstname, email, password, birthday) 
            VALUES ($1, $2, $3, $4) 
            RETURNING uid, firstname AS username, email, birthday
        `;
        const values = [firstName, email, password, birthday || null];
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error executing user entry creation:', error);
        throw new Error('Database user insertion failed');
    }
};

const findUserById = async (id) => {
    try {
        const query = 'SELECT uid, firstname AS username, email, birthday FROM users WHERE uid = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error finding user by id:', error);
        throw new Error('Database user lookup by id failed');
    }
};

const updateUserProfile = async (userId, updates) => {
    try {
        const { username, birthday } = updates;
        const query = `
            UPDATE users
            SET firstname = COALESCE(NULLIF($1, ''), firstname),
                birthday = COALESCE($2, birthday)
            WHERE uid = $3
            RETURNING uid, firstname AS username, email, birthday
        `;
        const values = [username || null, birthday || null, userId];
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Database user profile update failed');
    }
};

module.exports = {
    registerUser,
    findUserByEmail,
    findUserByUsername,
    findUserById,
    updateUserProfile
};