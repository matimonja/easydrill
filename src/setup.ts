/**
 * Setup Screen – Allows the user to pick an exercise zone before entering the editor.
 * Manages the preset cards, custom-zone drawing canvas, and confirmation callback.
 *
 * Custom zone interaction modes:
 *  1. Draw:  drag on empty canvas to create a new rectangle
 *  2. Move:  drag inside the existing rectangle to reposition it
 *  3. Resize: drag a corner handle to resize the rectangle
 */
import { Field } from './entities/Field';
import {
    ZonePreset,
    ZoneRect,
    ExerciseZoneConfig,
    ZONE_PRESETS,
} from './core/ExerciseZoneConfig';

export interface ZoneSetupOptions {
    onConfirm: (config: ExerciseZoneConfig) => void;
}

/** Size (in world units) of the corner resize handles */
const HANDLE_SIZE = 14;

/** Rectangle colors – orange/amber for high visibility */
const ZONE_FILL = 'rgba(251, 146, 60, 0.22)';
const ZONE_FILL_CONFIRMED = 'rgba(251, 146, 60, 0.18)';
const ZONE_STROKE = '#f97316';
const ZONE_STROKE_CONFIRMED = '#fb923c';
const HANDLE_FILL = '#f97316';

type InteractionMode = 'draw' | 'move' | 'resize';
type HandleCorner = 'tl' | 'tr' | 'bl' | 'br';

export class ZoneSetupScreen {
    private selectedPreset: ZonePreset = 'full';
    private customZone: ZoneRect | null = null;
    private onConfirm: (config: ExerciseZoneConfig) => void;

    // Canvas for custom drawing
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private field: Field = new Field();

    // Interaction state
    private interactionMode: InteractionMode | null = null;
    private activeHandle: HandleCorner | null = null;
    private pointerStart: { x: number; y: number } | null = null;
    private drawCurrent: { x: number; y: number } | null = null;
    /** Snapshot of the zone rect at the start of a move or resize */
    private zoneSnapshot: ZoneRect | null = null;

    constructor(options: ZoneSetupOptions) {
        this.onConfirm = options.onConfirm;
        this.canvas = document.getElementById('zone-preview-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        this.setupCards();
        this.setupCanvas();
        this.setupCTA();
    }

    // --- Card Selection ---
    private setupCards(): void {
        const cards = document.querySelectorAll<HTMLButtonElement>('.zone-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const preset = card.dataset.preset as ZonePreset;
                this.selectPreset(preset);
            });
        });
    }

    private selectPreset(preset: ZonePreset): void {
        this.selectedPreset = preset;

        // Update active card
        document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('active'));
        document.querySelector(`.zone-card[data-preset="${preset}"]`)?.classList.add('active');

        // Show/hide custom section
        const customSection = document.getElementById('custom-section')!;
        if (preset === 'custom') {
            customSection.classList.add('visible');
            this.customZone = null;
            requestAnimationFrame(() => this.initCanvas());
        } else {
            customSection.classList.remove('visible');
        }
    }

    // --- Custom Zone Canvas ---
    private setupCanvas(): void {
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('pointercancel', () => this.onPointerCancel());

        const ro = new ResizeObserver(() => {
            if (this.selectedPreset === 'custom') this.initCanvas();
        });
        ro.observe(this.canvas.parentElement!);
    }

    private initCanvas(): void {
        const wrapper = this.canvas.parentElement!;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = wrapper.clientWidth * dpr;
        this.canvas.height = wrapper.clientHeight * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.renderPreview();
    }

    /** Current scale used in the canvas transform (for hit testing handles) */
    private getCanvasScale(): number {
        const displayW = this.canvas.width / (window.devicePixelRatio || 1);
        const displayH = this.canvas.height / (window.devicePixelRatio || 1);
        const runoff = 50;
        const totalW = this.field.width + runoff * 2;
        const totalH = this.field.height + runoff * 2;
        const padding = 0.06;
        const availW = displayW * (1 - 2 * padding);
        const availH = displayH * (1 - 2 * padding);
        return Math.min(availW / totalW, availH / totalH);
    }

    /** Convert screen coordinates to world coordinates on the preview canvas.
     *  This is the exact inverse of the rendering transform in renderPreview():
     *    translate(displayW/2, displayH/2) → scale(s, s)
     */
    private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const displayW = this.canvas.width / (window.devicePixelRatio || 1);
        const displayH = this.canvas.height / (window.devicePixelRatio || 1);

        // Convert client coords → CSS-pixel position inside the canvas
        const px = (clientX - rect.left) / rect.width * displayW;
        const py = (clientY - rect.top) / rect.height * displayH;

        // Invert the transform: translate(center) then scale(s)
        const scale = this.getCanvasScale();
        const worldX = (px - displayW / 2) / scale;
        const worldY = (py - displayH / 2) / scale;

        return { x: worldX, y: worldY };
    }

    /** Check if a point is near a handle corner of the existing zone (returns which handle) */
    private hitTestHandle(wx: number, wy: number): HandleCorner | null {
        if (!this.customZone) return null;
        const z = this.customZone;
        const scale = this.getCanvasScale();
        const hs = HANDLE_SIZE / scale; // handle half-size in world units

        const corners: { key: HandleCorner; cx: number; cy: number }[] = [
            { key: 'tl', cx: z.x, cy: z.y },
            { key: 'tr', cx: z.x + z.w, cy: z.y },
            { key: 'bl', cx: z.x, cy: z.y + z.h },
            { key: 'br', cx: z.x + z.w, cy: z.y + z.h },
        ];

        for (const c of corners) {
            if (Math.abs(wx - c.cx) < hs && Math.abs(wy - c.cy) < hs) {
                return c.key;
            }
        }
        return null;
    }

    /** Check if a point is inside the existing zone rectangle */
    private hitTestZone(wx: number, wy: number): boolean {
        if (!this.customZone) return false;
        const z = this.customZone;
        return wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h;
    }

    private onPointerDown(e: PointerEvent): void {
        e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        const pos = this.screenToWorld(e.clientX, e.clientY);
        this.pointerStart = pos;

        // Priority: handle > inside zone > new draw
        const handle = this.hitTestHandle(pos.x, pos.y);
        if (handle) {
            this.interactionMode = 'resize';
            this.activeHandle = handle;
            this.zoneSnapshot = { ...this.customZone! };
        } else if (this.hitTestZone(pos.x, pos.y)) {
            this.interactionMode = 'move';
            this.zoneSnapshot = { ...this.customZone! };
        } else {
            this.interactionMode = 'draw';
            this.drawCurrent = pos;
            this.customZone = null;
        }

        this.updateCursor(pos);
        this.renderPreview();
    }

    private onPointerMove(e: PointerEvent): void {
        const pos = this.screenToWorld(e.clientX, e.clientY);

        if (!this.interactionMode) {
            // Just update cursor based on hover
            this.updateCursor(pos);
            return;
        }

        e.preventDefault();

        if (this.interactionMode === 'draw') {
            this.drawCurrent = pos;
        } else if (this.interactionMode === 'move' && this.pointerStart && this.zoneSnapshot) {
            const dx = pos.x - this.pointerStart.x;
            const dy = pos.y - this.pointerStart.y;
            this.customZone = {
                x: this.zoneSnapshot.x + dx,
                y: this.zoneSnapshot.y + dy,
                w: this.zoneSnapshot.w,
                h: this.zoneSnapshot.h,
            };
        } else if (this.interactionMode === 'resize' && this.pointerStart && this.zoneSnapshot && this.activeHandle) {
            this.applyResize(pos);
        }

        this.renderPreview();
    }

    private onPointerUp(e: PointerEvent): void {
        if (!this.interactionMode) return;
        const pos = this.screenToWorld(e.clientX, e.clientY);

        if (this.interactionMode === 'draw' && this.pointerStart) {
            const x = Math.min(this.pointerStart.x, pos.x);
            const y = Math.min(this.pointerStart.y, pos.y);
            const w = Math.abs(pos.x - this.pointerStart.x);
            const h = Math.abs(pos.y - this.pointerStart.y);
            if (w > 20 && h > 20) {
                this.customZone = { x, y, w, h };
            }
        }

        this.resetInteraction();
        this.renderPreview();
    }

    private onPointerCancel(): void {
        // Revert to snapshot if we were moving/resizing
        if ((this.interactionMode === 'move' || this.interactionMode === 'resize') && this.zoneSnapshot) {
            this.customZone = this.zoneSnapshot;
        }
        this.resetInteraction();
        this.renderPreview();
    }

    private resetInteraction(): void {
        this.interactionMode = null;
        this.activeHandle = null;
        this.pointerStart = null;
        this.drawCurrent = null;
        this.zoneSnapshot = null;
    }

    /** Apply resize based on which corner handle is being dragged */
    private applyResize(pos: { x: number; y: number }): void {
        if (!this.zoneSnapshot || !this.activeHandle) return;
        const s = this.zoneSnapshot;
        let x = s.x, y = s.y, w = s.w, h = s.h;

        const minSize = 30;

        switch (this.activeHandle) {
            case 'tl':
                x = Math.min(pos.x, s.x + s.w - minSize);
                y = Math.min(pos.y, s.y + s.h - minSize);
                w = s.x + s.w - x;
                h = s.y + s.h - y;
                break;
            case 'tr':
                y = Math.min(pos.y, s.y + s.h - minSize);
                w = Math.max(minSize, pos.x - s.x);
                h = s.y + s.h - y;
                break;
            case 'bl':
                x = Math.min(pos.x, s.x + s.w - minSize);
                w = s.x + s.w - x;
                h = Math.max(minSize, pos.y - s.y);
                break;
            case 'br':
                w = Math.max(minSize, pos.x - s.x);
                h = Math.max(minSize, pos.y - s.y);
                break;
        }

        this.customZone = { x, y, w, h };
    }

    /** Update the canvas cursor based on what the pointer is hovering */
    private updateCursor(worldPos: { x: number; y: number }): void {
        const handle = this.hitTestHandle(worldPos.x, worldPos.y);
        if (handle) {
            if (handle === 'tl' || handle === 'br') {
                this.canvas.style.cursor = 'nwse-resize';
            } else {
                this.canvas.style.cursor = 'nesw-resize';
            }
        } else if (this.hitTestZone(worldPos.x, worldPos.y)) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    /** Render the field and any drawn rectangle on the preview canvas */
    private renderPreview(): void {
        const displayW = this.canvas.width / (window.devicePixelRatio || 1);
        const displayH = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, displayW, displayH);
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, displayW, displayH);

        const scale = this.getCanvasScale();

        this.ctx.save();
        this.ctx.translate(displayW / 2, displayH / 2);
        this.ctx.scale(scale, scale);

        // Draw field
        this.field.draw(this.ctx);

        // Draw the current drag rectangle (during draw mode)
        if (this.interactionMode === 'draw' && this.pointerStart && this.drawCurrent) {
            const rx = Math.min(this.pointerStart.x, this.drawCurrent.x);
            const ry = Math.min(this.pointerStart.y, this.drawCurrent.y);
            const rw = Math.abs(this.drawCurrent.x - this.pointerStart.x);
            const rh = Math.abs(this.drawCurrent.y - this.pointerStart.y);

            this.ctx.fillStyle = ZONE_FILL;
            this.ctx.fillRect(rx, ry, rw, rh);
            this.ctx.strokeStyle = ZONE_STROKE;
            this.ctx.lineWidth = 2 / scale;
            this.ctx.setLineDash([6 / scale, 4 / scale]);
            this.ctx.strokeRect(rx, ry, rw, rh);
            this.ctx.setLineDash([]);
        }

        // Draw the confirmed/active custom zone
        if (this.customZone && this.interactionMode !== 'draw') {
            const z = this.customZone;
            const isActive = this.interactionMode === 'move' || this.interactionMode === 'resize';

            // Fill
            this.ctx.fillStyle = isActive ? ZONE_FILL : ZONE_FILL_CONFIRMED;
            this.ctx.fillRect(z.x, z.y, z.w, z.h);

            // Stroke
            this.ctx.strokeStyle = isActive ? ZONE_STROKE : ZONE_STROKE_CONFIRMED;
            this.ctx.lineWidth = 2 / scale;
            this.ctx.setLineDash(isActive ? [] : [6 / scale, 4 / scale]);
            this.ctx.strokeRect(z.x, z.y, z.w, z.h);
            this.ctx.setLineDash([]);

            // Resize handles (corner squares)
            this.drawHandles(z, scale);
        }

        this.ctx.restore();
    }

    /** Draw resize handles at the 4 corners of a zone rect */
    private drawHandles(z: ZoneRect, scale: number): void {
        const hs = HANDLE_SIZE / scale;
        const half = hs / 2;

        const corners = [
            { cx: z.x, cy: z.y },
            { cx: z.x + z.w, cy: z.y },
            { cx: z.x, cy: z.y + z.h },
            { cx: z.x + z.w, cy: z.y + z.h },
        ];

        this.ctx.fillStyle = HANDLE_FILL;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1.5 / scale;
        for (const c of corners) {
            this.ctx.fillRect(c.cx - half, c.cy - half, hs, hs);
            this.ctx.strokeRect(c.cx - half, c.cy - half, hs, hs);
        }
    }

    // --- CTA Navigation ---
    private setupCTA(): void {
        const btn = document.getElementById('btn-start') as HTMLButtonElement;
        btn.addEventListener('click', () => this.confirm());
    }

    private confirm(): void {
        let zone: ZoneRect;

        if (this.selectedPreset === 'custom') {
            if (!this.customZone) {
                zone = ZONE_PRESETS.full;
            } else {
                zone = this.customZone;
            }
        } else {
            zone = ZONE_PRESETS[this.selectedPreset];
        }

        const shouldRotate = zone.h > zone.w;

        const config: ExerciseZoneConfig = {
            preset: this.selectedPreset,
            zone,
            rotate: shouldRotate,
        };

        this.onConfirm(config);
    }
}
