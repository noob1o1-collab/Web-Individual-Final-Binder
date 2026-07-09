const db = require('../config/db');

const createPhoto = async (connectionId, userId, filePath) => {
    const query = `
        INSERT INTO photos (connection_id, user_id, file_path)
        VALUES ($1, $2, $3)
        RETURNING pid, connection_id, user_id, file_path, created_at
    `;
    const result = await db.query(query, [connectionId, userId, filePath]);
    return result.rows[0];
};

const getPhotosByConnection = async (connectionId) => {
    const query = `
        SELECT pid, file_path, user_id, created_at
        FROM photos
        WHERE connection_id = $1
        ORDER BY created_at DESC
    `;
    const result = await db.query(query, [connectionId]);
    return result.rows;
};

module.exports = {
    createPhoto,
    getPhotosByConnection
};
