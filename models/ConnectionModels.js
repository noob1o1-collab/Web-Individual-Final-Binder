const db = require('../config/db');
const findExistingConnection = async (userA, userB) => {
    try {
        const query = `
            SELECT * FROM connections 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
        `;
        const result = await db.query(query, [userA, userB]);
        return result.rows[0];
    } catch (error) {
        console.error('Error identifying existing connection:', error);
        throw new Error('Database relation verification failed');
    }
};

const initiateConnection = async (senderId, receiverId, type, anniversaryDate) => {
    try {
        const query = `
            INSERT INTO connections (sender_id, receiver_id, relationship_type, anniversary_date, status) 
            VALUES ($1, $2, $3, $4, 'pending') 
            RETURNING cid, sender_id, receiver_id, status, relationship_type
        `;
        const values = [senderId, receiverId, type, anniversaryDate || null];
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error inserting connection request:', error);
        throw new Error('Failed to record connection invitation row');
    }
};

module.exports = {
    findExistingConnection,
    initiateConnection
};