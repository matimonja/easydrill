import { BaseTool } from './BaseTool';
import { Player } from '../entities/Player';
import { BaseAction, ActionType, RunAction, PassAction, DribbleAction, ShootAction, TackleAction, TurnAction } from '../entities/Action';
import { AddActionCommand } from '../core/Commands';

export class ActionTool extends BaseTool {
    private currentPlayer: Player | null = null;
    private actionType: ActionType = 'run';
    private lineType: 'straight' | 'freehand' = 'straight';
    private isDrawing: boolean = false;
    private tempAction: BaseAction | null = null;

    public setContext(player: Player, type: ActionType, lineType: 'straight' | 'freehand') {
        this.currentPlayer = player;
        this.actionType = type;
        this.lineType = lineType;
    }

    onMouseDown(e: MouseEvent): void {
        if (!this.currentPlayer) return;
        
        const worldPos = this.getWorldPoint(e);
        
        // Calculate start position based on chain
        let startX = this.currentPlayer.x;
        let startY = this.currentPlayer.y;
        
        if (this.currentPlayer.actions.length > 0) {
            const lastAction = this.currentPlayer.actions[this.currentPlayer.actions.length - 1];
            const finalPos = lastAction.getFinalPosition();
            startX = finalPos.x;
            startY = finalPos.y;
        }

        // Handle Instant Actions (No Drag)
        if (this.actionType === 'turn' || this.actionType === 'tackle') {
            let action: BaseAction;
            if (this.actionType === 'turn') {
                action = new TurnAction(startX, startY, startX, startY);
            } else {
                action = new TackleAction(startX, startY, startX, startY);
            }
            // Set owner happens in command
            
            this.game.commandManager.execute(new AddActionCommand(this.currentPlayer, action));
            
            // Select Player and switch to Select tool (mimicking arrow behavior)
            this.game.selectEntity(this.currentPlayer);
            this.game.setTool('select');
            return;
        }

        // Create Drag Action
        const endX = this.lineType === 'straight' ? worldPos.x : startX;
        const endY = this.lineType === 'straight' ? worldPos.y : startY;

        switch (this.actionType) {
            case 'run': this.tempAction = new RunAction(startX, startY, endX, endY); break;
            case 'pass': this.tempAction = new PassAction(startX, startY, endX, endY); break;
            case 'dribble': this.tempAction = new DribbleAction(startX, startY, endX, endY); break;
            case 'shoot': this.tempAction = new ShootAction(startX, startY, endX, endY); break;
            default: this.tempAction = new RunAction(startX, startY, endX, endY);
        }

        this.tempAction.pathType = this.lineType;
        this.tempAction.owner = this.currentPlayer; // Set owner for temp action too

        if (this.lineType === 'freehand') {
            this.tempAction.points = [{x: startX, y: startY}];
        }

        this.isDrawing = true;
    }

    onMouseMove(e: MouseEvent): void {
        if (this.isDrawing && this.tempAction) {
            const worldPos = this.getWorldPoint(e);
            
            if (this.lineType === 'straight') {
                this.tempAction.endX = worldPos.x;
                this.tempAction.endY = worldPos.y;
            } else {
                // Freehand
                this.tempAction.points.push(worldPos);
                this.tempAction.endX = worldPos.x;
                this.tempAction.endY = worldPos.y;
            }
        }
    }

    onMouseUp(e: MouseEvent): void {
        if (this.isDrawing && this.tempAction && this.currentPlayer) {
            this.game.commandManager.execute(new AddActionCommand(this.currentPlayer, this.tempAction));
            
            this.game.selectEntity(this.currentPlayer);
            this.game.setTool('select');
        }
        
        this.isDrawing = false;
        this.tempAction = null;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.isDrawing && this.tempAction) {
            this.tempAction.draw(ctx);
        }
    }
}
