import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  generateSessionCode,
  verifySessionCode,
  getSessions,
} from '../controllers/sessionController.js';

const router = express.Router();

router.post('/generate-code', authenticateToken, generateSessionCode);
router.post('/verify-code', verifySessionCode); 
router.get('/', authenticateToken, getSessions);

export default router;