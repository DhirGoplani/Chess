import express from 'express';
import { verifyToken } from '../auth/authMiddleware.js';
import {
  searchUsers,
  sendRequest,
  respondRequest,
  listFriends,
  removeFriend,
} from './friendsController.js';

const router = express.Router();
router.use(verifyToken);

router.get('/search',           searchUsers);
router.post('/request',         sendRequest);
router.post('/respond',         respondRequest);
router.get('/list',             listFriends);
router.delete('/:friendId',     removeFriend);

export default router;