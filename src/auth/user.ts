/**
 * User State Module
 *
 * Manages the current user's profile, plan, and auth state in memory.
 * Syncs with the backend via GET /api/me on login.
 * Provides helpers for authenticated API calls.
 */

import { getIdToken, signOut as cognitoSignOut, isCognitoConfigured } from './client';
import type { PlanId, PlanLimits, PlanFeatures } from '../config/plans';

// ─── Types ───────────────────────────────────────────────────────

export interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: 'entrenador' | 'club';
    bio: string | null;
    createdAt: string;
}

export interface UserState {
    user: UserProfile;
    planId: PlanId;
    plan: { id: string; displayName: string } | null;
    limits: PlanLimits | null;
    features: PlanFeatures | null;
    usage: { exercises_saved: number };
}

// ─── In-memory State ─────────────────────────────────────────────

let currentState: UserState | null = null;
let stateListeners: Array<(state: UserState | null) => void> = [];

// ─── Public API ──────────────────────────────────────────────────

/**
 * Sync profile from backend. Call after login and on page load.
 * Returns the user state, or null if not authenticated.
 */
export async function syncProfile(): Promise<UserState | null> {
    const token = await getIdToken();
    if (!token) {
        currentState = null;
        notifyListeners();
        return null;
    }

    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
            if (res.status === 401) {
                currentState = null;
                notifyListeners();
                return null;
            }
            throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        currentState = data as UserState;
        notifyListeners();
        return currentState;
    } catch (err) {
        console.error('Failed to sync profile:', err);
        currentState = null;
        notifyListeners();
        return null;
    }
}

/**
 * Get the current user profile (from memory).
 */
export function getProfile(): UserProfile | null {
    return currentState?.user ?? null;
}

/**
 * Get the current plan ID.
 */
export function getPlanId(): PlanId {
    return currentState?.planId ?? 'free';
}

/**
 * Get the full user state.
 */
export function getUserState(): UserState | null {
    return currentState;
}

/**
 * Check if the user is currently logged in.
 */
export function isLoggedIn(): boolean {
    return currentState !== null;
}

/**
 * Log out: clear Cognito session + local state.
 */
export function logout(): void {
    cognitoSignOut();
    currentState = null;
    notifyListeners();
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(listener: (state: UserState | null) => void): () => void {
    stateListeners.push(listener);
    return () => {
        stateListeners = stateListeners.filter(l => l !== listener);
    };
}

// ─── Authenticated Fetch Helper ──────────────────────────────────

/**
 * Fetch wrapper that automatically includes the Authorization header.
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = await getIdToken();
    const headers = new Headers(options.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
}

// ─── Init: Try to restore session on page load ───────────────────

/**
 * Initialize auth state. Call once on page load.
 * If user has a valid session, syncs profile from backend.
 */
export async function initAuth(): Promise<UserState | null> {
    if (!isCognitoConfigured()) {
        // Cognito not configured — check if we have stored OAuth tokens
        const stored = localStorage.getItem('easydrill-auth-tokens');
        if (stored) {
            return syncProfile();
        }
        return null;
    }

    return syncProfile();
}

// ─── Internal ────────────────────────────────────────────────────

function notifyListeners(): void {
    for (const listener of stateListeners) {
        try {
            listener(currentState);
        } catch (err) {
            console.error('Auth state listener error:', err);
        }
    }
}
