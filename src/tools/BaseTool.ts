import { IGameContext } from '../core/Interfaces';
import { Tool } from './Tool';

/**
 * Abstract base class for tools.
 * Provides access to the Game Context and default no-op implementations.
 */
export abstract class BaseTool implements Tool {
    constructor(protected game: IGameContext) {}

    abstract onMouseDown(e: MouseEvent): void;
    abstract onMouseMove(e: MouseEvent): void;
    abstract onMouseUp(e: MouseEvent): void;

    render(ctx: CanvasRenderingContext2D): void {}

    activate(): void {}
    deactivate(): void {}

    /**
     * Helper to get world coordinates from a mouse event.
     */
    protected getWorldPoint(e: MouseEvent): { x: number, y: number } {
        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        return this.game.camera.screenToWorld(mouseX, mouseY, this.game.canvas);
    }
}

