import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHabit extends Document {
    name: string;
    icon: string;
    color: string; // e.g., 'neon-red', 'neon-green' or hex
    description?: string;
    goal: number; // e.g., target per week or month
    order: number;
    createdAt: Date;
}

const HabitSchema: Schema = new Schema({
    name: { type: String, required: true },
    icon: { type: String, default: '📝' },
    color: { type: String, default: 'neon-blue' },
    description: { type: String, default: '' },
    goal: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

// Prevent Mongoose model recompilation error in development
// Delete the model if it exists to ensure new schema is applied
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.Habit;
}

const Habit: Model<IHabit> = mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema);

export default Habit;
