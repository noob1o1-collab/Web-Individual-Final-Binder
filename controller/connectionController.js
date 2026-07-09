const UserModel = require('../models/UserModel');
const ConnectionModel = require('../models/ConnectionModel');

exports.sendConnectionRequest = async (req, res) => {
    try {
        const { targetUsername, relationshipType, anniversaryDate } = req.body;
        const currentUserId = req.user.id;

        if (!targetUsername || !relationshipType) {
            return res.status(400).json({ error: 'Target username handle and relationship type are required.' });
        }

        if (targetUsername === req.user.username) {
            return res.status(400).json({ error: 'You cannot issue a space connection request to your own account handle.' });
        }

        const targetUser = await UserModel.findUserByUsername(targetUsername);
        if (!targetUser) {
            return res.status(444).json({ error: `The target user handle "${targetUsername}" could not be found.` });
        }

        const existingRequest = await ConnectionModel.findExistingConnection(currentUserId, targetUser.uid);
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(409).json({ error: 'A pending connection request is already awaiting response between you two.' });
            } else {
                return res.status(409).json({ error: 'An active connection space is already fully operating with this user.' });
            }
        }

        const newConnection = await ConnectionModel.initiateConnection(
            currentUserId, 
            targetUser.uid, 
            relationshipType, 
            anniversaryDate
        );

        return res.status(201).json({ 
            success: true, 
            message: `Connection request successfully dispatched to ${targetUsername}.`, 
            connection: newConnection 
        });

    } catch (error) {
        console.error('Connection dispatch routine failure:', error);
        return res.status(500).json({ error: 'Internal server error processing relationship invitation.' });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const list = await ConnectionModel.getPendingRequestsForUser(currentUserId);
        return res.json({ success: true, pendingRequests: list });
    } catch (error) {
        console.error('Error fetching pending invitations list:', error);
        return res.status(500).json({ error: 'Internal server error pulling invitation records.' });
    }
};

exports.acceptConnection = async (req, res) => {
    try {
        const connectionId = req.params.id;
        const currentUserId = req.user.id;

        const connection = await ConnectionModel.getConnectionById(connectionId);
        
        if (!connection || connection.receiver_id !== currentUserId) {
            return res.status(403).json({ error: 'Authorization denied. This request does not exist or does not belong to you.' });
        }

        if (connection.status === 'accepted') {
            return res.status(400).json({ error: 'This connection has already been accepted.' });
        }

        const updatedConnection = await ConnectionModel.updateConnectionStatus(connectionId, 'accepted');
        
        return res.json({ 
            success: true, 
            message: 'Space connection successfully established! Shared features are now unlocked.',
            connection: updatedConnection
        });
    } catch (error) {
        console.error('Error resolving accept operation hook:', error);
        return res.status(500).json({ error: 'Internal server error accepting connection request.' });
    }
};

exports.declineConnection = async (req, res) => {
    try {
        const connectionId = req.params.id;
        const currentUserId = req.user.id;

        const connection = await ConnectionModel.getConnectionById(connectionId);
        
        if (!connection || connection.receiver_id !== currentUserId) {
            return res.status(403).json({ error: 'Authorization denied. This request does not exist or does not belong to you.' });
        }

        await ConnectionModel.deleteConnection(connectionId);
        
        return res.json({ success: true, message: 'Relationship space invitation declined and removed.' });
    } catch (error) {
        console.error('Error resolving decline operation hook:', error);
        return res.status(500).json({ error: 'Internal server error declining connection request.' });
    }
};

exports.getConnectionStatus = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const activeConnections = await ConnectionModel.getAcceptedConnectionsForUser(currentUserId);

        if (!activeConnections || activeConnections.length === 0) {
            return res.json({ 
                success: true, 
                connected: false, 
                message: 'User is not currently linked to any active collaborative space.' 
            });
        }

        const firstConnection = activeConnections[0];
        const partnerInfo = {
            id: firstConnection.partner_id,
            username: firstConnection.partner_username,
            birthday: firstConnection.partner_birthday,
            relationshipType: firstConnection.relationship_type,
            anniversaryDate: firstConnection.anniversary_date
        };

        return res.json({
            success: true,
            connected: true,
            connectionId: firstConnection.cid,
            partner: partnerInfo
        });
    } catch (error) {
        console.error('Error within getConnectionStatus routine:', error);
        return res.status(500).json({ error: 'Internal server error processing relationship status query.' });
    }
};

exports.getAcceptedConnections = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const connections = await ConnectionModel.getAcceptedConnectionsForUser(currentUserId);
        return res.json({ success: true, connections });
    } catch (error) {
        console.error('Error fetching accepted connections:', error);
        return res.status(500).json({ error: 'Internal server error pulling accepted connections.' });
    }
};

exports.getConnectionDetail = async (req, res) => {
    try {
        const connectionId = req.query.connectionId || req.headers['x-connection-id'];
        if (!connectionId) {
            return res.status(400).json({ error: 'Connection id is required.' });
        }
        const currentUserId = req.user.id;
        const connection = await ConnectionModel.getAcceptedConnectionForUserById(Number(connectionId), currentUserId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found or not accepted.' });
        }
        const isSender = connection.sender_id === currentUserId;
        const partnerInfo = {
            id: isSender ? connection.receiver_id : connection.sender_id,
            partner_username: isSender ? connection.receiver_username : connection.sender_username,
            partner_birthday: isSender ? connection.receiver_birthday : connection.sender_birthday,
            relationship_type: connection.relationship_type,
            anniversary_date: connection.anniversary_date
        };
        return res.json({ success: true, connection: partnerInfo });
    } catch (error) {
        console.error('Error fetching connection detail:', error);
        return res.status(500).json({ error: 'Internal server error retrieving connection detail.' });
    }
};
