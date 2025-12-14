export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  public rotation: number = 0;
  private minZoom: number = 0.1;
  private maxZoom: number = 5;

  constructor(initialX: number = 0, initialY: number = 0) {
    this.x = initialX;
    this.y = initialY;
  }

  public applyTransform(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.rotate(this.rotation);
    ctx.translate(-this.x, -this.y);
  }

  public screenToWorld(screenX: number, screenY: number, canvas: HTMLCanvasElement): { x: number, y: number } {
    const relativeX = screenX - canvas.width / 2;
    const relativeY = screenY - canvas.height / 2;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const rotatedX = relativeX * cos - relativeY * sin;
    const rotatedY = relativeX * sin + relativeY * cos;
    const worldX = rotatedX / this.zoom + this.x;
    const worldY = rotatedY / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  public zoomAt(amount: number, screenX: number, screenY: number, canvas: HTMLCanvasElement) {
    const mouseWorldBefore = this.screenToWorld(screenX, screenY, canvas);
    this.zoom *= amount;
    this.zoom = Math.max(this.minZoom, Math.min(this.zoom, this.maxZoom));
    const mouseWorldAfter = this.screenToWorld(screenX, screenY, canvas);
    this.x += (mouseWorldBefore.x - mouseWorldAfter.x);
    this.y += (mouseWorldBefore.y - mouseWorldAfter.y);
  }

  public pan(dx: number, dy: number) {
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const rotatedDx = dx * cos - dy * sin;
    const rotatedDy = dx * sin + dy * cos;
    
    this.x -= rotatedDx / this.zoom;
    this.y -= rotatedDy / this.zoom;
  }

  public toggleRotation() {
    if (this.rotation === 0) {
      this.rotation = -Math.PI / 2;
    } else {
      this.rotation = 0;
    }
  }
}
