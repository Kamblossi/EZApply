import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

/** Shared connection pool */
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/** Helper type for query rows (expand later as needed) */
export type Row<T> = T & { id: string };
