const PhotoModel = require('../models/PhotoModel');
const ConnectionModel = require('../models/ConnectionModel');

exports.uploadPhoto = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const connectionId = req.query.connectionId || req.headers['x-connection-id'];
        if (!connectionId) {
            return res.status(400).json({ error: 'Connection id is required to upload a photo.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Photo file is required.' });
        }
        const activeLink = await ConnectionModel.getAcceptedConnectionForUserById(Number(connectionId), currentUserId);
        if (!activeLink) {
            return res.status(403).json({ error: 'Access denied. Connection must be accepted to upload shared photos.' });
        }
        const filePath = `/uploads/${req.file.filename}`;
        const savedPhoto = await PhotoModel.createPhoto(Number(connectionId), currentUserId, filePath);
        return res.json({ success: true, message: 'Photo uploaded successfully.', photo: savedPhoto });
    } catch (error) {
        console.error('Photo upload failure:', error);
        return res.status(500).json({ error: 'Internal server error uploading photo.' });
    }
};

exports.fetchSharedPhotos = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const connectionId = req.query.connectionId || req.headers['x-connection-id'];
        if (!connectionId) {
            return res.status(400).json({ error: 'Connection id is required.' });
        }
        const activeLink = await ConnectionModel.getAcceptedConnectionForUserById(Number(connectionId), currentUserId);
        if (!activeLink) {
            return res.status(403).json({ error: 'Access denied. Connection must be accepted to view photos.' });
        }
        const photos = await PhotoModel.getPhotosByConnection(Number(connectionId));
        return res.json({ success: true, photos });
    } catch (error) {
        console.error('Fetching shared photos failure:', error);
        return res.status(500).json({ error: 'Internal server error fetching shared photos.' });
    }
};
