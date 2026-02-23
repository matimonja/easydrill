/**
 * Exercise Persistence Types
 *
 * Defines the serialization format for the complete exercise document.
 * These types are used by ExerciseStorage and EntitySerializer.
 */

import { ExerciseZoneConfig } from '../core/ExerciseZoneConfig';

// ─── Reusable Primitives ─────────────────────────────────────────

export type ActionType = 'run' | 'dribble' | 'pass' | 'shoot' | 'tackle' | 'turn';
export type ShapeKind = 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'freehand';
export type ConeGroupShape = 'line' | 'freehand' | 'rectangle' | 'ellipse' | 'triangle';
export type StrokeType = 'solid' | 'dashed' | 'dotted';
export type MarkerType = 'none' | 'arrow';

// ─── Exercise Document (Root) ────────────────────────────────────

export interface ExerciseDocument {
    id: string;
    version: number;
    metadata: ExerciseMetadata;
    editorState: EditorState;
    zoneConfig: ExerciseZoneConfig | null;
    entities: SerializedEntities;
    scenes: SceneState;
    createdAt: string;
    updatedAt: string;
    status: 'draft' | 'complete';
}

// ─── Metadata ────────────────────────────────────────────────────

export interface ExerciseMetadata {
    title: string;
    objective?: string;
    duration?: string;
    players?: string;
    fieldSize?: string;
    category?: string;
    description?: string;
    materials?: string[];
    coachingPoints?: string[];
    variantsEasier?: string[];
    variantsHarder?: string[];
    successCriteria?: string;
    tags?: { label: string; color: string }[];
}

// ─── Editor State ────────────────────────────────────────────────

export interface EditorState {
    camera: {
        x: number;
        y: number;
        zoom: number;
        rotation: number;
    };
}

// ─── Scenes ──────────────────────────────────────────────────────

export interface SceneState {
    count: number;
    current: number;
}

// ─── Serialized Entities ─────────────────────────────────────────

export interface SerializedEntities {
    items: SerializedEntity[];
}

export type SerializedEntity =
    | SerializedPlayer
    | SerializedShape
    | SerializedCone
    | SerializedConeGroup
    | SerializedBall
    | SerializedGoal;

// ─── Player ──────────────────────────────────────────────────────

export interface SerializedPlayer {
    type: 'player';
    id: string;
    x: number;
    y: number;
    initialX: number;
    initialY: number;
    number: string;
    color: string;
    team: string;
    hasBall: boolean;
    ballColor?: string;
    description: string;
    rotation: number;
    actions: SerializedAction[];
}

// ─── Action ──────────────────────────────────────────────────────

export interface SerializedAction {
    id: string;
    type: ActionType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    sceneIndex: number;
    pathType: 'straight' | 'freehand';
    points: { x: number; y: number }[];
    config: { preEvent: string; postEvent: string };
    speed?: number | null;
    waitBefore?: number;
    gesture?: string;
    dribbleType?: string;
    style?: 'straight' | 'zigzag';
    radius?: number;
    angle?: number;
}

// ─── Shape ───────────────────────────────────────────────────────

export interface SerializedShape {
    type: 'shape';
    shapeKind: ShapeKind;
    id: string;
    x: number;
    y: number;
    rotation: number;
    color: string;
    lineWidth: number;
    strokeType: StrokeType;
    hasFill: boolean;
    fillOpacity: number;
    // Rectangle
    width?: number;
    height?: number;
    // Ellipse
    radiusX?: number;
    radiusY?: number;
    // Triangle / Freehand
    points?: { x: number; y: number }[];
    // Line
    endX?: number;
    endY?: number;
    startMarker?: MarkerType;
    endMarker?: MarkerType;
    // Freehand
    smoothingFactor?: number;
}

// ─── Exercise Objects ────────────────────────────────────────────

export interface SerializedCone {
    type: 'cone';
    id: string;
    x: number;
    y: number;
    color: string;
    height: number;
}

export interface SerializedConeGroup {
    type: 'coneGroup';
    id: string;
    x: number;
    y: number;
    rotation: number;
    shapeType: ConeGroupShape;
    coneDistance: number;
    showLines: boolean;
    groupColor: string;
    groupHeight: number;
    smoothingFactor: number;
    color: string;
    lineWidth: number;
    strokeType: StrokeType;
    hasFill: boolean;
    fillOpacity: number;
    width?: number;
    height?: number;
    radiusX?: number;
    radiusY?: number;
    points?: { x: number; y: number }[];
    endX?: number;
    endY?: number;
    coneColors?: Record<number, string>;
}

export interface SerializedBall {
    type: 'ball';
    id: string;
    x: number;
    y: number;
    color: string;
    isGroup: boolean;
}

export interface SerializedGoal {
    type: 'goal';
    id: string;
    x: number;
    y: number;
    rotation: number;
    color: string;
    width: number;
    height: number;
}

// ─── Exercise List Item (for listings) ───────────────────────────

export interface ExerciseListItem {
    id: string;
    title: string;
    status: 'draft' | 'complete';
    updatedAt: string;
    createdAt: string;
    thumbnail?: string;
    tags?: { label: string; color: string }[];
}
