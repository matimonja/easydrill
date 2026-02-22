import { Camera } from './Camera';
import { Field } from '../entities/Field';
import { Player } from '../entities/Player';
import { BaseShape, RectangleShape, EllipseShape, TriangleShape, LineShape, FreehandShape } from '../entities/Shape';
import { BaseAction, ActionType, RunAction, PassAction, DribbleAction, ShootAction, TackleAction, TurnAction } from '../entities/Action';
import { Cone, Ball, ConeGroup } from '../entities/ExerciseObjects';
import { Goal } from '../entities/Goal';
import { CommandManager } from './CommandManager';
import { AnimationManager } from './AnimationManager';
import { RemoveEntityCommand, AddEntityCommand, MoveEntityCommand, RemoveActionChainCommand } from './Commands';
import { IGameContext, ToolType, ShapeType, Entity } from './Interfaces';
import { ExerciseZoneConfig } from './ExerciseZoneConfig';

// Tools
import { Tool } from '../tools/Tool';
import { SelectTool } from '../tools/SelectTool';
import { PlayerTool } from '../tools/PlayerTool';
import { CameraTool } from '../tools/CameraTool';
import { ShapeTool } from '../tools/ShapeTool';
import { ActionTool } from '../tools/ActionTool';
import { ExerciseTool } from '../tools/ExerciseTool';

type AppMode = 'edit' | 'play';

export class Game implements IGameContext {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public camera: Camera;
    public field: Field;
    public commandManager: CommandManager;
    public animationManager: AnimationManager;

    public entities: Entity[] = [];
    private selectedEntity: Entity | null = null;

    // Scene Management
    public currentScene: number = 0;
    public sceneCount: number = 1;

    // State Management
    private currentMode: AppMode = 'edit';
    private currentToolId: ToolType = 'select';

    // Tool System
    private tools: Map<ToolType, Tool> = new Map();

    // Action UI State
    private currentActionType: ActionType = 'run';
    private currentActionLineType: 'straight' | 'freehand' = 'straight';

    // Optimization State
    private useAIOptimization: boolean = false;

    // Exercise Zone Configuration (optional, passed from setup screen)
    private zoneConfig?: ExerciseZoneConfig;
    private _zoneSelected: boolean = false;
    private _zoneEditEnabled: boolean = false;

    // Pointer / pinch state (mobile & desktop)
    private activePointerId: number | null = null;
    private pinchPointers: Map<number, { clientX: number; clientY: number }> = new Map();
    private pinchInitialDistance: number = 0;
    private pinchInitialZoom: number = 1;

    constructor(canvasId: string, zoneConfig?: ExerciseZoneConfig) {
        this.zoneConfig = zoneConfig;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found');

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;

        // Initialize Core Subsystems
        this.camera = new Camera(0, 0);
        this.field = new Field();
        this.commandManager = new CommandManager();
        this.animationManager = new AnimationManager();

        // Initialize Tools
        this.tools.set('select', new SelectTool(this));
        this.tools.set('player', new PlayerTool(this));
        this.tools.set('camera', new CameraTool(this));
        this.tools.set('shape', new ShapeTool(this));
        this.tools.set('action', new ActionTool(this));
        this.tools.set('exercise', new ExerciseTool(this));

        // Initial Setup
        this.setupUI();
        this.setupEvents();
        this.resize();

        // Activate default tool
        this.setTool('select');

        window.addEventListener('resize', () => this.resize());
    }

    // --- IGameContext Implementation ---

    public addEntity(entity: Entity) {
        this.entities.push(entity);
    }

    public removeEntity(entity: Entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
        if (this.selectedEntity === entity) {
            this.selectEntity(null);
        }
    }

    public selectEntity(entity: Entity | null) {
        if (this.selectedEntity) this.selectedEntity.isSelected = false;
        this.selectedEntity = entity;
        if (this.selectedEntity) this.selectedEntity.isSelected = true;

        // Deselect zone when selecting an entity
        if (entity) this._zoneSelected = false;

        if (this.currentMode === 'edit') {
            this.updateSelectionUI();
        }
    }

    public getSelectedEntity(): Entity | null {
        return this.selectedEntity;
    }

    // --- Zone selection/editing methods ---

    public hasZone(): boolean {
        return !!this.zoneConfig && this.zoneConfig.preset !== 'full';
    }

    public isZoneSelected(): boolean {
        return this._zoneSelected;
    }

    public isZoneEditing(): boolean {
        return this._zoneSelected && this._zoneEditEnabled;
    }

    public selectZone(): void {
        // Deselect any entity first
        if (this.selectedEntity) {
            this.selectedEntity.isSelected = false;
            this.selectedEntity = null;
        }
        this._zoneSelected = true;
        if (this.currentMode === 'edit') {
            this.updateSelectionUI();
        }
    }

    public deselectZone(): void {
        this._zoneSelected = false;
        this._zoneEditEnabled = false;
        if (this.currentMode === 'edit') {
            this.updateSelectionUI();
        }
    }

    public getZoneRect(): { x: number; y: number; w: number; h: number } | null {
        if (!this.zoneConfig || this.zoneConfig.preset === 'full') return null;
        return { ...this.zoneConfig.zone };
    }

    public setZoneRect(rect: { x: number; y: number; w: number; h: number }): void {
        if (!this.zoneConfig) return;
        this.zoneConfig.zone = { ...rect };
    }

    public getZoneHandles(): { id: string; x: number; y: number }[] {
        const z = this.getZoneRect();
        if (!z) return [];
        return [
            { id: 'nw', x: z.x, y: z.y },
            { id: 'ne', x: z.x + z.w, y: z.y },
            { id: 'sw', x: z.x, y: z.y + z.h },
            { id: 'se', x: z.x + z.w, y: z.y + z.h },
        ];
    }

    public setTool(toolId: ToolType) {
        // Deactivate previous tool
        if (this.currentToolId) {
            this.tools.get(this.currentToolId)?.deactivate();
        }

        this.currentToolId = toolId;

        // Activate new tool
        this.tools.get(toolId)?.activate();

        // UI Updates
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

        let activeBtnId = '';
        if (toolId === 'select') activeBtnId = 'tool-select';
        if (toolId === 'player') activeBtnId = 'tool-player';
        if (toolId === 'camera') activeBtnId = 'tool-camera';
        if (toolId === 'shape') activeBtnId = 'tool-shape';
        if (toolId === 'exercise') activeBtnId = 'tool-exercise';

        if (activeBtnId) document.getElementById(activeBtnId)?.classList.add('active');

        // Deselect entities if switching to creation tools to avoid confusion
        if (toolId === 'camera' || toolId === 'shape' || toolId === 'exercise') {
            this.selectEntity(null);
        }

        this.updatePropertiesPanel(toolId);
    }

    private activateActionTool(player: Player) {
        this.setTool('action');
        const tool = this.tools.get('action') as ActionTool;
        if (tool) {
            tool.setContext(player, this.currentActionType, this.currentActionLineType);
        }
        // Force UI update to show active highlights
        this.updatePropertiesPanel('action');
    }

    // --- Input Handling (Delegated to Tools) ---

    private setupEvents() {
        // Wheel zoom (desktop)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoomAt(zoomAmount, e.clientX, e.clientY, this.canvas);
        }, { passive: false });

        // Pointer events (mouse + touch + pen)
        this.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (e.target !== this.canvas) return;
            const isTouch = e.pointerType === 'touch';

            if (isTouch) {
                this.pinchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                if (this.pinchPointers.size === 2) {
                    this.startPinch(e);
                    return;
                }
            }
            if (this.pinchPointers.size >= 2) return;

            this.activePointerId = e.pointerId;
            this.canvas.setPointerCapture(e.pointerId);
            this.tools.get(this.currentToolId)?.onMouseDown(e as PointerEvent);
        });

        this.canvas.addEventListener('pointermove', (e) => {
            if (e.target !== this.canvas) return;
            if (this.pinchPointers.size === 2) {
                this.updatePinch(e);
                return;
            }
            if (this.activePointerId === e.pointerId) {
                if (e.pointerType === 'touch') this.pinchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                this.tools.get(this.currentToolId)?.onMouseMove(e as PointerEvent);
            } else if (e.pointerType === 'touch' && this.pinchPointers.has(e.pointerId)) {
                this.pinchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
            }
        });

        this.canvas.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'touch') {
                this.pinchPointers.delete(e.pointerId);
                if (this.pinchPointers.size < 2) this.endPinch();
            }
            if (this.activePointerId === e.pointerId) {
                this.activePointerId = null;
                this.tools.get(this.currentToolId)?.onMouseUp(e as PointerEvent);
            }
        });

        this.canvas.addEventListener('pointercancel', (e) => {
            this.pinchPointers.delete(e.pointerId);
            if (this.pinchPointers.size < 2) this.endPinch();
            if (this.activePointerId === e.pointerId) {
                this.activePointerId = null;
                this.tools.get(this.currentToolId)?.onMouseUp(e as PointerEvent);
            }
        });

        window.addEventListener('keydown', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (this.currentMode === 'play') {
                if (e.key.toLowerCase() === 'r') this.camera.toggleRotation();
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') this.commandManager.undo();
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') this.commandManager.redo();

            if (e.key.toLowerCase() === 'v') this.setTool('select');
            if (e.key.toLowerCase() === 'p') this.setTool('player');
            if (e.key.toLowerCase() === 'c') this.setTool('camera');
            if (e.key.toLowerCase() === 's') this.setTool('shape');
            if (e.key.toLowerCase() === 'o') this.setTool('exercise');
            if (e.key.toLowerCase() === 'r') this.camera.toggleRotation();
        });
    }

    private pinchDistance(): number {
        const entries = [...this.pinchPointers.entries()];
        if (entries.length < 2) return 0;
        const [a, b] = entries;
        return Math.hypot(a[1].clientX - b[1].clientX, a[1].clientY - b[1].clientY) || 1;
    }

    private pinchCenter(): { clientX: number; clientY: number } {
        const entries = [...this.pinchPointers.values()];
        const n = entries.length;
        if (n === 0) return { clientX: 0, clientY: 0 };
        const sumX = entries.reduce((s, p) => s + p.clientX, 0);
        const sumY = entries.reduce((s, p) => s + p.clientY, 0);
        return { clientX: sumX / n, clientY: sumY / n };
    }

    private startPinch(secondFingerEvent: PointerEvent) {
        const otherId = [...this.pinchPointers.keys()].find(id => id !== secondFingerEvent.pointerId);
        if (otherId != null && this.activePointerId === otherId) {
            const pos = this.pinchPointers.get(otherId)!;
            const synthetic = new PointerEvent('pointerup', { pointerId: otherId, clientX: pos.clientX, clientY: pos.clientY });
            this.tools.get(this.currentToolId)?.onMouseUp(synthetic);
            this.activePointerId = null;
        }
        this.pinchInitialDistance = this.pinchDistance();
        this.pinchInitialZoom = this.camera.zoom;
    }

    private updatePinch(e: PointerEvent) {
        this.pinchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        const dist = this.pinchDistance();
        if (this.pinchInitialDistance <= 0) return;
        const ratio = dist / this.pinchInitialDistance;
        const newZoom = Math.max(0.1, Math.min(5, this.pinchInitialZoom * ratio));
        const amount = newZoom / this.camera.zoom;
        const center = this.pinchCenter();
        this.camera.zoomAt(amount, center.clientX, center.clientY, this.canvas);
    }

    private endPinch() {
        this.pinchInitialDistance = 0;
        this.pinchInitialZoom = 1;
    }

    // --- UI Management ---

    private setupUI() {
        const btnModeEdit = document.getElementById('btn-mode-edit');
        const btnModePlay = document.getElementById('btn-mode-play');
        const editToolsPanel = document.getElementById('edit-tools-panel');
        const playToolsPanel = document.getElementById('play-tools-panel');

        const switchMode = (mode: AppMode) => {
            this.currentMode = mode;

            if (mode === 'edit') {
                // Stop animation and reset positions when entering Edit Mode
                this.animationManager.stop();
                this.updateSceneState();

                btnModeEdit?.classList.add('active');
                btnModePlay?.classList.remove('active');
                editToolsPanel?.classList.remove('hidden');
                playToolsPanel?.classList.add('hidden');

                // Show Scene Controls in Edit Mode
                const sceneSection = document.getElementById('section-scenes');
                if (sceneSection) sceneSection.style.display = 'flex';

                // Restore Edit Tool
                this.setTool('select');
                this.updateSelectionUI();
            } else {
                btnModeEdit?.classList.remove('active');
                btnModePlay?.classList.add('active');
                editToolsPanel?.classList.add('hidden');
                playToolsPanel?.classList.remove('hidden');

                // Hide Scene Controls in Play Mode
                const sceneSection = document.getElementById('section-scenes');
                if (sceneSection) sceneSection.style.display = 'none';

                this.selectEntity(null);
                this.updatePropertiesPanel(null);

                // In Play Mode, we effectively use the Camera Tool with Pan enabled
                this.setTool('camera');
                (this.tools.get('camera') as CameraTool).setPanEnabled(true);
            }
        };

        btnModeEdit?.addEventListener('click', () => switchMode('edit'));
        btnModePlay?.addEventListener('click', () => switchMode('play'));

        // Save & Settings buttons
        document.getElementById('btn-save')?.addEventListener('click', () => {
            // Navigate to exercise detail page
            window.location.href = 'ejercicio.html';
        });
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            window.location.href = 'setup.html';
        });

        // Inject Scene Controls
        const modesSection = document.querySelector('.section-modes');
        if (modesSection) {
            const sep = document.createElement('div');
            sep.className = 'separator-vertical';
            modesSection.after(sep);

            const sceneSection = document.createElement('div');
            sceneSection.id = 'section-scenes';
            sceneSection.className = 'toolbar-section section-modes'; // Reuse style
            sceneSection.style.flexDirection = 'column';
            sceneSection.style.gap = '5px';
            sceneSection.style.minWidth = '100px';
            sceneSection.innerHTML = `
            <div style="font-size: 0.7rem; color: #888; text-transform: uppercase;">Escena</div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="mode-btn" id="scene-prev" style="width: 24px; height: 24px; font-size: 12px;"><i class="fa-solid fa-chevron-left"></i></button>
                <span id="scene-display" style="font-weight: bold; min-width: 20px; text-align: center; font-size: 1.1rem;">1</span>
                <button class="mode-btn" id="scene-next" style="width: 24px; height: 24px; font-size: 12px;"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <button class="prop-btn" id="scene-add" style="padding: 2px 8px; font-size: 0.75rem; width: 100%; justify-content: center; height: 24px;"><i class="fa-solid fa-plus"></i> Nueva</button>
            <button class="prop-btn danger" id="scene-delete" style="padding: 2px 8px; font-size: 0.75rem; width: 100%; justify-content: center; height: 24px; display: none;"><i class="fa-solid fa-trash"></i> Eliminar</button>
        `;
            sep.after(sceneSection);

            // Scene Listeners
            document.getElementById('scene-prev')?.addEventListener('click', () => this.setScene(this.currentScene - 1));
            document.getElementById('scene-next')?.addEventListener('click', () => this.setScene(this.currentScene + 1));
            document.getElementById('scene-add')?.addEventListener('click', () => {
                this.sceneCount++;
                this.setScene(this.sceneCount - 1);
            });
            document.getElementById('scene-delete')?.addEventListener('click', () => this.deleteScene());
        }

        // Tool Buttons
        document.getElementById('tool-select')?.addEventListener('click', () => this.setTool('select'));
        document.getElementById('tool-player')?.addEventListener('click', () => this.setTool('player'));
        document.getElementById('tool-camera')?.addEventListener('click', () => this.setTool('camera'));
        document.getElementById('tool-shape')?.addEventListener('click', () => this.setTool('shape'));
        document.getElementById('tool-exercise')?.addEventListener('click', () => this.setTool('exercise'));

        document.getElementById('action-undo')?.addEventListener('click', () => this.commandManager.undo());
        document.getElementById('action-redo')?.addEventListener('click', () => this.commandManager.redo());

        // Collapsible Menu
        const secondaryMenu = document.getElementById('secondary-menu');
        const btnCollapse = document.getElementById('btn-collapse-menu');
        const btnOpenMenu = document.getElementById('btn-open-menu');

        const toggleMenu = (forceOpen: boolean = false) => {
            if (forceOpen) {
                secondaryMenu?.classList.remove('collapsed');
                btnOpenMenu?.classList.add('hidden');
            } else {
                secondaryMenu?.classList.toggle('collapsed');
                if (secondaryMenu?.classList.contains('collapsed')) {
                    btnOpenMenu?.classList.remove('hidden');
                } else {
                    btnOpenMenu?.classList.add('hidden');
                }
            }
        };

        btnCollapse?.addEventListener('click', () => toggleMenu());
        btnOpenMenu?.addEventListener('click', () => toggleMenu());

        // Toolbar colapsable (solo efecto en móvil vía CSS)
        const mainToolbar = document.getElementById('main-toolbar');
        const toolbarCollapseBtn = document.getElementById('toolbar-collapse-btn');
        toolbarCollapseBtn?.addEventListener('click', () => {
            mainToolbar?.classList.toggle('collapsed');
            const collapsed = mainToolbar?.classList.contains('collapsed');
            toolbarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Colapsar menú');
            toolbarCollapseBtn.title = collapsed ? 'Expandir menú' : 'Colapsar menú';
        });

        // Properties Side Panel (mobile)
        const btnCloseProps = document.getElementById('btn-close-props-panel');
        btnCloseProps?.addEventListener('click', () => this.closePropsPanel());

        // Animation Controls
        const btnAnimPlay = document.getElementById('anim-play');
        const btnAnimStop = document.getElementById('anim-stop');
        const inputAnimSpeed = document.getElementById('anim-speed') as HTMLInputElement;
        const spanAnimSpeed = document.getElementById('anim-speed-val');

        // Inject Optimization Toggle into Play Panel
        const playPanel = document.getElementById('play-tools-panel');
        if (playPanel) {
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'menu-control-group checkbox-wrapper';
            toggleContainer.style.margin = '0 10px';
            toggleContainer.style.background = 'rgba(0,0,0,0.2)';
            toggleContainer.style.padding = '4px 8px';
            toggleContainer.style.borderRadius = '4px';

            toggleContainer.innerHTML = `
            <input type="checkbox" id="ai-opt-toggle">
            <label class="menu-label" for="ai-opt-toggle" style="cursor:pointer; color: #a855f7; font-weight: bold;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Opt
            </label>
        `;
            playPanel.insertBefore(toggleContainer, playPanel.firstChild);

            const toggle = toggleContainer.querySelector('#ai-opt-toggle') as HTMLInputElement;
            toggle.addEventListener('change', (e) => {
                this.useAIOptimization = (e.target as HTMLInputElement).checked;
            });
        }

        btnAnimPlay?.addEventListener('click', async () => {
            if (this.animationManager.isPlaying) {
                this.animationManager.pause();
            } else {
                const useAIOpt = (document.getElementById('ai-opt-toggle') as HTMLInputElement)?.checked ?? this.useAIOptimization;
                if (useAIOpt) {
                    await this.optimizeDrill();
                }
                this.animationManager.play(this.currentScene, this.entities);
            }
            // Update Icon
            const icon = btnAnimPlay.querySelector('i');
            if (this.animationManager.isPlaying && !this.animationManager.isPaused) {
                icon?.classList.replace('fa-play', 'fa-pause');
            } else {
                icon?.classList.replace('fa-pause', 'fa-play');
            }
        });

        btnAnimStop?.addEventListener('click', () => {
            this.animationManager.stop();
            const icon = btnAnimPlay?.querySelector('i');
            icon?.classList.replace('fa-pause', 'fa-play');
        });

        inputAnimSpeed?.addEventListener('input', (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            this.animationManager.setSpeed(val);
            if (spanAnimSpeed) spanAnimSpeed.textContent = val.toFixed(1) + 'x';
        });
    }

    public setScene(index: number) {
        if (index < 0 || index >= this.sceneCount) return;

        this.currentScene = index;
        this.updateSceneState();
    }

    public updateSceneState() {
        // Update UI
        const display = document.getElementById('scene-display');
        if (display) display.textContent = (this.currentScene + 1).toString();

        // Update delete button visibility
        this.updateSceneButtons();

        // Update Entities
        this.entities.forEach(e => {
            if (e instanceof Player) {
                e.updateForScene(this.currentScene);
            }
        });

        // Deselect to avoid stale handles
        this.selectEntity(null);
    }

    private updateSceneButtons() {
        const deleteBtn = document.getElementById('scene-delete');
        if (deleteBtn) {
            const canDelete = this.sceneCount > 1 && this.currentScene === this.sceneCount - 1;
            deleteBtn.style.display = canDelete ? '' : 'none';
        }
    }

    private deleteScene() {
        if (this.sceneCount <= 1 || this.currentScene !== this.sceneCount - 1) return;

        const sceneNumber = this.currentScene + 1;
        this.showConfirmDialog(
            `¿Eliminar Escena ${sceneNumber}?`,
            'Se eliminará todo lo correspondiente a esta escena (acciones, movimientos, etc.). Esta acción no se puede deshacer.',
            () => {
                const sceneToDelete = this.currentScene;

                // Remove all actions belonging to this scene from every player
                this.entities.forEach(e => {
                    if (e instanceof Player) {
                        e.actions = e.actions.filter(a => a.sceneIndex !== sceneToDelete);
                    }
                });

                this.sceneCount--;
                this.setScene(sceneToDelete - 1);
            }
        );
    }

    private showConfirmDialog(title: string, message: string, onConfirm: () => void) {
        // Remove any existing dialog
        document.getElementById('confirm-dialog-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'confirm-dialog-overlay';
        overlay.className = 'confirm-dialog-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-title">${title}</div>
                <div class="confirm-dialog-message">${message}</div>
                <div class="confirm-dialog-actions">
                    <button class="confirm-dialog-btn cancel" id="confirm-cancel">Cancelar</button>
                    <button class="confirm-dialog-btn confirm" id="confirm-ok">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('confirm-cancel')!.addEventListener('click', () => overlay.remove());
        document.getElementById('confirm-ok')!.addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    private isMobileView(): boolean {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    private openPropsPanel(title: string): void {
        const panel = document.getElementById('properties-side-panel');
        const titleEl = document.getElementById('props-panel-title');
        if (panel) panel.classList.remove('collapsed');
        if (titleEl) titleEl.textContent = title;
    }

    public closePropsPanel(): void {
        const panel = document.getElementById('properties-side-panel');
        if (panel) panel.classList.add('collapsed');
    }



    private setupAccordionListeners(container: HTMLElement): void {
        container.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.accordion-section');
                section?.classList.toggle('open');
            });
        });
    }

    private wrapInAccordion(title: string, content: string, openByDefault: boolean = false): string {
        return `
            <div class="accordion-section${openByDefault ? ' open' : ''}">
                <button class="accordion-header">
                    <span>${title}</span>
                    <i class="fa-solid fa-chevron-down accordion-chevron"></i>
                </button>
                <div class="accordion-body">${content}</div>
            </div>
        `;
    }

    private updatePropertiesPanel(tool: ToolType | null) {
        const propertiesPanel = document.getElementById('properties-panel');
        if (!propertiesPanel) return;
        propertiesPanel.innerHTML = '';

        // Also clear the mobile side panel content
        const mobilePanelContent = document.getElementById('props-panel-content');
        if (mobilePanelContent) mobilePanelContent.innerHTML = '';

        if (this.currentMode === 'play') {
            propertiesPanel.innerHTML = '<span class="placeholder-text-small">Modo Reproducción</span>';
            this.closePropsPanel();
            return;
        }

        if (!tool) {
            this.closePropsPanel();
            return;
        }

        const isMobile = this.isMobileView();
        // On mobile, we render into the side panel
        const targetPanel = isMobile ? mobilePanelContent! : propertiesPanel;

        if (tool === 'exercise') {
            const exTool = this.tools.get('exercise') as ExerciseTool;
            const currentObj = exTool.getObjectType();
            const currentShape = exTool.getConeShape();

            let html = `
             <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                 <button class="prop-btn ${currentObj === 'cone' ? 'active-prop' : ''}" id="ex-cone" title="Cono"><i class="fa-solid fa-traffic-cone"></i></button>
                 <button class="prop-btn ${currentObj === 'ball' ? 'active-prop' : ''}" id="ex-ball" title="Bocha"><i class="fa-solid fa-circle"></i></button>
                 <button class="prop-btn ${currentObj === 'goal' ? 'active-prop' : ''}" id="ex-goal" title="Arco"><i class="fa-regular fa-futbol"></i></button>
             </div>
          `;

            if (currentObj === 'cone') {
                html += `
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                     <button class="prop-btn ${currentShape === 'single' ? 'active-prop' : ''}" id="ex-shape-single" title="Simple"><i class="fa-solid fa-stop"></i></button>
                     <button class="prop-btn ${currentShape === 'line' ? 'active-prop' : ''}" id="ex-shape-line" title="Línea"><i class="fa-solid fa-slash"></i></button>
                     <button class="prop-btn ${currentShape === 'freehand' ? 'active-prop' : ''}" id="ex-shape-free" title="Libre"><i class="fa-solid fa-pencil"></i></button>
                     <button class="prop-btn ${currentShape === 'rectangle' ? 'active-prop' : ''}" id="ex-shape-rect" title="Rectángulo"><i class="fa-regular fa-square"></i></button>
                     <button class="prop-btn ${currentShape === 'ellipse' ? 'active-prop' : ''}" id="ex-shape-circle" title="Círculo"><i class="fa-regular fa-circle"></i></button>
                     <button class="prop-btn ${currentShape === 'triangle' ? 'active-prop' : ''}" id="ex-shape-tri" title="Triángulo"><i class="fa-solid fa-play fa-rotate-270"></i></button>
                </div>
             `;
            }

            targetPanel.innerHTML = html;
            if (isMobile) this.openPropsPanel('Objetos');

            document.getElementById('ex-cone')?.addEventListener('click', () => { exTool.setObjectType('cone'); this.updatePropertiesPanel('exercise'); });
            document.getElementById('ex-ball')?.addEventListener('click', () => { exTool.setObjectType('ball'); this.updatePropertiesPanel('exercise'); });
            document.getElementById('ex-goal')?.addEventListener('click', () => { exTool.setObjectType('goal'); this.updatePropertiesPanel('exercise'); });

            if (currentObj === 'cone') {
                const setShape = (s: any) => { exTool.setConeShape(s); this.updatePropertiesPanel('exercise'); };
                document.getElementById('ex-shape-single')?.addEventListener('click', () => setShape('single'));
                document.getElementById('ex-shape-line')?.addEventListener('click', () => setShape('line'));
                document.getElementById('ex-shape-free')?.addEventListener('click', () => setShape('freehand'));
                document.getElementById('ex-shape-rect')?.addEventListener('click', () => setShape('rectangle'));
                document.getElementById('ex-shape-circle')?.addEventListener('click', () => setShape('ellipse'));
                document.getElementById('ex-shape-tri')?.addEventListener('click', () => setShape('triangle'));
            }
            return;
        }

        if (tool === 'action') {
            if (this.selectedEntity instanceof Player) {
                this.renderPlayerActionUI(targetPanel, this.selectedEntity);
                if (isMobile) this.openPropsPanel('Acciones');
            } else {
                targetPanel.innerHTML = '<span class="placeholder-text-small">Dibujando Acción...</span>';
            }
            return;
        }

        if (tool === 'shape') {
            const shapeTool = this.tools.get('shape') as ShapeTool;

            targetPanel.innerHTML = `
             <div style="display: flex; gap: 5px; flex-wrap: wrap;">
               <button class="prop-btn" id="shape-line" title="Línea"><i class="fa-solid fa-slash"></i></button>
               <button class="prop-btn" id="shape-free" title="Libre"><i class="fa-solid fa-pencil"></i></button>
               <button class="prop-btn" id="shape-rect" title="Rectángulo"><i class="fa-regular fa-square"></i></button>
               <button class="prop-btn" id="shape-circle" title="Círculo/Óvalo"><i class="fa-regular fa-circle"></i></button>
               <button class="prop-btn" id="shape-tri" title="Triángulo"><i class="fa-solid fa-play fa-rotate-270"></i></button>
             </div>
          `;
            if (isMobile) this.openPropsPanel('Formas');

            const setActiveBtn = (id: string) => {
                targetPanel.querySelectorAll('.prop-btn').forEach(b => b.classList.remove('active-prop'));
                document.getElementById(id)?.classList.add('active-prop');
            };

            setActiveBtn('shape-line');

            document.getElementById('shape-line')?.addEventListener('click', () => { shapeTool.setShapeType('line'); setActiveBtn('shape-line'); });
            document.getElementById('shape-free')?.addEventListener('click', () => { shapeTool.setShapeType('freehand'); setActiveBtn('shape-free'); });
            document.getElementById('shape-rect')?.addEventListener('click', () => { shapeTool.setShapeType('rectangle'); setActiveBtn('shape-rect'); });
            document.getElementById('shape-circle')?.addEventListener('click', () => { shapeTool.setShapeType('circle'); setActiveBtn('shape-circle'); });
            document.getElementById('shape-tri')?.addEventListener('click', () => { shapeTool.setShapeType('triangle'); setActiveBtn('shape-tri'); });

        } else if (tool === 'camera') {
            const camTool = this.tools.get('camera') as CameraTool;

            targetPanel.innerHTML = `
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              <button class="prop-btn" id="cam-pan-toggle" title="Activar Paneo"><i class="fa-solid fa-hand"></i> Paneo</button>
              <button class="prop-btn" id="cam-zoom-out" title="Alejar"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
              <button class="prop-btn" id="cam-zoom-in" title="Acercar"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
              <button class="prop-btn" id="cam-rotate" title="Rotar Vista"><i class="fa-solid fa-rotate"></i> Rotar</button>
              <button class="prop-btn" id="cam-reset" title="Centrar"><i class="fa-solid fa-compress"></i></button>
            </div>
          `;
            if (isMobile) this.openPropsPanel('Cámara');

            const panBtn = document.getElementById('cam-pan-toggle');
            if (panBtn) {
                const updatePanVisual = () => {
                    if (camTool.isPanEnabled) {
                        panBtn.classList.add('active-prop');
                    } else {
                        panBtn.classList.remove('active-prop');
                    }
                }
                updatePanVisual();

                panBtn.addEventListener('click', () => {
                    camTool.setPanEnabled(!camTool.isPanEnabled);
                    updatePanVisual();
                });
            }

            document.getElementById('cam-zoom-in')?.addEventListener('click', () =>
                this.camera.zoomAt(1.2, this.canvas.width / 2, this.canvas.height / 2, this.canvas)
            );
            document.getElementById('cam-zoom-out')?.addEventListener('click', () =>
                this.camera.zoomAt(0.8, this.canvas.width / 2, this.canvas.height / 2, this.canvas)
            );
            document.getElementById('cam-rotate')?.addEventListener('click', () =>
                this.camera.toggleRotation()
            );
            document.getElementById('cam-reset')?.addEventListener('click', () => {
                this.camera.x = 0;
                this.camera.y = 0;
            });

        } else if (tool === 'player') {
            const playerTool = this.tools.get('player') as PlayerTool;
            const currentTeam = playerTool.getTeam();
            const currentColor = playerTool.getColor();
            const currentQty = playerTool.getQuantity();

            const pastelColors = [
                '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
                '#BAE1FF', '#E2C9FF', '#FFFFFF', '#000000',
                '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'
            ];

            let colorPaletteHtml = '<div class="color-palette">';
            pastelColors.forEach(c => {
                colorPaletteHtml += `<div class="color-swatch" style="background-color: ${c}" data-color="${c}"></div>`;
            });
            colorPaletteHtml += '</div>';

            if (isMobile) {
                // Mobile: use accordion layout in side panel
                const teamContent = `
                    <div class="menu-control-group" style="margin-bottom: 0;">
                        <select id="create-player-team" class="menu-select">
                            <option value="A" ${currentTeam === 'A' ? 'selected' : ''}>Equipo A</option>
                            <option value="B" ${currentTeam === 'B' ? 'selected' : ''}>Equipo B</option>
                        </select>
                    </div>
                `;
                const colorContent = `
                    <div class="menu-control-group" style="margin-bottom: 0;">
                        ${colorPaletteHtml}
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                            <span style="font-size: 0.8rem; color: #888;">Custom:</span>
                            <input type="color" id="create-player-color" class="menu-input" value="${currentColor}" style="flex: 1; height: 30px;">
                        </div>
                    </div>
                `;
                const qtyContent = `
                    <div class="menu-control-group" style="margin-bottom: 0;">
                        <label class="menu-label">Cantidad: <span id="create-player-qty-val">${currentQty}</span></label>
                        <input type="range" id="create-player-qty" class="menu-input" min="1" max="11" step="1" value="${currentQty}">
                    </div>
                `;

                targetPanel.innerHTML =
                    this.wrapInAccordion('Equipo', teamContent, true) +
                    this.wrapInAccordion('Color', colorContent, true) +
                    this.wrapInAccordion('Cantidad', qtyContent, true);

                this.setupAccordionListeners(targetPanel);
                this.openPropsPanel('Crear Jugador');
            } else {
                // Desktop: horizontal layout in bottom toolbar
                targetPanel.innerHTML = `
                 <div class="menu-control-group" style="margin-bottom: 0; width: 120px;">
                      <label class="menu-label">Equipo</label>
                      <select id="create-player-team" class="menu-select">
                          <option value="A" ${currentTeam === 'A' ? 'selected' : ''}>Equipo A</option>
                          <option value="B" ${currentTeam === 'B' ? 'selected' : ''}>Equipo B</option>
                      </select>
                 </div>

                 <div class="menu-control-group" style="margin-bottom: 0; min-width: 200px;">
                      <label class="menu-label">Color</label>
                      ${colorPaletteHtml}
                      <div style="display: flex; align-items: center; gap: 8px;">
                         <span style="font-size: 0.8rem; color: #888;">Personalizado:</span>
                         <input type="color" id="create-player-color" class="menu-input" value="${currentColor}" style="flex: 1; height: 30px;">
                      </div>
                 </div>

                 <div class="menu-control-group" style="margin-bottom: 0; width: 100px;">
                      <label class="menu-label">Cantidad: <span id="create-player-qty-val">${currentQty}</span></label>
                      <input type="range" id="create-player-qty" class="menu-input" min="1" max="11" step="1" value="${currentQty}">
                 </div>
              `;
            }

            // Listeners (shared between mobile/desktop)
            document.getElementById('create-player-team')?.addEventListener('change', (e) => {
                playerTool.setTeam((e.target as HTMLSelectElement).value);
            });

            document.getElementById('create-player-qty')?.addEventListener('input', (e) => {
                const val = parseInt((e.target as HTMLInputElement).value) || 1;
                playerTool.setQuantity(val);
                document.getElementById('create-player-qty-val')!.textContent = val.toString();
            });

            targetPanel.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', (e) => {
                    const c = (e.target as HTMLElement).dataset.color;
                    if (c) {
                        playerTool.setColor(c);
                        const input = document.getElementById('create-player-color') as HTMLInputElement;
                        if (input) input.value = c;
                    }
                });
            });

            document.getElementById('create-player-color')?.addEventListener('input', (e) => {
                playerTool.setColor((e.target as HTMLInputElement).value);
            });

        } else if (tool === 'select') {
            if (this.selectedEntity) {
                const p = this.selectedEntity;
                if (p instanceof Player) {
                    this.renderPlayerActionUI(targetPanel, p);
                    if (isMobile) this.openPropsPanel('Jugador');
                } else if (p instanceof BaseShape) {
                    // Shape Selection UI
                    targetPanel.innerHTML = `
                     <button class="prop-btn danger" id="prop-delete" title="Eliminar"><i class="fa-solid fa-trash"></i> Eliminar</button>
                  `;
                    if (isMobile) this.openPropsPanel('Forma');
                    document.getElementById('prop-delete')?.addEventListener('click', () => this.deleteSelected());
                } else if (p instanceof BaseAction) {
                    // Action Selection UI
                    targetPanel.innerHTML = `
                     <button class="prop-btn danger" id="prop-delete" title="Eliminar"><i class="fa-solid fa-trash"></i> Eliminar</button>
                  `;
                    if (isMobile) this.openPropsPanel('Acción');
                    document.getElementById('prop-delete')?.addEventListener('click', () => this.deleteSelected());
                } else if (p instanceof Cone || p instanceof Ball || p instanceof ConeGroup) {
                    targetPanel.innerHTML = `
                     <button class="prop-btn danger" id="prop-delete" title="Eliminar"><i class="fa-solid fa-trash"></i> Eliminar</button>
                  `;
                    if (isMobile) this.openPropsPanel('Objeto');
                    document.getElementById('prop-delete')?.addEventListener('click', () => this.deleteSelected());
                }
            } else {
                targetPanel.innerHTML = '<span class="placeholder-text-small">Seleccione un elemento para ver sus propiedades</span>';
                this.closePropsPanel();
            }
        }
    }

    private renderPlayerActionUI(container: HTMLElement, player: Player) {
        container.innerHTML = `
         <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
             <!-- Row 1: Actions -->
             <div class="action-toolbar" style="display: flex; gap: 5px; justify-content: flex-start; flex-wrap: wrap;">
                 <button class="prop-btn action-btn" data-action="run" title="Correr"><i class="fa-solid fa-person-running"></i></button>
                 <button class="prop-btn action-btn" data-action="dribble" title="Conducir"><i class="fa-solid fa-hockey-puck"></i></button>
                 <button class="prop-btn action-btn" data-action="pass" title="Pase"><i class="fa-solid fa-share"></i></button>
                 <button class="prop-btn action-btn" data-action="shoot" title="Tiro"><i class="fa-solid fa-bullseye"></i></button>
                 <button class="prop-btn action-btn" data-action="tackle" title="Quitar"><i class="fa-solid fa-shield-halved"></i></button>
                 <button class="prop-btn action-btn" data-action="turn" title="Girar"><i class="fa-solid fa-rotate"></i></button>
             </div>
             
             <!-- Row 2: Lines & Delete -->
             <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
                 <div style="display: flex; gap: 5px;">
                     <button class="prop-btn line-type-btn" data-type="straight" title="Recta"><i class="fa-solid fa-slash"></i></button>
                     <button class="prop-btn line-type-btn" data-type="freehand" title="Libre"><i class="fa-solid fa-pencil"></i></button>
                 </div>
                 <button class="prop-btn danger" id="prop-delete" title="Eliminar"><i class="fa-solid fa-trash"></i> Eliminar</button>
             </div>
         </div>
      `;

        // Highlights
        const updateHighlights = () => {
            const isActionTool = this.currentToolId === 'action';

            if (!isActionTool) {
                container.querySelectorAll('.active-prop').forEach(el => el.classList.remove('active-prop'));
                return;
            }

            const isInstantAction = this.currentActionType === 'turn' || this.currentActionType === 'tackle';

            container.querySelectorAll('.action-btn').forEach(btn => {
                btn.classList.toggle('active-prop', (btn as HTMLElement).dataset.action === this.currentActionType);
            });

            container.querySelectorAll('.line-type-btn').forEach(btn => {
                const b = btn as HTMLButtonElement;
                b.classList.toggle('active-prop', b.dataset.type === this.currentActionLineType);

                if (isInstantAction) {
                    b.style.opacity = '0.5';
                    b.style.pointerEvents = 'none';
                } else {
                    b.style.opacity = '1';
                    b.style.pointerEvents = 'auto';
                }
            });
        };
        updateHighlights();

        // Listeners
        container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentActionType = (e.currentTarget as HTMLElement).dataset.action as ActionType;
                this.activateActionTool(player); // This sets tool to 'action', triggering update
            });
        });

        container.querySelectorAll('.line-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentActionLineType = (e.currentTarget as HTMLElement).dataset.type as any;
                this.activateActionTool(player);
            });
        });

        document.getElementById('prop-delete')?.addEventListener('click', () => this.deleteSelected());
    }

    public updateSelectionUI() {
        // Re-render properties panel for current tool (updates context sensitive buttons)
        this.updatePropertiesPanel(this.currentToolId);
        this.updateSecondaryMenu();

        const secondaryMenu = document.getElementById('secondary-menu');
        const btnOpenMenu = document.getElementById('btn-open-menu');

        // En móvil el menú solo se abre de forma explícita (botón), no al seleccionar
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if ((this.selectedEntity || this._zoneSelected) && !isMobile) {
            secondaryMenu?.classList.remove('collapsed');
            btnOpenMenu?.classList.add('hidden');
        }
    }

    /** Parsea preEvent/postEvent a modo y opcionalmente segundos (para "esperar:N"). */
    private parseEventConfig(value: string): { mode: 'auto' | 'inmediato' | 'esperar'; seconds?: number } {
        const v = (value || '').trim().toLowerCase();
        if (v === 'auto') return { mode: 'auto' };
        if (v === 'inmediato') return { mode: 'inmediato' };
        if (v.startsWith('esperar:')) {
            const num = parseFloat(v.slice(8));
            return { mode: 'esperar', seconds: isNaN(num) || num < 0 ? 1 : num };
        }
        // Compatibilidad: valores antiguos o numéricos → auto por defecto
        return { mode: 'auto' };
    }

    private updateSecondaryMenu() {
        const menuContent = document.querySelector('.menu-content');
        if (!menuContent) return;

        if (!this.selectedEntity) {
            // Check if zone is selected instead
            if (this._zoneSelected && this.zoneConfig) {
                const z = this.zoneConfig.zone;
                let zoneHtml = `
                  <div class="menu-control-group">
                      <h3 style="margin:0 0 8px; font-size: 1rem; color: #fb923c;">
                          <i class="fa-solid fa-vector-square" style="margin-right:6px;"></i>Zona del ejercicio
                      </h3>
                      <p style="color:#888; font-size:0.8rem; margin:0 0 12px;">
                          Define el área de trabajo del ejercicio.
                      </p>
                  </div>
                  <div class="menu-control-group checkbox-wrapper">
                      <input type="checkbox" id="zone-edit-toggle" ${this._zoneEditEnabled ? 'checked' : ''}>
                      <label class="menu-label" for="zone-edit-toggle">Habilitar edición</label>
                  </div>`;

                if (this._zoneEditEnabled) {
                    // Convert world units to meters (10 units = 1 m)
                    const UNITS_PER_METER = 10;
                    const wMeters = (z.w / UNITS_PER_METER).toFixed(1);
                    const hMeters = (z.h / UNITS_PER_METER).toFixed(1);
                    zoneHtml += `
                    <div class="menu-control-group">
                        <label class="menu-label">Largo (m)</label>
                        <input type="number" id="zone-prop-w" class="menu-input" value="${wMeters}" step="0.5" min="2">
                    </div>
                    <div class="menu-control-group">
                        <label class="menu-label">Ancho (m)</label>
                        <input type="number" id="zone-prop-h" class="menu-input" value="${hMeters}" step="0.5" min="2">
                    </div>`;
                }

                menuContent.innerHTML = zoneHtml;

                // Wire up the toggle
                const toggleEl = document.getElementById('zone-edit-toggle') as HTMLInputElement;
                toggleEl?.addEventListener('change', () => {
                    this._zoneEditEnabled = toggleEl.checked;
                    this.updateSecondaryMenu(); // Re-render to show/hide fields
                });

                // Wire up dimension inputs (meters → world units)
                if (this._zoneEditEnabled) {
                    const UNITS_PER_METER = 10;
                    const bindDim = (id: string, prop: 'w' | 'h') => {
                        const el = document.getElementById(id) as HTMLInputElement;
                        el?.addEventListener('change', () => {
                            const meters = parseFloat(el.value);
                            if (!isNaN(meters) && meters >= 2) {
                                (this.zoneConfig!.zone as any)[prop] = meters * UNITS_PER_METER;
                            }
                        });
                    };
                    bindDim('zone-prop-w', 'w');
                    bindDim('zone-prop-h', 'h');
                }

                return;
            }

            menuContent.innerHTML = '<p class="placeholder-text">Seleccione un elemento para ver sus propiedades.</p>';
            return;
        }

        const p = this.selectedEntity;
        let html = '';

        // Pastel Palette Helper
        const pastelColors = [
            '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
            '#BAE1FF', '#E2C9FF', '#FFFFFF', '#000000',
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'
        ];

        let colorPaletteHtml = '<div class="color-palette">';
        pastelColors.forEach(c => {
            colorPaletteHtml += `<div class="color-swatch" style="background-color: ${c}" data-color="${c}"></div>`;
        });
        colorPaletteHtml += '</div>';

        if (p instanceof Cone) {
            html += `
              <div class="menu-control-group">
                  <label class="menu-label">Color</label>
                  ${colorPaletteHtml}
                  <input type="color" id="cone-prop-color" class="menu-input" value="${p.color}">
              </div>
              <div class="menu-control-group">
                  <label class="menu-label">Altura: <span id="height-val">${p.height}</span>px</label>
                  <input type="range" id="cone-prop-height" class="menu-input" min="10" max="60" value="${p.height}">
              </div>
           `;
        } else if (p instanceof Ball) {
            html += `
              <div class="menu-control-group checkbox-wrapper">
                  <input type="checkbox" id="ball-prop-group" ${p.isGroup ? 'checked' : ''}>
                  <label class="menu-label" for="ball-prop-group">Grupo de Bochas</label>
              </div>
              <div class="menu-control-group">
                  <label class="menu-label">Color</label>
                  ${colorPaletteHtml}
                  <input type="color" id="ball-prop-color" class="menu-input" value="${p.color}">
              </div>
           `;
        } else if (p instanceof Goal) {
            html += `
              <div class="menu-control-group">
                  <label class="menu-label">Color del Arco</label>
                  ${colorPaletteHtml}
                  <div style="display: flex; align-items: center; gap: 8px;">
                     <span style="font-size: 0.8rem; color: #888;">Personalizado:</span>
                     <input type="color" id="goal-prop-color" class="menu-input" value="${p.color}" style="flex: 1; height: 30px;">
                  </div>
              </div>
           `;
        } else if (p instanceof ConeGroup) {
            html += `
               <div class="menu-control-group checkbox-wrapper">
                  <input type="checkbox" id="group-prop-lines" ${p.showLines ? 'checked' : ''}>
                  <label class="menu-label" for="group-prop-lines">Mostrar Líneas</label>
               </div>
           `;

            if (p.shapeType === 'freehand') {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Suavizado: <span id="group-smooth-val">${p.smoothingFactor}</span></label>
                      <input type="range" id="group-prop-smooth" class="menu-input" min="1" max="20" step="1" value="${p.smoothingFactor}">
                  </div>
               `;
            }

            html += `
               <div class="menu-control-group">
                  <label class="menu-label">Distancia: <span id="dist-val">${p.coneDistance}</span>px</label>
                  <input type="range" id="group-prop-dist" class="menu-input" min="20" max="200" step="5" value="${p.coneDistance}">
               </div>
               <div class="menu-control-group">
                  <label class="menu-label">Color del Conjunto</label>
                  ${colorPaletteHtml}
                  <input type="color" id="group-prop-color" class="menu-input" value="${p.groupColor}">
              </div>
              <div class="menu-control-group">
                  <label class="menu-label">Altura Conos: <span id="height-val">${p.groupHeight}</span>px</label>
                  <input type="range" id="group-prop-height" class="menu-input" min="10" max="60" value="${p.groupHeight}">
              </div>
              <div class="menu-control-group">
                  <label class="menu-label">Color Cono Seleccionado (#${p.selectedConeIndex})</label>
                  <input type="color" id="group-prop-ind-color" class="menu-input" value="${p.coneColors.get(p.selectedConeIndex) || p.groupColor}">
              </div>
           `;
        } else if (p instanceof BaseShape) {
            const shape = p;
            const isLine = shape instanceof LineShape;
            const isFreehand = shape instanceof FreehandShape;
            const supportsFill = !isLine && !isFreehand;

            html += `
              <div class="menu-control-group">
                  <label class="menu-label">Color del Trazo</label>
                  ${colorPaletteHtml}
                  <div style="display: flex; align-items: center; gap: 8px;">
                     <span style="font-size: 0.8rem; color: #888;">Personalizado:</span>
                     <input type="color" id="shape-color" class="menu-input" value="${shape.color}" style="flex: 1; height: 30px;">
                  </div>
              </div>

              <div class="menu-control-group">
                  <label class="menu-label">Tipo de Línea</label>
                  <select id="shape-stroke-type" class="menu-select">
                      <option value="solid" ${shape.strokeType === 'solid' ? 'selected' : ''}>Sólida</option>
                      <option value="dashed" ${shape.strokeType === 'dashed' ? 'selected' : ''}>Discontinua (Guiones)</option>
                      <option value="dotted" ${shape.strokeType === 'dotted' ? 'selected' : ''}>Punteada</option>
                  </select>
              </div>
          `;

            if (isLine) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Marcador Inicial</label>
                      <select id="line-start-marker" class="menu-select">
                          <option value="none" ${(shape as LineShape).startMarker === 'none' ? 'selected' : ''}>Ninguno</option>
                          <option value="arrow" ${(shape as LineShape).startMarker === 'arrow' ? 'selected' : ''}>Flecha</option>
                      </select>
                  </div>
                  <div class="menu-control-group">
                      <label class="menu-label">Marcador Final</label>
                      <select id="line-end-marker" class="menu-select">
                          <option value="none" ${(shape as LineShape).endMarker === 'none' ? 'selected' : ''}>Ninguno</option>
                          <option value="arrow" ${(shape as LineShape).endMarker === 'arrow' ? 'selected' : ''}>Flecha</option>
                      </select>
                  </div>
              `;
            }

            if (isFreehand) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Suavizado: <span id="smooth-val">${(shape as FreehandShape).smoothingFactor}</span></label>
                      <input type="range" id="shape-smooth" class="menu-input" min="1" max="20" step="1" value="${(shape as FreehandShape).smoothingFactor}">
                  </div>
              `;
            }

            if (supportsFill) {
                html += `
                  <div class="menu-control-group checkbox-wrapper">
                      <input type="checkbox" id="shape-has-fill" ${shape.hasFill ? 'checked' : ''}>
                      <label class="menu-label" for="shape-has-fill">Relleno</label>
                  </div>

                  <div class="menu-control-group" id="container-opacity" style="${shape.hasFill ? '' : 'opacity: 0.5; pointer-events: none;'}">
                      <label class="menu-label">Opacidad de Relleno: <span id="opacity-val">${Math.round(shape.fillOpacity * 100)}%</span></label>
                      <input type="range" id="shape-opacity" class="menu-input" min="0" max="1" step="0.1" value="${shape.fillOpacity}">
                  </div>
              `;
            }
        } else if (p instanceof Player) {
            const player = p;

            html += `
              <div class="menu-control-group">
                  <label class="menu-label">Equipo</label>
                  <select id="player-team" class="menu-select">
                      <option value="A" ${player.team === 'A' ? 'selected' : ''}>Equipo A</option>
                      <option value="B" ${player.team === 'B' ? 'selected' : ''}>Equipo B</option>
                  </select>
              </div>

              <div class="menu-control-group">
                  <label class="menu-label">Color</label>
                  ${colorPaletteHtml}
                  <div style="display: flex; align-items: center; gap: 8px;">
                     <span style="font-size: 0.8rem; color: #888;">Personalizado:</span>
                     <input type="color" id="shape-color" class="menu-input" value="${player.color}" style="flex: 1; height: 30px;">
                  </div>
              </div>

              <div class="menu-control-group">
                  <label class="menu-label">Etiqueta (Max 3)</label>
                  <input type="text" id="player-label" class="menu-input" maxlength="3" value="${player.number}">
              </div>

              <div class="menu-control-group checkbox-wrapper">
                  <input type="checkbox" id="player-ball" ${player.hasBall ? 'checked' : ''}>
                  <label class="menu-label" for="player-ball">Posee Bocha</label>
              </div>

              <div class="menu-control-group">
                  <label class="menu-label">Descripción</label>
                  <textarea id="player-desc" class="menu-input" rows="3">${player.description}</textarea>
              </div>
          `;
        } else if (p instanceof BaseAction) {
            const action = p;
            const preParsed = this.parseEventConfig(action.config.preEvent);
            const postParsed = this.parseEventConfig(action.config.postEvent);
            html += `
              <div class="menu-control-group">
                  <label class="menu-label">Tipo</label>
                  <input type="text" class="menu-input" value="${action.type.toUpperCase()}" disabled>
              </div>
              <div class="menu-control-group">
                  <label class="menu-label">Pre-Evento</label>
                  <select id="action-preevent" class="menu-select">
                      <option value="auto" ${preParsed.mode === 'auto' ? 'selected' : ''}>Auto</option>
                      <option value="inmediato" ${preParsed.mode === 'inmediato' ? 'selected' : ''}>Inmediato</option>
                      <option value="esperar" ${preParsed.mode === 'esperar' ? 'selected' : ''}>Esperar</option>
                  </select>
                  <div id="container-preevent-seconds" class="menu-control-group" style="${preParsed.mode === 'esperar' ? '' : 'display: none;'}">
                      <label class="menu-label">Segundos</label>
                      <input type="number" id="action-preevent-seconds" class="menu-input" min="0" max="60" step="0.5" value="${preParsed.seconds ?? 1}">
                  </div>
              </div>
              <div class="menu-control-group">
                  <label class="menu-label">Post-Evento</label>
                  <select id="action-postevent" class="menu-select">
                      <option value="auto" ${postParsed.mode === 'auto' ? 'selected' : ''}>Auto</option>
                      <option value="inmediato" ${postParsed.mode === 'inmediato' ? 'selected' : ''}>Inmediato</option>
                      <option value="esperar" ${postParsed.mode === 'esperar' ? 'selected' : ''}>Esperar</option>
                  </select>
                  <div id="container-postevent-seconds" class="menu-control-group" style="${postParsed.mode === 'esperar' ? '' : 'display: none;'}">
                      <label class="menu-label">Segundos</label>
                      <input type="number" id="action-postevent-seconds" class="menu-input" min="0" max="60" step="0.5" value="${postParsed.seconds ?? 1}">
                  </div>
              </div>
          `;

            if (p.pathType === 'freehand') {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Suavizado: <span id="action-smooth-val">${action.smoothingFactor}</span></label>
                      <input type="range" id="action-smooth" class="menu-input" min="1" max="20" step="1" value="${action.smoothingFactor}">
                  </div>
              `;
            }

            // Specific Action Configs
            const hasSpeed = (p instanceof RunAction || p instanceof PassAction || p instanceof ShootAction || p instanceof DribbleAction);

            if (hasSpeed) {
                const speedVal = (p as any).speed;
                html += `
                  <div class="menu-control-group checkbox-wrapper">
                      <input type="checkbox" id="action-speed-check" ${speedVal !== null ? 'checked' : ''}>
                      <label class="menu-label" for="action-speed-check">Velocidad</label>
                  </div>
                  <div class="menu-control-group" id="container-speed" style="${speedVal !== null ? '' : 'opacity: 0.5; pointer-events: none;'}">
                      <label class="menu-label">Valor: <span id="speed-val">${speedVal || 50}</span>%</label>
                      <input type="range" id="action-speed-val" class="menu-input" min="0" max="100" value="${speedVal || 50}">
                  </div>
              `;
            }

            if (p instanceof PassAction) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Gesto Técnico</label>
                      <select id="action-gesture" class="menu-select">
                          <option value="push" ${p.gesture === 'push' ? 'selected' : ''}>Push</option>
                          <option value="pegada" ${p.gesture === 'pegada' ? 'selected' : ''}>Pegada</option>
                          <option value="barrida" ${p.gesture === 'barrida' ? 'selected' : ''}>Barrida</option>
                          <option value="flick" ${p.gesture === 'flick' ? 'selected' : ''}>Flick</option>
                      </select>
                  </div>
              `;
            }

            if (p instanceof ShootAction) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Gesto Técnico</label>
                      <select id="action-gesture" class="menu-select">
                          <option value="push" ${p.gesture === 'push' ? 'selected' : ''}>Push</option>
                          <option value="pegada" ${p.gesture === 'pegada' ? 'selected' : ''}>Pegada</option>
                          <option value="barrida" ${p.gesture === 'barrida' ? 'selected' : ''}>Barrida</option>
                          <option value="flick" ${p.gesture === 'flick' ? 'selected' : ''}>Flick</option>
                      </select>
                  </div>
              `;
            }

            if (p instanceof DribbleAction) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Tipo Conducción</label>
                      <select id="action-dribble-type" class="menu-select">
                          <option value="derecho" ${p.dribbleType === 'derecho' ? 'selected' : ''}>Derecho</option>
                          <option value="reves" ${p.dribbleType === 'reves' ? 'selected' : ''}>Revés</option>
                          <option value="aerea" ${p.dribbleType === 'aerea' ? 'selected' : ''}>Aérea</option>
                      </select>
                  </div>
                  <div class="menu-control-group">
                      <label class="menu-label">Visualización</label>
                      <select id="action-dribble-style" class="menu-select">
                          <option value="straight" ${p.style === 'straight' ? 'selected' : ''}>Flecha Recta</option>
                          <option value="zigzag" ${p.style === 'zigzag' ? 'selected' : ''}>ZigZag (Onda)</option>
                      </select>
                  </div>
              `;
            }

            if (p instanceof TackleAction) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Radio: <span id="radius-val">${p.radius}</span>px</label>
                      <input type="range" id="action-radius" class="menu-input" min="10" max="100" step="1" value="${p.radius}">
                  </div>
              `;
            }

            if (p instanceof TurnAction) {
                html += `
                  <div class="menu-control-group">
                      <label class="menu-label">Ángulo: <span id="angle-val">${p.angle}</span>°</label>
                      <input type="range" id="action-angle" class="menu-input" min="-360" max="360" step="5" value="${p.angle}">
                  </div>
              `;
            }
        }

        menuContent.innerHTML = html;

        // --- LISTENERS ---

        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = (e.target as HTMLElement).dataset.color;
                if (color) {
                    if (this.selectedEntity instanceof BaseShape) this.selectedEntity.color = color;
                    if (this.selectedEntity instanceof Player) this.selectedEntity.color = color;
                    if (this.selectedEntity instanceof Cone) this.selectedEntity.color = color;
                    if (this.selectedEntity instanceof Ball) this.selectedEntity.color = color;
                    if (this.selectedEntity instanceof ConeGroup) this.selectedEntity.groupColor = color;
                    if (this.selectedEntity instanceof Goal) this.selectedEntity.color = color;

                    const input = document.getElementById('shape-color') as HTMLInputElement ||
                        document.getElementById('cone-prop-color') ||
                        document.getElementById('ball-prop-color') ||
                        document.getElementById('group-prop-color') ||
                        document.getElementById('goal-prop-color');
                    if (input) input.value = color;
                }
            });
        });

        document.getElementById('shape-color')?.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            if (this.selectedEntity instanceof BaseShape) this.selectedEntity.color = val;
            if (this.selectedEntity instanceof Player) this.selectedEntity.color = val;
        });

        if (p instanceof Cone) {
            document.getElementById('cone-prop-color')?.addEventListener('input', (e) => {
                p.color = (e.target as HTMLInputElement).value;
            });
            document.getElementById('cone-prop-height')?.addEventListener('input', (e) => {
                p.height = parseInt((e.target as HTMLInputElement).value, 10);
                const valSpan = document.getElementById('height-val');
                if (valSpan) valSpan.textContent = p.height.toString();
            });
        } else if (p instanceof Ball) {
            document.getElementById('ball-prop-group')?.addEventListener('change', (e) => {
                p.isGroup = (e.target as HTMLInputElement).checked;
            });
            document.getElementById('ball-prop-color')?.addEventListener('input', (e) => {
                p.color = (e.target as HTMLInputElement).value;
            });
        } else if (p instanceof Goal) {
            document.getElementById('goal-prop-color')?.addEventListener('input', (e) => {
                p.color = (e.target as HTMLInputElement).value;
            });
        } else if (p instanceof ConeGroup) {
            document.getElementById('group-prop-lines')?.addEventListener('change', (e) => {
                p.showLines = (e.target as HTMLInputElement).checked;
            });

            if (p.shapeType === 'freehand') {
                document.getElementById('group-prop-smooth')?.addEventListener('input', (e) => {
                    p.smoothingFactor = parseInt((e.target as HTMLInputElement).value, 10);
                    const valSpan = document.getElementById('group-smooth-val');
                    if (valSpan) valSpan.textContent = p.smoothingFactor.toString();
                });
            }

            document.getElementById('group-prop-dist')?.addEventListener('input', (e) => {
                p.coneDistance = parseInt((e.target as HTMLInputElement).value, 10);
                const valSpan = document.getElementById('dist-val');
                if (valSpan) valSpan.textContent = p.coneDistance.toString();
            });
            document.getElementById('group-prop-color')?.addEventListener('input', (e) => {
                p.groupColor = (e.target as HTMLInputElement).value;
            });
            document.getElementById('group-prop-height')?.addEventListener('input', (e) => {
                p.groupHeight = parseInt((e.target as HTMLInputElement).value, 10);
                const valSpan = document.getElementById('height-val');
                if (valSpan) valSpan.textContent = p.groupHeight.toString();
            });
            document.getElementById('group-prop-ind-color')?.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                p.coneColors.set(p.selectedConeIndex, val);
            });
        } else if (p instanceof BaseShape) {
            const shape = p;
            const isLine = shape instanceof LineShape;
            const isFreehand = shape instanceof FreehandShape;
            const supportsFill = !isLine && !isFreehand;

            document.getElementById('shape-stroke-type')?.addEventListener('change', (e) => {
                shape.strokeType = (e.target as HTMLSelectElement).value as any;
            });

            if (isLine) {
                document.getElementById('line-start-marker')?.addEventListener('change', (e) => {
                    (shape as LineShape).startMarker = (e.target as HTMLSelectElement).value as any;
                });
                document.getElementById('line-end-marker')?.addEventListener('change', (e) => {
                    (shape as LineShape).endMarker = (e.target as HTMLSelectElement).value as any;
                });
            }

            if (isFreehand) {
                const smoothRange = document.getElementById('shape-smooth');
                const smoothVal = document.getElementById('smooth-val');
                smoothRange?.addEventListener('input', (e) => {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    (shape as FreehandShape).smoothingFactor = val;
                    if (smoothVal) smoothVal.textContent = val.toString();
                });
            }

            if (supportsFill) {
                const checkFill = document.getElementById('shape-has-fill') as HTMLInputElement;
                const containerOpacity = document.getElementById('container-opacity');

                checkFill?.addEventListener('change', (e) => {
                    shape.hasFill = (e.target as HTMLInputElement).checked;
                    if (containerOpacity) {
                        containerOpacity.style.opacity = shape.hasFill ? '1' : '0.5';
                        containerOpacity.style.pointerEvents = shape.hasFill ? 'auto' : 'none';
                    }
                });

                const opacityRange = document.getElementById('shape-opacity') as HTMLInputElement;
                const opacityVal = document.getElementById('opacity-val');

                opacityRange?.addEventListener('input', (e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    shape.fillOpacity = val;
                    if (opacityVal) opacityVal.textContent = Math.round(val * 100) + '%';
                });
            }
        } else if (p instanceof Player) {
            const player = p;

            document.getElementById('player-team')?.addEventListener('change', (e) => {
                player.team = (e.target as HTMLSelectElement).value;
            });

            document.getElementById('player-label')?.addEventListener('input', (e) => {
                player.number = (e.target as HTMLInputElement).value;
            });

            document.getElementById('player-ball')?.addEventListener('change', (e) => {
                player.hasBall = (e.target as HTMLInputElement).checked;
            });

            document.getElementById('player-desc')?.addEventListener('input', (e) => {
                player.description = (e.target as HTMLTextAreaElement).value;
            });
        } else if (p instanceof BaseAction) {
            // Sincronizar waitBefore con preEvent "esperar:N" por si se cargó desde JSON
            const preParsed = this.parseEventConfig(p.config.preEvent);
            if (preParsed.mode === 'esperar' && preParsed.seconds != null) (p as any).waitBefore = preParsed.seconds;

            const preSelect = document.getElementById('action-preevent') as HTMLSelectElement;
            const preSecondsContainer = document.getElementById('container-preevent-seconds');
            const preSecondsInput = document.getElementById('action-preevent-seconds') as HTMLInputElement;
            preSelect?.addEventListener('change', () => {
                const mode = preSelect.value as 'auto' | 'inmediato' | 'esperar';
                if (mode === 'esperar') {
                    const sec = preSecondsInput ? parseFloat(preSecondsInput.value) || 1 : 1;
                    p.config.preEvent = `esperar:${sec}`;
                    (p as any).waitBefore = sec;
                    if (preSecondsContainer) preSecondsContainer.style.display = '';
                } else {
                    p.config.preEvent = mode;
                    (p as any).waitBefore = 0;
                    if (preSecondsContainer) preSecondsContainer.style.display = 'none';
                }
            });
            preSecondsInput?.addEventListener('input', () => {
                const sec = parseFloat(preSecondsInput.value);
                if (!isNaN(sec) && sec >= 0) {
                    p.config.preEvent = `esperar:${sec}`;
                    (p as any).waitBefore = sec;
                }
            });

            const postSelect = document.getElementById('action-postevent') as HTMLSelectElement;
            const postSecondsContainer = document.getElementById('container-postevent-seconds');
            const postSecondsInput = document.getElementById('action-postevent-seconds') as HTMLInputElement;
            postSelect?.addEventListener('change', () => {
                const mode = postSelect.value as 'auto' | 'inmediato' | 'esperar';
                if (mode === 'esperar') {
                    const sec = postSecondsInput ? parseFloat(postSecondsInput.value) || 1 : 1;
                    p.config.postEvent = `esperar:${sec}`;
                    if (postSecondsContainer) postSecondsContainer.style.display = '';
                } else {
                    p.config.postEvent = mode;
                    if (postSecondsContainer) postSecondsContainer.style.display = 'none';
                }
            });
            postSecondsInput?.addEventListener('input', () => {
                const sec = parseFloat(postSecondsInput.value);
                if (!isNaN(sec) && sec >= 0) p.config.postEvent = `esperar:${sec}`;
            });

            if (p.pathType === 'freehand') {
                const smoothRange = document.getElementById('action-smooth');
                const smoothVal = document.getElementById('action-smooth-val');
                smoothRange?.addEventListener('input', (e) => {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    p.smoothingFactor = val;
                    if (smoothVal) smoothVal.textContent = val.toString();
                });
            }

            // New Listeners
            const action = p as any; // Cast for dynamic access

            const speedCheck = document.getElementById('action-speed-check') as HTMLInputElement;
            const speedContainer = document.getElementById('container-speed');
            const speedVal = document.getElementById('action-speed-val') as HTMLInputElement;
            const speedDisplay = document.getElementById('speed-val');

            if (speedCheck) {
                speedCheck.addEventListener('change', (e) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    if (checked) {
                        action.speed = parseInt(speedVal.value);
                        if (speedContainer) {
                            speedContainer.style.opacity = '1';
                            speedContainer.style.pointerEvents = 'auto';
                        }
                    } else {
                        action.speed = null;
                        if (speedContainer) {
                            speedContainer.style.opacity = '0.5';
                            speedContainer.style.pointerEvents = 'none';
                        }
                    }
                });
            }

            if (speedVal) {
                speedVal.addEventListener('input', (e) => {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    action.speed = val;
                    if (speedDisplay) speedDisplay.textContent = val.toString();
                });
            }

            document.getElementById('action-gesture')?.addEventListener('change', (e) => {
                if (p instanceof PassAction || p instanceof ShootAction) {
                    p.gesture = (e.target as HTMLSelectElement).value;
                }
            });

            document.getElementById('action-dribble-type')?.addEventListener('change', (e) => {
                if (p instanceof DribbleAction) {
                    p.dribbleType = (e.target as HTMLSelectElement).value;
                }
            });

            document.getElementById('action-dribble-style')?.addEventListener('change', (e) => {
                if (p instanceof DribbleAction) {
                    p.style = (e.target as HTMLSelectElement).value as any;
                }
            });

            const radiusRange = document.getElementById('action-radius');
            if (radiusRange) {
                radiusRange.addEventListener('input', (e) => {
                    if (p instanceof TackleAction) {
                        p.radius = parseInt((e.target as HTMLInputElement).value);
                        document.getElementById('radius-val')!.textContent = p.radius.toString();
                    }
                });
            }

            const angleRange = document.getElementById('action-angle');
            if (angleRange) {
                angleRange.addEventListener('input', (e) => {
                    if (p instanceof TurnAction) {
                        p.angle = parseInt((e.target as HTMLInputElement).value);
                        document.getElementById('angle-val')!.textContent = p.angle.toString();
                    }
                });
            }
        }
    }

    // --- Logic Helpers ---

    private deleteSelected() {
        if (this.selectedEntity) {
            if (this.selectedEntity instanceof BaseAction) {
                // Action Deletion Logic
                const action = this.selectedEntity;
                const owner = action.owner; // owner is IActionOwner

                if (owner instanceof Player) {
                    this.commandManager.execute(new RemoveActionChainCommand(owner, action));
                    this.selectedEntity = null;
                    this.updateSelectionUI();
                }
            } else {
                // Normal Entity Deletion
                this.commandManager.execute(new RemoveEntityCommand(this, this.selectedEntity));
                this.selectedEntity = null;
                this.updateSelectionUI();
            }
        }
    }

    private resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
        } else {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    public start() {
        // Apply zone view if configured from setup screen
        if (this.zoneConfig) {
            this.applyZoneView(this.zoneConfig);
        }
        requestAnimationFrame((t) => {
            this.lastTime = t;
            this.loop(t);
        });
    }

    /**
     * Adjusts camera position and zoom to center and frame the given zone
     * so it occupies ~85% of the viewport.
     */
    private applyZoneView(config: ExerciseZoneConfig): void {
        const z = config.zone;

        // Rotate camera first if the zone is taller than wide (better screen usage)
        if (config.rotate) {
            this.camera.rotation = -Math.PI / 2;
        }

        // Center camera on zone center
        this.camera.x = z.x + z.w / 2;
        this.camera.y = z.y + z.h / 2;

        // When rotated, the canvas width maps to zone height and vice versa
        const viewW = config.rotate ? this.canvas.height : this.canvas.width;
        const viewH = config.rotate ? this.canvas.width : this.canvas.height;
        const zoomX = viewW / z.w;
        const zoomY = viewH / z.h;
        this.camera.zoom = Math.min(zoomX, zoomY) * 0.85;
    }

    private lastTime: number = 0;

    private loop(timestamp: number) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    private update(dt: number) {
        if (this.currentMode === 'play') {
            this.animationManager.update(dt);

            // Auto-update play button icon if paused automatically
            if (this.animationManager.isPaused) {
                const btnAnimPlay = document.getElementById('anim-play');
                const icon = btnAnimPlay?.querySelector('i');
                icon?.classList.replace('fa-pause', 'fa-play');
            }
        }
    }

    private render() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.camera.applyTransform(this.ctx, this.canvas);

        this.field.draw(this.ctx);

        // Draw exercise zone indicator rectangle (if zone selected and not full)
        if (this.zoneConfig && this.zoneConfig.preset !== 'full') {
            const z = this.zoneConfig.zone;
            const invZoom = 1 / this.camera.zoom;
            this.ctx.save();

            if (this._zoneSelected) {
                // Selected state: solid, thicker border
                this.ctx.strokeStyle = 'rgba(251, 146, 60, 1)';
                this.ctx.lineWidth = (this._zoneEditEnabled ? 3 : 2.5) * invZoom;
                this.ctx.setLineDash([]);
                this.ctx.strokeRect(z.x, z.y, z.w, z.h);
                // Brighter fill when selected
                this.ctx.fillStyle = 'rgba(251, 146, 60, 0.12)';
                this.ctx.fillRect(z.x, z.y, z.w, z.h);

                // Draw corner handles when editing is enabled
                if (this._zoneEditEnabled) {
                    const handleSize = 8 * invZoom;
                    const corners = [
                        { x: z.x, y: z.y },
                        { x: z.x + z.w, y: z.y },
                        { x: z.x, y: z.y + z.h },
                        { x: z.x + z.w, y: z.y + z.h },
                    ];
                    for (const c of corners) {
                        this.ctx.fillStyle = '#fb923c';
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 1.5 * invZoom;
                        this.ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
                        this.ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
                    }
                }
            } else {
                // Default (not selected): dashed, subtle
                this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.8)';
                this.ctx.lineWidth = 2 * invZoom;
                this.ctx.setLineDash([8 * invZoom, 5 * invZoom]);
                this.ctx.strokeRect(z.x, z.y, z.w, z.h);
                this.ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
                this.ctx.fillRect(z.x, z.y, z.w, z.h);
                this.ctx.setLineDash([]);
            }

            this.ctx.restore();
        }

        this.entities.forEach(entity => entity.draw(this.ctx, this.currentScene));

        if (this.currentMode === 'play') {
            this.animationManager.render(this.ctx);
        }

        // Delegate Tool Rendering (Temp shapes, handles, guides)
        this.tools.get(this.currentToolId)?.render(this.ctx);

        this.ctx.restore();
    }

    // --- Optimization Logic ---

    private async optimizeDrill() {
        const btnAnimPlay = document.getElementById('anim-play');
        const originalIcon = btnAnimPlay?.innerHTML;

        // Loading State
        if (btnAnimPlay) {
            btnAnimPlay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btnAnimPlay.style.pointerEvents = 'none';
        }

        try {
            const state = this.serializeDrillState();

            const response = await fetch('/api/optimize-drill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });

            if (response.ok) {
                const optimizedState = await response.json();
                this.applyOptimizedState(optimizedState);
                this.showOptimizationFeedback(true);
            } else {
                this.showOptimizationFeedback(false);
                console.error('Optimization failed:', response.statusText);
            }
        } catch (error) {
            this.showOptimizationFeedback(false);
            console.error('Error optimizing drill:', error);
        } finally {
            if (btnAnimPlay && originalIcon) {
                btnAnimPlay.innerHTML = originalIcon;
                btnAnimPlay.style.pointerEvents = 'auto';
            }
        }
    }

    private serializeDrillState(): any {
        const players = this.entities
            .filter(e => e instanceof Player)
            .map(p => {
                const player = p as Player;
                return {
                    id: player.id,
                    x: player.x,
                    y: player.y,
                    initialX: player.initialX,
                    initialY: player.initialY,
                    number: player.number,
                    hasBall: player.hasBall,
                    team: player.team,
                    actions: player.actions.map(a => ({
                        id: a.id,
                        type: a.type,
                        startX: a.startX,
                        startY: a.startY,
                        endX: a.endX,
                        endY: a.endY,
                        config: a.config,
                        pathType: a.pathType,
                        points: a.points,
                        sceneIndex: a.sceneIndex,
                        speed: (a as any).speed || null,
                        waitBefore: (a as any).waitBefore || 0,
                        // Specific props
                        gesture: (a as any).gesture,
                        dribbleType: (a as any).dribbleType,
                        style: (a as any).style,
                        radius: (a as any).radius,
                        angle: (a as any).angle
                    }))
                };
            });

        return { players };
    }

    private showOptimizationFeedback(success: boolean) {
        const label = document.querySelector('label[for="ai-opt-toggle"]');
        if (!label) return;
        const originalText = label.innerHTML;
        label.innerHTML = success
            ? '<i class="fa-solid fa-check" style="color: #22c55e;"></i> Optimizado'
            : '<i class="fa-solid fa-exclamation-triangle" style="color: #eab308;"></i> Error';
        label.classList.toggle('optimization-feedback', true);
        setTimeout(() => {
            label.innerHTML = originalText;
            label.classList.remove('optimization-feedback');
        }, 2500);
    }

    private applyOptimizedState(optimizedState: any) {
        if (!optimizedState.players) return;

        optimizedState.players.forEach((optPlayer: any) => {
            const localPlayer = this.entities.find(e => String(e.id) === String(optPlayer.id)) as Player;
            if (localPlayer) {
                localPlayer.actions.forEach(localAction => {
                    const optAction = optPlayer.actions?.find((a: any) => String(a.id) === String(localAction.id));
                    if (optAction) {
                        if (optAction.speed !== undefined) (localAction as any).speed = optAction.speed;
                        if (optAction.waitBefore !== undefined) (localAction as any).waitBefore = optAction.waitBefore;
                        if (optAction.config?.preEvent !== undefined) localAction.config.preEvent = optAction.config.preEvent;
                        if (optAction.config?.postEvent !== undefined) localAction.config.postEvent = optAction.config.postEvent;
                    }
                });
            }
        });
    }
}
