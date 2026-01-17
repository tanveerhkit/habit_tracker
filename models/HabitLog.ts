import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHabitLog extends Document {
    habitId: mongoose.Types.ObjectId;
    date: Date; // Normalized to entering midnight or YYYY-MM-DD string
    completed: boolean;
    value?: number; // For quantifiable habits (e.g., 4L water)
}

const HabitLogSchema: Schema = new Schema({
    habitId: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
    date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    value: { type: Number },
}, {
    timestamps: true
});

// Compound index to ensure one log per habit per day
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });

const HabitLog: Model<IHabitLog> = mongoose.models.HabitLog || mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);

export default HabitLog;
