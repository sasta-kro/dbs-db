import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

import { initializeDatabase } from './db/init.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import partsRoutes from './routes/parts.js';
import buildsRoutes from './routes/builds.js';
import requestsRoutes from './routes/requests.js';
import offersRoutes from './routes/offers.js';
import usersRoutes from './routes/users.js';
import inquiriesRoutes from './routes/inquiries.js';
import applicationsRoutes from './routes/applications.js';
import compatibilityRoutes from './routes/compatibility.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/builds', buildsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/compatibility', compatibilityRoutes);


app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});


app.get('/api/stats', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM builds WHERE status = 'published')::int as builds,
        (SELECT COUNT(*) FROM parts WHERE is_active = true)::int as parts,
        (SELECT COUNT(*) FROM users WHERE is_banned = false)::int as users,
        (SELECT COUNT(*) FROM build_requests)::int as requests
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


app.use(errorHandler);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BuildBoard API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
