/**
 * ExerciseController — CRUD endpoints for exercises.
 *
 * POST   /api/exercises          — Create (with plan limit check)
 * GET    /api/exercises          — List (lightweight: no entities)
 * GET    /api/exercises/:id      — Load full document
 * PATCH  /api/exercises/:id      — Update (full or metadata-only, with optimistic locking)
 * DELETE /api/exercises/:id      — Delete
 */

import { Request, Response } from 'express';
import {
    findUserBySub,
    getPlan,
    getUserExerciseCount,
    insertExercise,
    updateExercise,
    getExercise,
    getExercisesByUser,
    deleteExercise,
    getExerciseVersion,
} from '../database';

export class ExerciseController {

    private async resolveUser(req: Request, res: Response): Promise<{ userId: string } | null> {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return null;
        }
        const user = await findUserBySub(req.user.sub);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return null;
        }
        return { userId: user.id };
    }

    async create(req: Request, res: Response): Promise<void> {
        const auth = await this.resolveUser(req, res);
        if (!auth) return;

        try {
            const user = await findUserBySub(req.user!.sub);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const plan = await getPlan(user.plan_id);
            const currentCount = await getUserExerciseCount(auth.userId);

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

            const metadata = body.metadata ?? {};
            const title = metadata.title || body.title || 'Sin título';

            const exercise = await insertExercise(auth.userId, {
                id: body.id,
                title,
                status: body.status || 'draft',
                version: body.version || 1,
                metadata: JSON.stringify(metadata),
                zone_config: body.zoneConfig != null ? JSON.stringify(body.zoneConfig) : null,
                entities: body.entities ? JSON.stringify(body.entities) : '{"items":[]}',
                scenes: body.scenes ? JSON.stringify(body.scenes) : '{"count":1,"current":0}',
                editor_state: body.editorState ? JSON.stringify(body.editorState) : '{"camera":{"x":0,"y":0,"zoom":1,"rotation":0}}',
                thumbnail: body.thumbnail ?? null,
                created_at: body.createdAt,
                updated_at: body.updatedAt,
            });

            res.status(201).json(this.dbToDocument(exercise));
        } catch (err: any) {
            const isUniqueViolation =
                err.message?.includes('UNIQUE constraint failed') ||
                (err as any).code === '23505'; // PostgreSQL unique_violation
            if (isUniqueViolation) {
                res.status(409).json({ error: 'Exercise with this id already exists' });
                return;
            }
            console.error('Error in POST /api/exercises:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async list(req: Request, res: Response): Promise<void> {
        const auth = await this.resolveUser(req, res);
        if (!auth) return;

        try {
            const rows = await getExercisesByUser(auth.userId);
            const items = rows.map((row) => {
                const meta = this.parseJson(row.metadata, {});
                return {
                    id: row.id,
                    title: row.title,
                    status: row.status,
                    updatedAt: row.updated_at,
                    createdAt: row.created_at,
                    thumbnail: row.thumbnail ?? undefined,
                    tags: meta.tags ?? undefined,
                };
            });
            res.json(items);
        } catch (err: any) {
            console.error('Error in GET /api/exercises:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getOne(req: Request, res: Response): Promise<void> {
        const auth = await this.resolveUser(req, res);
        if (!auth) return;

        try {
            const exercise = await getExercise(req.params.id, auth.userId);
            if (!exercise) {
                res.status(404).json({ error: 'Exercise not found' });
                return;
            }
            res.json(this.dbToDocument(exercise));
        } catch (err: any) {
            console.error('Error in GET /api/exercises/:id:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        const auth = await this.resolveUser(req, res);
        if (!auth) return;

        try {
            const exerciseId = req.params.id;
            const body = req.body;

            // Optimistic locking: reject if client version < stored version
            if (body.version != null) {
                const storedVersion = await getExerciseVersion(exerciseId, auth.userId);
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

            const updates: any = {};

            if (body.metadata !== undefined) {
                updates.metadata = JSON.stringify(body.metadata);
                updates.title = body.metadata.title || 'Sin título';
            }
            if (body.status !== undefined) updates.status = body.status;
            if (body.version !== undefined) updates.version = body.version;
            if (body.zoneConfig !== undefined) updates.zone_config = body.zoneConfig != null ? JSON.stringify(body.zoneConfig) : null;
            if (body.entities !== undefined) updates.entities = JSON.stringify(body.entities);
            if (body.scenes !== undefined) updates.scenes = JSON.stringify(body.scenes);
            if (body.editorState !== undefined) updates.editor_state = JSON.stringify(body.editorState);
            if (body.thumbnail !== undefined) updates.thumbnail = body.thumbnail;

            if (Object.keys(updates).length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            const exercise = await updateExercise(exerciseId, auth.userId, updates);
            if (!exercise) {
                res.status(404).json({ error: 'Exercise not found' });
                return;
            }

            res.json(this.dbToDocument(exercise));
        } catch (err: any) {
            console.error('Error in PATCH /api/exercises/:id:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async remove(req: Request, res: Response): Promise<void> {
        const auth = await this.resolveUser(req, res);
        if (!auth) return;

        try {
            const deleted = await deleteExercise(req.params.id, auth.userId);
            if (!deleted) {
                res.status(404).json({ error: 'Exercise not found' });
                return;
            }
            res.json({ success: true });
        } catch (err: any) {
            console.error('Error in DELETE /api/exercises/:id:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ── Helpers ──────────────────────────────────────────────────

    private dbToDocument(row: any): any {
        return {
            id: row.id,
            version: row.version,
            status: row.status,
            metadata: this.parseJson(row.metadata, {}),
            editorState: this.parseJson(row.editor_state, { camera: { x: 0, y: 0, zoom: 1, rotation: 0 } }),
            zoneConfig: this.parseJson(row.zone_config, null),
            entities: this.parseJson(row.entities, { items: [] }),
            scenes: this.parseJson(row.scenes, { count: 1, current: 0 }),
            thumbnail: row.thumbnail ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private parseJson(raw: string | null, fallback: any): any {
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }
}
