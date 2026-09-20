const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 15 MB File Limit as specified in requirements
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Allowed file extensions and mime types
const ALLOWED_EXTENSIONS = /pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|zip|txt/i;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${safeBase}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const extMatch = ALLOWED_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());
  const mimeMatch = ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith('image/');

  if (extMatch && mimeMatch) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, ZIP, TXT'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

module.exports = { upload, UPLOADS_DIR, MAX_FILE_SIZE };
