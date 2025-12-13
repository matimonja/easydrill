export class Field {
  public width: number;
  public height: number;
  public color: string = "#3b82f6";
  public runoffColor: string = "#f472b6";
  public lineColor: string = "#ffffff";

  constructor(width: number = 914, height: number = 550) {
    this.width = width;
    this.height = height;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const runoff = 50;

    ctx.fillStyle = this.runoffColor;
    ctx.fillRect(
      -(halfW + runoff), 
      -(halfH + runoff), 
      this.width + runoff * 2, 
      this.height + runoff * 2
    );

    ctx.fillStyle = this.color;
    ctx.fillRect(-halfW, -halfH, this.width, this.height);

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfW, -halfH, this.width, this.height);

    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(0, halfH);
    ctx.stroke();

    const dist23 = 229;
    ctx.beginPath();
    ctx.moveTo(-halfW + dist23, -halfH);
    ctx.lineTo(-halfW + dist23, halfH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(halfW - dist23, -halfH);
    ctx.lineTo(halfW - dist23, halfH);
    ctx.stroke();

    this.drawStrikingCircle(ctx, -halfW, 1);
    this.drawStrikingCircle(ctx, halfW, -1);

    this.drawSpot(ctx, -halfW + 64, 0);
    this.drawSpot(ctx, halfW - 64, 0);

    this.drawMarks(ctx, -halfW, 1);
    this.drawMarks(ctx, halfW, -1);

    this.drawGoal(ctx, -halfW, 1);
    this.drawGoal(ctx, halfW, -1);
  }

  private drawMarks(ctx: CanvasRenderingContext2D, offsetX: number, direction: number) {
    const halfH = this.height / 2;
    const markLen = 3;
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const posts = [-18.3, 18.3];
    posts.forEach(postY => {
        const sign = postY < 0 ? -1 : 1;
        const y5 = postY + (50 * sign);
        ctx.moveTo(offsetX, y5);
        ctx.lineTo(offsetX + (markLen * direction), y5);
        const y10 = postY + (100 * sign);
        ctx.moveTo(offsetX, y10);
        ctx.lineTo(offsetX + (markLen * direction), y10);
    });
    const markX = offsetX + (50 * direction);
    ctx.moveTo(markX, -halfH);
    ctx.lineTo(markX, -halfH + markLen);
    ctx.moveTo(markX, halfH);
    ctx.lineTo(markX, halfH - markLen);
    ctx.stroke();
  }

  private drawStrikingCircle(ctx: CanvasRenderingContext2D, offsetX: number, direction: number) {
    const radius = 146.3;
    const goalPostDist = 18.3;
    const dashedRadius = 196.3;
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const topCenterX = offsetX;
    const topCenterY = -goalPostDist;
    const bottomCenterX = offsetX;
    const bottomCenterY = goalPostDist;

    if (direction === 1) {
        ctx.arc(topCenterX, topCenterY, radius, -Math.PI/2, 0);
        ctx.lineTo(topCenterX + radius, bottomCenterY);
        ctx.arc(bottomCenterX, bottomCenterY, radius, 0, Math.PI/2);
    } else {
        ctx.moveTo(offsetX, topCenterY - radius); 
        ctx.arc(topCenterX, topCenterY, radius, -Math.PI/2, Math.PI, true);
        ctx.lineTo(offsetX - radius, bottomCenterY);
        ctx.arc(bottomCenterX, bottomCenterY, radius, Math.PI, Math.PI/2, true);
    }
    ctx.stroke();
    
    ctx.save();
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    if (direction === 1) {
         ctx.arc(topCenterX, topCenterY, dashedRadius, -Math.PI/2, 0);
         ctx.lineTo(topCenterX + dashedRadius, bottomCenterY);
         ctx.arc(bottomCenterX, bottomCenterY, dashedRadius, 0, Math.PI/2);
    } else {
         ctx.arc(topCenterX, topCenterY, dashedRadius, -Math.PI/2, Math.PI, true);
         ctx.lineTo(offsetX - dashedRadius, bottomCenterY);
         ctx.arc(bottomCenterX, bottomCenterY, dashedRadius, Math.PI, Math.PI/2, true);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawSpot(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.beginPath();
    ctx.fillStyle = this.lineColor;
    ctx.arc(x, y, 2, 0, Math.PI * 2); 
    ctx.fill();
  }
  
  private drawGoal(ctx: CanvasRenderingContext2D, x: number, direction: number) {
      const goalWidth = 36.6;
      const goalDepth = 12;
      ctx.strokeStyle = this.lineColor;
      ctx.lineWidth = 2;
      const left = direction === 1 ? x - goalDepth : x;
      const top = -goalWidth / 2;
      ctx.strokeRect(left, top, goalDepth, goalWidth);
  }
}
