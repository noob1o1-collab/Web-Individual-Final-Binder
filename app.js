const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(csrf({ cookie: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const diaryRoutes = require('./routes/diaryRoutes');

app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/diaries', diaryRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Binder REST API is fully operational.' });
});

const DEFAULT_PORT = Number(process.env.PORT) || 5000;

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Binder REST API Server running on port ${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const nextPort = port + 1;
            console.error(`Port ${port} is already in use. Trying ${nextPort}...`);
            startServer(nextPort);
            return;
        }

        console.error('Server failed to start:', err.message);
    });
};

startServer(DEFAULT_PORT);
