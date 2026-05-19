import express from 'express';
import { signup, verify } from '../controllers/authController.js';
import { signupLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/signup', signupLimiter, signup);
router.get('/verify/:token', verify);

export default router;
