import { db } from '../src/db';

describe('Database integration tests', () => {
  it('should have users table', async () => {
    const res = await db.query(`
      SELECT to_regclass('public.users') AS table_name;
    `);
    expect(res.rows[0].table_name).toBe('users');
  });

  it('should insert and retrieve a user', async () => {
    const email = `testuser${Date.now()}@example.com`;
    const passwordHash = 'hashedpassword';

    // Insert user
    const insertRes = await db.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
      [email, passwordHash]
    );
    expect(insertRes.rows.length).toBe(1);
    expect(insertRes.rows[0].email).toBe(email);

    // Query user
    const queryRes = await db.query(
      `SELECT id, email FROM users WHERE email = $1`,
      [email]
    );
    expect(queryRes.rows.length).toBe(1);
    expect(queryRes.rows[0].email).toBe(email);
  });
});
