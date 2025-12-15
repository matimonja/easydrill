import { describe, it, expect } from 'vitest';
import { RunAction, PassAction, ShootAction, DribbleAction, TurnAction, TackleAction } from '../../entities/Action';
import { Player } from '../../entities/Player';

describe('Actions', () => {
    it('should initialize with coordinates', () => {
        const action = new RunAction(0, 0, 100, 100);
        expect(action.startX).toBe(0);
        expect(action.endX).toBe(100);
        expect(action.type).toBe('run');
    });

    it('RunAction should change final position (Straight)', () => {
        const action = new RunAction(0, 0, 50, 50);
        const final = action.getFinalPosition();
        expect(final.x).toBe(50);
        expect(final.y).toBe(50);
    });

    it('PassAction should NOT change final position', () => {
        const action = new PassAction(0, 0, 50, 50);
        const final = action.getFinalPosition();
        expect(final.x).toBe(0);
        expect(final.y).toBe(0);
    });

    it('ShootAction should NOT change final position', () => {
        const action = new ShootAction(0, 0, 50, 50);
        expect(action.getFinalPosition().x).toBe(0);
    });
    
    it('DribbleAction should change final position', () => {
        const action = new DribbleAction(0, 0, 50, 50);
        expect(action.getFinalPosition().x).toBe(50);
    });
    
    it('should support freehand points', () => {
        const action = new RunAction(0, 0, 10, 10);
        action.pathType = 'freehand';
        action.points = [{x:0, y:0}, {x:5, y:5}, {x:10, y:10}];
        
        const final = action.getFinalPosition();
        expect(final.x).toBe(10);
        expect(final.y).toBe(10);
    });

    it('should detect hit on freehand path', () => {
        const action = new RunAction(0, 0, 10, 10);
        action.pathType = 'freehand';
        action.points = [{x:0, y:0}, {x:10, y:0}]; 
        
        expect(action.containsPoint(5, 0)).toBe(true);
        expect(action.containsPoint(5, 5)).toBe(true);
        expect(action.containsPoint(5, 50)).toBe(false);
    });

    it('TurnAction should detect hit near center', () => {
        const action = new TurnAction(10, 10, 10, 10);
        expect(action.containsPoint(10, 10)).toBe(true);
        expect(action.containsPoint(25, 25)).toBe(true);
        expect(action.containsPoint(40, 40)).toBe(false);
    });

    it('should update chain on resize', () => {
        const player = new Player(0, 0);
        const action1 = new RunAction(0, 0, 10, 10);
        action1.owner = player;
        player.actions.push(action1);
        
        const action2 = new PassAction(10, 10, 20, 20); // Starts at 10,10
        action2.owner = player;
        player.actions.push(action2);
        
        // Resize action1 end to 15,15
        action1.resize('end', 15, 15);
        
        // Action1 end should be 15,15
        expect(action1.endX).toBe(15);
        expect(action1.endY).toBe(15);
        
        // Action2 start should be 15,15 (chain updated via owner)
        expect(action2.startX).toBe(15);
        expect(action2.startY).toBe(15);
        
        // Action2 end should preserve relative vector (10,10) -> 25,25
        expect(action2.endX).toBe(25);
        expect(action2.endY).toBe(25);
    });
});

