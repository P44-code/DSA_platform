import mongoose from 'mongoose';

export async function connectDatabase(options: { required?: boolean } = {}) {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    const message = 'MONGO_URI is not set. Add a MongoDB connection string to server/.env.';
    if (options.required) {
      throw new Error(message);
    }

    console.warn(`${message} Database features are unavailable.`);
    return false;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');
  return true;
}
