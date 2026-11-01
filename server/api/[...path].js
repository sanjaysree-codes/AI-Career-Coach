import mongoose from 'mongoose';
import app from '../src/app.js';

let connectionPromise;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI is not configured.');
    error.status = 503;
    throw error;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).catch(error => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
}

export default async function handler(req, res) {
  // Health is a process check and remains available while MongoDB is recovering.
  if (req.url?.split('?')[0] !== '/api/health') {
    try {
      await connectMongo();
    } catch (error) {
      console.error('MongoDB connection unavailable', { name: error?.name, code: error?.code });
      return res.status(503).json({ message: 'The database is temporarily unavailable. Please try again shortly.' });
    }
  }

  return app(req, res);
}
