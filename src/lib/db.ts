// src/lib/db.ts
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '25', 10);
    const maxIdle = Math.min(10, connectionLimit);

    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'maro_hub',
      waitForConnections: true,
      connectionLimit,
      maxIdle,
      idleTimeout: 60000, // 60s
      queueLimit: 0,
      connectTimeout: 10000, // 10s
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}
