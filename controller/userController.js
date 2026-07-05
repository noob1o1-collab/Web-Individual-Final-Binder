const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, birthday } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        const existingUsername = await UserModel.findUserByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ error: 'Username handle is already taken.' });
        }

        const existingEmail = await UserModel.findUserByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email address is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await UserModel.registerUser({
            firstName: username,
            email,
            password: hashedPassword,
            birthday: birthday || null
        });

        const token = jwt.sign(
            { userId: newUser.uid, username: newUser.firstname }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.cookie('token', token, { httpOnly: true, secure: false });
        return res.status(201).json({ success: true, message: 'User account created successfully.', user: newUser });
    } catch (error) {
        console.error('Registration processing error:', error);
        return res.status(500).json({ error: 'Internal server error creating account.' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await UserModel.findUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password credentials.' });
        }

        const token = jwt.sign(
            { userId: user.uid, username: user.firstname }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.cookie('token', token, { httpOnly: true, secure: false });
        return res.json({ 
            success: true, 
            message: 'Authentication successful.', 
            user: { uid: user.uid, username: user.firstname, email: user.email } 
        });
    } catch (error) {
        console.error('Login routing processing failure:', error);
        return res.status(500).json({ error: 'Internal server error processing sign-in.' });
    }
};

exports.logoutUser = (req, res) => {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out successfully.' });
};

exports.getMe = (req, res) => {
    return res.json({ user: req.user });
};