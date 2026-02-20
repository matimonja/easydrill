export const ANIMATION_CONFIG = {
    /** Tiempo mínimo (segundos) entre acciones con bocha antes de poder iniciar la siguiente */
    MIN_DELAY_AFTER_BALL_ACTION: 0.3,
    /** Umbral (seg) para considerar waitBefore significativo */
    WAIT_BEFORE_EPSILON: 0.001,
    /** Distancia (px) de la bocha respecto al jugador al conducir */
    BALL_OFFSET_DISTANCE: 17,
    /** Factor de interpolación para rotación suave */
    ROTATION_LERP_FACTOR: 0.2,
    PICKUP_RADIUS: 20,
    BASE_SPEED_PX_PER_SEC: 50,
    MAX_ADDITIONAL_SPEED_PX_PER_SEC: 350,
    DEFAULT_SPEED_PERCENT: 50,
    INSTANT_ACTION_DURATION: 1.0,
    ZERO_LENGTH_DURATION: 1.0,
    // Visuals
    BALL_RADIUS: 6,
    BALL_COLOR_DEFAULT: '#FFA500',
    BALL_COLOR_MOVING: '#FFA500',
    BALL_STROKE_COLOR: '#fff'
};
