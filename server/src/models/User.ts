import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export interface User {
  email: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
}

const userSchema = new Schema<User>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  passwordHash: { type: String, required: true, select: false },
  passwordSalt: { type: String, required: true, select: false },
}, { timestamps: true });

export const UserModel =
  (models.User as mongoose.Model<User> | undefined) ??
  model<User>('User', userSchema);
