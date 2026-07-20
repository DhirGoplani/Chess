import express from 'express';
import { verifyToken } from '../auth/authMiddleware.js';
import { getHistory, getMoves } from './gameController.js';

const router = express.Router();
router.use(verifyToken);

router.get('/history',         getHistory);
router.get('/:gameId/moves',   getMoves);

export default router;