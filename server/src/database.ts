/**
 * Database Module — SQLite for local dev.
 *
 * Creates and manages the SQLite database with tables for users and plans.
 * In production, this would be swapped for a PostgreSQL/RDS connection.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ─── Types ───────────────────────────────────────────────────────

export interface DbUser {
    id: string;
    cognito_sub: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    role: 'entrenador' | 'club';
    plan_id: string;
    bio: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbPlan {
    id: string;
    display_name: string;
    max_exercises_saved: number;
    max_bolsa_results: number;
    can_subscribe_bolsa_notifications: number; // 0 or 1 (SQLite boolean)
    optimize_drill: number;
}

// ─── Database Instance ───────────────────────────────────────────

let db: Database.Database;

export function getDb(): Database.Database {
    if (!db) {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'easydrill.db');
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initTables();
    }
    return db;
}

// ─── Schema ──────────────────────────────────────────────────────

function initTables(): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      max_exercises_saved INTEGER NOT NULL DEFAULT -1,
      max_bolsa_results INTEGER NOT NULL DEFAULT -1,
      can_subscribe_bolsa_notifications INTEGER NOT NULL DEFAULT 0,
      optimize_drill INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      cognito_sub TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'entrenador',
      plan_id TEXT NOT NULL DEFAULT 'free',
      bio TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );
  `);

    // Seed plans if empty
    const count = db.prepare('SELECT COUNT(*) as c FROM plans').get() as { c: number };
    if (count.c === 0) {
        seedPlans();
    }
}

function seedPlans(): void {
    const insert = db.prepare(`
    INSERT OR IGNORE INTO plans (id, display_name, max_exercises_saved, max_bolsa_results, can_subscribe_bolsa_notifications, optimize_drill)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const plans = [
        ['free', 'Gratuito', 5, 10, 0, 0],
        ['basic', 'Básico', 25, 50, 0, 1],
        ['pro', 'Pro', 100, -1, 1, 1],
        ['team', 'Equipo', -1, -1, 1, 1],
    ];

    const tx = db.transaction(() => {
        for (const plan of plans) {
            insert.run(...plan);
        }
    });
    tx();
}

// ─── User CRUD ───────────────────────────────────────────────────

export function findUserBySub(cognitoSub: string): DbUser | undefined {
    return getDb().prepare('SELECT * FROM users WHERE cognito_sub = ?').get(cognitoSub) as DbUser | undefined;
}

export function findUserById(id: string): DbUser | undefined {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser | undefined;
}

export function createUser(data: {
    cognitoSub: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
}): DbUser {
    const id = crypto.randomUUID();
    getDb().prepare(`
    INSERT INTO users (id, cognito_sub, email, display_name, avatar_url, role, plan_id)
    VALUES (?, ?, ?, ?, ?, 'entrenador', 'free')
  `).run(id, data.cognitoSub, data.email, data.displayName || '', data.avatarUrl || null);

    return findUserById(id)!;
}

export function updateUser(id: string, updates: Partial<{
    display_name: string;
    avatar_url: string;
    role: string;
    bio: string;
}>): DbUser | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.display_name !== undefined) { fields.push('display_name = ?'); values.push(updates.display_name); }
    if (updates.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(updates.avatar_url); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.bio !== undefined) { fields.push('bio = ?'); values.push(updates.bio); }

    if (fields.length === 0) return findUserById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return findUserById(id);
}

export function updateUserPlan(userId: string, planId: string): DbUser | undefined {
    getDb().prepare("UPDATE users SET plan_id = ?, updated_at = datetime('now') WHERE id = ?").run(planId, userId);
    return findUserById(userId);
}

// ─── Plan Queries ────────────────────────────────────────────────

export function getPlan(planId: string): DbPlan | undefined {
    return getDb().prepare('SELECT * FROM plans').all().find((p: any) => p.id === planId) as DbPlan | undefined;
}

export function getUserExerciseCount(userId: string): number {
    // TODO: When exercises table exists, count from there
    // For now return 0 (no persistence of exercises in DB yet)
    return 0;
}
