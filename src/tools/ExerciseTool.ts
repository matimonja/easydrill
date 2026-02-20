import { PointerLikeEvent } from './Tool';
import { BaseTool } from './BaseTool';
import { AddEntityCommand } from '../core/Commands';
import { Cone, Ball, ConeGroup, ExerciseObjectType, ConeGroupShape } from '../entities/ExerciseObjects';
import { Goal } from '../entities/Goal';

export class ExerciseTool extends BaseTool {
    private objectType: ExerciseObjectType = 'cone';
    private coneShape: ConeGroupShape | 'single' = 'single';
    
    private isDragging: boolean = false;
    private tempEntity: ConeGroup | Goal | null = null;
    private dragStart: {x: number, y: number} = {x:0, y:0};
    
    public setObjectType(type: ExerciseObjectType) { 
        this.objectType = type; 
        if (type === 'cone') this.coneShape = 'single';
    }
    
    public setConeShape(shape: ConeGroupShape | 'single') {
        this.coneShape = shape;
    }
    
    public getObjectType() { return this.objectType; }
    public getConeShape() { return this.coneShape; }

    onMouseDown(e: PointerLikeEvent) {
        const pos = this.getWorldPoint(e);
        this.dragStart = { x: pos.x, y: pos.y };
        
        if (this.objectType === 'ball') {
            const ball = new Ball(pos.x, pos.y);
            this.game.commandManager.execute(new AddEntityCommand(this.game, ball));
            this.game.selectEntity(ball);
            this.game.setTool('select');
            return;
        }
        
        if (this.objectType === 'goal') {
            this.isDragging = true;
            this.tempEntity = new Goal(pos.x, pos.y);
            // Start with 0 size, grows with drag
            this.tempEntity.width = 0;
            this.tempEntity.height = 0;
            return;
        }
        
        if (this.objectType === 'cone') {
            if (this.coneShape === 'single') {
                const cone = new Cone(pos.x, pos.y);
                this.game.commandManager.execute(new AddEntityCommand(this.game, cone));
                this.game.selectEntity(cone);
                this.game.setTool('select');
                return;
            }
            
            // Cone Group Creation
            this.isDragging = true;
            this.tempEntity = new ConeGroup(this.coneShape as ConeGroupShape, pos.x, pos.y);
            
            if (this.coneShape === 'freehand') {
                this.tempEntity.points = [{x: 0, y: 0}]; // Relative to start (x,y)
            } else if (this.coneShape === 'triangle') {
                this.tempEntity.points = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}];
            }
        }
    }
    
    onMouseMove(e: PointerLikeEvent) {
        if (!this.isDragging || !this.tempEntity) return;
        
        const pos = this.getWorldPoint(e);
        const startX = this.dragStart.x;
        const startY = this.dragStart.y;
        
        if (this.tempEntity instanceof Goal) {
            this.tempEntity.width = Math.abs(pos.x - startX);
            this.tempEntity.height = Math.abs(pos.y - startY);
            this.tempEntity.x = (startX + pos.x) / 2;
            this.tempEntity.y = (startY + pos.y) / 2;
        } else if (this.tempEntity instanceof ConeGroup) {
            if (this.tempEntity.shapeType === 'line') {
                this.tempEntity.endX = pos.x - startX;
                this.tempEntity.endY = pos.y - startY;
            } else if (this.tempEntity.shapeType === 'rectangle') {
                this.tempEntity.width = Math.abs(pos.x - startX);
                this.tempEntity.height = Math.abs(pos.y - startY);
                this.tempEntity.x = (startX + pos.x) / 2;
                this.tempEntity.y = (startY + pos.y) / 2;
            } else if (this.tempEntity.shapeType === 'ellipse') {
                this.tempEntity.radiusX = Math.abs(pos.x - startX) / 2;
                this.tempEntity.radiusY = Math.abs(pos.y - startY) / 2;
                this.tempEntity.x = (startX + pos.x) / 2;
                this.tempEntity.y = (startY + pos.y) / 2;
            } else if (this.tempEntity.shapeType === 'triangle') {
                const w = pos.x - startX;
                const h = pos.y - startY;
                this.tempEntity.x = startX + w/2;
                this.tempEntity.y = startY + h/2;
                this.tempEntity.points = [
                    { x: 0, y: -h/2 },
                    { x: w/2, y: h/2 },
                    { x: -w/2, y: h/2 }
                ];
            } else if (this.tempEntity.shapeType === 'freehand') {
                const relX = pos.x - this.tempEntity.x;
                const relY = pos.y - this.tempEntity.y;
                this.tempEntity.points.push({x: relX, y: relY});
            }
        }
    }
    
    onMouseUp(e: PointerLikeEvent) {
        if (this.isDragging && this.tempEntity) {
             let w = 0, h = 0;
             let isValid = false;

             if (this.tempEntity instanceof Goal) {
                 w = this.tempEntity.width;
                 h = this.tempEntity.height;
                 isValid = w > 5 || h > 5;
             } else if (this.tempEntity instanceof ConeGroup) {
                 w = this.tempEntity.width || Math.abs(this.tempEntity.endX) || 10;
                 h = this.tempEntity.height || Math.abs(this.tempEntity.endY) || 10;
                 isValid = w > 5 || h > 5 || this.tempEntity.points.length > 2;
             }
             
             if (isValid) {
                 this.game.commandManager.execute(new AddEntityCommand(this.game, this.tempEntity));
                 this.game.selectEntity(this.tempEntity);
             }
             this.game.setTool('select');
        }
        this.isDragging = false;
        this.tempEntity = null;
    }
    
    render(ctx: CanvasRenderingContext2D) {
        if (this.isDragging && this.tempEntity) {
            this.tempEntity.draw(ctx);
        }
    }
}
