import { Camera } from './Camera';
import { CommandManager } from './CommandManager';

export interface Entity {
  id: string;
  x: number;
  y: number;
  isSelected: boolean;
  draw(ctx: CanvasRenderingContext2D): void;
  containsPoint(x: number, y: number): boolean;
  setPosition(x: number, y: number): void;
}

export interface IActionOwner {
    updateActionChain(): void;
    x: number;
    y: number;
}

export type ToolType = 'select' | 'player' | 'camera' | 'shape' | 'action';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'freehand';

/**
 * Interface defining the context exposed by the Game engine to Tools and Commands.
 * This decouples the concrete Game implementation from its consumers.
 */
export interface IGameContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    camera: Camera;
    commandManager: CommandManager;
    entities: Entity[];
    
    addEntity(entity: Entity): void;
    removeEntity(entity: Entity): void;
    selectEntity(entity: Entity | null): void;
    getSelectedEntity(): Entity | null;
    setTool(tool: ToolType): void;
    
    // UI Helpers that might be triggered by tools
    updateSelectionUI(): void;
}
