import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHabitLog extends Document {
    userId: mongoose.Types.ObjectId;
    habitId: mongoose.Types.ObjectId;
    date: Date; // Normalized to entering midnight or YYYY-MM-DD string
    completed: boolean;
    value?: number; // For quantifiable habits (e.g., 4L water)
}

const HabitLogSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    habitId: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
    date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    value: { type: Number },
}, {
    timestamps: true
});

// Compound index to ensure one log per habit per day
HabitLogSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });

// Prevent Mongoose model recompilation error in development (HMR)
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.HabitLog;
}

const HabitLog: Model<IHabitLog> = mongoose.models.HabitLog || mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);

export default HabitLog;
