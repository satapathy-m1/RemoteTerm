import express from 'express';
import { body, validationResult } from 'express-validator';

import { register, login, me } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateAuth = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    next();
  },
];

router.post('/register', validateAuth, register);
router.post('/login', validateAuth, login);
router.get('/me', authenticateToken, me);

export default router;