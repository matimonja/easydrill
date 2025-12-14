import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandManager, Command } from '../../core/CommandManager';

describe('CommandManager', () => {
    let manager: CommandManager;

    beforeEach(() => {
        manager = new CommandManager();
    });

    it('should execute a command', () => {
        const cmd: Command = { execute: vi.fn(), undo: vi.fn() };
        manager.execute(cmd);
        expect(cmd.execute).toHaveBeenCalled();
    });

    it('should undo a command', () => {
        const cmd: Command = { execute: vi.fn(), undo: vi.fn() };
        manager.execute(cmd);
        manager.undo();
        expect(cmd.undo).toHaveBeenCalled();
    });

    it('should redo a command', () => {
        const cmd: Command = { execute: vi.fn(), undo: vi.fn() };
        manager.execute(cmd);
        manager.undo();
        manager.redo();
        expect(cmd.execute).toHaveBeenCalledTimes(2); // Once initially, once on redo
    });

    it('should clear redo stack on new execute', () => {
        const cmd1: Command = { execute: vi.fn(), undo: vi.fn() };
        const cmd2: Command = { execute: vi.fn(), undo: vi.fn() };
        
        manager.execute(cmd1);
        manager.undo();
        manager.execute(cmd2);
        manager.redo(); // Should do nothing as redo stack is cleared
        
        expect(cmd1.execute).toHaveBeenCalledTimes(1);
    });
});
