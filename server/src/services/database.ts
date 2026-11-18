import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.warn('MONGO_URI is not set; database features are unavailable.');
    return;
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
