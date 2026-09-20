const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered. Please login.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const tokenPayload = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: tokenPayload,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    user.lastActive = new Date();
    await user.save();

    const tokenPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      presence: user.presence || 'available',
      role: user.role || 'user',
      avatar: user.avatar || '',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      user: tokenPayload,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        presence: user.presence || 'available',
        statusMessage: user.statusMessage || '',
        avatar: user.avatar || '',
        role: user.role || 'user',
        lastActive: user.lastActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Server error fetching profile.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email presence statusMessage avatar lastActive createdAt').sort({ name: 1 });
    return res.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        presence: u.presence || 'available',
        statusMessage: u.statusMessage || '',
        avatar: u.avatar || '',
        lastActive: u.lastActive,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({ error: 'Server error fetching user directory.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword, statusMessage, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (statusMessage !== undefined) {
      user.statusMessage = statusMessage.trim();
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    user.lastActive = new Date();
    await user.save();

    const tokenPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      presence: user.presence || 'available',
      role: user.role || 'user',
      avatar: user.avatar || '',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Profile updated successfully',
      token,
      user: {
        ...tokenPayload,
        statusMessage: user.statusMessage,
        lastActive: user.lastActive,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};

exports.updatePresence = async (req, res) => {
  try {
    const { presence, statusMessage } = req.body;
    const validStates = ['available', 'away', 'busy', 'offline'];
    if (!presence || !validStates.includes(presence)) {
      return res.status(400).json({ error: 'Valid presence state (available, away, busy, offline) is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.presence = presence;
    if (statusMessage !== undefined) user.statusMessage = statusMessage.trim();
    user.lastActive = new Date();
    await user.save();

    return res.json({
      message: 'Presence updated.',
      presence: user.presence,
      statusMessage: user.statusMessage,
      lastActive: user.lastActive,
    });
  } catch (err) {
    console.error('Update presence error:', err);
    return res.status(500).json({ error: 'Failed to update presence status.' });
  }
};
