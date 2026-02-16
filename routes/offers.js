import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();


router.get('/', authenticate, async (req, res, next) => {
  try {
    const { request_id, builder_id } = req.query;
    let query = `SELECT bo.*, u.display_name as builder_display_name,
                        b.title as request_title,
                        json_build_object(
                          'years_of_experience', bp.years_of_experience,
                          'completed_builds', bp.completed_builds,
                          'avg_rating', bp.avg_rating
                        ) as builder_profile
                 FROM builder_offers bo
                 JOIN users u ON bo.builder_id = u.id
                 JOIN build_requests br ON bo.request_id = br.id
                 JOIN builds b ON br.build_id = b.id
                 LEFT JOIN builder_profiles bp ON bp.user_id = bo.builder_id
                 WHERE 1=1`;
    const params = [];

    if (request_id) {
      params.push(request_id);
      query += ` AND bo.request_id = $${params.length}`;
    }
    if (builder_id) {
      params.push(builder_id);
      query += ` AND bo.builder_id = $${params.length}`;
    }

    query += ' ORDER BY bo.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.post('/', authenticate, requireRole('builder'), async (req, res, next) => {
  try {
    const { request_id, fee, message, suggested_build_id, contact_info } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO builder_offers (request_id, builder_id, fee, message, suggested_build_id, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [request_id, req.user.id, fee || 0, message, suggested_build_id || null, contact_info]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You have already submitted an offer for this request' });
    }
    next(err);
  }
});


router.post('/:id/accept', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    
    const { rows: offers } = await client.query('SELECT * FROM builder_offers WHERE id = $1', [req.params.id]);
    if (offers.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Offer not found' });
    }
    const offer = offers[0];

    
    const { rows: requests } = await client.query('SELECT * FROM build_requests WHERE id = $1', [offer.request_id]);
    if (requests.length === 0 || (requests[0].user_id !== req.user.id && req.user.role !== 'admin')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized' });
    }

    
    await client.query("UPDATE builder_offers SET status = 'accepted' WHERE id = $1", [req.params.id]);

    
    await client.query(
      "UPDATE builder_offers SET status = 'rejected' WHERE request_id = $1 AND id != $2",
      [offer.request_id, req.params.id]
    );

    
    await client.query(
      "UPDATE build_requests SET status = 'claimed' WHERE id = $1",
      [offer.request_id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
