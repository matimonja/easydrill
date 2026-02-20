import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShapeTool } from '../../tools/ShapeTool';
import { IGameContext } from '../../core/Interfaces';
import { RectangleShape } from '../../entities/Shape';
import type { PointerLikeEvent } from '../../tools/Tool';

/** Creates a pointer-like event for tests (jsdom may not have PointerEvent). */
function pointerEvent(type: string, clientX: number, clientY: number): PointerLikeEvent {
    return { clientX, clientY, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, cancelable: true, bubbles: true } as unknown as PointerLikeEvent;
}

describe('ShapeTool', () => {
    let mockGame: IGameContext;
    let tool: ShapeTool;

    beforeEach(() => {
        mockGame = {
            canvas: document.createElement('canvas'),
            ctx: document.createElement('canvas').getContext('2d')!,
            camera: { 
                screenToWorld: vi.fn((x, y) => ({ x, y })), 
                zoom: 1 
            } as any,
            commandManager: { execute: vi.fn() } as any,
            entities: [],
            addEntity: vi.fn(),
            removeEntity: vi.fn(),
            selectEntity: vi.fn(),
            setTool: vi.fn(),
            getSelectedEntity: vi.fn(),
            updateSelectionUI: vi.fn()
        };
        tool = new ShapeTool(mockGame);
    });

    it('should start drawing on pointer down', () => {
        tool.setShapeType('rectangle');
        tool.onMouseDown(pointerEvent('pointerdown', 10, 10));
        // Cannot easily check private state `isDrawing`, but we can check side effects on pointer up
        // or ensure no errors thrown
    });

    it('should create entity on drag and pointer up', () => {
        tool.setShapeType('rectangle');
        tool.onMouseDown(pointerEvent('pointerdown', 0, 0));
        tool.onMouseMove(pointerEvent('pointermove', 100, 100));
        tool.onMouseUp(pointerEvent('pointerup', 100, 100));
        expect(mockGame.commandManager.execute).toHaveBeenCalled();
        expect(mockGame.selectEntity).toHaveBeenCalled();
        expect(mockGame.setTool).toHaveBeenCalledWith('select');
    });

    it('should NOT create entity if too small', () => {
        tool.setShapeType('rectangle');
        tool.onMouseDown(pointerEvent('pointerdown', 0, 0));
        tool.onMouseMove(pointerEvent('pointermove', 0, 0)); // No move
        tool.onMouseUp(pointerEvent('pointerup', 0, 0));
        expect(mockGame.commandManager.execute).not.toHaveBeenCalled();
    });
});

