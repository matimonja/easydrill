import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShapeTool } from '../../tools/ShapeTool';
import { IGameContext } from '../../core/Interfaces';
import { RectangleShape } from '../../entities/Shape';

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

    it('should start drawing on mouse down', () => {
        tool.setShapeType('rectangle');
        const event = new MouseEvent('mousedown', { clientX: 10, clientY: 10 });
        
        tool.onMouseDown(event);
        
        // Cannot easily check private state `isDrawing`, but we can check side effects on mouse up
        // or ensure no errors thrown
    });

    it('should create entity on drag and mouse up', () => {
        tool.setShapeType('rectangle');
        
        // Down
        tool.onMouseDown(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }));
        
        // Move
        tool.onMouseMove(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
        
        // Up
        tool.onMouseUp(new MouseEvent('mouseup', { clientX: 100, clientY: 100 }));
        
        expect(mockGame.commandManager.execute).toHaveBeenCalled();
        expect(mockGame.selectEntity).toHaveBeenCalled();
        expect(mockGame.setTool).toHaveBeenCalledWith('select');
    });

    it('should NOT create entity if too small', () => {
        tool.setShapeType('rectangle');
        tool.onMouseDown(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }));
        tool.onMouseMove(new MouseEvent('mousemove', { clientX: 0, clientY: 0 })); // No move
        tool.onMouseUp(new MouseEvent('mouseup', { clientX: 0, clientY: 0 }));
        
        expect(mockGame.commandManager.execute).not.toHaveBeenCalled();
    });
});
