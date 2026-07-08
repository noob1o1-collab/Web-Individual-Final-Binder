const GameModel = require('../models/GameModel');
const ConnectionModel = require('../models/ConnectionModel');

function checkWinConditions(b) {
    const wins = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    for (let combo of wins) {
        if (b[combo[0]] !== ' ' && b[combo[0]] === b[combo[1]] && b[combo[1]] === b[combo[2]]) {
            return b[combo[0]];
        }
    }
    if (!b.includes(' ')) return 'draw';
    return null;
}

exports.getGameState = async (req, res) => {
    try {
        const activeLink = await ConnectionModel.getActiveConnection(req.user.id);
        if (!activeLink) {
            return res.status(403).json({ error: 'Game subsystems are locked until a connection space is established.' });
        }

        let game = await GameModel.findActiveGameByConnection(activeLink.cid);
        if (!game) {
            game = await GameModel.startNewGameSession(activeLink.cid, req.user.id);
        }

        const playerSymbol = (activeLink.sender_id === req.user.id) ? 'X' : 'O';

        return res.json({ game, playerSymbol, currentUserId: req.user.id });
    } catch (err) {
        return res.status(500).json({ error: 'Internal game engine fetching error.' });
    }
};

exports.makeMove = async (req, res) => {
    try {
        const { cellIndex } = req.body;
        const userId = req.user.id;

        const activeLink = await ConnectionModel.getActiveConnection(userId);
        let game = await GameModel.findActiveGameByConnection(activeLink.cid);

        if (!game || game.status !== 'active') {
            return res.status(400).json({ error: 'No active session game found.' });
        }

        if (game.turn_user_id !== userId) {
            return res.status(400).json({ error: 'Wait for your tactical sequence turn!' });
        }

        let boardArray = game.board.split('');
        if (boardArray[cellIndex] !== ' ') {
            return res.status(400).json({ error: 'Target layout coordinate position already claimed.' });
        }

        const symbol = (activeLink.sender_id === userId) ? 'X' : 'O';
        boardArray[cellIndex] = symbol;
        const updatedBoardString = boardArray.join('');

        let status = 'active';
        let winnerId = null;
        const outcome = checkWinConditions(updatedBoardString);

        if (outcome === 'draw') {
            status = 'draw';
        } else if (outcome) {
            status = 'won';
            winnerId = userId;
        }

        const partnerId = (activeLink.sender_id === userId) ? activeLink.receiver_id : activeLink.sender_id;

        const updatedGame = await GameModel.saveTurnMove(game.gid, updatedBoardString, partnerId, status, winnerId);
        return res.json({ success: true, game: updatedGame });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed handling processing turn move.' });
    }
};

exports.resetGame = async (req, res) => {
    try {
        const activeLink = await ConnectionModel.getActiveConnection(req.user.id);
        const newGame = await GameModel.startNewGameSession(activeLink.cid, req.user.id);
        return res.json({ success: true, game: newGame });
    } catch (err) {
        return res.status(500).json({ error: 'Reset game operations failed.' });
    }
};
