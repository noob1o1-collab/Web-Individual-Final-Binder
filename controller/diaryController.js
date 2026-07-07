const DiaryModel = require('../models/DiaryModel');
const ConnectionModel = require('../models/ConnectionModel');

exports.addDiaryEntry = async (req, res) => {
    try {
        const { title, description, isShared } = req.body;
        const currentUserId = req.user.id;

        if (!title || !description) {
            return res.status(400).json({ error: 'Diary entry title and description body fields are required.' });
        }

        if (isShared === true || isShared === 'true') {
            const activeLink = await ConnectionModel.getActiveConnection(currentUserId);
            if (!activeLink) {
                return res.status(403).json({ error: 'Access denied. You must be in an accepted relationship space to write to a shared journal.' });
            }
        }

        const savedEntry = await DiaryModel.createEntry(title, description, currentUserId, isShared);
        return res.status(201).json({ success: true, message: 'Log entry added successfully.', entry: savedEntry });
    } catch (error) {
        console.error('Diary posting handling exception:', error);
        return res.status(500).json({ error: 'Internal server error committing diary log.' });
    }
};

exports.fetchPersonalSpace = async (req, res) => {
    try {
        const logs = await DiaryModel.getPersonalEntries(req.user.id);
        return res.json({ success: true, space: 'private', logs });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error pulling personal logs.' });
    }
};

exports.fetchSharedSpace = async (req, res) => {
    try {
        const activeLink = await ConnectionModel.getActiveConnection(req.user.id);
        if (!activeLink) {
            return res.status(403).json({ error: 'Access denied. Shared archives are locked until a connection space is active.' });
        }

        const logs = await DiaryModel.getSharedEntries(req.user.id);
        return res.json({ success: true, space: 'collaborative', logs });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error pulling shared journals.' });
    }
};

exports.eraseDiaryEntry = async (req, res) => {
    try {
        const diaryId = req.params.id;
        const currentUserId = req.user.id;

        const targetEntry = await DiaryModel.getEntryById(diaryId);
        if (!targetEntry) {
            return res.status(404).json({ error: 'The requested log entry could not be located.' });
        }

        if (targetEntry.creator !== currentUserId) {
            return res.status(403).json({ error: 'Authorization verification failed. You cannot delete an entry written by another user.' });
        }

        await DiaryModel.deleteEntry(diaryId);
        return res.json({ success: true, message: 'Diary record entry successfully cleared from space logs.' });
    } catch (error) {
        console.error('Diary erasure routine exception:', error);
        return res.status(500).json({ error: 'Internal server error executing deletion sequence.' });
    }
};
