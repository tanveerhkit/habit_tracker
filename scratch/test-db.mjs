import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI is not defined in .env.local');
        process.exit(1);
    }
    console.log('Connecting to:', MONGODB_URI.split('@')[1] || MONGODB_URI);
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

testConnection();
