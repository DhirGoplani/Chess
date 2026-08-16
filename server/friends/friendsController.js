import { sql } from '../utils/connectDB.js';
import onlineUsers from './onlineUsers.js';

export const searchUsers = async (req, res) => {
  try {
    const myId = req.user.id;
    const { username } = req.query;

    if (!username || username.trim().length < 2) {
      return res.json({ users: [] });
    }

    const users = await sql`
      SELECT id, username
      FROM users
      WHERE username ILIKE ${'%' + username.trim() + '%'}
        AND id <> ${myId}
      LIMIT 10
    `;
    res.json({ users });
  } catch (err) {
    console.error('[searchUsers]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId || receiverId === senderId) {
      return res.status(400).json({ message: 'Invalid receiver' });
    }

    const existing = await sql`
      SELECT id, status FROM "Friend_Request"
      WHERE (sender_id = ${senderId} AND receiver_id = ${receiverId})
         OR (sender_id = ${receiverId} AND receiver_id = ${senderId})
    `;

    if (existing.length > 0) {
      const row = existing[0];
      if (row.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      return res.status(400).json({ message: 'Request already pending' });
    }

    await sql`
      INSERT INTO "Friend_Request" (sender_id, receiver_id, status)
      VALUES (${senderId}, ${receiverId}, 'pending')
    `;

    res.json({ success: true });
  } catch (err) {
    console.error('[sendRequest]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const respondRequest = async (req, res) => {
  try {
    const myId = req.user.id;
    const { requestId, accept } = req.body;

    const rows = await sql`
      SELECT id FROM "Friend_Request"
      WHERE id = ${requestId} AND receiver_id = ${myId} AND status = 'pending'
    `;
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (accept) {
      await sql`
        UPDATE "Friend_Request" SET status = 'accepted' WHERE id = ${requestId}
      `;
    } else {
      await sql`
        DELETE FROM "Friend_Request" WHERE id = ${requestId}
      `;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[respondRequest]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listFriends = async (req, res) => {
  try {
    const myId = req.user.id;

    const friendsRaw = await sql`
      SELECT u.id, u.username, fr.id AS request_id
      FROM "Friend_Request" fr
      JOIN users u ON u.id = CASE WHEN fr.sender_id = ${myId} THEN fr.receiver_id ELSE fr.sender_id END
      WHERE (fr.sender_id = ${myId} OR fr.receiver_id = ${myId})
        AND fr.status = 'accepted'
    `;

    const friends = friendsRaw.map((f) => ({
      ...f,
      isOnline: onlineUsers.isOnline(f.id),
    }));

    const incoming = await sql`
      SELECT fr.id AS request_id, u.id AS sender_id, u.username
      FROM "Friend_Request" fr
      JOIN users u ON u.id = fr.sender_id
      WHERE fr.receiver_id = ${myId} AND fr.status = 'pending'
    `;

    const outgoing = await sql`
      SELECT fr.id AS request_id, u.id AS receiver_id, u.username
      FROM "Friend_Request" fr
      JOIN users u ON u.id = fr.receiver_id
      WHERE fr.sender_id = ${myId} AND fr.status = 'pending'
    `;

    res.json({ friends, incoming, outgoing });
  } catch (err) {
    console.error('[listFriends]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const myId = req.user.id;
    const { friendId } = req.params;

    await sql`
      DELETE FROM "Friend_Request"
      WHERE status = 'accepted'
        AND ((sender_id = ${myId} AND receiver_id = ${friendId})
          OR (sender_id = ${friendId} AND receiver_id = ${myId}))
    `;

    res.json({ success: true });
  } catch (err) {
    console.error('[removeFriend]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};