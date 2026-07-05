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
app.use(express.static('public'));
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes); 
app.get('/api/health', (req, res) => {
    res.json({ status: "healthy", message: "Binder REST API is fully operational." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Binder REST API Server running on port ${PORT}`);
});
