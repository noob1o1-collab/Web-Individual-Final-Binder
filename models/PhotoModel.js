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
        SELECT pid, file_path, user_id, created_at, connection_id
        FROM photos
        WHERE connection_id = $1
        ORDER BY created_at DESC
    `;
    const result = await db.query(query, [connectionId]);
    return result.rows;
};

const getPhotoById = async (photoId) => {
    const query = `
        SELECT pid, file_path, user_id, connection_id
        FROM photos
        WHERE pid = $1
        LIMIT 1
    `;
    const result = await db.query(query, [photoId]);
    return result.rows[0];
};

const deletePhotoById = async (photoId) => {
    await db.query('DELETE FROM photos WHERE pid = $1', [photoId]);
};

module.exports = {
    createPhoto,
    getPhotosByConnection,
    getPhotoById,
    deletePhotoById
};
