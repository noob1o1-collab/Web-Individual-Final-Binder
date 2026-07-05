const db = require('../config/db');

const findUserByEmail = async (email) => {
    try {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw new Error('Database user lookup by email failed');
    }
};

const findUserByUsername = async (username) => {
    try {
        const query = 'SELECT * FROM users WHERE firstname = $1';
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
            RETURNING uid, firstname, email, birthday
        `;
        const values = [firstName, email, password, birthday || null];
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error executing user entry creation:', error);
        throw new Error('Database user insertion failed');
    }
};

module.exports = {
    registerUser,
    findUserByEmail,
    findUserByUsername
};