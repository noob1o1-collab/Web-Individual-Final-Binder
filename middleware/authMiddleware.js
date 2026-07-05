const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.cookies && req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Unauthenticated session.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: Number(decoded.userId),
            username: decoded.username
        };
        return next();
    } catch (err) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Authentication token has expired or is invalid.' });
    }
};

module.exports = authMiddleware;