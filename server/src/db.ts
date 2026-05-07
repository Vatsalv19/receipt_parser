import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";
import type { ReceiptData } from "./validators.js";

export type ReceiptRow = {
  id: number;
  data: ReceiptData;
  createdAt: string;
};

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "receipts.db");

export async function initDb(): Promise<Database> {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  return db;
}

export async function insertReceipt(
  db: Database,
  data: ReceiptData
): Promise<number> {
  const result = await db.run(
    "INSERT INTO receipts (data, created_at) VALUES (?, ?)",
    JSON.stringify(data),
    new Date().toISOString()
  );
  return result.lastID as number;
}

export async function listReceipts(db: Database): Promise<ReceiptRow[]> {
  const rows = await db.all<
    { id: number; data: string; created_at: string }[]
  >("SELECT id, data, created_at FROM receipts ORDER BY id DESC");
  return rows.map((row) => ({
    id: row.id,
    data: JSON.parse(row.data) as ReceiptData,
    createdAt: row.created_at,
  }));
}

export async function getReceipt(
  db: Database,
  id: number
): Promise<ReceiptRow | null> {
  const row = await db.get<{ id: number; data: string; created_at: string }>(
    "SELECT id, data, created_at FROM receipts WHERE id = ?",
    id
  );
  if (!row) return null;
  return {
    id: row.id,
    data: JSON.parse(row.data) as ReceiptData,
    createdAt: row.created_at,
  };
}
