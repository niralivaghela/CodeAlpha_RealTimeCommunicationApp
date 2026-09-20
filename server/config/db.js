const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realtime_collab_app';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`\n❌ MongoDB Connection Error: ${err.message}`);
    console.error(`👉 Please ensure MongoDB service is running (e.g., net start MongoDB) or check MONGODB_URI in your .env file.\n`);
    // Do not crash the entire process so server can still serve diagnostic info if needed
  }
};

module.exports = connectDB;
