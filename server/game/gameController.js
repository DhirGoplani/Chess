import { sql } from '../utils/connectDB.js';

export const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const games  = await sql`
      SELECT
        gh.game_id,
        gh.user_colour,
        gh.result,
        gh.game_type,
        gh.rating_before,
        gh.rating_after,
        gh.rating_change,
        gh.ended_at,
        u.username  AS opponent_username,
        u.id        AS opponent_id
      FROM game_history gh
      JOIN users u ON u.id = gh.opponent_id
      WHERE gh.user_id = ${userId}
      ORDER BY gh.ended_at DESC
      LIMIT 20
    `;
    res.json({ games });
  } catch (err) {
    console.error('[getHistory]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMoves = async (req, res) => {
  try {
    const { gameId } = req.params;
    const moves      = await sql`
      SELECT
        move_number,
        colour,
        from_square,
        to_square,
        san,
        fen,
        time_left
      FROM game_moves
      WHERE game_id = ${gameId}
      ORDER BY id ASC
    `;
    res.json({ moves });
  } catch (err) {
    console.error('[getMoves]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};