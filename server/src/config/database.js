const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('FATAL: MONGODB_URI environment variable is required');
  }

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50,
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 5,
    retryWrites: true,
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    console.error(`MongoDB initial connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
