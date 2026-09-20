const User = require('../models/User');
const Meeting = require('../models/Meeting');
const File = require('../models/File');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');

exports.globalSearch = async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q || q.length < 1) {
      return res.json({ people: [], meetings: [], files: [], messages: [] });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const currentUserId = req.user.id;

    // 1. Search People (Users)
    const peoplePromise = User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        { $or: [{ name: regex }, { email: regex }] },
      ],
    })
      .select('name email presence statusMessage avatar lastActive')
      .limit(8);

    // 2. Search Meetings
    const meetingsPromise = Meeting.find({
      $and: [
        {
          $or: [
            { hostId: currentUserId },
            { 'participants.userId': currentUserId },
          ],
        },
        { $or: [{ meetingId: regex }, { title: regex }] },
      ],
    })
      .select('meetingId title scheduledFor status createdAt durationSeconds')
      .limit(8);

    // 3. Search Files
    const filesPromise = File.find({
      fileName: regex,
    })
      .select('fileName originalName fileSize mimeType uploadedBy createdAt meetingId')
      .limit(8);

    // 4. Search Messages (Room Messages + DMs)
    const roomMessagesPromise = Message.find({
      text: regex,
    })
      .select('meetingId senderName text createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const dmsPromise = DirectMessage.find({
      $and: [
        { $or: [{ senderId: currentUserId }, { recipientId: currentUserId }] },
        { content: regex },
      ],
    })
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .select('content createdAt senderId recipientId')
      .sort({ createdAt: -1 })
      .limit(5);

    const [people, meetings, files, roomMessages, dms] = await Promise.all([
      peoplePromise,
      meetingsPromise,
      filesPromise,
      roomMessagesPromise,
      dmsPromise,
    ]);

    const formattedMessages = [
      ...roomMessages.map((m) => ({
        id: m._id,
        type: 'room',
        text: m.text,
        senderName: m.senderName,
        target: m.meetingId,
        createdAt: m.createdAt,
      })),
      ...dms.map((m) => ({
        id: m._id,
        type: 'direct',
        text: m.content,
        senderName: m.senderId ? m.senderId.name : 'Unknown',
        target: m.recipientId ? m.recipientId.name : 'Direct',
        createdAt: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    return res.json({
      query: q,
      people,
      meetings,
      files,
      messages: formattedMessages,
    });
  } catch (err) {
    console.error('Global search error:', err);
    return res.status(500).json({ error: 'Search operation failed.' });
  }
};
