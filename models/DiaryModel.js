const db = require('../config/db');

const createEntry = async (title, description, creatorId, isShared) => {
    try {
        const query = `
            INSERT INTO diaries (title, description, creator, is_shared)
            VALUES ($1, $2, $3, $4)
            RETURNING did, title, description, is_shared, created_at
        `;
        const values = [title, description, creatorId, isShared || false];
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Database entry insertion failure:', error);
        throw new Error('Failed to save diary log entry.');
    }
};

const getPersonalEntries = async (userId) => {
    try {
        const query = `
            SELECT did, title, description, created_at 
            FROM diaries 
            WHERE creator = $1 AND is_shared = FALSE
            ORDER BY created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Database personal list query failure:', error);
        throw new Error('Failed to load private diary items.');
    }
};

const getSharedEntries = async (userId) => {
    try {
        const query = `
            SELECT d.did, d.title, d.description, d.created_at, u.firstname AS creator_username
            FROM diaries d
            JOIN users u ON u.uid = d.creator
            WHERE d.is_shared = TRUE 
              AND (d.creator = $1 OR d.creator = (
                  SELECT CASE 
                      WHEN sender_id = $1 THEN receiver_id 
                      ELSE sender_id 
                  END 
                  FROM connections 
                  WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted' LIMIT 1
              ))
            ORDER BY d.created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Database collaborative list query failure:', error);
        throw new Error('Failed to extract shared journal logs.');
    }
};

const getEntryById = async (diaryId) => {
    try {
        const query = 'SELECT * FROM diaries WHERE did = $1';
        const result = await db.query(query, [diaryId]);
        return result.rows[0];
    } catch (error) {
        console.error('Database single row fetch breakdown:', error);
        throw new Error('Failed to find entry record.');
    }
};

const deleteEntry = async (diaryId) => {
    try {
        const query = 'DELETE FROM diaries WHERE did = $1';
        await db.query(query, [diaryId]);
        return true;
    } catch (error) {
        console.error('Database entry erasure execution failure:', error);
        throw new Error('Failed to wipe diary entry row.');
    }
};

const updateDiaryEntry = async (diaryId, title, description, isShared, userId) => {
    try {
        const query = `
            UPDATE diaries 
            SET title = $1, description = $2, is_shared = $3 
            WHERE did = $4 AND creator = $5
            RETURNING *
        `;
        const result = await db.query(query, [title, description, isShared, diaryId, userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Database diary update failure:', error);
        throw error;
    }
};

module.exports = {
    createEntry,
    getPersonalEntries,
    getSharedEntries,
    getEntryById,
    deleteEntry,
    updateDiaryEntry
};
