import mongoose from 'mongoose';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('⚠️  Could not set Google DNS servers, falling back to system default:', e.message);
}

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌  Error: ${error.message}`);
        process.exit(1);
    }
};
