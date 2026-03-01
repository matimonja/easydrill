"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationService = void 0;
const graphlib_1 = require("graphlib");
/** Constantes del cliente (animation.ts) para que los tiempos coincidan con la animación. */
const CLIENT_BASE_SPEED_PX_PER_SEC = 50;
const CLIENT_MAX_ADDITIONAL_PX_PER_SEC = 350;
const CLIENT_DEFAULT_SPEED_PERCENT = 50;
/** Velocidad efectiva en px/s cuando el cliente usa speed null (default 50%). */
const CLIENT_DEFAULT_PX_PER_SEC = CLIENT_BASE_SPEED_PX_PER_SEC + (CLIENT_DEFAULT_SPEED_PERCENT / 100) * CLIENT_MAX_ADDITIONAL_PX_PER_SEC;
class OptimizationService {
    constructor() {
        this.MAX_PLAYER_SPEED = 350; // px/s (run/dribble; al 100% cliente ≈ 400, usamos 350 para coherencia con pxPerSecToSpeedPercent)
        this.MIN_PLAYER_SPEED = 100; // px/s (límite al ralentizar)
    }
    /** Convierte porcentaje de velocidad (0-100) a px/s tal como lo hace el cliente. */
    clientPxFromSpeedPercent(pct) {
        return CLIENT_BASE_SPEED_PX_PER_SEC + (pct / 100) * CLIENT_MAX_ADDITIONAL_PX_PER_SEC;
    }
    /**
     * Indica si el preEvent/postEvent está en modo "Auto" y por tanto puede ser modificado por el optimizador.
     */
    isEventAuto(value) {
        return (value || '').trim().toLowerCase() === 'auto';
    }
    /** Convierte velocidad en px/s a porcentaje 0-100 usado por el cliente. */
    pxPerSecToSpeedPercent(pxPerSec) {
        const pct = ((pxPerSec - CLIENT_BASE_SPEED_PX_PER_SEC) / CLIENT_MAX_ADDITIONAL_PX_PER_SEC) * 100;
        return Math.max(0, Math.min(100, Math.round(pct)));
    }
    /**
     * Tiempo de inactividad: tiempo que un jugador pasa sin cambiar de posición *después* de haber
     * ejecutado al menos una acción. El tiempo inicial antes de la primera acción no cuenta.
     */
    computeIdleTime(state) {
        let total = 0;
        state.players.forEach(player => {
            let timeEndLastAction = 0;
            let hasMoved = false;
            player.actions.forEach((action, index) => {
                var _a;
                const waitBefore = (_a = action.waitBefore) !== null && _a !== void 0 ? _a : 0;
                const dist = this.getActionLength(action);
                let duration = 0;
                const speedPx = (action.speed != null)
                    ? CLIENT_BASE_SPEED_PX_PER_SEC + (action.speed / 100) * CLIENT_MAX_ADDITIONAL_PX_PER_SEC
                    : this.MAX_PLAYER_SPEED;
                if (action.type === 'pass' || action.type === 'shoot') {
                    const ballPx = (action.speed != null) ? this.clientPxFromSpeedPercent(action.speed) : CLIENT_DEFAULT_PX_PER_SEC;
                    duration = dist / ballPx;
                }
                else if (action.type === 'run' || action.type === 'dribble')
                    duration = dist / speedPx;
                else
                    duration = 0.5;
                const startTime = timeEndLastAction + waitBefore;
                if (hasMoved && waitBefore > 0)
                    total += waitBefore;
                hasMoved = true;
                timeEndLastAction = startTime + duration;
            });
        });
        return total;
    }
    optimize(state) {
        this.logTestCaseData(state);
        const g = new graphlib_1.Graph({ directed: true });
        // 1. Construir Nodos y Aristas secuenciales (Cadena de acciones por jugador)
        state.players.forEach(player => {
            let prevNodeId = `start_${player.id}`;
            g.setNode(prevNodeId, { time: 0 });
            player.actions.forEach((action, index) => {
                const endNodeId = `p_${player.id}_a_${index}_end`;
                g.setNode(endNodeId, { label: `${player.id} act ${index}` });
                // Duración según la misma fórmula que el cliente (AnimationManager) para que los tiempos coincidan.
                const dist = this.getActionLength(action);
                let minDuration = 0;
                if (action.type === 'pass' || action.type === 'shoot') {
                    const ballPx = (action.speed != null) ? this.clientPxFromSpeedPercent(action.speed) : CLIENT_DEFAULT_PX_PER_SEC;
                    minDuration = dist / ballPx;
                }
                else if (action.type === 'run' || action.type === 'dribble') {
                    const runPx = (action.speed != null) ? this.clientPxFromSpeedPercent(action.speed) : this.MAX_PLAYER_SPEED;
                    minDuration = dist / runPx;
                }
                else {
                    minDuration = 0.5;
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
        const PROXIMITY_PX = 100; // umbral en px (canvas): receptor debe terminar cerca del destino del pase
        state.players.forEach(pSender => {
            pSender.actions.forEach((actionSender, idxSender) => {
                if (actionSender.type === 'pass') {
                    const passEndNode = `p_${pSender.id}_a_${idxSender}_end`;
                    const passEndPos = { x: actionSender.endX, y: actionSender.endY };
                    state.players.forEach(pReceiver => {
                        if (pSender.id === pReceiver.id)
                            return;
                        let bestDist = Infinity;
                        let bestIdx = -1;
                        pReceiver.actions.forEach((actionReceiver, idxReceiver) => {
                            if (actionReceiver.type === 'run' || actionReceiver.type === 'dribble') {
                                const receiverEndPos = this.getActionEndPos(actionReceiver);
                                const dist = Math.hypot(passEndPos.x - receiverEndPos.x, passEndPos.y - receiverEndPos.y);
                                if (dist < bestDist) {
                                    bestDist = dist;
                                    bestIdx = idxReceiver;
                                }
                            }
                        });
                        if (bestDist < PROXIMITY_PX && bestIdx >= 0) {
                            const receiverEndNode = `p_${pReceiver.id}_a_${bestIdx}_end`;
                            g.setEdge(passEndNode, receiverEndNode, { minDuration: 0, isSync: true });
                            console.log(`[OptimizationService] Sync: pase ${pSender.id} -> receptor ${pReceiver.id} acción ${bestIdx} (dist=${bestDist.toFixed(0)}px)`);
                        }
                        else if (bestIdx >= 0) {
                            console.log(`[OptimizationService] Sin sync: receptor más cercano ${pReceiver.id} acción ${bestIdx} dist=${bestDist.toFixed(0)}px (umbral=${PROXIMITY_PX}px)`);
                        }
                    });
                }
            });
        });
        // 3. Forward Pass: EST por nodo = MAX(predecesor + duración) para respetar sync (receptor ≥ llegada pase).
        // Pero tenemos multiples orígenes.
        // Agregamos un nodo SUPER_START conectado a todos los `start_${player.id}` con peso 0.
        g.setNode('SUPER_START', { time: 0 });
        state.players.forEach(p => {
            g.setEdge('SUPER_START', `start_${p.id}`, { minDuration: 0 });
        });
        // EST = Earliest Start/Finish Time. Debe ser el MÁXIMO sobre predecesores (no el mínimo):
        // el receptor no puede terminar antes de que llegue el pase, así que usamos max, no Dijkstra (min).
        const est = this.computeEST(g);
        // --- Log: tiempos NATURALES (secuencial por jugador, máx velocidad, sin sync) ---
        this.logNaturalTimes(state);
        // Nodos involucrados en sincronización (origen o destino de una arista isSync).
        // Solo aceleramos acciones que terminan en uno de estos nodos cuando no hay slack.
        const syncRelatedNodes = new Set();
        g.edges().forEach(edgeId => {
            const edgeData = g.edge(edgeId);
            if (edgeData.isSync) {
                syncRelatedNodes.add(edgeId.v);
                syncRelatedNodes.add(edgeId.w);
            }
        });
        // 4. Backward Pass / Ajuste
        // Solo se modifica speed cuando está vacío (check desmarcado); solo preEvent/postEvent cuando están en "Auto".
        // Solo se acelera a máxima cuando es necesario para concatenar (nodo destino en sync).
        const speedEditable = (a) => a.speed === undefined || a.speed === null;
        const preEventEditable = (a) => { var _a, _b; return this.isEventAuto((_b = (_a = a.config) === null || _a === void 0 ? void 0 : _a.preEvent) !== null && _b !== void 0 ? _b : ''); };
        g.edges().forEach(e => {
            var _a, _b;
            const edgeData = g.edge(e);
            if (!edgeData.actionRef)
                return;
            const { player, action } = edgeData.actionRef;
            const sourceEST = (_a = est[e.v]) !== null && _a !== void 0 ? _a : 0;
            const targetEST = (_b = est[e.w]) !== null && _b !== void 0 ? _b : 0;
            const availableTime = targetEST - sourceEST;
            const minDuration = edgeData.minDuration;
            const slack = availableTime - minDuration;
            const targetInSync = syncRelatedNodes.has(e.w);
            if (slack > 0.05) {
                const dist = this.getActionLength(action);
                const desiredPxPerSec = dist / availableTime;
                let waitBeforeSec = 0;
                // Receptor en sync: preferir retrasar el inicio (waitBefore) para llegar cuando llega la bocha,
                // en lugar de correr lento todo el tiempo (evita tiempo de inactividad en el punto de recepción).
                const isReceiverInSync = targetInSync && (action.type === 'run' || action.type === 'dribble');
                if (isReceiverInSync && speedEditable(action)) {
                    const travelTimeAtMax = dist / this.MAX_PLAYER_SPEED;
                    waitBeforeSec = Math.max(0, availableTime - travelTimeAtMax);
                    action.speed = this.pxPerSecToSpeedPercent(this.MAX_PLAYER_SPEED);
                    action.waitBefore = waitBeforeSec;
                    if (preEventEditable(action) && waitBeforeSec > 0) {
                        action.config = Object.assign(Object.assign({}, action.config), { preEvent: `esperar:${waitBeforeSec}` });
                    }
                    console.log(`[OptimizationService] Receptor ${player.id} run/dribble: waitBefore=${waitBeforeSec.toFixed(2)}s availableTime=${availableTime.toFixed(2)}s`);
                }
                else if (speedEditable(action)) {
                    if (desiredPxPerSec >= this.MIN_PLAYER_SPEED || action.type === 'pass' || action.type === 'shoot') {
                        action.speed = this.pxPerSecToSpeedPercent(desiredPxPerSec);
                    }
                    else {
                        action.speed = this.pxPerSecToSpeedPercent(this.MIN_PLAYER_SPEED);
                        const travelTime = dist / this.MIN_PLAYER_SPEED;
                        waitBeforeSec = Math.max(0, availableTime - travelTime);
                    }
                }
                if (!isReceiverInSync && preEventEditable(action) && (speedEditable(action) || waitBeforeSec > 0)) {
                    action.waitBefore = waitBeforeSec;
                    if (waitBeforeSec > 0)
                        action.config = Object.assign(Object.assign({}, action.config), { preEvent: `esperar:${waitBeforeSec}` });
                }
            }
            else {
                if (targetInSync && (action.type === 'run' || action.type === 'dribble') && speedEditable(action)) {
                    action.speed = this.pxPerSecToSpeedPercent(this.MAX_PLAYER_SPEED);
                }
                if (preEventEditable(action)) {
                    action.waitBefore = 0;
                    action.config = Object.assign(Object.assign({}, action.config), { preEvent: 'auto' });
                }
            }
        });
        // --- Log: tiempos MODIFICADOS (tras optimización) ---
        this.logModifiedTimes(state, est);
        return state;
    }
    /**
     * Calcula Earliest Start/Finish Time (EST) por nodo usando MAX sobre predecesores.
     * Así el receptor no puede "terminar" antes de que llegue el pase (sync).
     */
    computeEST(g) {
        let order;
        try {
            order = graphlib_1.alg.topsort(g);
        }
        catch (_a) {
            order = g.nodes();
        }
        const est = {};
        est['SUPER_START'] = 0;
        for (const node of order) {
            if (node === 'SUPER_START')
                continue;
            const preds = g.predecessors(node);
            if (!preds || preds.length === 0) {
                est[node] = 0;
                continue;
            }
            const candidates = preds.map(p => { var _a, _b, _c; return ((_a = est[p]) !== null && _a !== void 0 ? _a : 0) + ((_c = (_b = g.edge(p, node)) === null || _b === void 0 ? void 0 : _b.minDuration) !== null && _c !== void 0 ? _c : 0); });
            est[node] = Math.max(0, ...candidates);
        }
        return est;
    }
    /**
     * Log del estado completo del drill para copiar y armar un caso de test.
     * Copiar el JSON entre las marcas y usar en test: const state = JSON.parse(pasted) as DrillState;
     */
    logTestCaseData(state) {
        const payload = {
            players: state.players.map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                initialX: p.initialX,
                initialY: p.initialY,
                number: p.number,
                hasBall: p.hasBall,
                team: p.team,
                actions: p.actions.map(a => {
                    var _a, _b;
                    return (Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ id: a.id, type: a.type, startX: a.startX, startY: a.startY, endX: a.endX, endY: a.endY, config: a.config ? { preEvent: a.config.preEvent, postEvent: a.config.postEvent } : { preEvent: 'auto', postEvent: 'auto' }, pathType: a.pathType, points: a.points ? [...a.points] : [], sceneIndex: a.sceneIndex, speed: (_a = a.speed) !== null && _a !== void 0 ? _a : null, waitBefore: (_b = a.waitBefore) !== null && _b !== void 0 ? _b : 0 }, (a.gesture != null && { gesture: a.gesture })), (a.dribbleType != null && { dribbleType: a.dribbleType })), (a.style != null && { style: a.style })), (a.radius != null && { radius: a.radius })), (a.angle != null && { angle: a.angle })));
                }),
            })),
        };
        console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║  TEST CASE DATA - Copiar el JSON de abajo para armar un test                 ║');
        console.log('║  Uso: const state = JSON.parse(<pegado>) as DrillState;                      ║');
        console.log('║  Luego: const out = service.optimize(state);                                 ║');
        console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
        console.log(JSON.stringify(payload, null, 2));
        console.log('\n══════════════════════════════════════════════════════════════════════════════\n');
    }
    /** Duración en segundos de una acción con su speed actual (px/s o % según esté seteado). */
    getActionDurationSec(action) {
        const dist = this.getActionLength(action);
        if (action.type === 'pass' || action.type === 'shoot') {
            const ballPx = (action.speed != null) ? this.clientPxFromSpeedPercent(action.speed) : CLIENT_DEFAULT_PX_PER_SEC;
            return dist / ballPx;
        }
        if (action.type === 'run' || action.type === 'dribble') {
            const speedPx = (action.speed != null)
                ? CLIENT_BASE_SPEED_PX_PER_SEC + (action.speed / 100) * CLIENT_MAX_ADDITIONAL_PX_PER_SEC
                : this.MAX_PLAYER_SPEED;
            return dist / speedPx;
        }
        return 0.5;
    }
    logNaturalTimes(state) {
        console.log('\n========== TIEMPOS NATURALES (sin optimización) ==========');
        state.players.forEach(player => {
            let t = 0;
            player.actions.forEach((action, index) => {
                const dist = this.getActionLength(action);
                let dur = 0;
                if (action.type === 'pass' || action.type === 'shoot') {
                    const ballPx = (action.speed != null) ? this.clientPxFromSpeedPercent(action.speed) : CLIENT_DEFAULT_PX_PER_SEC;
                    dur = dist / ballPx;
                }
                else if (action.type === 'run' || action.type === 'dribble') {
                    const runPx = (action.speed != null) ? this.clientPxFromSpeedPercent(action.speed) : this.MAX_PLAYER_SPEED;
                    dur = dist / runPx;
                }
                else
                    dur = 0.5;
                const start = t;
                const end = t + dur;
                t = end;
                console.log(`  [${player.id}] acción ${index} (${action.type}): inicio=${start.toFixed(2)}s  fin=${end.toFixed(2)}s  duración=${dur.toFixed(2)}s`);
            });
        });
        console.log('============================================================\n');
    }
    logModifiedTimes(state, est) {
        console.log('\n========== TIEMPOS MODIFICADOS (con optimización) ==========');
        state.players.forEach(player => {
            let prevNodeId = `start_${player.id}`;
            player.actions.forEach((action, index) => {
                var _a, _b, _c, _d, _e, _f;
                const endNodeId = `p_${player.id}_a_${index}_end`;
                const sourceEST = (_a = est[prevNodeId]) !== null && _a !== void 0 ? _a : 0;
                const targetEST = (_b = est[endNodeId]) !== null && _b !== void 0 ? _b : 0;
                const waitBefore = (_c = action.waitBefore) !== null && _c !== void 0 ? _c : 0;
                const start = sourceEST + waitBefore;
                const duration = this.getActionDurationSec(action);
                const end = start + duration;
                console.log(`  [${player.id}] acción ${index} (${action.type}): inicio=${start.toFixed(2)}s  fin=${end.toFixed(2)}s  waitBefore=${waitBefore.toFixed(2)}s  speed=${(_d = action.speed) !== null && _d !== void 0 ? _d : '—'}  preEvent=${(_f = (_e = action.config) === null || _e === void 0 ? void 0 : _e.preEvent) !== null && _f !== void 0 ? _f : '—'}`);
                prevNodeId = endNodeId;
            });
        });
        console.log('============================================================\n');
    }
    getActionLength(action) {
        if (action.pathType === 'straight') {
            return Math.hypot(action.endX - action.startX, action.endY - action.startY);
        }
        else {
            // Simplificación para freehand si no tenemos los puntos completos o logic compleja
            // Usamos distancia directa * factor de curvatura estimado
            // O sumamos segmentos si points existe
            if (action.points && action.points.length > 0) {
                let len = 0;
                for (let i = 0; i < action.points.length - 1; i++) {
                    len += Math.hypot(action.points[i + 1].x - action.points[i].x, action.points[i + 1].y - action.points[i].y);
                }
                return len;
            }
            return Math.hypot(action.endX - action.startX, action.endY - action.startY) * 1.2;
        }
    }
    getActionEndPos(action) {
        if (action.pathType === 'straight')
            return { x: action.endX, y: action.endY };
        if (action.points && action.points.length > 0)
            return action.points[action.points.length - 1];
        return { x: action.endX, y: action.endY };
    }
}
exports.OptimizationService = OptimizationService;
