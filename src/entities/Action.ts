import { Entity, IActionOwner } from '../core/Interfaces';
import { Handle } from './Shape'; 

export type ActionType = 'run' | 'dribble' | 'pass' | 'shoot' | 'tackle' | 'turn';

export interface ActionConfig {
    preEvent: string; 
    postEvent: string;
}

function distToSegment(p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

export abstract class BaseAction implements Entity {
    public id: string;
    public isSelected: boolean = false;
    public config: ActionConfig = { preEvent: 'inmediato', postEvent: 'inmediato' };
    
    public pathType: 'straight' | 'freehand' = 'straight';
    public points: {x: number, y: number}[] = [];
    public smoothingFactor: number = 5;
    
    public owner: IActionOwner | null = null;

    constructor(
        public type: ActionType,
        public startX: number,
        public startY: number,
        public endX: number,
        public endY: number
    ) {
        this.id = crypto.randomUUID();
    }

    get x() { return this.startX; }
    set x(v) { 
        const dx = v - this.startX;
        this.setPosition(v, this.startY); 
    }
    
    get y() { return this.startY; }
    set y(v) { 
        const dy = v - this.startY;
        this.setPosition(this.startX, v);
    }

    abstract draw(ctx: CanvasRenderingContext2D): void;
    abstract getFinalPosition(): {x: number, y: number};
    
    containsPoint(px: number, py: number): boolean {
        if (this.type === 'turn' || this.type === 'tackle') {
             const dx = this.startX - px;
             const dy = this.startY - py;
             let r = 20;
             if (this.type === 'tackle') {
                 r = (this as any).radius || 25;
             }
             return (dx*dx + dy*dy) < r*r;
        }

        if (this.pathType === 'straight') {
            const dist = distToSegment({x: px, y: py}, {x: this.startX, y: this.startY}, {x: this.endX, y: this.endY});
            return dist < 10;
        } else {
            if (this.points.length < 2) return false;
            for (let i = 0; i < this.points.length - 1; i++) {
                const dist = distToSegment({x: px, y: py}, this.points[i], this.points[i+1]);
                if (dist < 10) return true;
            }
            return false;
        }
    }

    setStartPosition(x: number, y: number): void {
        this.startX = x;
        this.startY = y;
        if (this.pathType === 'freehand' && this.points.length > 0) {
            this.points[0].x = x;
            this.points[0].y = y;
        }
    }

    setPosition(x: number, y: number): void {
        const dx = x - this.startX;
        const dy = y - this.startY;
        this.startX = x;
        this.startY = y;
        this.endX += dx;
        this.endY += dy;
        
        this.points.forEach(p => {
            p.x += dx;
            p.y += dy;
        });
    }
    
    getHandles(): Handle[] {
        if (this.pathType === 'straight') {
            return [{ id: 'end', x: this.endX, y: this.endY, cursor: 'move' }];
        }
        return [];
    }
    
    resize(handleId: string, x: number, y: number) {
        if (handleId === 'end') {
            this.endX = x;
            this.endY = y;
            if (this.owner) this.owner.updateActionChain();
        }
    }

    protected drawArrowPath(ctx: CanvasRenderingContext2D, color: string, dashed: boolean) {
        ctx.beginPath();
        
        let arrowX = this.endX;
        let arrowY = this.endY;
        let angle = 0;

        if (this.pathType === 'straight') {
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.endX, this.endY);
            angle = Math.atan2(this.endY - this.startY, this.endX - this.startX);
        } else {
            if (this.points.length > 0) {
                const points = this.points;
                const factor = Math.max(1, this.smoothingFactor);
                let pointsToUse = points;
                
                // Smoothing Generation
                if (points.length >= 3 && factor > 1) {
                    const sampled = [];
                    for (let i = 0; i < points.length; i += Math.ceil(factor)) {
                        sampled.push(points[i]);
                    }
                    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
                        sampled.push(points[points.length - 1]);
                    }
                    
                    if (sampled.length >= 2) {
                        pointsToUse = sampled;
                        
                        // Draw Curve using Sampled Points
                        ctx.moveTo(sampled[0].x, sampled[0].y);
                        for (let i = 1; i < sampled.length - 1; i++) {
                             const cp = sampled[i];
                             const next = sampled[i+1];
                             const ep = { x: (cp.x + next.x) / 2, y: (cp.y + next.y) / 2 };
                             ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
                        }
                        const last = sampled[sampled.length - 1];
                        ctx.lineTo(last.x, last.y);
                    } else {
                        // Fallback draw
                        ctx.moveTo(points[0].x, points[0].y);
                        for (let i = 1; i < points.length; i++) {
                            ctx.lineTo(points[i].x, points[i].y);
                        }
                    }
                } else {
                    // Draw Raw
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                }
                
                // Calculate Arrow Direction using pointsToUse (Smoothed or Raw)
                if (pointsToUse.length > 1) {
                    const last = pointsToUse[pointsToUse.length - 1];
                    const lookbackShort = 2; 
                    const lookbackLong = (pointsToUse === points) ? 10 : 3;

                    const pShort = pointsToUse[Math.max(0, pointsToUse.length - lookbackShort)]; 
                    const angleShort = Math.atan2(last.y - pShort.y, last.x - pShort.x);
                    
                    const pLong = pointsToUse[Math.max(0, pointsToUse.length - lookbackLong)];
                    const angleLong = Math.atan2(last.y - pLong.y, last.x - pLong.x);
                    
                    let d = angleShort - angleLong;
                    while (d <= -Math.PI) d += 2*Math.PI;
                    while (d > Math.PI) d -= 2*Math.PI;
                    
                    angle = (Math.abs(d) < (30 * Math.PI / 180)) ? angleLong : angleShort;
                    
                    arrowX = last.x;
                    arrowY = last.y;
                }
            }
        }
        
        ctx.strokeStyle = this.isSelected ? '#fff' : color;
        ctx.lineWidth = 2;
        if (dashed) ctx.setLineDash([10, 5]);
        else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow Head
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, 5);
        ctx.lineTo(-10, -5);
        ctx.closePath();
        ctx.fillStyle = this.isSelected ? '#fff' : color;
        ctx.fill();
        ctx.restore();
    }
}

export class RunAction extends BaseAction {
    public speed: number | null = null; // null = disabled
    constructor(startX: number, startY: number, endX: number, endY: number) {
        super('run', startX, startY, endX, endY);
    }
    draw(ctx: CanvasRenderingContext2D) {
        this.drawArrowPath(ctx, '#ef4444', true); 
    }
    getFinalPosition() {
        if (this.pathType === 'straight') return { x: this.endX, y: this.endY };
        if (this.points.length > 0) return this.points[this.points.length - 1];
        return { x: this.startX, y: this.startY };
    }
}

export class PassAction extends BaseAction {
    public speed: number | null = null;
    public gesture: string = 'push';
    constructor(startX: number, startY: number, endX: number, endY: number) {
        super('pass', startX, startY, endX, endY);
    }
    draw(ctx: CanvasRenderingContext2D) {
        this.drawArrowPath(ctx, '#eab308', false);
    }
    getFinalPosition() {
        return { x: this.startX, y: this.startY };
    }
}

export class DribbleAction extends BaseAction {
    public speed: number | null = null;
    public dribbleType: string = 'derecho';
    constructor(startX: number, startY: number, endX: number, endY: number) {
        super('dribble', startX, startY, endX, endY);
    }
    draw(ctx: CanvasRenderingContext2D) {
        this.drawArrowPath(ctx, '#ef4444', false);
    }
    getFinalPosition() { 
        if (this.pathType === 'straight') return { x: this.endX, y: this.endY };
        if (this.points.length > 0) return this.points[this.points.length - 1];
        return { x: this.startX, y: this.startY };
    }
}

export class ShootAction extends BaseAction {
    public speed: number | null = null;
    public gesture: string = 'pegada';
    constructor(startX: number, startY: number, endX: number, endY: number) {
        super('shoot', startX, startY, endX, endY);
    }
    draw(ctx: CanvasRenderingContext2D) {
        this.drawArrowPath(ctx, '#22c55e', false);
    }
    getFinalPosition() { return { x: this.startX, y: this.startY }; } 
}

export class TackleAction extends BaseAction {
    public radius: number = 25;
    constructor(startX: number, startY: number, endX: number, endY: number) {
        super('tackle', startX, startY, endX, endY);
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.startX, this.startY, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.isSelected ? '#fff' : '#eab308';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    getFinalPosition() { return { x: this.startX, y: this.startY }; }
}

export class TurnAction extends BaseAction {
    public angle: number = 0;
    constructor(startX: number, startY: number, endX: number, endY: number) {
        super('turn', startX, startY, endX, endY);
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.startX, this.startY, 19, 0, Math.PI * 2); 
        ctx.strokeStyle = this.isSelected ? '#fff' : '#eab308';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.stroke();
    }
    getFinalPosition() { return { x: this.startX, y: this.startY }; }
}
