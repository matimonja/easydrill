import { IGameContext } from '../core/Interfaces';
import { Tool, PointerLikeEvent } from './Tool';

/**
 * Abstract base class for tools.
 * Provides access to the Game Context and default no-op implementations.
 */
export abstract class BaseTool implements Tool {
    constructor(protected game: IGameContext) {}

    abstract onMouseDown(e: PointerLikeEvent): void;
    abstract onMouseMove(e: PointerLikeEvent): void;
    abstract onMouseUp(e: PointerLikeEvent): void;

    render(ctx: CanvasRenderingContext2D): void {}

    activate(): void {}
    deactivate(): void {}

    /**
     * Helper to get world coordinates from a pointer event (mouse or touch).
     */
    protected getWorldPoint(e: PointerLikeEvent): { x: number, y: number } {
        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        return this.game.camera.screenToWorld(mouseX, mouseY, this.game.canvas);
    }
}

