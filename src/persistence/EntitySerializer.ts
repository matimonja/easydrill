/**
 * EntitySerializer — Serialize/Deserialize entities for persistence.
 *
 * Each entity type has a pair of functions:
 *   serializeX(entity) → SerializedX
 *   deserializeX(data) → Entity
 *
 * The main entry points are serializeEntity() and deserializeEntity().
 */

import { Entity } from '../core/Interfaces';
import { Player } from '../entities/Player';
import {
    BaseAction, RunAction, PassAction, DribbleAction,
    ShootAction, TackleAction, TurnAction
} from '../entities/Action';
import {
    BaseShape, RectangleShape, EllipseShape, TriangleShape,
    LineShape, FreehandShape
} from '../entities/Shape';
import { Cone, Ball, ConeGroup } from '../entities/ExerciseObjects';
import { Goal } from '../entities/Goal';

import type {
    SerializedEntity, SerializedPlayer, SerializedAction,
    SerializedShape, SerializedCone, SerializedConeGroup,
    SerializedBall, SerializedGoal
} from './types';

// ─── Main Entry Points ───────────────────────────────────────────

export function serializeEntity(entity: Entity): SerializedEntity | null {
    if (entity instanceof Player) return serializePlayer(entity);
    if (entity instanceof ConeGroup) return serializeConeGroup(entity);
    if (entity instanceof Goal) return serializeGoal(entity);
    if (entity instanceof RectangleShape) return serializeShape(entity, 'rectangle');
    if (entity instanceof EllipseShape) return serializeShape(entity, 'ellipse');
    if (entity instanceof TriangleShape) return serializeShape(entity, 'triangle');
    if (entity instanceof LineShape) return serializeShape(entity, 'line');
    if (entity instanceof FreehandShape) return serializeShape(entity, 'freehand');
    if (entity instanceof Cone) return serializeCone(entity);
    if (entity instanceof Ball) return serializeBall(entity);
    // Unknown entity type
    console.warn('EntitySerializer: unknown entity type, skipping', entity);
    return null;
}

export function deserializeEntity(data: SerializedEntity): Entity | null {
    switch (data.type) {
        case 'player': return deserializePlayer(data);
        case 'shape': return deserializeShape(data);
        case 'cone': return deserializeCone(data);
        case 'coneGroup': return deserializeConeGroup(data);
        case 'ball': return deserializeBall(data);
        case 'goal': return deserializeGoal(data);
        default:
            console.warn('EntitySerializer: unknown serialized type, skipping', data);
            return null;
    }
}

// ─── Player ──────────────────────────────────────────────────────

function serializePlayer(player: Player): SerializedPlayer {
    return {
        type: 'player',
        id: player.id,
        x: player.x,
        y: player.y,
        initialX: player.initialX,
        initialY: player.initialY,
        number: player.number,
        color: player.color,
        team: player.team,
        hasBall: player.hasBall,
        ballColor: player.ballColor,
        description: player.description,
        rotation: player.rotation,
        actions: player.actions.map(serializeAction),
    };
}

function deserializePlayer(data: SerializedPlayer): Player {
    const player = new Player(data.initialX, data.initialY, data.number, data.color);
    player.id = data.id;
    player.x = data.x;
    player.y = data.y;
    player.initialX = data.initialX;
    player.initialY = data.initialY;
    player.team = data.team;
    player.hasBall = data.hasBall;
    if (data.ballColor !== undefined) player.ballColor = data.ballColor;
    player.description = data.description || '';
    player.rotation = data.rotation || 0;
    player.actions = data.actions.map(a => deserializeAction(a, player));
    return player;
}

// ─── Action ──────────────────────────────────────────────────────

function serializeAction(action: BaseAction): SerializedAction {
    const data: SerializedAction = {
        id: action.id,
        type: action.type,
        startX: action.startX,
        startY: action.startY,
        endX: action.endX,
        endY: action.endY,
        sceneIndex: action.sceneIndex,
        pathType: action.pathType,
        points: action.points.map(p => ({ x: p.x, y: p.y })),
        config: { ...action.config },
        speed: action.speed,
        waitBefore: action.waitBefore,
    };

    // Type-specific properties
    if (action instanceof PassAction || action instanceof ShootAction) {
        data.gesture = (action as any).gesture;
    }
    if (action instanceof DribbleAction) {
        data.dribbleType = action.dribbleType;
        data.style = action.style;
    }
    if (action instanceof TackleAction) {
        data.radius = action.radius;
    }
    if (action instanceof TurnAction) {
        data.angle = action.angle;
    }

    return data;
}

function deserializeAction(data: SerializedAction, owner: Player): BaseAction {
    let action: BaseAction;

    switch (data.type) {
        case 'run':
            action = new RunAction(data.startX, data.startY, data.endX, data.endY);
            break;
        case 'pass': {
            const a = new PassAction(data.startX, data.startY, data.endX, data.endY);
            if (data.gesture !== undefined) a.gesture = data.gesture;
            action = a;
            break;
        }
        case 'dribble': {
            const a = new DribbleAction(data.startX, data.startY, data.endX, data.endY);
            if (data.dribbleType !== undefined) a.dribbleType = data.dribbleType;
            if (data.style !== undefined) a.style = data.style;
            action = a;
            break;
        }
        case 'shoot': {
            const a = new ShootAction(data.startX, data.startY, data.endX, data.endY);
            if (data.gesture !== undefined) a.gesture = data.gesture;
            action = a;
            break;
        }
        case 'tackle': {
            const a = new TackleAction(data.startX, data.startY, data.endX, data.endY);
            if (data.radius !== undefined) a.radius = data.radius;
            action = a;
            break;
        }
        case 'turn': {
            const a = new TurnAction(data.startX, data.startY, data.endX, data.endY);
            if (data.angle !== undefined) a.angle = data.angle;
            action = a;
            break;
        }
        default:
            action = new RunAction(data.startX, data.startY, data.endX, data.endY);
    }

    action.id = data.id;
    action.sceneIndex = data.sceneIndex || 0;
    action.pathType = data.pathType || 'straight';
    action.points = (data.points || []).map(p => ({ x: p.x, y: p.y }));
    action.config = data.config || { preEvent: 'auto', postEvent: 'auto' };
    if (data.speed !== undefined) action.speed = data.speed;
    if (data.waitBefore !== undefined) action.waitBefore = data.waitBefore;
    action.owner = owner;

    return action;
}

// ─── Shape ───────────────────────────────────────────────────────

function serializeShape(shape: BaseShape, shapeKind: string): SerializedShape {
    const data: SerializedShape = {
        type: 'shape',
        shapeKind: shapeKind as any,
        id: shape.id,
        x: shape.x,
        y: shape.y,
        rotation: shape.rotation,
        color: shape.color,
        lineWidth: shape.lineWidth,
        strokeType: shape.strokeType,
        hasFill: shape.hasFill,
        fillOpacity: shape.fillOpacity,
    };

    if (shape instanceof RectangleShape) {
        data.width = shape.width;
        data.height = shape.height;
    } else if (shape instanceof EllipseShape) {
        data.radiusX = shape.radiusX;
        data.radiusY = shape.radiusY;
    } else if (shape instanceof TriangleShape) {
        data.points = shape.points.map(p => ({ x: p.x, y: p.y }));
    } else if (shape instanceof LineShape) {
        data.endX = shape.endX;
        data.endY = shape.endY;
        data.startMarker = shape.startMarker;
        data.endMarker = shape.endMarker;
    } else if (shape instanceof FreehandShape) {
        data.points = shape.points.map(p => ({ x: p.x, y: p.y }));
        data.smoothingFactor = shape.smoothingFactor;
    }

    return data;
}

function deserializeShape(data: SerializedShape): BaseShape {
    let shape: BaseShape;

    switch (data.shapeKind) {
        case 'rectangle': {
            const s = new RectangleShape(data.x, data.y, data.color);
            s.width = data.width || 0;
            s.height = data.height || 0;
            shape = s;
            break;
        }
        case 'ellipse': {
            const s = new EllipseShape(data.x, data.y, data.color);
            s.radiusX = data.radiusX || 0;
            s.radiusY = data.radiusY || 0;
            shape = s;
            break;
        }
        case 'triangle': {
            const s = new TriangleShape(data.x, data.y, data.color);
            if (data.points) s.points = data.points.map(p => ({ x: p.x, y: p.y }));
            shape = s;
            break;
        }
        case 'line': {
            const s = new LineShape(data.x, data.y, data.color);
            s.endX = data.endX || 0;
            s.endY = data.endY || 0;
            s.startMarker = data.startMarker || 'none';
            s.endMarker = data.endMarker || 'none';
            shape = s;
            break;
        }
        case 'freehand': {
            const s = new FreehandShape(data.x, data.y, data.color);
            if (data.points) s.points = data.points.map(p => ({ x: p.x, y: p.y }));
            if (data.smoothingFactor !== undefined) s.smoothingFactor = data.smoothingFactor;
            shape = s;
            break;
        }
        default:
            shape = new RectangleShape(data.x, data.y, data.color);
    }

    shape.id = data.id;
    shape.rotation = data.rotation || 0;
    shape.lineWidth = data.lineWidth ?? 3;
    shape.strokeType = data.strokeType || 'solid';
    shape.hasFill = data.hasFill ?? true;
    shape.fillOpacity = data.fillOpacity ?? 0.2;

    return shape;
}

// ─── Cone ────────────────────────────────────────────────────────

function serializeCone(cone: Cone): SerializedCone {
    return {
        type: 'cone',
        id: cone.id,
        x: cone.x,
        y: cone.y,
        color: cone.color,
        height: cone.height,
    };
}

function deserializeCone(data: SerializedCone): Cone {
    const cone = new Cone(data.x, data.y, data.color, data.height);
    cone.id = data.id;
    return cone;
}

// ─── ConeGroup ───────────────────────────────────────────────────

function serializeConeGroup(group: ConeGroup): SerializedConeGroup {
    const data: SerializedConeGroup = {
        type: 'coneGroup',
        id: group.id,
        x: group.x,
        y: group.y,
        rotation: group.rotation,
        shapeType: group.shapeType,
        coneDistance: group.coneDistance,
        showLines: group.showLines,
        groupColor: group.groupColor,
        groupHeight: group.groupHeight,
        smoothingFactor: group.smoothingFactor,
        color: group.color,
        lineWidth: group.lineWidth,
        strokeType: group.strokeType,
        hasFill: group.hasFill,
        fillOpacity: group.fillOpacity,
    };

    // Geometry depends on shape type
    if (group.shapeType === 'rectangle') {
        data.width = group.width;
        data.height = group.height;
    } else if (group.shapeType === 'ellipse') {
        data.radiusX = group.radiusX;
        data.radiusY = group.radiusY;
    } else if (group.shapeType === 'line') {
        data.endX = group.endX;
        data.endY = group.endY;
    } else if (group.shapeType === 'triangle' || group.shapeType === 'freehand') {
        data.points = group.points.map(p => ({ x: p.x, y: p.y }));
    }

    // Cone colors
    if (group.coneColors.size > 0) {
        const colors: Record<number, string> = {};
        group.coneColors.forEach((color, idx) => { colors[idx] = color; });
        data.coneColors = colors;
    }

    return data;
}

function deserializeConeGroup(data: SerializedConeGroup): ConeGroup {
    const group = new ConeGroup(data.shapeType, data.x, data.y);
    group.id = data.id;
    group.rotation = data.rotation || 0;
    group.coneDistance = data.coneDistance ?? 50;
    group.showLines = data.showLines ?? true;
    group.groupColor = data.groupColor || '#f97316';
    group.groupHeight = data.groupHeight ?? 10;
    group.smoothingFactor = data.smoothingFactor ?? 5;
    group.color = data.color || 'rgba(255,255,255,0.5)';
    group.lineWidth = data.lineWidth ?? 3;
    group.strokeType = data.strokeType || 'solid';
    group.hasFill = data.hasFill ?? true;
    group.fillOpacity = data.fillOpacity ?? 0.2;

    // Geometry
    if (data.shapeType === 'rectangle') {
        group.width = data.width || 0;
        group.height = data.height || 0;
    } else if (data.shapeType === 'ellipse') {
        group.radiusX = data.radiusX || 0;
        group.radiusY = data.radiusY || 0;
    } else if (data.shapeType === 'line') {
        group.endX = data.endX || 0;
        group.endY = data.endY || 0;
    } else if (data.shapeType === 'triangle' || data.shapeType === 'freehand') {
        if (data.points) group.points = data.points.map(p => ({ x: p.x, y: p.y }));
    }

    // Cone colors
    if (data.coneColors) {
        for (const [idx, color] of Object.entries(data.coneColors)) {
            group.coneColors.set(Number(idx), color);
        }
    }

    return group;
}

// ─── Ball ────────────────────────────────────────────────────────

function serializeBall(ball: Ball): SerializedBall {
    return {
        type: 'ball',
        id: ball.id,
        x: ball.x,
        y: ball.y,
        color: ball.color,
        isGroup: ball.isGroup,
    };
}

function deserializeBall(data: SerializedBall): Ball {
    const ball = new Ball(data.x, data.y, data.color);
    ball.id = data.id;
    ball.isGroup = data.isGroup || false;
    return ball;
}

// ─── Goal ────────────────────────────────────────────────────────

function serializeGoal(goal: Goal): SerializedGoal {
    return {
        type: 'goal',
        id: goal.id,
        x: goal.x,
        y: goal.y,
        rotation: goal.rotation,
        color: goal.color,
        width: goal.width,
        height: goal.height,
    };
}

function deserializeGoal(data: SerializedGoal): Goal {
    const goal = new Goal(data.x, data.y);
    goal.id = data.id;
    goal.rotation = data.rotation || 0;
    goal.color = data.color || '#ffffff';
    goal.width = data.width || 100;
    goal.height = data.height || 40;
    return goal;
}
