import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();


router.get('/', authenticate, async (req, res, next) => {
  try {
    const { build_id, builder_id, user_id } = req.query;
    let query = `SELECT si.*, u.display_name as user_display_name, b.title as build_title
                 FROM showcase_inquiries si
                 JOIN users u ON si.user_id = u.id
                 JOIN builds b ON si.build_id = b.id
                 WHERE 1=1`;
    const params = [];

    if (build_id) {
      params.push(build_id);
      query += ` AND si.build_id = $${params.length}`;
    }
    if (builder_id) {
      params.push(builder_id);
      query += ` AND si.builder_id = $${params.length}`;
    }
    if (user_id) {
      params.push(user_id);
      query += ` AND si.user_id = $${params.length}`;
    }

    query += ' ORDER BY si.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.post('/', authenticate, async (req, res, next) => {
  try {
    const { build_id, builder_id, message } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO showcase_inquiries (user_id, build_id, builder_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, build_id, builder_id, message]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
