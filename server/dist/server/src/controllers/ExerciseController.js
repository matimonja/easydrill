"use strict";
/**
 * ExerciseController — CRUD endpoints for exercises.
 *
 * POST   /api/exercises          — Create (with plan limit check)
 * GET    /api/exercises          — List (lightweight: no entities)
 * GET    /api/exercises/:id      — Load full document
 * PATCH  /api/exercises/:id      — Update (full or metadata-only, with optimistic locking)
 * DELETE /api/exercises/:id      — Delete
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExerciseController = void 0;
const database_1 = require("../database");
class ExerciseController {
    resolveUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return null;
            }
            const user = yield (0, database_1.findUserBySub)(req.user.sub);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return null;
            }
            return { userId: user.id };
        });
    }
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const auth = yield this.resolveUser(req, res);
            if (!auth)
                return;
            try {
                const user = yield (0, database_1.findUserBySub)(req.user.sub);
                if (!user) {
                    res.status(404).json({ error: 'User not found' });
                    return;
                }
                const plan = yield (0, database_1.getPlan)(user.plan_id);
                const currentCount = yield (0, database_1.getUserExerciseCount)(auth.userId);
                if (plan && plan.max_exercises_saved !== -1 && currentCount >= plan.max_exercises_saved) {
                    res.status(403).json({
                        error: 'plan_limit_reached',
                        message: `Has alcanzado el límite de ejercicios guardados para tu plan (${plan.display_name}). Actualizá tu plan para guardar más.`,
                        limit: plan.max_exercises_saved,
                        current: currentCount,
                    });
                    return;
                }
                const body = req.body;
                if (!body.id) {
                    res.status(400).json({ error: 'Exercise id is required' });
                    return;
                }
                const metadata = (_a = body.metadata) !== null && _a !== void 0 ? _a : {};
                const title = metadata.title || body.title || 'Sin título';
                const exercise = yield (0, database_1.insertExercise)(auth.userId, {
                    id: body.id,
                    title,
                    status: body.status || 'draft',
                    version: body.version || 1,
                    metadata: JSON.stringify(metadata),
                    zone_config: body.zoneConfig != null ? JSON.stringify(body.zoneConfig) : null,
                    entities: body.entities ? JSON.stringify(body.entities) : '{"items":[]}',
                    scenes: body.scenes ? JSON.stringify(body.scenes) : '{"count":1,"current":0}',
                    editor_state: body.editorState ? JSON.stringify(body.editorState) : '{"camera":{"x":0,"y":0,"zoom":1,"rotation":0}}',
                    thumbnail: (_b = body.thumbnail) !== null && _b !== void 0 ? _b : null,
                    created_at: body.createdAt,
                    updated_at: body.updatedAt,
                });
                res.status(201).json(this.dbToDocument(exercise));
            }
            catch (err) {
                const isUniqueViolation = ((_c = err.message) === null || _c === void 0 ? void 0 : _c.includes('UNIQUE constraint failed')) ||
                    err.code === '23505'; // PostgreSQL unique_violation
                if (isUniqueViolation) {
                    res.status(409).json({ error: 'Exercise with this id already exists' });
                    return;
                }
                console.error('Error in POST /api/exercises:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    list(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield this.resolveUser(req, res);
            if (!auth)
                return;
            try {
                const rows = yield (0, database_1.getExercisesByUser)(auth.userId);
                const items = rows.map((row) => {
                    var _a, _b;
                    const meta = this.parseJson(row.metadata, {});
                    return {
                        id: row.id,
                        title: row.title,
                        status: row.status,
                        updatedAt: row.updated_at,
                        createdAt: row.created_at,
                        thumbnail: (_a = row.thumbnail) !== null && _a !== void 0 ? _a : undefined,
                        tags: (_b = meta.tags) !== null && _b !== void 0 ? _b : undefined,
                    };
                });
                res.json(items);
            }
            catch (err) {
                console.error('Error in GET /api/exercises:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    getOne(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield this.resolveUser(req, res);
            if (!auth)
                return;
            try {
                const exercise = yield (0, database_1.getExercise)(req.params.id, auth.userId);
                if (!exercise) {
                    res.status(404).json({ error: 'Exercise not found' });
                    return;
                }
                res.json(this.dbToDocument(exercise));
            }
            catch (err) {
                console.error('Error in GET /api/exercises/:id:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield this.resolveUser(req, res);
            if (!auth)
                return;
            try {
                const exerciseId = req.params.id;
                const body = req.body;
                // Optimistic locking: reject if client version < stored version
                if (body.version != null) {
                    const storedVersion = yield (0, database_1.getExerciseVersion)(exerciseId, auth.userId);
                    if (storedVersion !== null && body.version < storedVersion) {
                        res.status(409).json({
                            error: 'version_conflict',
                            message: 'El ejercicio fue modificado desde otro dispositivo. Refrescá la página para obtener la versión actual.',
                            storedVersion,
                            clientVersion: body.version,
                        });
                        return;
                    }
                }
                const updates = {};
                if (body.metadata !== undefined) {
                    updates.metadata = JSON.stringify(body.metadata);
                    updates.title = body.metadata.title || 'Sin título';
                }
                if (body.status !== undefined)
                    updates.status = body.status;
                if (body.version !== undefined)
                    updates.version = body.version;
                if (body.zoneConfig !== undefined)
                    updates.zone_config = body.zoneConfig != null ? JSON.stringify(body.zoneConfig) : null;
                if (body.entities !== undefined)
                    updates.entities = JSON.stringify(body.entities);
                if (body.scenes !== undefined)
                    updates.scenes = JSON.stringify(body.scenes);
                if (body.editorState !== undefined)
                    updates.editor_state = JSON.stringify(body.editorState);
                if (body.thumbnail !== undefined)
                    updates.thumbnail = body.thumbnail;
                if (Object.keys(updates).length === 0) {
                    res.status(400).json({ error: 'No fields to update' });
                    return;
                }
                const exercise = yield (0, database_1.updateExercise)(exerciseId, auth.userId, updates);
                if (!exercise) {
                    res.status(404).json({ error: 'Exercise not found' });
                    return;
                }
                res.json(this.dbToDocument(exercise));
            }
            catch (err) {
                console.error('Error in PATCH /api/exercises/:id:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield this.resolveUser(req, res);
            if (!auth)
                return;
            try {
                const deleted = yield (0, database_1.deleteExercise)(req.params.id, auth.userId);
                if (!deleted) {
                    res.status(404).json({ error: 'Exercise not found' });
                    return;
                }
                res.json({ success: true });
            }
            catch (err) {
                console.error('Error in DELETE /api/exercises/:id:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    // ── Helpers ──────────────────────────────────────────────────
    dbToDocument(row) {
        var _a;
        return {
            id: row.id,
            version: row.version,
            status: row.status,
            metadata: this.parseJson(row.metadata, {}),
            editorState: this.parseJson(row.editor_state, { camera: { x: 0, y: 0, zoom: 1, rotation: 0 } }),
            zoneConfig: this.parseJson(row.zone_config, null),
            entities: this.parseJson(row.entities, { items: [] }),
            scenes: this.parseJson(row.scenes, { count: 1, current: 0 }),
            thumbnail: (_a = row.thumbnail) !== null && _a !== void 0 ? _a : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    parseJson(raw, fallback) {
        if (!raw)
            return fallback;
        try {
            return JSON.parse(raw);
        }
        catch (_a) {
            return fallback;
        }
    }
}
exports.ExerciseController = ExerciseController;
