import { Entity } from '../core/Interfaces';
import { Handle, BaseShape } from './Shape';

export type ExerciseObjectType = 'cone' | 'ball' | 'goal';
export type ConeGroupShape = 'line' | 'freehand' | 'rectangle' | 'ellipse' | 'triangle';

export class Cone implements Entity {
    public id: string;
    public isSelected: boolean = false;
    
    constructor(
        public x: number, 
        public y: number,
        public color: string = '#f97316', 
        public height: number = 10 
    ) {
        this.id = crypto.randomUUID();
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    containsPoint(px: number, py: number): boolean {
        const r = 15;
        const dx = this.x - px;
        const dy = this.y - py;
        return (dx*dx + dy*dy) < r*r;
    }

    draw(ctx: CanvasRenderingContext2D) {
        Cone.drawCone(ctx, this.x, this.y, this.color, this.height, this.isSelected);
    }

    static drawCone(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, height: number, isSelected: boolean) {
        const w = 20; 
        const hBase = 8; 
        
        ctx.fillStyle = color;
        
        ctx.beginPath();
        ctx.moveTo(x, y - height); 
        ctx.lineTo(x - w/2, y); 
        ctx.lineTo(x + w/2, y); 
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(x, y, w/2, hBase/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x, y - height);
            ctx.lineTo(x - w/2, y);
            ctx.lineTo(x + w/2, y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

export class Ball implements Entity {
    public id: string;
    public isSelected: boolean = false;
    public isGroup: boolean = false;
    
    constructor(
        public x: number, 
        public y: number,
        public color: string = '#ffffff'
    ) {
        this.id = crypto.randomUUID();
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    containsPoint(px: number, py: number): boolean {
        const r = this.isGroup ? 15 : 5; 
        const dx = this.x - px;
        const dy = this.y - py;
        return (dx*dx + dy*dy) < (r + 5)*(r + 5); 
    }

    draw(ctx: CanvasRenderingContext2D) {
        const r = 5;
        
        const drawSingle = (cx: number, cy: number) => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            if (this.isGroup) {
                ctx.strokeStyle = '#000'; 
            } else {
                ctx.strokeStyle = this.color; 
            }
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        if (this.isGroup) {
            // Center
            drawSingle(this.x, this.y);
            // 4 corners touching center. Distance 2r = 10.
            const offset = 2 * r * Math.cos(Math.PI / 4);
            drawSingle(this.x - offset, this.y - offset);
            drawSingle(this.x + offset, this.y - offset);
            drawSingle(this.x - offset, this.y + offset);
            drawSingle(this.x + offset, this.y + offset);
        } else {
            drawSingle(this.x, this.y);
        }
        
        if (this.isSelected) {
            const selR = this.isGroup ? 18 : 9;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, selR, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

export class ConeGroup extends BaseShape {
    public shapeType: ConeGroupShape;
    public coneDistance: number = 50;
    public showLines: boolean = true;
    public groupColor: string = '#f97316';
    public groupHeight: number = 10;
    public smoothingFactor: number = 5;

    // Shape Params (Union)
    public width: number = 0;
    public height: number = 0;
    public radiusX: number = 0;
    public radiusY: number = 0;
    public endX: number = 0;
    public endY: number = 0;
    public points: {x: number, y: number}[] = [];

    // Interaction
    public selectedConeIndex: number = 0; 
    public coneColors: Map<number, string> = new Map();

    constructor(type: ConeGroupShape, x: number, y: number) {
        super(x, y, 'rgba(255,255,255,0.5)'); 
        this.shapeType = type;
        if (type === 'triangle' || type === 'freehand') {
            this.points = [{x:0, y:0}];
        }
    }

    // --- BaseShape Implementation ---

    drawShape(ctx: CanvasRenderingContext2D): void {
        // Draw Lines
        if (this.showLines) {
            ctx.beginPath();
            if (this.shapeType === 'line') {
                ctx.moveTo(0, 0);
                ctx.lineTo(this.endX, this.endY);
            } else if (this.shapeType === 'rectangle') {
                ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
            } else if (this.shapeType === 'ellipse') {
                ctx.ellipse(0, 0, Math.max(0, this.radiusX), Math.max(0, this.radiusY), 0, 0, 2 * Math.PI);
            } else if (this.shapeType === 'triangle') {
                if (this.points.length > 0) {
                    ctx.moveTo(this.points[0].x, this.points[0].y);
                    for(let i=1; i<this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
                    ctx.closePath();
                }
            } else if (this.shapeType === 'freehand') {
                const poly = this.getSmoothedPolyline();
                if (poly.length > 0) {
                    ctx.moveTo(poly[0].x, poly[0].y);
                    for(let i=1; i<poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
                }
            }
            
            ctx.strokeStyle = this.isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Cones with Counter-Rotation
        const positions = this.generateConePositionsLocal();
        positions.forEach((pos, i) => {
            let color = this.coneColors.get(i) || this.groupColor;
            let isSel = this.isSelected && i === this.selectedConeIndex;
            
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(-this.rotation); // Keep cones upright relative to world
            Cone.drawCone(ctx, 0, 0, color, this.groupHeight, isSel);
            ctx.restore();
        });
    }

    containsPointLocal(lx: number, ly: number): boolean {
        // 1. Check Cones
        const positions = this.generateConePositionsLocal();
        for (let i = 0; i < positions.length; i++) {
            const p = positions[i];
            const dx = lx - p.x;
            const dy = ly - p.y;
            if (dx*dx + dy*dy < 225) { // 15px radius
                this.selectedConeIndex = i;
                return true;
            }
        }

        // 2. Check Path/Lines (Hollow Selection)
        let hit = false;
        const tolerance = 10;

        if (this.shapeType === 'rectangle') {
            const hw = this.width/2; 
            const hh = this.height/2;
            const outerHW = hw + tolerance;
            const outerHH = hh + tolerance;
            const innerHW = Math.max(0, hw - tolerance);
            const innerHH = Math.max(0, hh - tolerance);
            
            const insideOuter = (Math.abs(lx) <= outerHW && Math.abs(ly) <= outerHH);
            const insideInner = (Math.abs(lx) <= innerHW && Math.abs(ly) <= innerHH);
            
            if (insideOuter && !insideInner) hit = true;

        } else if (this.shapeType === 'ellipse') {
            const rx = this.radiusX; 
            const ry = this.radiusY;
            if (rx > 0 && ry > 0) {
                const val = (lx*lx)/(rx*rx) + (ly*ly)/(ry*ry);
                // Check if near boundary (val approx 1)
                // val=1 is border. range [0.8, 1.2]?
                if (val >= 0.8 && val <= 1.2) hit = true;
            }
        } else if (this.shapeType === 'line') {
            const l2 = this.endX*this.endX + this.endY*this.endY;
            if (l2 === 0) return false;
            let t = ((lx * this.endX) + (ly * this.endY)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = t * this.endX;
            const projY = t * this.endY;
            if (Math.hypot(lx - projX, ly - projY) < tolerance) hit = true;
        } else {
            // Triangle / Freehand - Check segments
            let checkPoints = this.points;
            if (this.shapeType === 'freehand') {
                checkPoints = this.getSmoothedPolyline();
            }

            if (checkPoints.length > 1) {
                for (let i = 0; i < checkPoints.length - 1; i++) {
                    const p1 = checkPoints[i];
                    const p2 = checkPoints[i+1];
                    const l2 = (p2.x-p1.x)**2 + (p2.y-p1.y)**2;
                    if (l2 === 0) continue;
                    let t = ((lx-p1.x)*(p2.x-p1.x) + (ly-p1.y)*(p2.y-p1.y)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    const px = p1.x + t*(p2.x-p1.x);
                    const py = p1.y + t*(p2.y-p1.y);
                    if (Math.hypot(lx-px, ly-py) < tolerance) { hit = true; break; }
                }
                if (!hit && this.shapeType === 'triangle') {
                     const p1 = checkPoints[checkPoints.length-1];
                     const p2 = checkPoints[0];
                     const l2 = (p2.x-p1.x)**2 + (p2.y-p1.y)**2;
                     let t = ((lx-p1.x)*(p2.x-p1.x) + (ly-p1.y)*(p2.y-p1.y)) / l2;
                     t = Math.max(0, Math.min(1, t));
                     const px = p1.x + t*(p2.x-p1.x);
                     const py = p1.y + t*(p2.y-p1.y);
                     if (Math.hypot(lx-px, ly-py) < tolerance) hit = true;
                }
            }
        }

        if (hit) {
            this.selectedConeIndex = 0; 
            return true;
        }
        return false;
    }

    getHandles(): Handle[] {
        if (this.shapeType === 'rectangle') {
            const hw = this.width / 2;
            const hh = this.height / 2;
            return [
                { id: 'tl', x: -hw, y: -hh, cursor: 'nw-resize' },
                { id: 'br', x: hw, y: hh, cursor: 'se-resize' },
                { id: 'rotate', x: 0, y: -hh - 25, cursor: 'grab' }
            ];
        } else if (this.shapeType === 'ellipse') {
            const rx = this.radiusX;
            const ry = this.radiusY;
            return [
                { id: 'br', x: rx, y: ry, cursor: 'se-resize' },
                { id: 'rotate', x: 0, y: -ry - 25, cursor: 'grab' }
            ];
        } else if (this.shapeType === 'line') {
            return [
                { id: 'start', x: 0, y: 0, cursor: 'move' },
                { id: 'end', x: this.endX, y: this.endY, cursor: 'move' }
            ];
        } else if (this.shapeType === 'triangle') {
             return this.points.map((p, i) => ({
                 id: `p${i}`, x: p.x, y: p.y, cursor: 'move'
             })).concat([{ id: 'rotate', x: 0, y: -50, cursor: 'grab' }]);
        }
        return [];
    }

    resize(handleId: string, lx: number, ly: number): void {
        if (this.shapeType === 'rectangle') {
            const hw = this.width / 2;
            const hh = this.height / 2;
            let anchorX = 0, anchorY = 0;
            if (handleId === 'tl') { anchorX = hw; anchorY = hh; }
            else if (handleId === 'br') { anchorX = -hw; anchorY = -hh; }
            
            const newWidth = Math.abs(lx - anchorX);
            const newHeight = Math.abs(ly - anchorY);
            const midX = (lx + anchorX) / 2;
            const midY = (ly + anchorY) / 2;
            
            this.width = Math.max(10, newWidth);
            this.height = Math.max(10, newHeight);
            
            const shift = this.rotatePoint(midX, midY, this.rotation);
            this.x += shift.x;
            this.y += shift.y;

        } else if (this.shapeType === 'ellipse') {
            this.radiusX = Math.max(5, Math.abs(lx));
            this.radiusY = Math.max(5, Math.abs(ly));
        } else if (this.shapeType === 'line') {
            if (handleId === 'end') {
                this.endX = lx; this.endY = ly;
            } else if (handleId === 'start') {
                const shift = this.rotatePoint(lx, ly, this.rotation);
                this.x += shift.x; this.y += shift.y;
                this.endX -= lx; this.endY -= ly;
            }
        } else if (this.shapeType === 'triangle') {
            const idx = parseInt(handleId.charAt(1));
            if (!isNaN(idx) && this.points[idx]) {
                this.points[idx].x = lx;
                this.points[idx].y = ly;
            }
        }
    }

    // --- Cone Positioning ---

    private getSmoothedPolyline(): {x: number, y: number}[] {
        if (this.shapeType !== 'freehand' || this.points.length < 3 || this.smoothingFactor <= 1) {
            return this.points;
        }

        const sampled = [];
        for (let i = 0; i < this.points.length; i += Math.ceil(this.smoothingFactor)) {
            sampled.push(this.points[i]);
        }
        if (sampled[sampled.length - 1] !== this.points[this.points.length - 1]) {
            sampled.push(this.points[this.points.length - 1]);
        }

        const polyline: {x: number, y: number}[] = [];
        if (sampled.length < 2) return sampled;

        // Start point
        polyline.push(sampled[0]);
        let currentPos = sampled[0];

        for (let i = 1; i < sampled.length - 1; i++) {
             const cp = sampled[i];
             const next = sampled[i+1];
             const ep = { x: (cp.x + next.x) / 2, y: (cp.y + next.y) / 2 };
             
             // Approximate quadratic bezier from currentPos to ep via cp
             // Subdivide
             const steps = 10;
             for (let s = 1; s <= steps; s++) {
                 const t = s / steps;
                 const it = 1 - t;
                 const bx = it*it*currentPos.x + 2*it*t*cp.x + t*t*ep.x;
                 const by = it*it*currentPos.y + 2*it*t*cp.y + t*t*ep.y;
                 polyline.push({x: bx, y: by});
             }
             currentPos = ep;
        }
        
        // Final line segment
        const last = sampled[sampled.length - 1];
        polyline.push(last);

        return polyline;
    }

    private generateConePositionsLocal(): {x: number, y: number}[] {
        const points: {x: number, y: number}[] = [];
        const dist = Math.max(20, this.coneDistance);

        const addSegment = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const count = Math.max(1, Math.round(len / dist)); 
            for (let i = 0; i < count; i++) {
                const t = i / count;
                points.push({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                });
            }
        };

        if (this.shapeType === 'line') {
            const p1 = {x:0, y:0};
            const p2 = {x:this.endX, y:this.endY};
            addSegment(p1, p2);
            points.push(p2); 
        } else if (this.shapeType === 'rectangle') {
            const hw = this.width/2; const hh = this.height/2;
            const tl = {x: -hw, y: -hh};
            const tr = {x: hw, y: -hh};
            const br = {x: hw, y: hh};
            const bl = {x: -hw, y: hh};
            addSegment(tl, tr);
            addSegment(tr, br);
            addSegment(br, bl);
            addSegment(bl, tl);
        } else if (this.shapeType === 'triangle') {
            if (this.points.length === 3) {
                addSegment(this.points[0], this.points[1]);
                addSegment(this.points[1], this.points[2]);
                addSegment(this.points[2], this.points[0]);
            }
        } else if (this.shapeType === 'ellipse') {
            const steps = Math.max(8, Math.round((Math.PI * 2 * Math.max(this.radiusX, this.radiusY)) / dist));
            for (let i=0; i<steps; i++) {
                const a = (i/steps) * Math.PI * 2;
                points.push({
                    x: this.radiusX * Math.cos(a),
                    y: this.radiusY * Math.sin(a)
                });
            }
        } else if (this.shapeType === 'freehand') {
            const pathPoints = this.getSmoothedPolyline();
            
            if (pathPoints.length > 0) {
                points.push(pathPoints[0]);
                let lastP = pathPoints[0];
                let acc = 0;
                for (let i=1; i<pathPoints.length; i++) {
                    const d = Math.hypot(pathPoints[i].x - lastP.x, pathPoints[i].y - lastP.y);
                    if (d + acc >= dist) {
                        points.push(pathPoints[i]);
                        acc = 0;
                    } else {
                        acc += d;
                    }
                    lastP = pathPoints[i];
                }
                
                // Force last point if distance allows (avoid overlapping too much)
                const finalP = pathPoints[pathPoints.length-1];
                if (points.length > 0) {
                    const lastCone = points[points.length-1];
                    const distToLast = Math.hypot(finalP.x - lastCone.x, finalP.y - lastCone.y);
                    if (distToLast > 5) { // Minimum visual separation
                        points.push(finalP);
                    }
                } else {
                    points.push(finalP);
                }
            }
        }

        return points;
    }
}
