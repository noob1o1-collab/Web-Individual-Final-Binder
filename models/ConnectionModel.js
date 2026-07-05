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

const getConnectionById = async (connectionId) => {
    try {
        const query = 'SELECT * FROM connections WHERE cid = $1';
        const result = await db.query(query, [connectionId]);
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching connection by ID:', error);
        throw new Error('Database read execution failure');
    }
};

const getPendingRequestsForUser = async (userId) => {
    try {
        const query = `
            SELECT c.cid, c.relationship_type, c.anniversary_date, c.created_at,
                   u.firstname AS sender_username 
            FROM connections c 
            JOIN users u ON u.uid = c.sender_id 
            WHERE c.receiver_id = $1 AND c.status = 'pending'
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Error querying inbound pending requests:', error);
        throw new Error('Database list extraction breakdown');
    }
};

const updateConnectionStatus = async (connectionId, status) => {
    try {
        const query = `
            UPDATE connections 
            SET status = $1, updated_at = NOW() 
            WHERE cid = $2 
            RETURNING *
        `;
        const result = await db.query(query, [status, connectionId]);
        return result.rows[0];
    } catch (error) {
        console.error('Error performing connection status update:', error);
        throw new Error('Database state modification failure');
    }
};

const deleteConnection = async (connectionId) => {
    try {
        await db.query('DELETE FROM connections WHERE cid = $1', [connectionId]);
    } catch (error) {
        console.error('Error removing connection entry:', error);
        throw new Error('Database row erasure breakdown');
    }
};
const getActiveConnection = async (userId) => {
    try {
        const query = `
            SELECT c.cid, c.relationship_type, c.anniversary_date, c.sender_id, c.receiver_id,
                   u1.firstname AS sender_username, u1.birthday AS sender_birthday,
                   u2.firstname AS receiver_username, u2.birthday AS receiver_birthday
            FROM connections c
            JOIN users u1 ON u1.uid = c.sender_id
            JOIN users u2 ON u2.uid = c.receiver_id
            WHERE (c.sender_id = $1 OR c.receiver_id = $1) AND c.status = 'accepted'
            LIMIT 1
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching active relationship connection:', error);
        throw new Error('Database active connection query failure');
    }
};

module.exports = {
    findExistingConnection,
    initiateConnection,
    getConnectionById,
    getPendingRequestsForUser,
    updateConnectionStatus,
    deleteConnection,
    getActiveConnection 
};
