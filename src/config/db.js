const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 * ─────────────────────────────────────────────────────
 * Mongoose handles connection pooling automatically.
 * We listen for connection events to log status.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Log disconnection events (useful in production debugging)
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // Exit — no point running an API with no database
  }
};

module.exports = connectDB;
