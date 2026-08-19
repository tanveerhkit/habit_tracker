import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
});

if (process.env.NODE_ENV !== 'production') delete mongoose.models.User;
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
