import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolink';

  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected ✅');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
