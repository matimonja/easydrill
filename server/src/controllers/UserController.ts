/**
 * UserController — Handles user profile and plan endpoints.
 *
 * GET  /api/me          — Get or create user profile + plan info
 * PATCH /api/me         — Update profile fields (role, name, bio)
 * PATCH /api/users/:id/plan — Admin: change user plan
 */

import { Request, Response } from 'express';
import { findUserBySub, createUser, updateUser, updateUserPlan, getPlan, getUserExerciseCount } from '../database';

export class UserController {

    /**
     * GET /api/me
     * Returns user profile, plan info, limits, and features.
     * Creates user on first login (upsert by cognito sub).
     */
    async getMe(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            let user = await findUserBySub(req.user.sub);

            // First login — create user
            if (!user) {
                user = await createUser({
                    cognitoSub: req.user.sub,
                    email: req.user.email,
                    displayName: req.user.name || '',
                    avatarUrl: req.user.picture || undefined,
                });
            }

            const plan = await getPlan(user.plan_id);
            const exerciseCount = await getUserExerciseCount(user.id);

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.display_name,
                    avatarUrl: user.avatar_url,
                    role: user.role,
                    bio: user.bio,
                    createdAt: user.created_at,
                },
                planId: user.plan_id,
                plan: plan ? {
                    id: plan.id,
                    displayName: plan.display_name,
                } : null,
                limits: plan ? {
                    max_exercises_saved: plan.max_exercises_saved,
                    max_bolsa_results: plan.max_bolsa_results,
                } : null,
                features: plan ? {
                    can_subscribe_bolsa_notifications: !!plan.can_subscribe_bolsa_notifications,
                    optimize_drill: !!plan.optimize_drill,
                } : null,
                usage: {
                    exercises_saved: exerciseCount,
                },
            });
        } catch (err: any) {
            console.error('Error in GET /api/me:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PATCH /api/me
     * Update user profile fields.
     */
    async updateMe(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const user = await findUserBySub(req.user.sub);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const { role, display_name, bio } = req.body;

            // Validate role if provided
            if (role !== undefined && !['entrenador', 'club'].includes(role)) {
                res.status(400).json({ error: 'Invalid role. Must be "entrenador" or "club".' });
                return;
            }

            const updated = await updateUser(user.id, {
                ...(role !== undefined && { role }),
                ...(display_name !== undefined && { display_name }),
                ...(bio !== undefined && { bio }),
            });

            if (!updated) {
                res.status(500).json({ error: 'Failed to update user' });
                return;
            }

            res.json({
                user: {
                    id: updated.id,
                    email: updated.email,
                    displayName: updated.display_name,
                    avatarUrl: updated.avatar_url,
                    role: updated.role,
                    bio: updated.bio,
                },
            });
        } catch (err: any) {
            console.error('Error in PATCH /api/me:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PATCH /api/users/:id/plan
     * Admin endpoint: change a user's plan.
     */
    async updatePlan(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { planId } = req.body;

            if (!planId) {
                res.status(400).json({ error: 'planId is required' });
                return;
            }

            const plan = await getPlan(planId);
            if (!plan) {
                res.status(400).json({ error: `Plan "${planId}" not found` });
                return;
            }

            const updated = await updateUserPlan(id, planId);
            if (!updated) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({
                user: {
                    id: updated.id,
                    planId: updated.plan_id,
                },
                message: `Plan updated to "${planId}"`,
            });
        } catch (err: any) {
            console.error('Error in PATCH /api/users/:id/plan:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
