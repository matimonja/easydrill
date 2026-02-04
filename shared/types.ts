export type ActionType = 'run' | 'dribble' | 'pass' | 'shoot' | 'tackle' | 'turn';

export interface ActionConfig {
    preEvent: string; 
    postEvent: string;
}

export interface DrillAction {
    id: string;
    type: ActionType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    config: ActionConfig;
    pathType: 'straight' | 'freehand';
    points: {x: number, y: number}[];
    sceneIndex: number;
    
    // Optimization params
    speed?: number | null;
    waitBefore?: number; // preDelay logic
    
    // Specific properties map
    gesture?: string; // Pass/Shoot
    dribbleType?: string; // Dribble
    style?: 'straight' | 'zigzag'; // Dribble
    radius?: number; // Tackle
    angle?: number; // Turn
}

export interface DrillPlayer {
    id: string;
    x: number;
    y: number;
    initialX: number;
    initialY: number;
    number: string;
    actions: DrillAction[];
    hasBall: boolean;
    team: string;
}

export interface DrillState {
    players: DrillPlayer[];
    // Add other entities if needed for collision checks later
}
