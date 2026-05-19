import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    company: {
        type: String,
        trim: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifyToken: String,
    verifyExpires: Date,
    signedUpAt: {
        type: Date,
        default: Date.now
    },
    verifiedAt: Date
});

export default mongoose.model('Lead', leadSchema);
