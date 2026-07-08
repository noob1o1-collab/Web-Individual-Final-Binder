const db = require('../config/db');

const findActiveGameByConnection = async (connectionId) => {
    try {
        const query = `SELECT * FROM game_states WHERE connection_id = $1 AND status = 'active' LIMIT 1`;
        const result = await db.query(query, [connectionId]);
        return result.rows[0];
    } catch (error) {
        console.error('Database game fetch failure:', error);
        throw error;
    }
};

const startNewGameSession = async (connectionId, startingPlayerId) => {
    try {
        await db.query(`UPDATE game_states SET status = 'draw' WHERE connection_id = $1 AND status = 'active'`, [connectionId]);
        
        const query = `
            INSERT INTO game_states (connection_id, board, turn_user_id, status)
            VALUES ($1, '         ', $2, 'active')
            RETURNING *
        `;
        const result = await db.query(query, [connectionId, startingPlayerId]);
        return result.rows[0];
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

const saveTurnMove = async (gameId, boardString, nextPlayerId, status, winnerId = null) => {
    try {
        const query = `
            UPDATE game_states 
            SET board = $1, turn_user_id = $2, status = $3, winner_id = $4, updated_at = CURRENT_TIMESTAMP
            WHERE gid = $5
            RETURNING *
        `;
        const result = await db.query(query, [boardString, nextPlayerId, status, winnerId, gameId]);
        return result.rows[0];
    } catch (error) {
        console.error('Database turn execution failure:', error);
        throw error;
    }
};

module.exports = {
    findActiveGameByConnection,
    startNewGameSession,
    saveTurnMove
};
