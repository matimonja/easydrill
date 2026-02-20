/**
 * Event type for pointer/mouse input. PointerEvent is used so the same API
 * works for mouse (desktop) and touch/pen (mobile, tablet).
 */
export type PointerLikeEvent = PointerEvent;

/**
 * Interface for all tools in the application.
 * Follows the State Pattern to handle input events based on the active tool.
 * Uses PointerLikeEvent so tools work with both mouse and touch.
 */
export interface Tool {
    /**
     * Called when the pointer is pressed (mouse down or touch start).
     * @param e PointerEvent (has clientX, clientY; works for mouse and touch)
     */
    onMouseDown(e: PointerLikeEvent): void;

    /**
     * Called when the pointer moves.
     * @param e PointerEvent
     */
    onMouseMove(e: PointerLikeEvent): void;

    /**
     * Called when the pointer is released (mouse up or touch end).
     * @param e PointerEvent
     */
    onMouseUp(e: PointerLikeEvent): void;

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

