import { Entity, IActionOwner } from '../core/Interfaces';
import { BaseAction } from './Action';

export class Player implements Entity, IActionOwner {
  public id: string;
  public x: number;
  public y: number;
  public color: string;
  public number: string;
  public isSelected: boolean = false;
  
  public team: string = 'A';
  public hasBall: boolean = false;
  public description: string = '';
  
  public actions: BaseAction[] = [];

  private radius: number = 15;

  constructor(x: number, y: number, number: string = "1", color: string = "#ef4444") {
    this.id = crypto.randomUUID();
    this.x = x;
    this.y = y;
    this.number = number;
    this.color = color;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    
    // Update chain instead of translating actions
    this.updateActionChain();
  }

  updateActionChain() {
      let currentX = this.x;
      let currentY = this.y;
      
      for (const action of this.actions) {
          action.setStartPosition(currentX, currentY);
          const final = action.getFinalPosition();
          currentX = final.x;
          currentY = final.y;
      }
  }

  containsPoint(px: number, py: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    return (dx * dx + dy * dy) <= (this.radius * this.radius);
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw Actions
    this.actions.forEach(action => action.draw(ctx));

    if (this.isSelected) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.number, this.x, this.y);

    if (this.hasBall) {
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 12, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA500';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
  }
}

