const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

exports.getMeetingMessages = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const messages = await Message.find({ meetingId: meetingId.toUpperCase() })
      .sort({ timestamp: 1 })
      .limit(200);

    return res.json({
      messages: messages.map((m) => ({
        id: m._id,
        meetingId: m.meetingId,
        senderId: m.senderId,
        senderName: m.senderName,
        message: m.message,
        timestamp: m.timestamp,
      })),
    });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

exports.getDirectConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Find all distinct participants current user has exchanged messages with
    const dms = await DirectMessage.find({
      $or: [{ senderId: currentUserId }, { recipientId: currentUserId }],
    })
      .populate('senderId', 'name email presence avatar')
      .populate('recipientId', 'name email presence avatar')
      .sort({ createdAt: -1 });

    const conversationMap = new Map();

    for (const dm of dms) {
      const isSender = dm.senderId._id.toString() === currentUserId;
      const partner = isSender ? dm.recipientId : dm.senderId;
      if (!partner) continue;

      const partnerId = partner._id.toString();
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          user: {
            id: partner._id,
            name: partner.name,
            email: partner.email,
            presence: partner.presence || 'available',
            avatar: partner.avatar,
          },
          lastMessage: {
            id: dm._id,
            content: dm.content,
            createdAt: dm.createdAt,
            senderId: dm.senderId._id,
            read: dm.read,
          },
          unreadCount: 0,
        });
      }

      if (!isSender && !dm.read) {
        const conv = conversationMap.get(partnerId);
        conv.unreadCount += 1;
      }
    }

    return res.json({ conversations: Array.from(conversationMap.values()) });
  } catch (err) {
    console.error('Get direct conversations error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

exports.getDirectMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { partnerId } = req.params;

    const messages = await DirectMessage.find({
      $or: [
        { senderId: currentUserId, recipientId: partnerId },
        { senderId: partnerId, recipientId: currentUserId },
      ],
    })
      .populate('senderId', 'name email avatar')
      .populate('recipientId', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(300);

    // Mark unread messages as read
    await DirectMessage.updateMany(
      { senderId: partnerId, recipientId: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.json({
      messages: messages.map((m) => ({
        id: m._id,
        senderId: m.senderId._id,
        senderName: m.senderId.name,
        recipientId: m.recipientId._id,
        recipientName: m.recipientId.name,
        content: m.content,
        read: m.read,
        reactions: m.reactions,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('Get direct messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch direct messages.' });
  }
};

exports.sendDirectMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { recipientId, content } = req.body;

    if (!recipientId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Recipient and content are required.' });
    }

    const dm = new DirectMessage({
      senderId: currentUserId,
      recipientId,
      content: content.trim(),
    });
    await dm.save();

    const populated = await DirectMessage.findById(dm._id)
      .populate('senderId', 'name email avatar')
      .populate('recipientId', 'name email avatar');

    return res.status(201).json({
      message: 'Direct message sent.',
      directMessage: {
        id: populated._id,
        senderId: populated.senderId._id,
        senderName: populated.senderId.name,
        recipientId: populated.recipientId._id,
        recipientName: populated.recipientId.name,
        content: populated.content,
        read: populated.read,
        reactions: populated.reactions,
        createdAt: populated.createdAt,
      },
    });
  } catch (err) {
    console.error('Send direct message error:', err);
    return res.status(500).json({ error: 'Failed to send direct message.' });
  }
};

exports.deleteDirectMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;

    const dm = await DirectMessage.findOne({ _id: messageId, senderId: currentUserId });
    if (!dm) {
      return res.status(404).json({ error: 'Message not found or unauthorized to delete.' });
    }

    await DirectMessage.deleteOne({ _id: messageId });
    return res.json({ message: 'Message deleted successfully.' });
  } catch (err) {
    console.error('Delete direct message error:', err);
    return res.status(500).json({ error: 'Failed to delete message.' });
  }
};

