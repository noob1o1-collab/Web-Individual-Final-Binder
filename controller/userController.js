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

exports.updateUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { username, birthday } = req.body;

        if (!username && !birthday) {
            return res.status(400).json({ error: 'No profile fields were provided for update.' });
        }

        if (username && username.trim() !== req.user.username) {
            const existingUser = await UserModel.findUserByUsername(username.trim());
            if (existingUser && existingUser.uid !== currentUserId) {
                return res.status(409).json({ error: 'That username is already taken by another account.' });
            }
        }

        const updatedUser = await UserModel.updateUserProfile(currentUserId, {
            username: username ? username.trim() : undefined,
            birthday: birthday || null
        });

        const token = jwt.sign(
            { userId: updatedUser.uid, username: updatedUser.firstname },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.cookie('token', token, { httpOnly: true, secure: false });
        return res.json({ success: true, message: 'Profile updated successfully.', user: {
            uid: updatedUser.uid,
            username: updatedUser.firstname,
            email: updatedUser.email,
            birthday: updatedUser.birthday
        } });
    } catch (error) {
        console.error('Error updating user profile:', error);
        return res.status(500).json({ error: 'Internal server error updating profile.' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await UserModel.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        return res.json({ user });
    } catch (error) {
        console.error('Error retrieving current user profile:', error);
        return res.status(500).json({ error: 'Internal server error retrieving profile.' });
    }
};