/**
 * Configuration for the exercise zone selection.
 * Defines which area of the field the user wants to work in.
 */

export type ZonePreset = 'full' | 'half' | 'quarter' | 'area' | 'custom';

export interface ZoneRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface ExerciseZoneConfig {
    preset: ZonePreset;
    /** Rectangle in world coordinates (Field centered at 0,0) */
    zone: ZoneRect;
    /** If true, rotate the camera 90° to better fit a tall zone on a wide screen */
    rotate?: boolean;
}

/** Field dimensions from Field.ts defaults */
const FIELD_W = 914;
const FIELD_H = 550;
const HALF_W = FIELD_W / 2;   // 457
const HALF_H = FIELD_H / 2;   // 275
const DIST_25M = 229;         // Distance from endline to 25m line
const DASHED_R = 196.3;       // Dashed striking circle radius
const GOAL_POST = 18.3;       // Goal post half-distance

/** Preset zone definitions in world coordinates */
export const ZONE_PRESETS: Record<Exclude<ZonePreset, 'custom'>, ZoneRect> = {
    full: { x: -HALF_W, y: -HALF_H, w: FIELD_W, h: FIELD_H },
    half: { x: 0, y: -HALF_H, w: HALF_W, h: FIELD_H },
    quarter: { x: HALF_W - DIST_25M, y: -HALF_H, w: DIST_25M, h: FIELD_H },
    area: { x: HALF_W - DASHED_R, y: -(GOAL_POST + DASHED_R), w: DASHED_R, h: (GOAL_POST + DASHED_R) * 2 },
};

/** Storage key for passing config between pages */
export const ZONE_CONFIG_KEY = 'exerciseZoneConfig';

/** Save config to sessionStorage and navigate to editor */
export function saveZoneConfig(config: ExerciseZoneConfig): void {
    sessionStorage.setItem(ZONE_CONFIG_KEY, JSON.stringify(config));
}

/** Read config from sessionStorage (returns null if none) */
export function loadZoneConfig(): ExerciseZoneConfig | null {
    const raw = sessionStorage.getItem(ZONE_CONFIG_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as ExerciseZoneConfig;
    } catch {
        return null;
    }
}
