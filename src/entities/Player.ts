import { Entity, IActionOwner } from '../core/Interfaces';
import { BaseAction } from './Action';
import { DEFAULT_BALL_COLOR } from '../config/defaults';

export class Player implements Entity, IActionOwner {
  public id: string;
  public x: number;
  public y: number;
  public color: string;
  public number: string;
  public isSelected: boolean = false;
  
  public team: string = 'A';
  public hasBall: boolean = false;
  /** Color de la bocha que posee (modo reproducción). Por defecto el del jugador. */
  public ballColor?: string;
  public description: string = '';
  
  public actions: BaseAction[] = [];
  
  public initialX: number;
  public initialY: number;
  public rotation: number = 0;
  
  private sceneDeltaX: number = 0;
  private sceneDeltaY: number = 0;
  
  private radius: number = 15;

  constructor(x: number, y: number, number: string = "1", color: string = "#ef4444") {
    this.id = crypto.randomUUID();
    this.x = x;
    this.y = y;
    this.initialX = x;
    this.initialY = y;
    this.number = number;
    this.color = color;
  }

  setPosition(x: number, y: number) {
    // We adjust initialX so that the resulting visual position matches 'x' given current scene delta.
    // currentVisual = initial + delta
    // targetVisual = x
    // targetInitial = x - delta
    this.initialX = x - this.sceneDeltaX;
    this.initialY = y - this.sceneDeltaY;
    
    this.x = x;
    this.y = y;
    
    this.updateActionChain();
  }
  
  updateForScene(sceneIndex: number) {
      // Calculate position at START of sceneIndex
      let currentX = this.initialX;
      let currentY = this.initialY;
      let currentRot = 0; // Default rotation
      
      for (const action of this.actions) {
          // Process all actions up to current scene to find start pos
          if (action.sceneIndex < sceneIndex) {
              action.setStartPosition(currentX, currentY);
              const final = action.getFinalPosition();
              currentX = final.x;
              currentY = final.y;
              
              if (action.movesPlayer) {
                  // Asumimos que termina mirando hacia donde iba
                  currentRot = action.getHeadingAt(1.0);
              }
          }
      }
      
      this.sceneDeltaX = currentX - this.initialX;
      this.sceneDeltaY = currentY - this.initialY;
      
      this.x = currentX;
      this.y = currentY;
      this.rotation = currentRot;
      
      // Now update the chain for the CURRENT scene (and future scenes)
      let simX = currentX;
      let simY = currentY;
      
      for (const action of this.actions) {
          if (action.sceneIndex >= sceneIndex) {
              action.setStartPosition(simX, simY);
              const final = action.getFinalPosition();
              simX = final.x;
              simY = final.y;
          }
      }
  }

  updateActionChain() {
      // Full simulation from initialX
      let currentX = this.initialX;
      let currentY = this.initialY;
      
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

  draw(ctx: CanvasRenderingContext2D, sceneIndex: number = 0) {
    // Draw Actions for current scene only
    this.actions.forEach(action => {
        if (action.sceneIndex === sceneIndex) {
            action.draw(ctx);
        }
    });

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
        const dist = 17; // aprox sqrt(12^2 + 12^2)
        const angle = this.rotation + (Math.PI / 4); // +45 grados
        const bx = this.x + Math.cos(angle) * dist;
        const by = this.y + Math.sin(angle) * dist;

        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.ballColor ?? DEFAULT_BALL_COLOR;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
  }
}
