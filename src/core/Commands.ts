import { Command } from './CommandManager';
import { Entity } from './Interfaces';
import { IGameContext } from './Interfaces';
import { Player } from '../entities/Player';
import { BaseAction } from '../entities/Action';

/**
 * Command to add an entity to the game.
 * Supports Undo/Redo.
 */
export class AddEntityCommand implements Command {
  constructor(private game: IGameContext, private entity: Entity) {}
  execute() { this.game.addEntity(this.entity); }
  undo() { this.game.removeEntity(this.entity); }
}

/**
 * Command to remove an entity from the game.
 * Supports Undo/Redo.
 */
export class RemoveEntityCommand implements Command {
  constructor(private game: IGameContext, private entity: Entity) {}
  execute() { this.game.removeEntity(this.entity); }
  undo() { this.game.addEntity(this.entity); }
}

/**
 * Command to move an entity.
 * Supports Undo/Redo by storing old and new positions.
 */
export class MoveEntityCommand implements Command {
  constructor(
    private entity: Entity, 
    private oldX: number, 
    private oldY: number, 
    private newX: number, 
    private newY: number
  ) {}
  execute() { this.entity.setPosition(this.newX, this.newY); }
  undo() { this.entity.setPosition(this.oldX, this.oldY); }
}

/**
 * Interface to capture the state of an entity for Undo/Redo operations.
 */
export interface EntityState {
    x?: number;
    y?: number;
    rotation?: number;
    width?: number;
    height?: number;
    radiusX?: number;
    radiusY?: number;
    endX?: number;
    endY?: number;
    points?: {x:number, y:number}[];
}

/**
 * Command to update entity properties (Resize, Rotate, etc.).
 */
export class UpdateEntityCommand implements Command {
  constructor(
    private entity: any, 
    private oldState: EntityState,
    private newState: EntityState
  ) {}

  execute() { 
      this.applyState(this.newState); 
  }
  undo() { 
      this.applyState(this.oldState); 
  }

  private applyState(state: EntityState) {
      if (state.x !== undefined) this.entity.x = state.x;
      if (state.y !== undefined) this.entity.y = state.y;
      if (state.rotation !== undefined) this.entity.rotation = state.rotation;
      if (state.width !== undefined) this.entity.width = state.width;
      if (state.height !== undefined) this.entity.height = state.height;
      if (state.radiusX !== undefined) this.entity.radiusX = state.radiusX;
      if (state.radiusY !== undefined) this.entity.radiusY = state.radiusY;
      if (state.endX !== undefined) this.entity.endX = state.endX;
      if (state.endY !== undefined) this.entity.endY = state.endY;
      if (state.points !== undefined) {
          // Deep copy to prevent ref sharing
          this.entity.points = JSON.parse(JSON.stringify(state.points));
      }
      // If action, trigger chain update
      if (this.entity instanceof BaseAction && this.entity.owner) {
          this.entity.owner.updateActionChain();
      }
  }
}

/**
 * Command to add a player action.
 */
export class AddActionCommand implements Command {
    constructor(private player: Player, private action: BaseAction) {}
    execute() { 
        this.action.owner = this.player;
        this.player.actions.push(this.action); 
    }
    undo() { 
        const idx = this.player.actions.indexOf(this.action);
        if (idx > -1) this.player.actions.splice(idx, 1);
        this.action.owner = null;
    }
}

/**
 * Command to remove a player action and all subsequent actions in the chain.
 */
export class RemoveActionChainCommand implements Command {
    private removedActions: BaseAction[] = [];
    private startIndex: number = -1;

    constructor(private player: Player, private action: BaseAction) {}

    execute() {
        this.startIndex = this.player.actions.indexOf(this.action);
        if (this.startIndex > -1) {
            // Remove from startIndex to the end
            this.removedActions = this.player.actions.splice(this.startIndex);
            // Clear owner for removed actions
            this.removedActions.forEach(a => a.owner = null);
        }
    }

    undo() {
        if (this.startIndex > -1 && this.removedActions.length > 0) {
            // Re-assign owners
            this.removedActions.forEach(a => a.owner = this.player);
            
            // Insert back at start index
            this.player.actions.splice(this.startIndex, 0, ...this.removedActions);
        }
    }
}

