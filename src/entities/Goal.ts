import { RectangleShape } from './Shape';

export class Goal extends RectangleShape {
    constructor(x: number, y: number) {
        super(x, y, '#ffffff'); // Default color white
        this.width = 100;
        this.height = 40;
        this.hasFill = false; // We handle fill manually
    }

    drawShape(ctx: CanvasRenderingContext2D): void {
        const w = this.width;
        const h = this.height;
        const hw = w / 2;
        const hh = h / 2;

        // 1. Draw Net Pattern (Rhombus/Diagonals)
        ctx.save();
        ctx.beginPath();
        ctx.rect(-hw, -hh, w, h);
        ctx.clip();

        ctx.beginPath();
        ctx.strokeStyle = '#cccccc'; // Light grey for net strands
        ctx.lineWidth = 1;
        
        const spacing = 8;
        // Diagonals top-left to bottom-right
        // Start x from far left to far right to cover rotation/clipping
        // Local coords: -hw to hw. 
        // We draw lines y = x + offset and y = -x + offset
        
        const maxDim = w + h;
        
        for (let d = -maxDim; d <= maxDim; d += spacing) {
             // y = x + d  -> x = y - d
             // top: y = -hh -> x = -hh - d
             // bottom: y = hh -> x = hh - d
             ctx.moveTo(-hh - d, -hh);
             ctx.lineTo(hh - d, hh);
        }

        for (let d = -maxDim; d <= maxDim; d += spacing) {
            // y = -x + d -> x = d - y
            // top: y = -hh -> x = d + hh
            // bottom: y = hh -> x = d - hh
            ctx.moveTo(d + hh, -hh);
            ctx.lineTo(d - hh, hh);
       }
       
       ctx.stroke();
       ctx.restore();

        // 2. Draw Frame (Side and Back posts)
        ctx.beginPath();
        ctx.rect(-hw, -hh, w, h);
        ctx.strokeStyle = this.color === '#ffffff' ? '#000000' : this.color; // Use black for frame if white, else custom
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Draw Front Line (Thicker) - indicating the goal mouth
        // We assume the "Bottom" of the rect (positive Y) is the front
        ctx.beginPath();
        const ext = 1; // Extend to cover frame stroke (lineWidth 2)
        ctx.moveTo(-hw - ext, hh);
        ctx.lineTo(hw + ext, hh);
        ctx.lineWidth = 6;
        ctx.strokeStyle = this.color === '#ffffff' ? '#000000' : this.color;
        ctx.lineCap = 'butt'; // Crisp ends
        ctx.stroke();
    }
}
