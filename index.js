const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id    SERIAL PRIMARY KEY,
      name  TEXT   NOT NULL,
      email TEXT   NOT NULL UNIQUE
    );
  `);
}

ensureTableExists().catch(err => {
  console.error('Cant create users:', err);
  process.exit(1);
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error while SELECT:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Bad format' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error while INSERT:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  res.send('<h1>Express + PostgreSQL. GET /users та POST /users</h1>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening: ${PORT}`);
});
