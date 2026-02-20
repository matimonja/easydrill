import { PointerLikeEvent } from './Tool';
import { BaseTool } from './BaseTool';
import { Entity } from '../core/Interfaces'; 
import { BaseShape } from '../entities/Shape';
import { Player } from '../entities/Player';
import { BaseAction } from '../entities/Action';
import { MoveEntityCommand, UpdateEntityCommand, EntityState } from '../core/Commands';

export class SelectTool extends BaseTool {
    private isDraggingEntity: boolean = false;
    private dragStartPos: { x: number, y: number } | null = null;
    private initialEntityPos: { x: number, y: number } | null = null;
    private dragOffset: { x: number, y: number } | null = null;

    private isResizing: boolean = false;
    private activeHandleId: string | null = null;
    private initialResizeState: EntityState | null = null;

    onMouseDown(e: PointerLikeEvent): void {
        const worldPos = this.getWorldPoint(e);
        const selectedEntity = this.game.getSelectedEntity();

        // 1. Check for Resize/Rotate Handles
        if (selectedEntity) {
            const inverseScale = 1 / this.game.camera.zoom;
            const handleRadius = 10 * inverseScale;

            if (selectedEntity instanceof BaseShape) {
                const handles = selectedEntity.getHandles();
                const dx = worldPos.x - selectedEntity.x;
                const dy = worldPos.y - selectedEntity.y;
                const cos = Math.cos(-selectedEntity.rotation);
                const sin = Math.sin(-selectedEntity.rotation);
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;

                for (const h of handles) {
                    if (Math.abs(localX - h.x) < handleRadius && Math.abs(localY - h.y) < handleRadius) {
                        this.isResizing = true;
                        this.activeHandleId = h.id;
                        this.initialResizeState = this.captureState(selectedEntity);
                        return; 
                    }
                }
            } else if (selectedEntity instanceof BaseAction) {
                const handles = selectedEntity.getHandles();
                for (const h of handles) {
                    if (Math.hypot(worldPos.x - h.x, worldPos.y - h.y) < handleRadius) {
                        this.isResizing = true;
                        this.activeHandleId = h.id;
                        this.initialResizeState = this.captureState(selectedEntity);
                        return;
                    }
                }
            }
        }

        // 2. Check for Entity Click (Selection / Drag Start)
        let clickedEntity: Entity | undefined = undefined;
        const reversedEntities = this.game.entities.slice().reverse();

        for (const ent of reversedEntities) {
            if (ent instanceof Player) {
                // Priority 1: Player Body
                if (ent.containsPoint(worldPos.x, worldPos.y)) {
                    clickedEntity = ent;
                    break;
                }
                // Priority 2: Actions
                const actions = ent.actions.slice().reverse();
                for (const action of actions) {
                    if (action.containsPoint(worldPos.x, worldPos.y)) {
                        clickedEntity = action;
                        break;
                    }
                }
                if (clickedEntity) break;
            } else {
                if (ent.containsPoint(worldPos.x, worldPos.y)) {
                    clickedEntity = ent;
                    break;
                }
            }
        }
      
        if (clickedEntity) {
            this.game.selectEntity(clickedEntity);
            
            // Allow drag ONLY if NOT BaseAction
            if (!(clickedEntity instanceof BaseAction)) {
                this.isDraggingEntity = true;
                this.dragStartPos = { x: worldPos.x, y: worldPos.y };
                this.initialEntityPos = { x: clickedEntity.x, y: clickedEntity.y };
                
                this.dragOffset = {
                    x: clickedEntity.x - worldPos.x,
                    y: clickedEntity.y - worldPos.y
                };
            }
        } else {
            this.game.selectEntity(null);
        }
    }

    onMouseMove(e: PointerLikeEvent): void {
        const worldPos = this.getWorldPoint(e);
        const selectedEntity = this.game.getSelectedEntity();

        // Resizing/Rotation Update
        if (this.isResizing && this.activeHandleId && selectedEntity) {
            if (selectedEntity instanceof BaseShape) {
                if (this.activeHandleId === 'rotate') {
                     const dx = worldPos.x - selectedEntity.x;
                     const dy = worldPos.y - selectedEntity.y;
                     selectedEntity.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                } else {
                     const dx = worldPos.x - selectedEntity.x;
                     const dy = worldPos.y - selectedEntity.y;
                     const cos = Math.cos(-selectedEntity.rotation);
                     const sin = Math.sin(-selectedEntity.rotation);
                     const localX = dx * cos - dy * sin;
                     const localY = dx * sin + dy * cos;
        
                     selectedEntity.resize(this.activeHandleId, localX, localY);
                }
            } else if (selectedEntity instanceof BaseAction) {
                selectedEntity.resize(this.activeHandleId, worldPos.x, worldPos.y);
            }
            return;
        }

        // Dragging Update
        if (this.isDraggingEntity && selectedEntity && !this.isResizing && this.dragOffset) {
             selectedEntity.setPosition(worldPos.x + this.dragOffset.x, worldPos.y + this.dragOffset.y);
        }
    }

    onMouseUp(e: PointerLikeEvent): void {
        const selectedEntity = this.game.getSelectedEntity();

        if (this.isResizing && selectedEntity && this.initialResizeState) {
            const finalState = this.captureState(selectedEntity);
            if (JSON.stringify(this.initialResizeState) !== JSON.stringify(finalState)) {
                this.game.commandManager.execute(new UpdateEntityCommand(
                    selectedEntity,
                    this.initialResizeState,
                    finalState
                ));
            }
            this.isResizing = false;
            this.activeHandleId = null;
            this.initialResizeState = null;
        }

        if (this.isDraggingEntity && selectedEntity && this.initialEntityPos && !this.isResizing) {
            const dx = selectedEntity.x - this.initialEntityPos.x;
            const dy = selectedEntity.y - this.initialEntityPos.y;
            
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                this.game.commandManager.execute(new MoveEntityCommand(
                    selectedEntity, 
                    this.initialEntityPos.x, 
                    this.initialEntityPos.y,
                    selectedEntity.x,
                    selectedEntity.y
                ));
            }
        }

        this.isDraggingEntity = false;
        this.dragStartPos = null;
        this.initialEntityPos = null;
        this.dragOffset = null;
    }

    render(ctx: CanvasRenderingContext2D): void {
        const selectedEntity = this.game.getSelectedEntity();
        
        if (selectedEntity) {
            const inverseScale = 1 / this.game.camera.zoom;
            const size = 8 * inverseScale;
            ctx.lineWidth = 1 * inverseScale;

            if (selectedEntity instanceof BaseShape) {
                const handles = selectedEntity.getHandles();
                ctx.save();
                ctx.translate(selectedEntity.x, selectedEntity.y);
                ctx.rotate(selectedEntity.rotation);
                
                for (const h of handles) {
                    if (h.id === 'rotate') {
                        ctx.beginPath();
                        ctx.moveTo(h.x, h.y);
                        ctx.lineTo(h.x, h.y + 25); 
                        ctx.strokeStyle = '#ffffff';
                        ctx.stroke();
        
                        ctx.beginPath();
                        ctx.arc(h.x, h.y, size, 0, 2 * Math.PI); 
                        ctx.fillStyle = '#22c55e';
                        ctx.strokeStyle = '#ffffff';
                        ctx.fill();
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#000000';
                        ctx.fillRect(h.x - size/2, h.y - size/2, size, size);
                        ctx.strokeRect(h.x - size/2, h.y - size/2, size, size);
                    }
                }
                ctx.restore();
            } else if (selectedEntity instanceof BaseAction) {
                const handles = selectedEntity.getHandles();
                ctx.save();
                // World coordinates
                for (const h of handles) {
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#000000';
                    ctx.fillRect(h.x - size/2, h.y - size/2, size, size);
                    ctx.strokeRect(h.x - size/2, h.y - size/2, size, size);
                }
                ctx.restore();
            }
        }
    }

    private captureState(entity: any): EntityState {
        const state: EntityState = {
            x: entity.x,
            y: entity.y,
            rotation: entity.rotation,
        };
        if (entity.width !== undefined) state.width = entity.width;
        if (entity.height !== undefined) state.height = entity.height;
        if (entity.radiusX !== undefined) state.radiusX = entity.radiusX;
        if (entity.radiusY !== undefined) state.radiusY = entity.radiusY;
        if (entity.endX !== undefined) state.endX = entity.endX;
        if (entity.endY !== undefined) state.endY = entity.endY;
        if (entity.points !== undefined) state.points = JSON.parse(JSON.stringify(entity.points));
        return state;
    }
}

