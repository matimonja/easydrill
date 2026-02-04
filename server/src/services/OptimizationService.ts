import { Graph, alg } from 'graphlib';
import { DrillState, DrillAction, DrillPlayer } from '../../../shared/types';

interface GraphNode {
    id: string; // "PlayerID_ActionIndex_Start" or "End"
    time: number;
}

export class OptimizationService {
    
    // Configuración de velocidades (podrían venir en el request también)
    private readonly MAX_PLAYER_SPEED = 350; // px/s
    private readonly MIN_PLAYER_SPEED = 100; // px/s
    private readonly BALL_SPEED = 500; // px/s (Pase rápido)

    public optimize(state: DrillState): DrillState {
        const g = new Graph({ directed: true });

        // 1. Construir Nodos y Aristas secuenciales (Cadena de acciones por jugador)
        const nodeMap = new Map<string, string>(); // Key: "PlayerID_Index_Type", Value: NodeID

        state.players.forEach(player => {
            let prevNodeId = `start_${player.id}`;
            g.setNode(prevNodeId, { time: 0 });

            player.actions.forEach((action, index) => {
                const endNodeId = `p_${player.id}_a_${index}_end`;
                g.setNode(endNodeId, { label: `${player.id} act ${index}` });

                // Calcular duración mínima (máxima velocidad)
                const dist = this.getActionLength(action);
                let minDuration = 0;

                if (action.type === 'pass' || action.type === 'shoot') {
                    minDuration = dist / this.BALL_SPEED;
                } else if (action.type === 'run' || action.type === 'dribble') {
                    minDuration = dist / this.MAX_PLAYER_SPEED;
                } else {
                    // Turn, Tackle, etc.
                    minDuration = 0.5; // Tiempo base para maniobras
                }

                // Arista: Inicio Acción -> Fin Acción
                g.setEdge(prevNodeId, endNodeId, { 
                    minDuration, 
                    actionRef: { player, action } 
                });

                prevNodeId = endNodeId;
            });
        });

        // 2. Identificar Puntos de Sincronización (Interacción Bocha-Jugador)
        // Buscar pases y ver dónde terminan. Si terminan cerca del fin de una acción de correr de OTRO jugador, conectar.
        
        state.players.forEach(pSender => {
            pSender.actions.forEach((actionSender, idxSender) => {
                if (actionSender.type === 'pass') {
                    const passEndNode = `p_${pSender.id}_a_${idxSender}_end`;
                    const passEndPos = { x: actionSender.endX, y: actionSender.endY };

                    // Buscar receptor
                    state.players.forEach(pReceiver => {
                        if (pSender.id === pReceiver.id) return;

                        pReceiver.actions.forEach((actionReceiver, idxReceiver) => {
                            if (actionReceiver.type === 'run' || actionReceiver.type === 'dribble') { // Receiver moves to ball
                                const receiverEndPos = this.getActionEndPos(actionReceiver);
                                
                                // Chequeo de proximidad (20px)
                                const dist = Math.hypot(passEndPos.x - receiverEndPos.x, passEndPos.y - receiverEndPos.y);
                                if (dist < 30) {
                                    // Sincronización encontrada!
                                    // El pase llega al nodo de fin de la carrera del receptor.
                                    // OJO: El pase define cuando la bola está disponible.
                                    // El receptor debe llegar AHI.
                                    // Creamos dependencia: El evento "Fin de Carrera" y "Fin de Pase" son concurrentes.
                                    // En un DAG, esto significa que ambos convergen a un nodo lógico.
                                    // Simplificación: Unir los nodos con una arista de peso 0?
                                    // No, mejor: El nodo de llegada del receptor DEBE ocurrir DESPUES (o igual) que la llegada del pase?
                                    // En realidad, deben ser simultáneos para fluidez.
                                    // Vamos a agregar una arista PassEnd -> ReceiverRunEnd con weight 0 (dependencia temporal)
                                    // Pero si Receiver llega ANTES, debe esperar. 
                                    // Si Pass llega ANTES, Receiver llega y la bocha ya está ahí (ok).
                                    // PERO queremos fluidez: Receiver llega JUSTO cuando Pass llega.
                                    
                                    const receiverEndNode = `p_${pReceiver.id}_a_${idxReceiver}_end`;
                                    
                                    // Dependency: Pass MUST arrive for the play to continue smoothly? 
                                    // Actually, let's treat PassEnd as a prereq for whatever comes AFTER ReceiverRun.
                                    // But to force synchronization, we merge the nodes? 
                                    // Easier: Add edge PassEnd -> ReceiverEndNode with weight 0?
                                    // This means ReceiverEnd cannot happen before PassEnd. 
                                    // If Receiver is faster, EST(ReceiverEnd) will be dictated by PassEnd if Pass is slow.
                                    
                                    g.setEdge(passEndNode, receiverEndNode, { minDuration: 0, isSync: true });
                                    
                                    console.log(`Sync found: Pass from ${pSender.id} -> ${pReceiver.id}`);
                                }
                            }
                        });
                    });
                }
            });
        });

        // 3. Forward Pass (Calculo de EST - Earliest Start Time)
        // Graphlib tiene algs para esto? alg.dijkstra?
        // Como es un DAG, podemos usar orden topológico o simplemente dijkstra desde nodos origen.
        // Pero tenemos multiples orígenes.
        // Agregamos un nodo SUPER_START conectado a todos los `start_${player.id}` con peso 0.
        
        g.setNode('SUPER_START', { time: 0 });
        state.players.forEach(p => {
            g.setEdge('SUPER_START', `start_${p.id}`, { minDuration: 0 });
        });

        const dijkstra = alg.dijkstra(g, 'SUPER_START', (e) => {
            const edge = g.edge(e);
            return edge.minDuration;
        });

        // 4. Backward Pass / Ajuste
        // Para cada Arista (Acción), miramos el EST del nodo destino y el EST del nodo origen.
        // EST(Destino) es el tiempo en que TODO lo necesario ha llegado.
        // Si una acción podía llegar antes, tiene "Slack".
        
        g.edges().forEach(e => {
            const edgeData = g.edge(e);
            if (!edgeData.actionRef) return; // Arista dummy o sync

            const { player, action } = edgeData.actionRef;
            const sourceEST = dijkstra[e.v].distance;
            const targetEST = dijkstra[e.w].distance;

            // Tiempo disponible para esta acción
            const availableTime = targetEST - sourceEST;
            
            // Tiempo mínimo (físico)
            const minDuration = edgeData.minDuration;

            const slack = availableTime - minDuration;
            
            if (slack > 0.05) { // 50ms tolerancia
                // Tenemos tiempo extra.
                // Estrategia: Reducir velocidad hasta MIN_SPEED, luego usar waitBefore.
                
                const dist = this.getActionLength(action);
                
                // Intentar ajustar velocidad
                // Deseamos tardar 'availableTime'
                let newSpeed = dist / availableTime;

                if (newSpeed >= this.MIN_PLAYER_SPEED || action.type === 'pass') {
                    // Podemos ir más lento
                    action.speed = Math.floor(newSpeed);
                    action.waitBefore = 0;
                } else {
                    // Incluso a velocidad mínima, sobra tiempo.
                    // Fijar a velocidad mínima y esperar el resto.
                    action.speed = this.MIN_PLAYER_SPEED;
                    const travelTime = dist / this.MIN_PLAYER_SPEED;
                    action.waitBefore = availableTime - travelTime;
                }
                
                // console.log(`Optimized ${player.id} Action ${action.type}: Slack ${slack.toFixed(2)}s -> Speed ${action.speed}, Wait ${action.waitBefore?.toFixed(2)}`);
            } else {
                // Es ruta crítica o casi. Velocidad máxima (default implícito o seteada)
                // Asegurar que no tenga delays residuales
                action.speed = (action.type === 'run' || action.type === 'dribble') ? this.MAX_PLAYER_SPEED : null;
                action.waitBefore = 0;
            }
        });

        return state;
    }

    private getActionLength(action: DrillAction): number {
        if (action.pathType === 'straight') {
            return Math.hypot(action.endX - action.startX, action.endY - action.startY);
        } else {
            // Simplificación para freehand si no tenemos los puntos completos o logic compleja
            // Usamos distancia directa * factor de curvatura estimado
            // O sumamos segmentos si points existe
            if (action.points && action.points.length > 0) {
                let len = 0;
                for(let i=0; i<action.points.length-1; i++) {
                    len += Math.hypot(action.points[i+1].x - action.points[i].x, action.points[i+1].y - action.points[i].y);
                }
                return len;
            }
            return Math.hypot(action.endX - action.startX, action.endY - action.startY) * 1.2;
        }
    }

    private getActionEndPos(action: DrillAction) {
        if (action.pathType === 'straight') return { x: action.endX, y: action.endY };
        if (action.points && action.points.length > 0) return action.points[action.points.length - 1];
        return { x: action.endX, y: action.endY };
    }
}
