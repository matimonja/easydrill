"use strict";
/**
 * UserController — Handles user profile and plan endpoints.
 *
 * GET  /api/me          — Get or create user profile + plan info
 * PATCH /api/me         — Update profile fields (role, name, bio)
 * PATCH /api/users/:id/plan — Admin: change user plan
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
exports.UserController = void 0;
const database_1 = require("../database");
class UserController {
    /**
     * GET /api/me
     * Returns user profile, plan info, limits, and features.
     * Creates user on first login (upsert by cognito sub).
     */
    getMe(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }
            try {
                let user = yield (0, database_1.findUserBySub)(req.user.sub);
                // First login — create user
                if (!user) {
                    user = yield (0, database_1.createUser)({
                        cognitoSub: req.user.sub,
                        email: req.user.email,
                        displayName: req.user.name || '',
                        avatarUrl: req.user.picture || undefined,
                    });
                }
                const plan = yield (0, database_1.getPlan)(user.plan_id);
                const exerciseCount = yield (0, database_1.getUserExerciseCount)(user.id);
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
            }
            catch (err) {
                console.error('Error in GET /api/me:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    /**
     * PATCH /api/me
     * Update user profile fields.
     */
    updateMe(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }
            try {
                const user = yield (0, database_1.findUserBySub)(req.user.sub);
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
                const updated = yield (0, database_1.updateUser)(user.id, Object.assign(Object.assign(Object.assign({}, (role !== undefined && { role })), (display_name !== undefined && { display_name })), (bio !== undefined && { bio })));
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
            }
            catch (err) {
                console.error('Error in PATCH /api/me:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    /**
     * PATCH /api/users/:id/plan
     * Admin endpoint: change a user's plan.
     */
    updatePlan(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { planId } = req.body;
                if (!planId) {
                    res.status(400).json({ error: 'planId is required' });
                    return;
                }
                const plan = yield (0, database_1.getPlan)(planId);
                if (!plan) {
                    res.status(400).json({ error: `Plan "${planId}" not found` });
                    return;
                }
                const updated = yield (0, database_1.updateUserPlan)(id, planId);
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
            }
            catch (err) {
                console.error('Error in PATCH /api/users/:id/plan:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
}
exports.UserController = UserController;
