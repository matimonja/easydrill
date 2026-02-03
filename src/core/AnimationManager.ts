import { Entity } from './Interfaces';
import { Player } from '../entities/Player';
import { Ball } from '../entities/ExerciseObjects';
import { DEFAULT_BALL_COLOR } from '../config/defaults';
import { ANIMATION_CONFIG } from '../config/animation';
import { BaseAction, RunAction, DribbleAction, PassAction, ShootAction, TurnAction, TackleAction } from '../entities/Action';

// Estado de la Bocha en la animación
interface BallState {
    id: string;                 
    status: 'held' | 'moving' | 'loose'; 
    ownerId: string | null;     
    lastOwnerId?: string | null;
    x: number;
    y: number;
    color: string;
}

// Estado de cada Jugador en la animación
interface PlayerAnimState {
    currentAction: BaseAction | null;
    actionQueue: BaseAction[];
    timeInAction: number;       
    duration: number;           
    isWaitingForBall: boolean;  
    hasBall: boolean;           
}

interface AnimationMemento {
    originalX: number;
    originalY: number;
    originalRotation: number;
    hasBall: boolean;
}

interface BallEntityMemento {
    id: string;
    visible: boolean;
}

/**
 * Gestiona la reproducción de la animación de una escena.
 * Controla el estado de jugadores y bochas, interpolación de movimientos y reglas de posesión.
 */
export class AnimationManager {
    public isPlaying: boolean = false;
    public isPaused: boolean = false;
    public speedMultiplier: number = 1.0;
    
    // Entidades y Estados
    private entities: Entity[] = [];
    private playerStates: Map<string, PlayerAnimState> = new Map();
    private balls: BallState[] = [];
    
    // Para resetear (Memento Pattern)
    private initialMemento: Map<string, AnimationMemento> = new Map();
    private ballEntityMementos: BallEntityMemento[] = [];

    constructor() {}

    /**
     * Inicia la reproducción de la escena indicada.
     * @param sceneIndex Índice de la escena a reproducir.
     * @param entities Lista de entidades del juego.
     */
    public play(sceneIndex: number, entities: Entity[]) {
        this.entities = entities;
        this.isPlaying = true;
        this.isPaused = false;
        
        this.resetState();
        this.initializeState(sceneIndex);
    }

    /**
     * Detiene la reproducción y restaura el estado original.
     */
    public stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.isPaused = false;

        this.restoreState();
        this.balls = [];
    }

    /** Pausa o reanuda la reproducción. */
    public pause() {
        if (this.isPlaying) {
            this.isPaused = !this.isPaused;
        }
    }

    /** Define el multiplicador de velocidad global. */
    public setSpeed(val: number) {
        this.speedMultiplier = val;
    }

    /**
     * Actualiza el estado de la animación.
     * @param dt Delta time en segundos.
     */
    public update(dt: number) {
        if (!this.isPlaying || this.isPaused) return;

        const delta = dt * this.speedMultiplier;

        // 1. Actualizar Lógica de Jugadores
        this.entities.forEach(e => {
            if (e instanceof Player) {
                this.updatePlayer(e, delta);
            }
        });

        // 2. Actualizar Lógica de las Bochas
        this.balls.forEach(b => this.updateBall(b));
    }

    /**
     * Renderiza los elementos exclusivos de la animación (bochas dinámicas, indicadores).
     */
    public render(ctx: CanvasRenderingContext2D) {
        if (!this.isPlaying) return;

        this.balls.forEach(ball => {
            // Solo dibujar si no la tiene nadie (si la tiene, la dibuja el jugador)
            if (ball.status !== 'held') {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ANIMATION_CONFIG.BALL_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = ball.color; 
                ctx.fill();
                ctx.strokeStyle = ANIMATION_CONFIG.BALL_STROKE_COLOR;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        // Indicadores de espera
        this.playerStates.forEach((state, id) => {
            if (state.isWaitingForBall) {
                const p = this.entities.find(e => e.id === id);
                if (p) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = '10px Arial';
                    ctx.fillText('Esperando...', (p as Player).x - 20, (p as Player).y - 15);
                }
            }
        });
    }

    // --- Private Logic ---

    private resetState() {
        this.playerStates.clear();
        this.balls = [];
        this.initialMemento.clear();
        this.ballEntityMementos = [];
    }

    private initializeState(sceneIndex: number) {
        this.entities.forEach(e => {
            if (e instanceof Player) {
                this.initializePlayer(e, sceneIndex);
            } else if (e instanceof Ball) {
                this.initializeBallEntity(e);
            }
        });
    }

    private initializePlayer(player: Player, sceneIndex: number) {
        // Guardar estado inicial
        this.initialMemento.set(player.id, {
            originalX: player.x,
            originalY: player.y,
            originalRotation: player.rotation,
            hasBall: player.hasBall
        });

        const queue = player.actions.filter(a => a.sceneIndex === sceneIndex);

        this.playerStates.set(player.id, {
            currentAction: null,
            actionQueue: [...queue],
            timeInAction: 0,
            duration: 0,
            isWaitingForBall: false,
            hasBall: player.hasBall
        });

        // Si tiene bocha, crearla en el sistema
        if (player.hasBall) {
            this.balls.push({
                id: crypto.randomUUID(),
                status: 'held',
                ownerId: player.id,
                x: player.x + 12,
                y: player.y + 12,
                color: DEFAULT_BALL_COLOR
            });
            player.ballColor = DEFAULT_BALL_COLOR;
        }
    }

    private initializeBallEntity(ball: Ball) {
        if (!ball.isGroup) {
            // Guardar visibilidad y ocultar
            this.ballEntityMementos.push({ id: ball.id, visible: ball.visible });
            ball.visible = false;

            // Crear bocha dinámica
            this.balls.push({
                id: crypto.randomUUID(),
                status: 'loose',
                ownerId: null,
                x: ball.x,
                y: ball.y,
                color: ball.color
            });
        }
    }

    private restoreState() {
        this.entities.forEach(e => {
            if (e instanceof Player) {
                const memento = this.initialMemento.get(e.id);
                if (memento) {
                    e.x = memento.originalX;
                    e.y = memento.originalY;
                    e.rotation = memento.originalRotation;
                    e.hasBall = memento.hasBall;
                }
                e.ballColor = undefined;
            }
        });

        this.ballEntityMementos.forEach(m => {
            const ball = this.entities.find(e => e.id === m.id);
            if (ball && ball instanceof Ball) {
                ball.visible = m.visible;
            }
        });
    }

    private updatePlayer(player: Player, dt: number) {
        const state = this.playerStates.get(player.id);
        if (!state) return;

        // A. Intentar agarrar bocha
        if (!state.hasBall) {
            this.tryPickupBall(player, state);
        }

        // B. Ejecutar Acción
        if (state.currentAction) {
            this.processCurrentAction(player, state, dt);
        } else {
            this.processNextAction(player, state);
        }
    }

    private tryPickupBall(player: Player, state: PlayerAnimState) {
        // 1. Bochas dinámicas
        for (const ball of this.balls) {
            if (ball.status === 'held') continue;
            if (ball.status === 'moving' && ball.lastOwnerId === player.id) continue;

            const dist = Math.hypot(player.x - ball.x, player.y - ball.y);

            if (dist <= ANIMATION_CONFIG.PICKUP_RADIUS) {
                this.assignBallToPlayer(player, state, ball);
                return;
            }
        }

        // 2. Grupos de Bochas
        const groups = this.entities.filter(e => e instanceof Ball && e.isGroup && e.visible) as Ball[];
        for (const group of groups) {
            if (group.containsPoint(player.x, player.y)) {
                // Spawn new ball from group
                const newBall: BallState = {
                    id: crypto.randomUUID(),
                    status: 'held',
                    ownerId: player.id,
                    x: player.x + 12,
                    y: player.y + 12,
                    color: group.color // Mantener color del grupo
                };
                this.balls.push(newBall);
                this.assignBallToPlayer(player, state, newBall, false); // false = no cambiar estado de bocha existente, es nueva
                return;
            }
        }
    }

    private assignBallToPlayer(player: Player, state: PlayerAnimState, ball: BallState, updateBallStatus: boolean = true) {
        state.hasBall = true;
        player.hasBall = true;
        player.ballColor = ball.color;
        state.isWaitingForBall = false;
        
        if (updateBallStatus) {
            ball.status = 'held';
            ball.ownerId = player.id;
            ball.lastOwnerId = null;
        }
    }

    private processCurrentAction(player: Player, state: PlayerAnimState, dt: number) {
        state.timeInAction += dt;
        const progress = Math.min(1, state.timeInAction / state.duration);

        this.applyActionPhysics(player, state.currentAction!, progress);

        if (state.timeInAction >= state.duration) {
            this.finishAction(player, state);
        }
    }

    private processNextAction(player: Player, state: PlayerAnimState) {
        const nextAction = state.actionQueue[0];
        
        if (nextAction) {
            if (this.canStartAction(nextAction, state.hasBall)) {
                state.currentAction = state.actionQueue.shift()!;
                state.timeInAction = 0;
                state.duration = this.calculateDuration(state.currentAction);
                state.isWaitingForBall = false;

                // Si la acción propulsa la bola (Pase/Tiro), soltarla
                if (state.currentAction.ballInteraction === 'propel') {
                    this.releaseBall(player, state);
                }
            } else {
                state.isWaitingForBall = true;
            }
        }
    }

    private releaseBall(player: Player, state: PlayerAnimState) {
        const myBall = this.balls.find(b => b.ownerId === player.id);
        if (myBall) {
            myBall.status = 'moving';
            myBall.ownerId = null;
            myBall.lastOwnerId = player.id;
        }
        state.hasBall = false;
        player.hasBall = false;
        player.ballColor = undefined; 
    }

    private canStartAction(action: BaseAction, hasBall: boolean): boolean {
        // Si la acción requiere interacción con la bocha (llevarla o pegarle), debe tenerla
        if (action.ballInteraction !== 'none') {
            return hasBall;
        }
        return true;
    }

    private applyActionPhysics(player: Player, action: BaseAction, t: number) {
        // Movimiento del Jugador
        if (action.movesPlayer) {
            const pos = action.getPositionAt(t);
            
            // Calcular Rotación (Heading)
            const targetRotation = action.getHeadingAt(t);
            // Interpolación suave (Lerp) para evitar giros bruscos en Freehand
            // Factor 0.2 ajustado para suavidad visual
            player.rotation = this.lerpAngle(player.rotation, targetRotation, 0.2);

            player.x = pos.x;
            player.y = pos.y;
            
            // Si conduce (carry), la bocha va con él respetando la rotación
            if (action.ballInteraction === 'carry') {
                const myBall = this.balls.find(b => b.ownerId === player.id);
                if (myBall) {
                    this.updateBallPositionRelative(myBall, player);
                }
            }
        } 
        
        // Movimiento Independiente de la Bocha (Pase/Tiro)
        if (action.ballInteraction === 'propel') {
            // Buscar la bocha lanzada
            const myBall = this.balls.find(b => b.status === 'moving' && b.lastOwnerId === player.id);
            if (myBall) {
                const ballPos = action.getPositionAt(t);
                myBall.x = ballPos.x;
                myBall.y = ballPos.y;
            }
        }
    }

    private finishAction(player: Player, state: PlayerAnimState) {
        const action = state.currentAction!;
        state.currentAction = null;

        // Si terminó un pase, la bocha queda suelta en el destino
        if (action.ballInteraction === 'propel') {
            const myBall = this.balls.find(b => b.status === 'moving' && b.lastOwnerId === player.id);
            if (myBall) {
                myBall.status = 'loose';
                const finalPos = action.getPositionAt(1.0);
                myBall.x = finalPos.x;
                myBall.y = finalPos.y;
            }
        }
    }

    private updateBall(ball: BallState) {
        // Si está retenida, asegurar posición con el dueño (fallback)
        if (ball.status === 'held' && ball.ownerId) {
            const owner = this.entities.find(e => e.id === ball.ownerId);
            if (owner && owner instanceof Player) {
                this.updateBallPositionRelative(ball, owner);
            }
        }
    }

    private calculateDuration(action: BaseAction): number {
        let speedVal = ANIMATION_CONFIG.DEFAULT_SPEED_PERCENT;
        if ((action as any).speed !== undefined && (action as any).speed !== null) {
            speedVal = (action as any).speed;
        }

        const pxPerSec = ANIMATION_CONFIG.BASE_SPEED_PX_PER_SEC + 
                        (speedVal / 100) * ANIMATION_CONFIG.MAX_ADDITIONAL_SPEED_PX_PER_SEC;

        if (action.getPathLength() === 0) return ANIMATION_CONFIG.ZERO_LENGTH_DURATION;
        if (!action.movesPlayer && !action.movesBall && action.ballInteraction === 'none') {
             // Turn/Tackle (acciones in situ sin movimiento de bocha)
             return ANIMATION_CONFIG.INSTANT_ACTION_DURATION;
        }

        return action.getPathLength() / pxPerSec;
    }

    private updateBallPositionRelative(ball: BallState, player: Player) {
        // Distancia 17px (hipotenusa de 12,12) a +45 grados de la rotación
        const dist = 17;
        const angle = player.rotation + (Math.PI / 4);
        ball.x = player.x + Math.cos(angle) * dist;
        ball.y = player.y + Math.sin(angle) * dist;
    }

    private lerpAngle(current: number, target: number, factor: number): number {
        const diff = target - current;
        // Forma robusta de calcular el ángulo más corto usando atan2
        const delta = Math.atan2(Math.sin(diff), Math.cos(diff));
        return current + delta * factor;
    }
}
