const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');

exports.getHealth = async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const states = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };

    const mem = process.memoryUsage();
    return res.json({
      status: 'operational',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: mongoState === 1 ? 'healthy' : 'degraded',
          connectionState: states[mongoState] || 'Unknown',
          host: mongoose.connection.host || 'localhost',
        },
        websocket: {
          status: 'healthy',
          protocol: 'Socket.IO v4',
        },
        webrtc: {
          status: 'healthy',
          stunServers: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
    });
  } catch (err) {
    console.error('System health check error:', err);
    return res.status(500).json({ error: 'System diagnostics check failed.' });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await ActivityLog.find({
      $or: [{ userId }, { userId: null }],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.json({ logs });
  } catch (err) {
    console.error('Get activity logs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve activity history.' });
  }
};

exports.logAction = async (userId, userName, action, details, ip = '') => {
  try {
    await ActivityLog.create({
      userId,
      userName,
      action,
      details,
      ip,
    });
  } catch (e) {
    console.warn('Failed to record activity log:', e.message);
  }
};
