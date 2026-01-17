import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITimerLog extends Document {
    category: 'Study' | 'Other' | 'Food';
    startTime: Date;
    endTime: Date;
    duration: number; // in milliseconds
}

const TimerLogSchema: Schema = new Schema({
    category: { type: String, required: true, enum: ['Study', 'Other', 'Food'] },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }
});

// Prevent Mongoose model recompilation error in development
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.TimerLog;
}

const TimerLog: Model<ITimerLog> = mongoose.models.TimerLog || mongoose.model<ITimerLog>('TimerLog', TimerLogSchema);

export default TimerLog;
