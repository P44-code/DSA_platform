import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export interface Session {
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
}

const sessionSchema = new Schema<Session>({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const SessionModel =
  (models.Session as mongoose.Model<Session> | undefined) ??
  model<Session>('Session', sessionSchema);
