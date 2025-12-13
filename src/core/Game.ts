import { Camera } from './Camera';
import { Field } from '../entities/Field';
import { Entity, Player } from '../entities/Player';
import { BaseShape, RectangleShape, EllipseShape, TriangleShape, LineShape, FreehandShape } from '../entities/Shape';
import { CommandManager, Command } from './CommandManager';

// Commands Implementation
class AddEntityCommand implements Command {
  constructor(private game: Game, private entity: Entity) {}
  execute() { this.game.addEntity(this.entity); }
  undo() { this.game.removeEntity(this.entity); }
}

class RemoveEntityCommand implements Command {
  constructor(private game: Game, private entity: Entity) {}
  execute() { this.game.removeEntity(this.entity); }
  undo() { this.game.addEntity(this.entity); }
}

class MoveEntityCommand implements Command {
  constructor(
    private entity: Entity, 
    private oldX: number, 
    private oldY: number, 
    private newX: number, 
    private newY: number
  ) {}
  execute() { this.entity.setPosition(this.newX, this.newY); }
  undo() { this.entity.setPosition(this.oldX, this.oldY); }
}

type ToolType = 'select' | 'player' | 'camera' | 'shape';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'freehand';
type AppMode = 'edit' | 'play';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private field: Field;
  private commandManager: CommandManager;
  
  private entities: Entity[] = [];
  private selectedEntity: Entity | null = null;
  
  private currentMode: AppMode = 'edit';
  private currentTool: ToolType = 'select';
  private currentShapeType: ShapeType = 'line'; 
  
  private isPanToolActive: boolean = false;
  
  // Drawing States
  private isDrawing: boolean = false;
  private drawStartPos: { x: number, y: number } | null = null;
  private tempShape: BaseShape | null = null;

  // Dragging States
  private isDraggingEntity: boolean = false;
  private dragStartPos: { x: number, y: number } | null = null;
  private initialEntityPos: { x: number, y: number } | null = null;
  private dragOffset: { x: number, y: number } | null = null; 

  // Resizing States
  private isResizing: boolean = false;
  private activeHandleId: string | null = null;

  // Camera Pan State
  private isPanningCamera: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.camera = new Camera(0, 0);
    this.field = new Field();
    this.commandManager = new CommandManager();

    this.setupUI();
    this.setupEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private setupUI() {
    // --- Mode Buttons ---
    const btnModeEdit = document.getElementById('btn-mode-edit');
    const btnModePlay = document.getElementById('btn-mode-play');
    
    const editToolsPanel = document.getElementById('edit-tools-panel');
    const playToolsPanel = document.getElementById('play-tools-panel');

    const switchMode = (mode: AppMode) => {
      this.currentMode = mode;
      
      if (mode === 'edit') {
        btnModeEdit?.classList.add('active');
        btnModePlay?.classList.remove('active');
        editToolsPanel?.classList.remove('hidden');
        playToolsPanel?.classList.add('hidden');
        this.updateSelectionUI(); 
      } else {
        btnModeEdit?.classList.remove('active');
        btnModePlay?.classList.add('active');
        editToolsPanel?.classList.add('hidden');
        playToolsPanel?.classList.remove('hidden');
        this.selectEntity(null); 
        this.updatePropertiesPanel(null);
      }
    };

    btnModeEdit?.addEventListener('click', () => switchMode('edit'));
    btnModePlay?.addEventListener('click', () => switchMode('play'));

    // --- Tools ---
    const btnSelect = document.getElementById('tool-select');
    const btnPlayer = document.getElementById('tool-player');
    const btnCamera = document.getElementById('tool-camera');
    const btnShape = document.getElementById('tool-shape');
    const btnUndo = document.getElementById('action-undo');
    const btnRedo = document.getElementById('action-redo');

    btnSelect?.addEventListener('click', () => this.setTool('select'));
    btnPlayer?.addEventListener('click', () => this.setTool('player'));
    btnCamera?.addEventListener('click', () => this.setTool('camera'));
    btnShape?.addEventListener('click', () => this.setTool('shape'));
    
    btnUndo?.addEventListener('click', () => this.commandManager.undo());
    btnRedo?.addEventListener('click', () => this.commandManager.redo());

    // --- Secondary Menu ---
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
  }

  private setTool(tool: ToolType) {
    this.currentTool = tool;
    this.isPanToolActive = false;

    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    
    let activeBtnId = '';
    if (tool === 'select') activeBtnId = 'tool-select';
    if (tool === 'player') activeBtnId = 'tool-player';
    if (tool === 'camera') activeBtnId = 'tool-camera';
    if (tool === 'shape') activeBtnId = 'tool-shape';
    
    document.getElementById(activeBtnId)?.classList.add('active');

    if (tool === 'camera' || tool === 'shape') {
        this.selectEntity(null);
    }

    this.updatePropertiesPanel(tool);
  }

  private updatePropertiesPanel(tool: ToolType | null) {
      const propertiesPanel = document.getElementById('properties-panel');
      if (!propertiesPanel) return;

      propertiesPanel.innerHTML = ''; 

      if (!tool) {
         propertiesPanel.innerHTML = '<span class="placeholder-text-small">Reproduciendo...</span>';
         return;
      }

      if (tool === 'shape') {
          propertiesPanel.innerHTML = `
             <div class="prop-info">
                <span class="prop-label">Dibujar</span>
                <span class="prop-value">Forma</span>
             </div>
             <button class="prop-btn ${this.currentShapeType === 'line' ? 'active' : ''}" id="shape-line" title="Línea"><i class="fa-solid fa-slash"></i></button>
             <button class="prop-btn ${this.currentShapeType === 'freehand' ? 'active' : ''}" id="shape-free" title="Libre"><i class="fa-solid fa-pencil"></i></button>
             <button class="prop-btn ${this.currentShapeType === 'rectangle' ? 'active' : ''}" id="shape-rect" title="Rectángulo"><i class="fa-regular fa-square"></i></button>
             <button class="prop-btn ${this.currentShapeType === 'circle' ? 'active' : ''}" id="shape-circle" title="Círculo/Óvalo"><i class="fa-regular fa-circle"></i></button>
             <button class="prop-btn ${this.currentShapeType === 'triangle' ? 'active' : ''}" id="shape-tri" title="Triángulo"><i class="fa-solid fa-play fa-rotate-270"></i></button>
          `;

          const setShape = (type: ShapeType) => {
              this.currentShapeType = type;
              this.updatePropertiesPanel('shape');
          };

          document.getElementById('shape-line')?.addEventListener('click', () => setShape('line'));
          document.getElementById('shape-free')?.addEventListener('click', () => setShape('freehand'));
          document.getElementById('shape-rect')?.addEventListener('click', () => setShape('rectangle'));
          document.getElementById('shape-circle')?.addEventListener('click', () => setShape('circle'));
          document.getElementById('shape-tri')?.addEventListener('click', () => setShape('triangle'));
      
      } else if (tool === 'camera') {
          propertiesPanel.innerHTML = `
            <div class="prop-info">
                <span class="prop-label">Controles de Cámara</span>
                <span class="prop-value">Ajustes</span>
            </div>
            <button class="prop-btn ${this.isPanToolActive ? 'active-prop' : ''}" id="cam-pan-toggle" title="Activar Paneo"><i class="fa-solid fa-hand"></i> Paneo</button>
            <button class="prop-btn" id="cam-zoom-out" title="Alejar"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
            <button class="prop-btn" id="cam-zoom-in" title="Acercar"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button class="prop-btn" id="cam-rotate" title="Rotar Vista"><i class="fa-solid fa-rotate"></i> Rotar</button>
            <button class="prop-btn" id="cam-reset" title="Centrar"><i class="fa-solid fa-compress"></i></button>
          `;
          
          const panBtn = document.getElementById('cam-pan-toggle');
          if (panBtn && this.isPanToolActive) {
              panBtn.style.backgroundColor = '#3b82f6';
              panBtn.style.borderColor = '#60a5fa';
          }

          document.getElementById('cam-pan-toggle')?.addEventListener('click', () => {
              this.isPanToolActive = !this.isPanToolActive;
              this.updatePropertiesPanel('camera');
          });

          document.getElementById('cam-zoom-in')?.addEventListener('click', () => 
            this.camera.zoomAt(1.2, this.canvas.width/2, this.canvas.height/2, this.canvas)
          );
          document.getElementById('cam-zoom-out')?.addEventListener('click', () => 
            this.camera.zoomAt(0.8, this.canvas.width/2, this.canvas.height/2, this.canvas)
          );
          document.getElementById('cam-rotate')?.addEventListener('click', () => 
            this.camera.toggleRotation()
          );
          document.getElementById('cam-reset')?.addEventListener('click', () => {
             this.camera.x = 0;
             this.camera.y = 0;
          });

      } else if (tool === 'player') {
          propertiesPanel.innerHTML = '<span class="placeholder-text-small">Haga clic en el campo para crear un Jugador</span>';
      
      } else if (tool === 'select') {
          if (this.selectedEntity) {
              const p = this.selectedEntity;
              let label = "Elemento";
              let actionsHtml = '';

              if (p instanceof Player) {
                  label = `Jugador #${p.number}`;
                  actionsHtml = `
                     <div class="separator-vertical" style="height: 20px; margin: 0 10px;"></div>
                     <button class="prop-btn" title="Correr"><i class="fa-solid fa-person-running"></i></button>
                     <button class="prop-btn" title="Conducir"><i class="fa-solid fa-hockey-puck"></i></button>
                     <button class="prop-btn" title="Pase"><i class="fa-solid fa-share"></i></button>
                     <button class="prop-btn" title="Tiro"><i class="fa-solid fa-bullseye"></i></button>
                     <button class="prop-btn" title="Quitar"><i class="fa-solid fa-shield-halved"></i></button>
                     <button class="prop-btn" title="Girar"><i class="fa-solid fa-rotate"></i></button>
                  `;
              } else if (p instanceof BaseShape) {
                  label = "Forma";
              }

              propertiesPanel.innerHTML = `
                 <div class="prop-info">
                    <span class="prop-label">Selección</span>
                    <span class="prop-value">${label}</span>
                 </div>
                 ${actionsHtml}
                 <div class="separator-vertical" style="height: 20px; margin: 0 10px;"></div>
                 <button class="prop-btn danger" id="prop-delete" title="Eliminar"><i class="fa-solid fa-trash"></i> Eliminar</button>
              `;

              document.getElementById('prop-delete')?.addEventListener('click', () => this.deleteSelected());

          } else {
              propertiesPanel.innerHTML = '<span class="placeholder-text-small">Seleccione un elemento para ver sus propiedades</span>';
          }
      }
  }
  
  private updateSelectionUI() {
      this.updatePropertiesPanel(this.currentTool);
      this.updateSecondaryMenu();

      const secondaryMenu = document.getElementById('secondary-menu');
      const btnOpenMenu = document.getElementById('btn-open-menu');
      
      if (this.selectedEntity) {
          secondaryMenu?.classList.remove('collapsed');
          btnOpenMenu?.classList.add('hidden');
      } 
  }

  private updateSecondaryMenu() {
      const menuContent = document.querySelector('.menu-content');
      if (!menuContent) return;

      if (!this.selectedEntity) {
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

      if (p instanceof BaseShape) {
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
      }

      menuContent.innerHTML = html;

      // --- LISTENERS ---

      // Shared Color Listeners
      document.querySelectorAll('.color-swatch').forEach(swatch => {
          swatch.addEventListener('click', (e) => {
              const color = (e.target as HTMLElement).dataset.color;
              if (color) {
                  if (this.selectedEntity instanceof BaseShape) this.selectedEntity.color = color;
                  if (this.selectedEntity instanceof Player) this.selectedEntity.color = color;
                  
                  const input = document.getElementById('shape-color') as HTMLInputElement;
                  if (input) input.value = color;
              }
          });
      });

      document.getElementById('shape-color')?.addEventListener('input', (e) => {
          const val = (e.target as HTMLInputElement).value;
          if (this.selectedEntity instanceof BaseShape) this.selectedEntity.color = val;
          if (this.selectedEntity instanceof Player) this.selectedEntity.color = val;
      });

      if (p instanceof BaseShape) {
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
      }
  }

  private setupEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.zoomAt(zoomAmount, e.clientX, e.clientY, this.canvas);
    });

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

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
      if (e.key.toLowerCase() === 'r') this.camera.toggleRotation();
    });
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldPos = this.camera.screenToWorld(mouseX, mouseY, this.canvas);
    
    // Pan Logic
    const canPan = this.currentMode === 'play' || (this.currentTool === 'camera' && this.isPanToolActive);
    if (canPan) {
         this.isPanningCamera = true;
         this.lastMouseX = e.clientX;
         this.lastMouseY = e.clientY;
         return;
    }

    // Handle Resize/Rotate Click
    if (this.currentTool === 'select' && this.selectedEntity instanceof BaseShape) {
        const handles = this.selectedEntity.getHandles();
        const inverseScale = 1 / this.camera.zoom;
        const handleRadius = 10 * inverseScale; // Increased hit area

        const dx = worldPos.x - this.selectedEntity.x;
        const dy = worldPos.y - this.selectedEntity.y;
        const cos = Math.cos(-this.selectedEntity.rotation);
        const sin = Math.sin(-this.selectedEntity.rotation);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        for (const h of handles) {
            if (Math.abs(localX - h.x) < handleRadius && Math.abs(localY - h.y) < handleRadius) {
                this.isResizing = true;
                this.activeHandleId = h.id;
                return; 
            }
        }
    }

    // Shape Drawing Logic
    if (this.currentTool === 'shape') {
        this.isDrawing = true;
        this.drawStartPos = { x: worldPos.x, y: worldPos.y };
        
        if (this.currentShapeType === 'rectangle') {
            this.tempShape = new RectangleShape(worldPos.x, worldPos.y);
        } else if (this.currentShapeType === 'circle') {
            this.tempShape = new EllipseShape(worldPos.x, worldPos.y);
        } else if (this.currentShapeType === 'triangle') {
            this.tempShape = new TriangleShape(worldPos.x, worldPos.y);
            // Zero points to prevent default triangle creation
            (this.tempShape as TriangleShape).points = [{x:0, y:0}, {x:0, y:0}, {x:0, y:0}];
        } else if (this.currentShapeType === 'line') {
            this.tempShape = new LineShape(worldPos.x, worldPos.y);
        } else if (this.currentShapeType === 'freehand') {
            this.tempShape = new FreehandShape(worldPos.x, worldPos.y);
            (this.tempShape as FreehandShape).points.push({x: 0, y: 0});
        }
        return;
    }

    if (this.currentTool === 'player') {
      const newPlayer = new Player(worldPos.x, worldPos.y, (this.entities.length + 1).toString());
      this.commandManager.execute(new AddEntityCommand(this, newPlayer));
      this.selectEntity(newPlayer);
      this.setTool('select');
      return;
    }

    if (this.currentTool === 'select') {
      const clickedEntity = this.entities.slice().reverse().find(ent => ent.containsPoint(worldPos.x, worldPos.y));
      
      if (clickedEntity) {
        this.selectEntity(clickedEntity);
        this.isDraggingEntity = true;
        this.dragStartPos = { x: worldPos.x, y: worldPos.y };
        this.initialEntityPos = { x: clickedEntity.x, y: clickedEntity.y };
        
        this.dragOffset = {
            x: clickedEntity.x - worldPos.x,
            y: clickedEntity.y - worldPos.y
        };
      } else {
        this.selectEntity(null);
      }
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Drawing Update
    if (this.isDrawing && this.tempShape && this.drawStartPos) {
        const worldPos = this.camera.screenToWorld(mouseX, mouseY, this.canvas);
        const dx = worldPos.x - this.drawStartPos.x;
        const dy = worldPos.y - this.drawStartPos.y;

        if (this.tempShape instanceof RectangleShape) {
            this.tempShape.width = Math.abs(dx);
            this.tempShape.height = Math.abs(dy);
            this.tempShape.x = this.drawStartPos.x + dx / 2;
            this.tempShape.y = this.drawStartPos.y + dy / 2;
        } else if (this.tempShape instanceof EllipseShape) {
            const halfW = dx / 2;
            const halfH = dy / 2;
            this.tempShape.x = this.drawStartPos.x + halfW;
            this.tempShape.y = this.drawStartPos.y + halfH;
            this.tempShape.radiusX = Math.abs(halfW);
            this.tempShape.radiusY = Math.abs(halfH);
        } else if (this.tempShape instanceof TriangleShape) {
            const halfW = dx / 2;
            const halfH = dy / 2;
            this.tempShape.x = this.drawStartPos.x + halfW;
            this.tempShape.y = this.drawStartPos.y + halfH;
            
            this.tempShape.points = [
                { x: 0, y: -halfH },
                { x: halfW, y: halfH },
                { x: -halfW, y: halfH }
            ];
        } else if (this.tempShape instanceof LineShape) {
            this.tempShape.endX = dx;
            this.tempShape.endY = dy;
        } else if (this.tempShape instanceof FreehandShape) {
             this.tempShape.points.push({x: dx, y: dy});
        }
    }

    // Resizing/Rotation Update
    if (this.isResizing && this.selectedEntity instanceof BaseShape && this.activeHandleId) {
        const worldPos = this.camera.screenToWorld(mouseX, mouseY, this.canvas);
        
        if (this.activeHandleId === 'rotate') {
             const dx = worldPos.x - this.selectedEntity.x;
             const dy = worldPos.y - this.selectedEntity.y;
             this.selectedEntity.rotation = Math.atan2(dy, dx) + Math.PI / 2;
        } else {
             const dx = worldPos.x - this.selectedEntity.x;
             const dy = worldPos.y - this.selectedEntity.y;
             const cos = Math.cos(-this.selectedEntity.rotation);
             const sin = Math.sin(-this.selectedEntity.rotation);
             const localX = dx * cos - dy * sin;
             const localY = dx * sin + dy * cos;

             this.selectedEntity.resize(this.activeHandleId, localX, localY);
        }
    }

    // Dragging Update
    if (this.isDraggingEntity && this.selectedEntity && !this.isResizing && this.dragOffset) {
      const worldPos = this.camera.screenToWorld(mouseX, mouseY, this.canvas);
      // Use offset to keep relative position
      this.selectedEntity.setPosition(worldPos.x + this.dragOffset.x, worldPos.y + this.dragOffset.y);
    }

    if (this.isPanningCamera) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.panCamera(dx, dy);
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private handleMouseUp(e: MouseEvent) {
    if (this.isDrawing && this.tempShape) {
        // Validation: Check if shape has minimal size
        let isValid = true;
        if (this.tempShape instanceof RectangleShape && (this.tempShape.width < 1 || this.tempShape.height < 1)) isValid = false;
        if (this.tempShape instanceof EllipseShape && (this.tempShape.radiusX < 1 || this.tempShape.radiusY < 1)) isValid = false;
        if (this.tempShape instanceof LineShape && this.tempShape.endX === 0 && this.tempShape.endY === 0) isValid = false;
        // Triangle check
        if (this.tempShape instanceof TriangleShape) {
             const p = this.tempShape.points;
             const minX = Math.min(...p.map(pt=>pt.x));
             const maxX = Math.max(...p.map(pt=>pt.x));
             if (maxX - minX < 1) isValid = false;
        }

        if (isValid) {
            this.commandManager.execute(new AddEntityCommand(this, this.tempShape));
            this.selectEntity(this.tempShape);
        }
        
        this.tempShape = null;
        this.isDrawing = false;
        this.setTool('select'); 
    }

    if (this.isResizing) {
        this.isResizing = false;
        this.activeHandleId = null;
    }

    if (this.isDraggingEntity && this.selectedEntity && this.initialEntityPos && !this.isResizing) {
      const dx = this.selectedEntity.x - this.initialEntityPos.x;
      const dy = this.selectedEntity.y - this.initialEntityPos.y;
      
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        this.commandManager.execute(new MoveEntityCommand(
          this.selectedEntity, 
          this.initialEntityPos.x, 
          this.initialEntityPos.y,
          this.selectedEntity.x,
          this.selectedEntity.y
        ));
      }
    }

    this.isDraggingEntity = false;
    this.isPanningCamera = false;
    this.dragStartPos = null;
    this.initialEntityPos = null;
    this.dragOffset = null;
  }

  private panCamera(dx: number, dy: number) {
    const cos = Math.cos(-this.camera.rotation);
    const sin = Math.sin(-this.camera.rotation);
    const rotatedDx = dx * cos - dy * sin;
    const rotatedDy = dx * sin + dy * cos;

    this.camera.x -= rotatedDx / this.camera.zoom;
    this.camera.y -= rotatedDy / this.camera.zoom;
  }

  private selectEntity(entity: Entity | null) {
    if (this.selectedEntity) this.selectedEntity.isSelected = false;
    this.selectedEntity = entity;
    if (this.selectedEntity) this.selectedEntity.isSelected = true;
    
    if (this.currentMode === 'edit') {
        this.updateSelectionUI();
    }
  }

  private deleteSelected() {
    if (this.selectedEntity) {
      this.commandManager.execute(new RemoveEntityCommand(this, this.selectedEntity));
      this.selectedEntity = null;
      this.updateSelectionUI();
    }
  }

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
    this.loop();
  }

  private loop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  private update() {}

  private render() {
    this.ctx.fillStyle = '#111'; 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.camera.applyTransform(this.ctx, this.canvas);

    this.field.draw(this.ctx);
    this.entities.forEach(entity => entity.draw(this.ctx));
    
    // Draw Temp Shape
    if (this.isDrawing && this.tempShape) {
        this.tempShape.draw(this.ctx);
    }

    // Draw Resize/Rotate Handles if Selected
    if (this.selectedEntity instanceof BaseShape && this.currentTool === 'select') {
        const handles = this.selectedEntity.getHandles();
        this.ctx.save();
        this.ctx.translate(this.selectedEntity.x, this.selectedEntity.y);
        this.ctx.rotate(this.selectedEntity.rotation);
        
        const inverseScale = 1 / this.camera.zoom;
        const size = 8 * inverseScale;

        this.ctx.lineWidth = 1 * inverseScale;

        for (const h of handles) {
            if (h.id === 'rotate') {
                this.ctx.beginPath();
                this.ctx.moveTo(h.x, h.y);
                this.ctx.lineTo(h.x, h.y + 25); 
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(h.x, h.y, size, 0, 2 * Math.PI); 
                this.ctx.fillStyle = '#22c55e';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.strokeStyle = '#000000';
                this.ctx.fillRect(h.x - size/2, h.y - size/2, size, size);
                this.ctx.strokeRect(h.x - size/2, h.y - size/2, size, size);
            }
        }
        this.ctx.restore();
    }

    this.ctx.restore();
  }
}
