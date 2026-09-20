const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rate Limiting Middleware against Brute Force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Reasonable limit for active real-time sessions
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit login/signup attempts per IP per 15 mins
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

// Password Strength Checker
function validatePasswordStrength(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return 'Password must contain both letters and numbers.';
  }
  return null;
}

// Basic XSS Sanitizer for input strings
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

module.exports = {
  helmetOptions: helmet({
    contentSecurityPolicy: false, // Disabled CSP to allow local Canvas, WebRTC & Blob downloads seamlessly
    crossOriginEmbedderPolicy: false
  }),
  apiLimiter,
  authLimiter,
  validatePasswordStrength,
  sanitizeInput
};
