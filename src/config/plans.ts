/**
 * Plans Configuration
 *
 * Defines plan IDs, limits per plan, and feature flags per plan.
 * This is the single source of truth for plan-based access control on the frontend.
 * The backend mirrors this config in /api/me response.
 */

// ─── Plan IDs ────────────────────────────────────────────────────

export const PLAN_IDS = {
    FREE: 'free',
    BASIC: 'basic',
    PRO: 'pro',
    TEAM: 'team',
} as const;

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS];

// ─── Plan Display Names ─────────────────────────────────────────

export const PLAN_NAMES: Record<PlanId, string> = {
    free: 'Gratuito',
    basic: 'Básico',
    pro: 'Pro',
    team: 'Equipo',
};

// ─── Limits ──────────────────────────────────────────────────────

export interface PlanLimits {
    max_exercises_saved: number;
    max_bolsa_results: number;
}

const LIMITS_BY_PLAN: Record<PlanId, PlanLimits> = {
    free: {
        max_exercises_saved: 5,
        max_bolsa_results: 10,
    },
    basic: {
        max_exercises_saved: 25,
        max_bolsa_results: 50,
    },
    pro: {
        max_exercises_saved: 100,
        max_bolsa_results: -1, // -1 = unlimited
    },
    team: {
        max_exercises_saved: -1,
        max_bolsa_results: -1,
    },
};

// ─── Feature Flags ───────────────────────────────────────────────

export interface PlanFeatures {
    can_subscribe_bolsa_notifications: boolean;
    optimize_drill: boolean;
}

const FEATURES_BY_PLAN: Record<PlanId, PlanFeatures> = {
    free: {
        can_subscribe_bolsa_notifications: false,
        optimize_drill: false,
    },
    basic: {
        can_subscribe_bolsa_notifications: false,
        optimize_drill: true,
    },
    pro: {
        can_subscribe_bolsa_notifications: true,
        optimize_drill: true,
    },
    team: {
        can_subscribe_bolsa_notifications: true,
        optimize_drill: true,
    },
};

// ─── Public Functions ────────────────────────────────────────────

/**
 * Get the limits for a given plan.
 */
export function getLimits(planId: PlanId): PlanLimits {
    return LIMITS_BY_PLAN[planId] || LIMITS_BY_PLAN.free;
}

/**
 * Check if a plan has a specific feature enabled.
 */
export function can(planId: PlanId, feature: keyof PlanFeatures): boolean {
    const features = FEATURES_BY_PLAN[planId] || FEATURES_BY_PLAN.free;
    return features[feature] ?? false;
}

/**
 * Check if the current usage is within the limit for a plan.
 * Returns true if within limit, false if exceeded.
 * A limit of -1 means unlimited.
 */
export function isWithinLimit(
    planId: PlanId,
    limitKey: keyof PlanLimits,
    currentCount: number
): boolean {
    const limits = getLimits(planId);
    const max = limits[limitKey];
    if (max === -1) return true; // unlimited
    return currentCount < max;
}

/**
 * Get the display name for a plan.
 */
export function getPlanName(planId: PlanId): string {
    return PLAN_NAMES[planId] || planId;
}
