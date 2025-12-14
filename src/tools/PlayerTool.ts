import { BaseTool } from './BaseTool';
import { Player } from '../entities/Player';
import { AddEntityCommand } from '../core/Commands';

/**
 * Tool for creating Player entities.
 * Creates a new player on click and switches back to Select tool.
 */
export class PlayerTool extends BaseTool {
    onMouseDown(e: MouseEvent): void {
        const worldPos = this.getWorldPoint(e);
        const newPlayer = new Player(worldPos.x, worldPos.y, (this.game.entities.length + 1).toString());
        
        this.game.commandManager.execute(new AddEntityCommand(this.game, newPlayer));
        this.game.selectEntity(newPlayer);
        
        // We need a way to switch tool back to 'select'. 
        // Since we don't have a direct 'setTool' on IGameContext yet, 
        // we might need to add it or just rely on the user manually switching?
        // The original code did: this.setTool('select');
        // Let's add setTool to IGameContext? Or dispatch an event?
        // For now, I'll emit a custom event on the canvas or just assume the Game handles it if I add setTool to interface.
        
        // I will add setTool to IGameContext in the next step when updating Interfaces.ts, 
        // but for now I'll cast to any or just leave it commented if I can't.
        // Actually, the best way is to add it to the interface.
        (this.game as any).setTool('select');
    }

    onMouseMove(e: MouseEvent): void {}
    onMouseUp(e: MouseEvent): void {}
}
