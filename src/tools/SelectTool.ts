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

    // Zone interaction state
    private isDraggingZone: boolean = false;
    private isResizingZone: boolean = false;
    private zoneDragStart: { x: number; y: number } | null = null;
    private zoneInitialRect: { x: number; y: number; w: number; h: number } | null = null;
    private zoneActiveHandle: string | null = null;

    onMouseDown(e: PointerLikeEvent): void {
        const worldPos = this.getWorldPoint(e);
        const selectedEntity = this.game.getSelectedEntity();

        // 1. Check for Resize/Rotate Handles on selected entity
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

        // 2. Check for zone handle resize (only when zone editing is enabled)
        if (this.game.isZoneEditing()) {
            const inverseScale = 1 / this.game.camera.zoom;
            const handleRadius = 10 * inverseScale;
            const handles = this.game.getZoneHandles();
            for (const h of handles) {
                if (Math.abs(worldPos.x - h.x) < handleRadius && Math.abs(worldPos.y - h.y) < handleRadius) {
                    this.isResizingZone = true;
                    this.zoneActiveHandle = h.id;
                    this.zoneDragStart = { ...worldPos };
                    this.zoneInitialRect = this.game.getZoneRect();
                    return;
                }
            }
        }

        // 3. Check for Entity Click (Selection / Drag Start)
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
            return;
        }

        // 4. Check for zone click on edges (select or move)
        if (this.game.hasZone()) {
            const z = this.game.getZoneRect();
            const edgeTolerance = 8 / this.game.camera.zoom;
            if (z && this.isPointOnRectEdge(worldPos.x, worldPos.y, z, edgeTolerance)) {
                if (!this.game.isZoneSelected()) {
                    this.game.selectZone();
                } else if (this.game.isZoneEditing()) {
                    // Start dragging the zone from edge
                    this.isDraggingZone = true;
                    this.zoneDragStart = { ...worldPos };
                    this.zoneInitialRect = { ...z };
                }
                return;
            }
        }

        // 5. Click on empty space — deselect everything
        this.game.selectEntity(null);
        if (this.game.isZoneSelected()) {
            this.game.deselectZone();
        }
    }

    onMouseMove(e: PointerLikeEvent): void {
        const worldPos = this.getWorldPoint(e);
        const selectedEntity = this.game.getSelectedEntity();

        // Zone resize
        if (this.isResizingZone && this.zoneDragStart && this.zoneInitialRect && this.zoneActiveHandle) {
            const z = this.zoneInitialRect;
            const dx = worldPos.x - this.zoneDragStart.x;
            const dy = worldPos.y - this.zoneDragStart.y;
            const newRect = { ...z };

            switch (this.zoneActiveHandle) {
                case 'nw':
                    newRect.x = z.x + dx;
                    newRect.y = z.y + dy;
                    newRect.w = z.w - dx;
                    newRect.h = z.h - dy;
                    break;
                case 'ne':
                    newRect.y = z.y + dy;
                    newRect.w = z.w + dx;
                    newRect.h = z.h - dy;
                    break;
                case 'sw':
                    newRect.x = z.x + dx;
                    newRect.w = z.w - dx;
                    newRect.h = z.h + dy;
                    break;
                case 'se':
                    newRect.w = z.w + dx;
                    newRect.h = z.h + dy;
                    break;
            }

            // Enforce minimum size
            if (newRect.w < 20) { newRect.w = 20; newRect.x = z.x + z.w - 20; }
            if (newRect.h < 20) { newRect.h = 20; newRect.y = z.y + z.h - 20; }

            this.game.setZoneRect(newRect);
            return;
        }

        // Zone drag
        if (this.isDraggingZone && this.zoneDragStart && this.zoneInitialRect) {
            const dx = worldPos.x - this.zoneDragStart.x;
            const dy = worldPos.y - this.zoneDragStart.y;
            this.game.setZoneRect({
                x: this.zoneInitialRect.x + dx,
                y: this.zoneInitialRect.y + dy,
                w: this.zoneInitialRect.w,
                h: this.zoneInitialRect.h,
            });
            return;
        }

        // Resizing/Rotation Update (entity)
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

        // Dragging Update (entity)
        if (this.isDraggingEntity && selectedEntity && !this.isResizing && this.dragOffset) {
            selectedEntity.setPosition(worldPos.x + this.dragOffset.x, worldPos.y + this.dragOffset.y);
        }
    }

    onMouseUp(e: PointerLikeEvent): void {
        const selectedEntity = this.game.getSelectedEntity();

        // Zone interactions
        if (this.isResizingZone || this.isDraggingZone) {
            this.isResizingZone = false;
            this.isDraggingZone = false;
            this.zoneDragStart = null;
            this.zoneInitialRect = null;
            this.zoneActiveHandle = null;
            // Update the menu to reflect new coordinates
            this.game.updateSelectionUI();
            return;
        }

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
                        ctx.fillRect(h.x - size / 2, h.y - size / 2, size, size);
                        ctx.strokeRect(h.x - size / 2, h.y - size / 2, size, size);
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
                    ctx.fillRect(h.x - size / 2, h.y - size / 2, size, size);
                    ctx.strokeRect(h.x - size / 2, h.y - size / 2, size, size);
                }
                ctx.restore();
            }
        }
    }

    // --- Helpers ---

    /** Check if point lies on any edge of a rectangle within a tolerance */
    private isPointOnRectEdge(
        px: number, py: number,
        rect: { x: number; y: number; w: number; h: number },
        tolerance: number
    ): boolean {
        const { x, y, w, h } = rect;
        const inBoundsX = px >= x - tolerance && px <= x + w + tolerance;
        const inBoundsY = py >= y - tolerance && py <= y + h + tolerance;

        // Top or bottom edge
        if (inBoundsX && (Math.abs(py - y) <= tolerance || Math.abs(py - (y + h)) <= tolerance)) return true;
        // Left or right edge
        if (inBoundsY && (Math.abs(px - x) <= tolerance || Math.abs(px - (x + w)) <= tolerance)) return true;

        return false;
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
