import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

// GET /api/leads - Admin endpoint to get all leads
router.get('/leads', async (req, res, next) => {
    try {
        const leads = await Lead.find().sort({ signedUpAt: -1 });
        res.status(200).json({ success: true, count: leads.length, data: leads });
    } catch (error) {
        next(error);
    }
});

// GET /api/stats - Public endpoint for live counter
router.get('/stats', async (req, res, next) => {
    try {
        const count = await Lead.countDocuments({ verified: true });
        res.status(200).json({ success: true, verifiedUsers: count });
    } catch (error) {
        next(error);
    }
});

export default router;
