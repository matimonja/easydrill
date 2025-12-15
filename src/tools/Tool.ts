/**
 * Interface for all tools in the application.
 * Follows the State Pattern to handle input events based on the active tool.
 */
export interface Tool {
    /**
     * Called when the mouse button is pressed.
     * @param e MouseEvent
     */
    onMouseDown(e: MouseEvent): void;

    /**
     * Called when the mouse moves.
     * @param e MouseEvent
     */
    onMouseMove(e: MouseEvent): void;

    /**
     * Called when the mouse button is released.
     * @param e MouseEvent
     */
    onMouseUp(e: MouseEvent): void;

    /**
     * Called during the render loop to allow the tool to draw custom visuals
     * (e.g., temporary shapes, selection boxes, guides).
     * @param ctx CanvasRenderingContext2D
     */
    render(ctx: CanvasRenderingContext2D): void;

    /**
     * Called when the tool becomes active.
     */
    activate(): void;

    /**
     * Called when the tool is deactivated.
     */
    deactivate(): void;
}

