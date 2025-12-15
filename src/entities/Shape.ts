import { Entity } from '../core/Interfaces';
import { DEFAULT_SHAPE_CONFIG } from '../config/defaults';

export interface Handle {
  id: string; // 'tl', 'tr', 'start', 'end', 'p0', 'p1', 'rotate', etc.
  x: number; // local x
  y: number; // local y
  cursor: string; // cursor style
}

export abstract class BaseShape implements Entity {
  public id: string;
  public x: number;
  public y: number;
  public rotation: number = 0;
  public color: string = DEFAULT_SHAPE_CONFIG.color; 
  public isSelected: boolean = false;
  public lineWidth: number = 3;
  
  public strokeType: 'solid' | 'dashed' | 'dotted' = DEFAULT_SHAPE_CONFIG.strokeType;
  public hasFill: boolean = DEFAULT_SHAPE_CONFIG.hasFill;
  public fillOpacity: number = DEFAULT_SHAPE_CONFIG.fillOpacity;

  constructor(x: number, y: number, color: string = DEFAULT_SHAPE_CONFIG.color) {
    this.id = crypto.randomUUID();
    this.x = x;
    this.y = y;
    this.color = color;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  abstract drawShape(ctx: CanvasRenderingContext2D): void;
  abstract containsPointLocal(localX: number, localY: number): boolean;
  abstract getHandles(): Handle[];
  abstract resize(handleId: string, localX: number, localY: number): void;

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isSelected) {
      ctx.shadowColor = 'yellow';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'yellow';
    } else {
      ctx.strokeStyle = this.color;
    }
    
    // Apply Line Type
    if (this.strokeType === 'dashed') ctx.setLineDash([10, 5]);
    else if (this.strokeType === 'dotted') ctx.setLineDash([2, 5]);
    else ctx.setLineDash([]);

    ctx.lineWidth = this.lineWidth;
    
    this.drawShape(ctx);

    ctx.restore();
  }

  protected getFillColor(): string {
       let c = this.color.startsWith('#') ? this.color.slice(1) : this.color;
       if (c.length === 3) c = c.split('').map(x=>x+x).join('');
       const r = parseInt(c.substring(0,2), 16) || 0;
       const g = parseInt(c.substring(2,4), 16) || 0;
       const b = parseInt(c.substring(4,6), 16) || 0;
       return `rgba(${r},${g},${b},${this.fillOpacity})`;
  }

  containsPoint(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    return this.containsPointLocal(localX, localY);
  }

  protected rotatePoint(x: number, y: number, angle: number): {x: number, y: number} {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
          x: x * cos - y * sin,
          y: x * sin + y * cos
      };
  }
}

export class RectangleShape extends BaseShape {
  public width: number = 0;
  public height: number = 0;

  drawShape(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
    
    if (this.hasFill) {
        ctx.fillStyle = this.getFillColor();
        ctx.fill();
    }
    ctx.stroke();
  }

  containsPointLocal(lx: number, ly: number): boolean {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const tol = 10; 

    const onLeft = Math.abs(lx - (-hw)) < tol && ly >= -hh - tol && ly <= hh + tol;
    const onRight = Math.abs(lx - hw) < tol && ly >= -hh - tol && ly <= hh + tol;
    const onTop = Math.abs(ly - (-hh)) < tol && lx >= -hw - tol && lx <= hw + tol;
    const onBottom = Math.abs(ly - hh) < tol && lx >= -hw - tol && lx <= hw + tol;

    const inside = (Math.abs(lx) <= hw && Math.abs(ly) <= hh);

    return onLeft || onRight || onTop || onBottom || inside;
  }

  getHandles(): Handle[] {
      const hw = this.width / 2;
      const hh = this.height / 2;
      return [
          { id: 'tl', x: -hw, y: -hh, cursor: 'nw-resize' },
          { id: 'tr', x: hw, y: -hh, cursor: 'ne-resize' },
          { id: 'br', x: hw, y: hh, cursor: 'se-resize' },
          { id: 'bl', x: -hw, y: hh, cursor: 'sw-resize' },
          { id: 'rotate', x: 0, y: -hh - 25, cursor: 'grab' }
      ];
  }

  resize(handleId: string, lx: number, ly: number): void {
      const hw = this.width / 2;
      const hh = this.height / 2;
      let anchorX = 0;
      let anchorY = 0;

      if (handleId === 'tl') { anchorX = hw; anchorY = hh; }
      else if (handleId === 'tr') { anchorX = -hw; anchorY = hh; }
      else if (handleId === 'br') { anchorX = -hw; anchorY = -hh; }
      else if (handleId === 'bl') { anchorX = hw; anchorY = -hh; }

      const newWidth = Math.abs(lx - anchorX);
      const newHeight = Math.abs(ly - anchorY);

      const midX = (lx + anchorX) / 2;
      const midY = (ly + anchorY) / 2;

      this.width = Math.max(1, newWidth);
      this.height = Math.max(1, newHeight);

      const shift = this.rotatePoint(midX, midY, this.rotation);
      this.x += shift.x;
      this.y += shift.y;
  }
}

export class EllipseShape extends BaseShape {
  public radiusX: number = 0;
  public radiusY: number = 0;

  drawShape(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0, this.radiusX), Math.max(0, this.radiusY), 0, 0, 2 * Math.PI);
    
    if (this.hasFill) {
        ctx.fillStyle = this.getFillColor();
        ctx.fill();
    }
    ctx.stroke();
    
    if (this.isSelected) {
        ctx.save();
        ctx.strokeStyle = '#888';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.radiusX, -this.radiusY, this.radiusX * 2, this.radiusY * 2);
        ctx.restore();
    }
  }

  containsPointLocal(lx: number, ly: number): boolean {
    const rx = Math.max(1, this.radiusX);
    const ry = Math.max(1, this.radiusY);
    const val = (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry);
    return Math.abs(val - 1) < 0.2 || val <= 1; 
  }

  getHandles(): Handle[] {
      const rx = this.radiusX;
      const ry = this.radiusY;
      return [
          { id: 'tl', x: -rx, y: -ry, cursor: 'nw-resize' },
          { id: 'tr', x: rx, y: -ry, cursor: 'ne-resize' },
          { id: 'br', x: rx, y: ry, cursor: 'se-resize' },
          { id: 'bl', x: -rx, y: ry, cursor: 'sw-resize' },
          { id: 'rotate', x: 0, y: -ry - 25, cursor: 'grab' }
      ];
  }

  resize(handleId: string, lx: number, ly: number): void {
      const curRx = this.radiusX;
      const curRy = this.radiusY;
      let anchorX = 0;
      let anchorY = 0;

      if (handleId === 'tl') { anchorX = curRx; anchorY = curRy; }
      else if (handleId === 'tr') { anchorX = -curRx; anchorY = curRy; }
      else if (handleId === 'br') { anchorX = -curRx; anchorY = -curRy; }
      else if (handleId === 'bl') { anchorX = curRx; anchorY = -curRy; }

      const newWidth = Math.abs(lx - anchorX);
      const newHeight = Math.abs(ly - anchorY);

      const midX = (lx + anchorX) / 2;
      const midY = (ly + anchorY) / 2;

      this.radiusX = Math.max(1, newWidth / 2);
      this.radiusY = Math.max(1, newHeight / 2);

      const shift = this.rotatePoint(midX, midY, this.rotation);
      this.x += shift.x;
      this.y += shift.y;
  }
}

export class TriangleShape extends BaseShape {
  public points: {x: number, y: number}[] = [];

  constructor(x: number, y: number, color: string = DEFAULT_SHAPE_CONFIG.color) {
      super(x, y, color);
      this.points = [
          { x: 0, y: -50 },
          { x: 50, y: 50 },
          { x: -50, y: 50 }
      ];
  }

  drawShape(ctx: CanvasRenderingContext2D): void {
    if (this.points.length !== 3) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    ctx.lineTo(this.points[1].x, this.points[1].y);
    ctx.lineTo(this.points[2].x, this.points[2].y);
    ctx.closePath();
    
    if (this.hasFill) {
        ctx.fillStyle = this.getFillColor();
        ctx.fill();
    }
    ctx.stroke();
  }

  containsPointLocal(lx: number, ly: number): boolean {
    const minX = Math.min(...this.points.map(p => p.x));
    const maxX = Math.max(...this.points.map(p => p.x));
    const minY = Math.min(...this.points.map(p => p.y));
    const maxY = Math.max(...this.points.map(p => p.y));
    
    return lx >= minX - 10 && lx <= maxX + 10 && ly >= minY - 10 && ly <= maxY + 10;
  }

  getHandles(): Handle[] {
      const minY = Math.min(...this.points.map(p => p.y));
      const handles = this.points.map((p, i) => ({
          id: `p${i}`,
          x: p.x,
          y: p.y,
          cursor: 'move'
      }));
      handles.push({ id: 'rotate', x: 0, y: minY - 25, cursor: 'grab' });
      return handles;
  }

  resize(handleId: string, lx: number, ly: number): void {
      const idx = parseInt(handleId.charAt(1));
      if (!isNaN(idx) && this.points[idx]) {
          this.points[idx].x = lx;
          this.points[idx].y = ly;
      }
  }
}

export class LineShape extends BaseShape {
  public endX: number = 0;
  public endY: number = 0;
  public startMarker: 'none' | 'arrow' = DEFAULT_SHAPE_CONFIG.startMarker;
  public endMarker: 'none' | 'arrow' = DEFAULT_SHAPE_CONFIG.endMarker;

  drawShape(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();

    const angle = Math.atan2(this.endY, this.endX);
    if (this.startMarker === 'arrow') {
        this.drawArrow(ctx, 0, 0, angle + Math.PI);
    }
    if (this.endMarker === 'arrow') {
        this.drawArrow(ctx, this.endX, this.endY, angle);
    }
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, 5);
      ctx.lineTo(-15, -5);
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.setLineDash([]); 
      ctx.fill();
      ctx.restore();
  }

  containsPointLocal(lx: number, ly: number): boolean {
    const l2 = this.endX * this.endX + this.endY * this.endY;
    if (l2 === 0) return false;
    let t = ((lx * this.endX) + (ly * this.endY)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = t * this.endX;
    const projY = t * this.endY;
    const dist = Math.sqrt(Math.pow(lx - projX, 2) + Math.pow(ly - projY, 2));
    return dist < 10;
  }

  getHandles(): Handle[] {
      return [
          { id: 'start', x: 0, y: 0, cursor: 'move' },
          { id: 'end', x: this.endX, y: this.endY, cursor: 'move' }
      ];
  }

  resize(handleId: string, lx: number, ly: number): void {
      if (handleId === 'end') {
          this.endX = lx;
          this.endY = ly;
      } else if (handleId === 'start') {
          const shift = this.rotatePoint(lx, ly, this.rotation);
          this.x += shift.x;
          this.y += shift.y;
          this.endX -= lx;
          this.endY -= ly;
      }
  }
}

export class FreehandShape extends BaseShape {
  public points: {x: number, y: number}[] = [];
  public smoothingFactor: number = DEFAULT_SHAPE_CONFIG.smoothingFactor;

  drawShape(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;
    
    ctx.beginPath();
    
    if (this.smoothingFactor <= 1) {
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
    } else {
        const sampled = [];
        for (let i = 0; i < this.points.length; i += Math.ceil(this.smoothingFactor)) {
            sampled.push(this.points[i]);
        }
        if (sampled[sampled.length - 1] !== this.points[this.points.length - 1]) {
            sampled.push(this.points[this.points.length - 1]);
        }

        if (sampled.length < 2) {
             ctx.moveTo(this.points[0].x, this.points[0].y);
             return;
        }

        ctx.moveTo(sampled[0].x, sampled[0].y);
        
        for (let i = 1; i < sampled.length - 1; i++) {
             const cp = sampled[i];
             const next = sampled[i+1];
             const ep = { x: (cp.x + next.x) / 2, y: (cp.y + next.y) / 2 };
             ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
        }
        
        const last = sampled[sampled.length - 1];
        ctx.lineTo(last.x, last.y);
    }
    
    ctx.stroke();
  }

  containsPointLocal(lx: number, ly: number): boolean {
    for (const p of this.points) {
        const dx = lx - p.x;
        const dy = ly - p.y;
        if (dx*dx + dy*dy < 100) return true;
    }
    return false;
  }

  getHandles(): Handle[] { return []; }
  resize(id: string, lx: number, ly: number): void {}
}

