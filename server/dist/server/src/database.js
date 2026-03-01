"use strict";
/**
 * Database Module — SQLite (dev) or PostgreSQL/RDS (production).
 *
 * When DATABASE_URL is set, uses PostgreSQL. Otherwise uses SQLite (DATABASE_PATH or ./data/easydrill.db).
 * All exported functions are async. Call initDatabase() before starting the server when using PostgreSQL.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
exports.findUserBySub = findUserBySub;
exports.findUserById = findUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.updateUserPlan = updateUserPlan;
exports.getPlan = getPlan;
exports.getUserExerciseCount = getUserExerciseCount;
exports.insertExercise = insertExercise;
exports.updateExercise = updateExercise;
exports.getExercise = getExercise;
exports.getExercisesByUser = getExercisesByUser;
exports.deleteExercise = deleteExercise;
exports.getExerciseVersion = getExerciseVersion;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const pg_1 = require("pg");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const usePg = !!process.env.DATABASE_URL;
// ─── SQLite ──────────────────────────────────────────────────────
let db;
function getSqliteDb() {
    if (!db) {
        const dbPath = process.env.DATABASE_PATH || path_1.default.join(__dirname, '..', 'data', 'easydrill.db');
        const dir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        db = new better_sqlite3_1.default(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initTablesSqlite();
    }
    return db;
}
function initTablesSqlite() {
    const database = db;
    database.exec(`
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

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Sin título',
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL DEFAULT '{}',
      zone_config TEXT,
      entities TEXT NOT NULL DEFAULT '{"items":[]}',
      scenes TEXT NOT NULL DEFAULT '{"count":1,"current":0}',
      editor_state TEXT NOT NULL DEFAULT '{"camera":{"x":0,"y":0,"zoom":1,"rotation":0}}',
      thumbnail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
    CREATE INDEX IF NOT EXISTS idx_exercises_updated_at ON exercises(updated_at);
  `);
    const count = database.prepare('SELECT COUNT(*) as c FROM plans').get();
    if (count.c === 0) {
        seedPlansSqlite(database);
    }
}
function seedPlansSqlite(database) {
    const insert = database.prepare(`
    INSERT OR IGNORE INTO plans (id, display_name, max_exercises_saved, max_bolsa_results, can_subscribe_bolsa_notifications, optimize_drill)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const plans = [
        ['free', 'Gratuito', 5, 10, 0, 0],
        ['basic', 'Básico', 25, 50, 0, 1],
        ['pro', 'Pro', 100, -1, 1, 1],
        ['team', 'Equipo', -1, -1, 1, 1],
    ];
    const tx = database.transaction(() => {
        for (const row of plans) {
            insert.run(...row);
        }
    });
    tx();
}
// ─── PostgreSQL ───────────────────────────────────────────────────
let pool;
function getPgPool() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!pool) {
            pool = new pg_1.Pool({
                connectionString: process.env.DATABASE_URL,
                // RDS: use encryption but allow typical RDS cert (evita self-signed in chain)
                ssl: ((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.includes('sslmode=require')) ? { rejectUnauthorized: false } : undefined,
            });
            yield initPgSchema();
        }
        return pool;
    });
}
function initPgSchema() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const p = pool;
        yield p.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(64) PRIMARY KEY,
      display_name VARCHAR(255) NOT NULL,
      max_exercises_saved INTEGER NOT NULL DEFAULT -1,
      max_bolsa_results INTEGER NOT NULL DEFAULT -1,
      can_subscribe_bolsa_notifications INTEGER NOT NULL DEFAULT 0,
      optimize_drill INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      cognito_sub VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255) NOT NULL DEFAULT '',
      avatar_url TEXT,
      role VARCHAR(64) NOT NULL DEFAULT 'entrenador',
      plan_id VARCHAR(64) NOT NULL DEFAULT 'free',
      bio TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT 'Sin título',
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL DEFAULT '{}',
      zone_config TEXT,
      entities TEXT NOT NULL DEFAULT '{"items":[]}',
      scenes TEXT NOT NULL DEFAULT '{"count":1,"current":0}',
      editor_state TEXT NOT NULL DEFAULT '{"camera":{"x":0,"y":0,"zoom":1,"rotation":0}}',
      thumbnail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
    CREATE INDEX IF NOT EXISTS idx_exercises_updated_at ON exercises(updated_at);
  `);
        const countResult = yield p.query('SELECT COUNT(*) as c FROM plans');
        const count = parseInt(String((_b = (_a = countResult.rows[0]) === null || _a === void 0 ? void 0 : _a.c) !== null && _b !== void 0 ? _b : 0), 10);
        if (count === 0) {
            yield p.query(`
      INSERT INTO plans (id, display_name, max_exercises_saved, max_bolsa_results, can_subscribe_bolsa_notifications, optimize_drill)
      VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18), ($19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO NOTHING
    `, ['free', 'Gratuito', 5, 10, 0, 0, 'basic', 'Básico', 25, 50, 0, 1, 'pro', 'Pro', 100, -1, 1, 1, 'team', 'Equipo', -1, -1, 1, 1]);
        }
    });
}
/** Call once before starting the server. Ensures PostgreSQL schema is ready when using RDS. */
function initDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            yield getPgPool();
        }
        else {
            getSqliteDb();
        }
    });
}
/** For backwards compatibility; prefer initDatabase(). With PostgreSQL, initDatabase() must have been called first. */
function getDb() {
    if (usePg) {
        throw new Error('Use initDatabase() and async DB functions when DATABASE_URL is set (PostgreSQL).');
    }
    return getSqliteDb();
}
// ─── User CRUD (async) ───────────────────────────────────────────
function findUserBySub(cognitoSub) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT * FROM users WHERE cognito_sub = $1', [cognitoSub]);
            return res.rows[0];
        }
        const row = getSqliteDb().prepare('SELECT * FROM users WHERE cognito_sub = ?').get(cognitoSub);
        return Promise.resolve(row);
    });
}
function findUserById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT * FROM users WHERE id = $1', [id]);
            return res.rows[0];
        }
        return Promise.resolve(getSqliteDb().prepare('SELECT * FROM users WHERE id = ?').get(id));
    });
}
function createUser(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = crypto.randomUUID();
        if (usePg) {
            const p = yield getPgPool();
            yield p.query(`INSERT INTO users (id, cognito_sub, email, display_name, avatar_url, role, plan_id)
             VALUES ($1, $2, $3, $4, $5, 'entrenador', 'free')`, [id, data.cognitoSub, data.email, data.displayName || '', data.avatarUrl || null]);
            const created = yield findUserById(id);
            return created;
        }
        getSqliteDb().prepare(`
    INSERT INTO users (id, cognito_sub, email, display_name, avatar_url, role, plan_id)
    VALUES (?, ?, ?, ?, ?, 'entrenador', 'free')
  `).run(id, data.cognitoSub, data.email, data.displayName || '', data.avatarUrl || null);
        const created = yield findUserById(id);
        return created;
    });
}
function updateUser(id, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const fields = [];
            const values = [];
            let n = 1;
            if (updates.display_name !== undefined) {
                fields.push(`display_name = $${n++}`);
                values.push(updates.display_name);
            }
            if (updates.avatar_url !== undefined) {
                fields.push(`avatar_url = $${n++}`);
                values.push(updates.avatar_url);
            }
            if (updates.role !== undefined) {
                fields.push(`role = $${n++}`);
                values.push(updates.role);
            }
            if (updates.bio !== undefined) {
                fields.push(`bio = $${n++}`);
                values.push(updates.bio);
            }
            if (fields.length === 0)
                return findUserById(id);
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            const p = yield getPgPool();
            yield p.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${n}`, values);
            return findUserById(id);
        }
        const fields = [];
        const values = [];
        if (updates.display_name !== undefined) {
            fields.push('display_name = ?');
            values.push(updates.display_name);
        }
        if (updates.avatar_url !== undefined) {
            fields.push('avatar_url = ?');
            values.push(updates.avatar_url);
        }
        if (updates.role !== undefined) {
            fields.push('role = ?');
            values.push(updates.role);
        }
        if (updates.bio !== undefined) {
            fields.push('bio = ?');
            values.push(updates.bio);
        }
        if (fields.length === 0)
            return findUserById(id);
        fields.push("updated_at = datetime('now')");
        values.push(id);
        getSqliteDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return findUserById(id);
    });
}
function updateUserPlan(userId, planId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const p = yield getPgPool();
            yield p.query("UPDATE users SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [planId, userId]);
            return findUserById(userId);
        }
        getSqliteDb().prepare("UPDATE users SET plan_id = ?, updated_at = datetime('now') WHERE id = ?").run(planId, userId);
        return findUserById(userId);
    });
}
// ─── Plan Queries ─────────────────────────────────────────────────
function getPlan(planId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT * FROM plans WHERE id = $1', [planId]);
            return res.rows[0];
        }
        const all = getSqliteDb().prepare('SELECT * FROM plans').all();
        return Promise.resolve(all.find((p) => p.id === planId));
    });
}
function getUserExerciseCount(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT COUNT(*) as c FROM exercises WHERE user_id = $1', [userId]);
            const c = (_a = res.rows[0]) === null || _a === void 0 ? void 0 : _a.c;
            return typeof c === 'string' ? parseInt(c, 10) : (_b = Number(c)) !== null && _b !== void 0 ? _b : 0;
        }
        const row = getSqliteDb().prepare('SELECT COUNT(*) as c FROM exercises WHERE user_id = ?').get(userId);
        return Promise.resolve((_c = row === null || row === void 0 ? void 0 : row.c) !== null && _c !== void 0 ? _c : 0);
    });
}
// ─── Exercise CRUD ───────────────────────────────────────────────
function insertExercise(userId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (usePg) {
            const p = yield getPgPool();
            yield p.query(`INSERT INTO exercises (id, user_id, title, status, version, metadata, zone_config, entities, scenes, editor_state, thumbnail, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, CURRENT_TIMESTAMP), COALESCE($13, CURRENT_TIMESTAMP))`, [
                data.id, userId, data.title, data.status, data.version,
                data.metadata, data.zone_config, data.entities, data.scenes,
                data.editor_state, data.thumbnail,
                (_a = data.created_at) !== null && _a !== void 0 ? _a : null,
                (_b = data.updated_at) !== null && _b !== void 0 ? _b : null,
            ]);
            const created = yield getExercise(data.id, userId);
            return created;
        }
        getSqliteDb().prepare(`
      INSERT INTO exercises (id, user_id, title, status, version, metadata, zone_config, entities, scenes, editor_state, thumbnail, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `).run(data.id, userId, data.title, data.status, data.version, data.metadata, data.zone_config, data.entities, data.scenes, data.editor_state, data.thumbnail, (_c = data.created_at) !== null && _c !== void 0 ? _c : null, (_d = data.updated_at) !== null && _d !== void 0 ? _d : null);
        return (yield getExercise(data.id, userId));
    });
}
function updateExercise(exerciseId, userId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const fields = [];
            const values = [];
            let n = 1;
            if (data.title !== undefined) {
                fields.push(`title = $${n++}`);
                values.push(data.title);
            }
            if (data.status !== undefined) {
                fields.push(`status = $${n++}`);
                values.push(data.status);
            }
            if (data.version !== undefined) {
                fields.push(`version = $${n++}`);
                values.push(data.version);
            }
            if (data.metadata !== undefined) {
                fields.push(`metadata = $${n++}`);
                values.push(data.metadata);
            }
            if (data.zone_config !== undefined) {
                fields.push(`zone_config = $${n++}`);
                values.push(data.zone_config);
            }
            if (data.entities !== undefined) {
                fields.push(`entities = $${n++}`);
                values.push(data.entities);
            }
            if (data.scenes !== undefined) {
                fields.push(`scenes = $${n++}`);
                values.push(data.scenes);
            }
            if (data.editor_state !== undefined) {
                fields.push(`editor_state = $${n++}`);
                values.push(data.editor_state);
            }
            if (data.thumbnail !== undefined) {
                fields.push(`thumbnail = $${n++}`);
                values.push(data.thumbnail);
            }
            if (fields.length === 0)
                return getExercise(exerciseId, userId);
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(exerciseId, userId);
            const p = yield getPgPool();
            yield p.query(`UPDATE exercises SET ${fields.join(', ')} WHERE id = $${n} AND user_id = $${n + 1}`, values);
            return getExercise(exerciseId, userId);
        }
        const fields = [];
        const values = [];
        if (data.title !== undefined) {
            fields.push('title = ?');
            values.push(data.title);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.version !== undefined) {
            fields.push('version = ?');
            values.push(data.version);
        }
        if (data.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(data.metadata);
        }
        if (data.zone_config !== undefined) {
            fields.push('zone_config = ?');
            values.push(data.zone_config);
        }
        if (data.entities !== undefined) {
            fields.push('entities = ?');
            values.push(data.entities);
        }
        if (data.scenes !== undefined) {
            fields.push('scenes = ?');
            values.push(data.scenes);
        }
        if (data.editor_state !== undefined) {
            fields.push('editor_state = ?');
            values.push(data.editor_state);
        }
        if (data.thumbnail !== undefined) {
            fields.push('thumbnail = ?');
            values.push(data.thumbnail);
        }
        if (fields.length === 0)
            return getExercise(exerciseId, userId);
        fields.push("updated_at = datetime('now')");
        values.push(exerciseId, userId);
        getSqliteDb().prepare(`UPDATE exercises SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
        return getExercise(exerciseId, userId);
    });
}
function getExercise(exerciseId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT * FROM exercises WHERE id = $1 AND user_id = $2', [exerciseId, userId]);
            return res.rows[0];
        }
        const row = getSqliteDb().prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?').get(exerciseId, userId);
        return Promise.resolve(row);
    });
}
function getExercisesByUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT id, user_id, title, status, version, metadata, thumbnail, created_at, updated_at FROM exercises WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
            return res.rows;
        }
        const rows = getSqliteDb().prepare('SELECT id, user_id, title, status, version, metadata, thumbnail, created_at, updated_at FROM exercises WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
        return Promise.resolve(rows);
    });
}
function deleteExercise(exerciseId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [exerciseId, userId]);
            return ((_a = res.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        }
        const result = getSqliteDb().prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?').run(exerciseId, userId);
        return Promise.resolve(result.changes > 0);
    });
}
function getExerciseVersion(exerciseId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (usePg) {
            const p = yield getPgPool();
            const res = yield p.query('SELECT version FROM exercises WHERE id = $1 AND user_id = $2', [exerciseId, userId]);
            const row = res.rows[0];
            if (!row)
                return null;
            const v = row.version;
            return typeof v === 'string' ? parseInt(v, 10) : Number(v);
        }
        const row = getSqliteDb().prepare('SELECT version FROM exercises WHERE id = ? AND user_id = ?').get(exerciseId, userId);
        return Promise.resolve((_a = row === null || row === void 0 ? void 0 : row.version) !== null && _a !== void 0 ? _a : null);
    });
}
