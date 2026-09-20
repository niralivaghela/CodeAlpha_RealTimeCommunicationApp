const Contact = require('../models/Contact');
const User = require('../models/User');

exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await Contact.find({ userId, status: 'accepted' })
      .populate('contactId', 'name email presence statusMessage avatar lastActive')
      .sort({ createdAt: -1 });

    const formatted = contacts
      .filter((c) => c.contactId)
      .map((c) => ({
        id: c._id,
        contactId: c.contactId._id,
        name: c.contactId.name,
        email: c.contactId.email,
        presence: c.contactId.presence || 'available',
        statusMessage: c.contactId.statusMessage || '',
        avatar: c.contactId.avatar || '',
        lastActive: c.contactId.lastActive,
        nickname: c.nickname,
      }));

    return res.json({ contacts: formatted });
  } catch (err) {
    console.error('Get contacts error:', err);
    return res.status(500).json({ error: 'Failed to retrieve contacts.' });
  }
};

exports.addContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, targetUserId, contactUserId, nickname } = req.body;

    let targetUser = null;
    const lookupId = targetUserId || contactUserId;
    if (lookupId) {
      targetUser = await User.findById(lookupId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found with provided details.' });
    }

    if (targetUser._id.toString() === userId) {
      return res.status(400).json({ error: 'You cannot add yourself as a contact.' });
    }

    const existing = await Contact.findOne({ userId, contactId: targetUser._id });
    if (existing) {
      return res.status(409).json({ error: 'Contact already exists in your address book.' });
    }

    const contact = new Contact({
      userId,
      contactId: targetUser._id,
      nickname: nickname || targetUser.name,
      status: 'accepted',
    });
    await contact.save();

    // Reciprocal add if not present
    const reciprocal = await Contact.findOne({ userId: targetUser._id, contactId: userId });
    if (!reciprocal) {
      await Contact.create({
        userId: targetUser._id,
        contactId: userId,
        status: 'accepted',
      });
    }

    return res.status(201).json({
      message: 'Contact added successfully.',
      contact: {
        id: contact._id,
        contactId: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        presence: targetUser.presence || 'available',
        statusMessage: targetUser.statusMessage || '',
        lastActive: targetUser.lastActive,
        nickname: contact.nickname,
      },
    });
  } catch (err) {
    console.error('Add contact error:', err);
    return res.status(500).json({ error: 'Failed to add contact.' });
  }
};

exports.removeContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    await Contact.findOneAndDelete({
      userId,
      $or: [{ _id: contactId }, { contactId }],
    });

    return res.json({ message: 'Contact removed successfully.' });
  } catch (err) {
    console.error('Remove contact error:', err);
    return res.status(500).json({ error: 'Failed to remove contact.' });
  }
};
