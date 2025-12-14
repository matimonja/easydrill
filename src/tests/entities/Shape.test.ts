import { describe, it, expect } from 'vitest';
import { RectangleShape, EllipseShape, TriangleShape } from '../../entities/Shape';

describe('RectangleShape', () => {
    it('should initialize with default values', () => {
        const rect = new RectangleShape(100, 100);
        expect(rect.x).toBe(100);
        expect(rect.y).toBe(100);
        expect(rect.width).toBe(0);
        expect(rect.height).toBe(0);
    });

    it('should detect point inside', () => {
        const rect = new RectangleShape(0, 0);
        rect.width = 100;
        rect.height = 100;
        // Center is 0,0. Range: -50 to 50
        expect(rect.containsPointLocal(0, 0)).toBe(true);
        expect(rect.containsPointLocal(49, 49)).toBe(true);
        expect(rect.containsPointLocal(51, 51)).toBe(false);
    });
});

describe('TriangleShape', () => {
    it('should initialize with 3 points', () => {
        const tri = new TriangleShape(0, 0);
        expect(tri.points.length).toBe(3);
    });
    
    it('should have handles', () => {
        const tri = new TriangleShape(0, 0);
        const handles = tri.getHandles();
        expect(handles.length).toBeGreaterThan(0);
        expect(handles.find(h => h.id === 'rotate')).toBeDefined();
    });
});
