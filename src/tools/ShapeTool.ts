import { PointerLikeEvent } from './Tool';
import { BaseTool } from './BaseTool';
import { BaseShape, RectangleShape, EllipseShape, TriangleShape, LineShape, FreehandShape } from '../entities/Shape';
import { AddEntityCommand } from '../core/Commands';
import { ShapeType } from '../core/Interfaces';

/**
 * Tool for creating geometric shapes and freehand drawings.
 */
export class ShapeTool extends BaseTool {
    private isDrawing: boolean = false;
    private drawStartPos: { x: number, y: number } | null = null;
    private tempShape: BaseShape | null = null;
    private currentShapeType: ShapeType = 'line';

    public setShapeType(type: ShapeType) {
        this.currentShapeType = type;
    }

    onMouseDown(e: PointerLikeEvent): void {
        const worldPos = this.getWorldPoint(e);
        this.isDrawing = true;
        this.drawStartPos = { x: worldPos.x, y: worldPos.y };
        
        switch (this.currentShapeType) {
            case 'rectangle':
                this.tempShape = new RectangleShape(worldPos.x, worldPos.y);
                break;
            case 'circle':
                this.tempShape = new EllipseShape(worldPos.x, worldPos.y);
                break;
            case 'triangle':
                this.tempShape = new TriangleShape(worldPos.x, worldPos.y);
                // Zero points to prevent default triangle creation
                (this.tempShape as TriangleShape).points = [{x:0, y:0}, {x:0, y:0}, {x:0, y:0}];
                break;
            case 'line':
                this.tempShape = new LineShape(worldPos.x, worldPos.y);
                break;
            case 'freehand':
                this.tempShape = new FreehandShape(worldPos.x, worldPos.y);
                (this.tempShape as FreehandShape).points.push({x: 0, y: 0});
                break;
        }
    }

    onMouseMove(e: PointerLikeEvent): void {
        if (!this.isDrawing || !this.tempShape || !this.drawStartPos) return;

        const worldPos = this.getWorldPoint(e);
        const dx = worldPos.x - this.drawStartPos.x;
        const dy = worldPos.y - this.drawStartPos.y;

        if (this.tempShape instanceof RectangleShape) {
            this.tempShape.width = Math.abs(dx);
            this.tempShape.height = Math.abs(dy);
            this.tempShape.x = this.drawStartPos.x + dx / 2;
            this.tempShape.y = this.drawStartPos.y + dy / 2;
        } else if (this.tempShape instanceof EllipseShape) {
            const halfW = dx / 2;
            const halfH = dy / 2;
            this.tempShape.x = this.drawStartPos.x + halfW;
            this.tempShape.y = this.drawStartPos.y + halfH;
            this.tempShape.radiusX = Math.abs(halfW);
            this.tempShape.radiusY = Math.abs(halfH);
        } else if (this.tempShape instanceof TriangleShape) {
            const halfW = dx / 2;
            const halfH = dy / 2;
            this.tempShape.x = this.drawStartPos.x + halfW;
            this.tempShape.y = this.drawStartPos.y + halfH;
            
            this.tempShape.points = [
                { x: 0, y: -halfH },
                { x: halfW, y: halfH },
                { x: -halfW, y: halfH }
            ];
        } else if (this.tempShape instanceof LineShape) {
            this.tempShape.endX = dx;
            this.tempShape.endY = dy;
        } else if (this.tempShape instanceof FreehandShape) {
             this.tempShape.points.push({x: dx, y: dy});
        }
    }

    onMouseUp(e: PointerLikeEvent): void {
        if (this.isDrawing && this.tempShape) {
            // Validation: Check if shape has minimal size
            let isValid = true;
            if (this.tempShape instanceof RectangleShape && (this.tempShape.width < 1 || this.tempShape.height < 1)) isValid = false;
            if (this.tempShape instanceof EllipseShape && (this.tempShape.radiusX < 1 || this.tempShape.radiusY < 1)) isValid = false;
            if (this.tempShape instanceof LineShape && this.tempShape.endX === 0 && this.tempShape.endY === 0) isValid = false;
            // Triangle check
            if (this.tempShape instanceof TriangleShape) {
                 const p = this.tempShape.points;
                 const minX = Math.min(...p.map(pt=>pt.x));
                 const maxX = Math.max(...p.map(pt=>pt.x));
                 if (maxX - minX < 1) isValid = false;
            }
    
            if (isValid) {
                this.game.commandManager.execute(new AddEntityCommand(this.game, this.tempShape));
                this.game.selectEntity(this.tempShape);
            }
            
            this.tempShape = null;
            this.isDrawing = false;
            
            // Always switch to select tool after finishing a draw action
            this.game.setTool('select'); 
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.isDrawing && this.tempShape) {
            this.tempShape.draw(ctx);
        }
    }
}

