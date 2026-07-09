const DiaryModel = require('../models/DiaryModel');
const ConnectionModel = require('../models/ConnectionModel');

exports.addDiaryEntry = async (req, res) => {
    try {
        const { title, description, isShared } = req.body;
        const currentUserId = req.user.id;
        const connectionId = req.query.connectionId || req.headers['x-connection-id'];

        if (!title || !description) {
            return res.status(400).json({ error: 'Diary entry title and description body fields are required.' });
        }

        if (isShared === true || isShared === 'true') {
            if (!connectionId) {
                return res.status(400).json({ error: 'Connection id is required to write shared diary entries.' });
            }
            const activeLink = await ConnectionModel.getAcceptedConnectionForUserById(Number(connectionId), currentUserId);
            if (!activeLink) {
                return res.status(403).json({ error: 'Access denied. You must be in an accepted relationship space to write to a shared journal.' });
            }
        }

        const savedEntry = await DiaryModel.createEntry(title, description, currentUserId, isShared, connectionId ? Number(connectionId) : null);
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
        const currentUserId = req.user.id;
        const connectionId = req.query.connectionId || req.headers['x-connection-id'];

        if (!connectionId) {
            return res.status(400).json({ error: 'Connection id is required to fetch shared diary entries.' });
        }

        const activeLink = await ConnectionModel.getAcceptedConnectionForUserById(Number(connectionId), currentUserId);
        if (!activeLink) {
            return res.status(403).json({ error: 'Access denied. Shared archives are locked until a connection space is active.' });
        }

        const logs = await DiaryModel.getSharedEntries(req.user.id, Number(connectionId));
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

exports.editDiaryEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const userId = req.user.id;
        const connectionId = req.query.connectionId || req.headers['x-connection-id'];

        const targetEntry = await DiaryModel.getEntryById(id);
        if (!targetEntry) {
            return res.status(404).json({ error: 'Diary entry not found.' });
        }

        let updatedEntry;

        if (targetEntry.creator !== userId) {
            if (!targetEntry.is_shared) {
                return res.status(403).json({ error: 'Unauthorized operation. You can only edit your own diary logs.' });
            }

            if (!connectionId) {
                return res.status(400).json({ error: 'Connection id is required to edit shared diary entries.' });
            }

            const activeLink = await ConnectionModel.getAcceptedConnectionForUserById(Number(connectionId), userId);
            if (!activeLink || (targetEntry.creator !== activeLink.sender_id && targetEntry.creator !== activeLink.receiver_id)) {
                return res.status(403).json({ error: 'Unauthorized operation. You can only edit shared entries within your accepted connection.' });
            }

            updatedEntry = await DiaryModel.updateSharedDiaryEntry(
                id,
                title || targetEntry.title,
                description || targetEntry.description,
                targetEntry.is_shared,
                userId
            );
        } else {
            updatedEntry = await DiaryModel.updateDiaryEntry(
                id,
                title || targetEntry.title,
                description || targetEntry.description,
                targetEntry.is_shared,
                userId
            );
        }

        return res.json({ message: 'Diary entry updated successfully!', log: updatedEntry });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error during diary modification.' });
    }
};
