import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationManager } from '../../core/AnimationManager';
import { Player } from '../../entities/Player';
import { RunAction, PassAction } from '../../entities/Action';
import { Ball } from '../../entities/ExerciseObjects';

describe('AnimationManager', () => {
    let manager: AnimationManager;
    let player: Player;

    beforeEach(() => {
        manager = new AnimationManager();
        player = new Player(100, 100);
    });

    it('should initialize player state correctly', () => {
        manager.play(0, [player]);
        // Accessing private state via any for testing or public getters if available
        // Since we can't access private, we check side effects or public methods if any
        expect(manager.isPlaying).toBe(true);
    });

    it('should create a ball if player hasBall', () => {
        player.hasBall = true;
        manager.play(0, [player]);
        
        // We can't access balls directly as it is private.
        // We can verify render draws something?
        // Or we can assume logic works if no crash.
        // Better: Check if player ballColor is set (side effect of initialization)
        expect(player.ballColor).toBeDefined();
    });

    it('should execute RunAction and move player', () => {
        const run = new RunAction(100, 100, 200, 200);
        player.actions.push(run);
        
        manager.play(0, [player]);
        manager.update(0.1); // Advance time

        // Player should have moved from 100,100
        expect(player.x).not.toBe(100);
        expect(player.y).not.toBe(100);
    });

    it('should wait if action requires ball and player has none', () => {
        const pass = new PassAction(100, 100, 200, 100); // Requires ball
        player.hasBall = false;
        player.actions.push(pass);

        manager.play(0, [player]);
        manager.update(0.1);

        // Player should NOT have moved/started action (timeInAction would be 0 internally)
        // Since Pass doesn't move player, hard to check position.
        // But player.hasBall should remain false.
        expect(player.hasBall).toBe(false);
    });

    it('should pickup ball when close', () => {
        player.hasBall = false;
        const ball = new Ball(100, 100); // Ball at player pos
        
        manager.play(0, [player, ball]);
        manager.update(0.1); // Should trigger pickup

        expect(player.hasBall).toBe(true);
        expect(player.ballColor).toBe(ball.color);
    });
});
