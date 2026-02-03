import { BaseTool } from './BaseTool';
import { Player } from '../entities/Player';
import { AddEntityCommand } from '../core/Commands';

/**
 * Tool for creating Player entities.
 * Creates a new player on click and switches back to Select tool.
 */
export class PlayerTool extends BaseTool {
    private team: string = 'A';
    private color: string = '#ef4444';
    private quantity: number = 1;

    public setTeam(team: string) { this.team = team; }
    public setColor(color: string) { this.color = color; }
    public setQuantity(quantity: number) { this.quantity = Math.max(1, quantity); }

    public getTeam() { return this.team; }
    public getColor() { return this.color; }
    public getQuantity() { return this.quantity; }

    onMouseDown(e: MouseEvent): void {
        const worldPos = this.getWorldPoint(e);
        
        for (let i = 0; i < this.quantity; i++) {
            const offset = i * 15; // 15px offset for each subsequent player
            const num = (this.game.entities.filter(e => e instanceof Player).length + 1).toString();
            const newPlayer = new Player(worldPos.x + offset, worldPos.y + offset, num, this.color);
            newPlayer.team = this.team;
            
            this.game.commandManager.execute(new AddEntityCommand(this.game, newPlayer));
        }
        
        // Removed tool switch to allow continuous creation
        // Removed selection to keep focus on creation tool
    }

    onMouseMove(e: MouseEvent): void {}
    onMouseUp(e: MouseEvent): void {}
}

