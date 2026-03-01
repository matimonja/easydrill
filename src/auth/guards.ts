/**
 * Auth Guards — Helpers for checking plan limits and features.
 *
 * Use these before performing plan-restricted actions.
 */

import { getPlanId, getUserState } from './user';
import { isWithinLimit, can, getPlanName, type PlanLimits, type PlanFeatures } from '../config/plans';
import { ExerciseStorage } from '../persistence/ExerciseStorage';

// ─── Exercise Limit Check ────────────────────────────────────────

/**
 * Check if the user can save another exercise.
 * Uses the higher of server count or local count to avoid desyncs.
 * Returns { allowed: true } or { allowed: false, message: string }.
 */
export function checkExerciseLimit(): { allowed: boolean; message?: string } {
    const state = getUserState();
    if (!state) {
        return { allowed: true };
    }

    const planId = getPlanId();
    const serverCount = state.usage?.exercises_saved ?? 0;
    const storage = new ExerciseStorage();
    const localCount = storage.getExerciseList().length;
    const currentCount = Math.max(serverCount, localCount);

    if (isWithinLimit(planId, 'max_exercises_saved', currentCount)) {
        return { allowed: true };
    }

    return {
        allowed: false,
        message: `Has alcanzado el límite de ejercicios guardados para tu plan (${getPlanName(planId)}). Actualizá tu plan para guardar más.`,
    };
}

// ─── Feature Check ───────────────────────────────────────────────

/**
 * Check if a specific feature is available for the current user's plan.
 * Returns { allowed: true } or { allowed: false, message: string }.
 */
export function checkFeature(
    feature: keyof PlanFeatures,
    featureLabel?: string
): { allowed: boolean; message?: string } {
    const planId = getPlanId();

    if (can(planId, feature)) {
        return { allowed: true };
    }

    const label = featureLabel || feature;
    return {
        allowed: false,
        message: `"${label}" no está disponible en tu plan (${getPlanName(planId)}). Actualizá para acceder a esta funcionalidad.`,
    };
}

// ─── Bolsa Results Limit ─────────────────────────────────────────

/**
 * Get the max number of bolsa results the current user can see.
 * Returns -1 for unlimited.
 */
export function getMaxBolsaResults(): number {
    const state = getUserState();
    if (!state?.limits) return -1; // Not logged in, show all
    return state.limits.max_bolsa_results;
}
