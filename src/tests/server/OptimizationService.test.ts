import { describe, it, expect } from 'vitest';
import { OptimizationService } from '@server/services/OptimizationService';
import type { DrillState, DrillPlayer, DrillAction } from '../../../../shared/types';

function makeAction(overrides: Partial<DrillAction> & { type: DrillAction['type']; startX: number; startY: number; endX: number; endY: number }): DrillAction {
    return {
        id: `act-${Math.random().toString(36).slice(2)}`,
        type: overrides.type,
        startX: overrides.startX,
        startY: overrides.startY,
        endX: overrides.endX,
        endY: overrides.endY,
        config: { preEvent: 'auto', postEvent: 'auto' },
        pathType: 'straight',
        points: [],
        sceneIndex: 0,
        ...overrides,
    };
}

function makePlayer(id: string, actions: DrillAction[]): DrillPlayer {
    return {
        id,
        x: 0,
        y: 0,
        initialX: 0,
        initialY: 0,
        number: id,
        actions,
        hasBall: actions.length > 0,
        team: 'A',
    };
}

describe('OptimizationService', () => {
    const service = new OptimizationService();

    describe('computeIdleTime', () => {
        it('devuelve 0 cuando no hay waitBefore en ninguna acción', () => {
            const state: DrillState = {
                players: [
                    makePlayer('p1', [
                        makeAction({ type: 'run', startX: 0, startY: 0, endX: 100, endY: 0 }),
                    ]),
                ],
            };
            expect(service.computeIdleTime(state)).toBe(0);
        });

        it('cuenta solo waitBefore después de que el jugador ya se movió', () => {
            const state: DrillState = {
                players: [
                    makePlayer('p1', [
                        makeAction({ type: 'run', startX: 0, startY: 0, endX: 100, endY: 0 }),
                        makeAction({ type: 'run', startX: 100, startY: 0, endX: 200, endY: 0, waitBefore: 1.5 }),
                    ]),
                ],
            };
            expect(service.computeIdleTime(state)).toBe(1.5);
        });

        it('no cuenta tiempo antes de la primera acción (jugador inmóvil al inicio)', () => {
            const state: DrillState = {
                players: [
                    makePlayer('p1', [
                        makeAction({ type: 'run', startX: 0, startY: 0, endX: 100, endY: 0, waitBefore: 2 }),
                    ]),
                ],
            };
            expect(service.computeIdleTime(state)).toBe(0);
        });
    });

    describe('optimize', () => {
        it('no modifica speed cuando la acción ya tiene speed definido (check marcado)', () => {
            const run = makeAction({ type: 'run', startX: 0, startY: 0, endX: 100, endY: 0, speed: 50 });
            const state: DrillState = {
                players: [makePlayer('p1', [run])],
            };
            const out = service.optimize(state);
            expect(out.players[0].actions[0].speed).toBe(50);
        });

        it('solo modifica preEvent cuando está en Auto', () => {
            const run = makeAction({
                type: 'run',
                startX: 0,
                startY: 0,
                endX: 100,
                endY: 0,
                config: { preEvent: 'inmediato', postEvent: 'auto' },
            });
            const state: DrillState = { players: [makePlayer('p1', [run])] };
            const out = service.optimize(state);
            expect(out.players[0].actions[0].config.preEvent).toBe('inmediato');
        });

        it('puede setear preEvent esperar cuando preEvent es auto y hay slack', () => {
            const run = makeAction({
                type: 'run',
                startX: 0,
                startY: 0,
                endX: 50,
                endY: 0,
                config: { preEvent: 'auto', postEvent: 'auto' },
            });
            const state: DrillState = { players: [makePlayer('p1', [run])] };
            const out = service.optimize(state);
            const act = out.players[0].actions[0];
            expect(act.config.preEvent === 'auto' || act.config.preEvent.startsWith('esperar:')).toBe(true);
        });

        it('devuelve estado con acciones modificables (speed en rango 0-100 cuando se asigna)', () => {
            const run = makeAction({ type: 'run', startX: 0, startY: 0, endX: 200, endY: 0 });
            const state: DrillState = { players: [makePlayer('p1', [run])] };
            const out = service.optimize(state);
            const speed = out.players[0].actions[0].speed;
            if (speed != null) {
                expect(speed).toBeGreaterThanOrEqual(0);
                expect(speed).toBeLessThanOrEqual(100);
            }
        });

        it('no acelera a máxima acciones que no están en sincronización', () => {
            const run = makeAction({ type: 'run', startX: 0, startY: 0, endX: 100, endY: 0 });
            const state: DrillState = { players: [makePlayer('p1', [run])] };
            const out = service.optimize(state);
            const act = out.players[0].actions[0];
            expect(act.speed).not.toBe(100);
        });

        it('no modifica postEvent cuando no es Auto', () => {
            const run = makeAction({
                type: 'run',
                startX: 0,
                startY: 0,
                endX: 100,
                endY: 0,
                config: { preEvent: 'auto', postEvent: 'inmediato' },
            });
            const state: DrillState = { players: [makePlayer('p1', [run])] };
            const out = service.optimize(state);
            expect(out.players[0].actions[0].config.postEvent).toBe('inmediato');
        });

        it('mantiene estructura del estado (mismo número de jugadores y acciones)', () => {
            const state: DrillState = {
                players: [
                    makePlayer('p1', [makeAction({ type: 'run', startX: 0, startY: 0, endX: 50, endY: 0 })]),
                    makePlayer('p2', [makeAction({ type: 'run', startX: 100, startY: 100, endX: 150, endY: 100 })]),
                ],
            };
            const out = service.optimize(state);
            expect(out.players).toHaveLength(2);
            expect(out.players[0].actions).toHaveLength(1);
            expect(out.players[1].actions).toHaveLength(1);
        });

        it('asigna waitBefore al receptor cuando pase largo y run corto (sync)', () => {
            const state: DrillState = {
                players: [
                    makePlayer('pasador', [
                        makeAction({ type: 'pass', startX: -164, startY: -86.5, endX: 208, endY: -87.5 }),
                    ]),
                    makePlayer('receptor', [
                        makeAction({ type: 'run', startX: 199, startY: -11.5, endX: 210, endY: -88.5 }),
                        makeAction({ type: 'dribble', startX: 210, startY: -88.5, endX: 310, endY: 17.5 }),
                    ]),
                ],
            };
            (state.players[0] as DrillPlayer).hasBall = true;
            (state.players[1] as DrillPlayer).hasBall = false;
            const out = service.optimize(state);
            const runReceptor = out.players[1].actions[0];
            expect(runReceptor.type).toBe('run');
            expect(runReceptor.waitBefore).toBeGreaterThan(0);
        });
    });
});
