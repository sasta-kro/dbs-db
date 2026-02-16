import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    
    const { rows } = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists`
    );

    if (rows[0].exists) {
      console.log('Database tables already exist — skipping init');
      return;
    }

    console.log('No tables found — initializing database...');

    
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Schema created successfully');

    
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('password123', 10);

    let seedSQL = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_admin_hash_will_be_set_by_seed_script__/g, adminHash);
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_user1_hash_will_be_set_by_seed_script__/g, userHash);
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_user2_hash_will_be_set_by_seed_script__/g, userHash);
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_build1_hash_will_be_set_by_seed_script/g, userHash);
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_build2_hash_will_be_set_by_seed_script/g, userHash);

    await client.query(seedSQL);
    console.log('Seed data inserted successfully');
  } finally {
    client.release();
  }
}
