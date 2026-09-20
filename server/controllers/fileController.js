const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { UPLOADS_DIR } = require('../middleware/upload');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file failed validation.' });
    }

    const { meetingId } = req.body;
    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID is required for file sharing.' });
    }

    const fileRecord = await File.create({
      meetingId: meetingId.trim().toUpperCase(),
      senderId: req.user.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      type: req.file.mimetype || 'application/octet-stream',
      timestamp: new Date(),
    });

    const fileData = {
      id: fileRecord._id,
      meetingId: fileRecord.meetingId,
      senderId: fileRecord.senderId,
      senderName: req.user.name,
      originalName: fileRecord.originalName,
      size: fileRecord.size,
      type: fileRecord.type,
      timestamp: fileRecord.timestamp,
      downloadUrl: `/api/files/download/${fileRecord._id}`,
    };

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: fileData,
    });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'Failed to process file upload: ' + err.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const fileRecord = await File.findById(id);

    if (!fileRecord) {
      return res.status(404).json({ error: 'File record not found.' });
    }

    const safeStoredName = path.basename(fileRecord.storedName);
    const fullPath = path.resolve(UPLOADS_DIR, safeStoredName);

    // Strict Path Traversal Protection
    const baseUploads = path.resolve(UPLOADS_DIR);
    if (!fullPath.startsWith(baseUploads)) {
      return res.status(403).json({ error: 'Access denied: Path traversal detected.' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File data missing on server disk.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
    res.setHeader('Content-Type', fileRecord.type || 'application/octet-stream');
    return res.sendFile(fullPath);
  } catch (err) {
    console.error('File download error:', err);
    return res.status(500).json({ error: 'Failed to download file.' });
  }
};

exports.getMeetingFiles = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const files = await File.find({ meetingId: meetingId.toUpperCase() }).sort({ timestamp: -1 });

    return res.json({
      files: files.map((f) => ({
        id: f._id,
        meetingId: f.meetingId,
        senderId: f.senderId,
        originalName: f.originalName,
        size: f.size,
        type: f.type,
        timestamp: f.timestamp,
        downloadUrl: `/api/files/download/${f._id}`,
      })),
    });
  } catch (err) {
    console.error('Get meeting files error:', err);
    return res.status(500).json({ error: 'Failed to fetch meeting files.' });
  }
};
