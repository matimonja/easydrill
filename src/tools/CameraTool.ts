import { PointerLikeEvent } from './Tool';
import { BaseTool } from './BaseTool';

/**
 * Tool for camera manipulation (panning).
 * Zoom and Rotation are handled globally or via UI buttons, 
 * but Pan requires mouse interaction on the canvas.
 */
export class CameraTool extends BaseTool {
    private isPanning: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    
    private _isPanEnabled: boolean = false;

    public get isPanEnabled(): boolean {
        return this._isPanEnabled;
    }

    public setPanEnabled(enabled: boolean) {
        this._isPanEnabled = enabled;
        if (!enabled) {
            this.isPanning = false;
        }
    }

    onMouseDown(e: PointerLikeEvent): void {
        if (this._isPanEnabled) {
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    onMouseMove(e: PointerLikeEvent): void {
        if (this.isPanning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.game.camera.pan(dx, dy);
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    onMouseUp(e: PointerLikeEvent): void {
        this.isPanning = false;
    }
    
    deactivate(): void {
        this.isPanning = false;
    }
}

