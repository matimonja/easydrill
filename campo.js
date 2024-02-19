function dibujarCuadrado(context, rect, configs){
    context.save();
    let configsDibujo = configs || {};
    context.strokeStyle = configsDibujo.colorLinea;
    let largo = Math.abs(rect.iniX - rect.finX);
    let ancho = Math.abs(rect.iniY - rect.finY);
    context.strokeRect(Math.min(rect.iniX, rect.finX), Math.min(rect.iniY, rect.finY), largo , ancho);
    context.restore();

}

function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    let x_mouse;
    let y_mouse;
    if(evt.type == 'touchstart' || evt.type == 'touchmove' || evt.type == 'touchend' || evt.type == 'touchcancel'){
        let touch = evt.touches[0] || evt.changedTouches[0];
        x_mouse = touch.pageX;
        y_mouse = touch.pageY;
    } else if (evt.type == 'mousedown' || evt.type == 'mouseup' || evt.type == 'mousemove' || evt.type == 'mouseover'|| evt.type=='mouseout' || evt.type=='mouseenter' || evt.type=='mouseleave') {
        x_mouse = evt.clientX;
        y_mouse = evt.clientY;
    }
    return {
        x: (x_mouse - rect.left) / (rect.right - rect.left) * canvas.width,
        y: (y_mouse - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
}

function obtenerRectangulo( rect){
    let largo = Math.abs(rect.iniX - rect.finX);
    let ancho = Math.abs(rect.iniY - rect.finY);
    return {"x":Math.min(rect.iniX, rect.finX), "y":Math.min(rect.iniY, rect.finY), "largo":largo , "ancho":ancho};
}

function obtenerCoordenadasRectangulo(rect){
    return {"iniX":rect.x,"iniY":rect.y,"finX":rect.x + rect.largo,"finY":rect.y + rect.ancho}
}

class CanchaHockey{
    constructor(orientacion){
        this.anchoCancha =  63; //ancho mas retiro
        this.largoCancha =  101.4; //largo mas retiro
        this.escala = null;
        this.orientacion = orientacion;
    }

    setEscala(canvasWidth, canvasHeight){
        this.escala = Math.max(canvasWidth, canvasHeight) / Math.max(this.anchoCancha,this.largoCancha);
    }

    dibujarLineasCancha(context, zoom){
        let coef = this.escala * zoom;
        let cancha = {"x": 0 * coef, "y":0 * coef, "largo": 91.4 * coef, "ancho": 55 * coef}
        let linea25 = {"iniX":22.9 * coef ,"iniY":0 * coef, "finX": 22.9 * coef,"finY": 55 * coef}
        let linea50 = {"iniX":22.9 * 2 * coef ,"iniY":0 * coef, "finX": 22.9 * 2 * coef,"finY": 55 * coef}
        let linea75 = {"iniX":22.9 * 3 * coef ,"iniY":0 * coef, "finX": 22.9 * 3 * coef,"finY": 55 * coef}


        //context.strokeRect(0,0,this.largoCancha * this.escala * zoom,this.anchoCancha * this.escala * zoom)
        context.translate(this.retiros.x * zoom, this.retiros.y * zoom)
        context.strokeRect(cancha.x, cancha.y, cancha.largo, cancha.ancho);
        context.beginPath();
        context.moveTo(linea25.iniX, linea25.iniY);
        context.lineTo(linea25.finX, linea25.finY);
        context.moveTo(linea50.iniX, linea50.iniY);
        context.lineTo(linea50.finX, linea50.finY);
        context.moveTo(linea75.iniX, linea75.iniY);
        context.lineTo(linea75.finX, linea75.finY);
        context.stroke();

    }

    dibujarZona25(context, zoom){
        context.translate(this.retiros.x * zoom, this.retiros.y * zoom);
        let coef = this.escala * zoom;
        let lineaArco11 = {"iniX":0 * coef ,"iniY":25.67 * coef, "finX": -2 * coef,"finY": 25.67 * coef}
        let lineaArco12 = {"iniX":0 * coef ,"iniY":29.33 * coef, "finX": -2 * coef,"finY": 29.33 * coef}
        let lineaArco13 = {"iniX":-2 * coef ,"iniY":25.67 * coef, "finX": -2 * coef,"finY": 29.33 * coef}
        let area11 = {"iniX":0 * coef ,"iniY": 29.33 * coef,"radio":14.63 * coef ,"iniAngulo": 0, "finAngulo": Math.PI / 2}
        let area12 = {"iniX":0 * coef ,"iniY": 25.67 * coef,"radio":14.63 * coef ,"iniAngulo": 0, "finAngulo": -Math.PI / 2}
        let area13 = {"iniX":14.63 * coef ,"iniY":25.67 * coef, "finX": 14.63 * coef,"finY": 29.33 * coef}
        let lPunteada = 5 * coef;
        let lineaCorto11 = {"iniX":0 * coef ,"iniY":20.67 * coef, "finX": -0.8 * coef,"finY": 20.67 * coef}
        let lineaCorto12 = {"iniX":0 * coef ,"iniY":15.67 * coef, "finX": -0.8* coef,"finY": 15.67 * coef}
        let lineaCorto21 = {"iniX":0 * coef ,"iniY":34.33 * coef, "finX": -0.8 * coef,"finY": 34.33 * coef}
        let lineaCorto22 = {"iniX":0 * coef ,"iniY":39.33 * coef, "finX": -0.8* coef,"finY": 39.33 * coef}
        let lineaLateral15 = {"iniX":14.63 * coef ,"iniY":0 * coef, "finX": 14.63 * coef,"finY": -0.8 * coef}
        let linea2Lateral15 = {"iniX":14.63 * coef ,"iniY":55 * coef, "finX": 14.63 * coef,"finY": 55.8 * coef}
        let puntoPenal = {"iniX":6.475 * coef ,"iniY": 27.5 * coef,"radio":0.2 * coef ,"iniAngulo": 0, "finAngulo": Math.PI * 2}


        context.beginPath();
        context.moveTo(lineaArco11.iniX, lineaArco11.iniY);
        context.lineTo(lineaArco11.finX, lineaArco11.finY);
        context.moveTo(lineaArco12.iniX, lineaArco12.iniY);
        context.lineTo(lineaArco12.finX, lineaArco12.finY);
        context.moveTo(lineaArco13.iniX, lineaArco13.iniY);
        context.lineTo(lineaArco13.finX, lineaArco13.finY);

        context.moveTo(lineaCorto11.iniX, lineaCorto11.iniY);
        context.lineTo(lineaCorto11.finX, lineaCorto11.finY);
        context.moveTo(lineaCorto12.iniX, lineaCorto12.iniY);
        context.lineTo(lineaCorto12.finX, lineaCorto12.finY);

        context.moveTo(lineaCorto21.iniX, lineaCorto21.iniY);
        context.lineTo(lineaCorto21.finX, lineaCorto21.finY);
        context.moveTo(lineaCorto22.iniX, lineaCorto22.iniY);
        context.lineTo(lineaCorto22.finX, lineaCorto22.finY);

        context.moveTo(lineaLateral15.iniX, lineaLateral15.iniY);
        context.lineTo(lineaLateral15.finX, lineaLateral15.finY);

        context.moveTo(linea2Lateral15.iniX, linea2Lateral15.iniY);
        context.lineTo(linea2Lateral15.finX, linea2Lateral15.finY);

        context.moveTo(puntoPenal.iniX, puntoPenal.iniY);
        context.arc(puntoPenal.iniX, puntoPenal.iniY, puntoPenal.radio, puntoPenal.iniAngulo, puntoPenal.finAngulo);
        context.fill();

        //area
        context.moveTo(area11.iniX + area11.radio, area11.iniY);
        context.arc(area11.iniX, area11.iniY, area11.radio, area11.iniAngulo, area11.finAngulo);
        context.moveTo(area12.iniX + area12.radio, area12.iniY);
        context.arc(area12.iniX, area12.iniY, area12.radio, area12.iniAngulo, area12.finAngulo, true);
        context.moveTo(area13.iniX, area13.iniY);
        context.lineTo(area13.finX, area13.finY);
        context.stroke();
        //Punteada

        context.setLineDash([0.7 * coef, 3 * coef]);
        context.moveTo(area11.iniX + area11.radio + lPunteada, area11.iniY);
        context.arc(area11.iniX, area11.iniY, area11.radio + lPunteada, area11.iniAngulo, area11.finAngulo);
        context.moveTo(area12.iniX + area12.radio + lPunteada, area12.iniY);
        context.arc(area12.iniX, area12.iniY, area12.radio + lPunteada, area12.iniAngulo, area12.finAngulo, true);
        context.moveTo(area13.iniX + lPunteada, area13.iniY);
        context.lineTo(area13.finX + lPunteada, area13.finY);
        context.stroke();
    }

    dibujarZona75(context, zoom){
        context.translate(this.retiros.x * zoom, this.retiros.y * zoom);
        let coef = this.escala * zoom;
        //console.log(coef, this.escala, zoom)
        let lineaArco11 = {"iniX":91.4 * coef ,"iniY":25.67 * coef, "finX": 93.4 * coef,"finY": 25.67 * coef}
        let lineaArco12 = {"iniX":91.4 * coef ,"iniY":29.33 * coef, "finX": 93.4 * coef,"finY": 29.33 * coef}
        let lineaArco13 = {"iniX":93.4 * coef ,"iniY":25.67 * coef, "finX": 93.4 * coef,"finY": 29.33 * coef}
        let area11 = {"iniX":91.4 * coef ,"iniY": 29.33 * coef,"radio":14.63 * coef ,"iniAngulo": -Math.PI * 3/2  , "finAngulo":-Math.PI  }
        let area12 = {"iniX":91.4 * coef ,"iniY": 25.67 * coef,"radio":14.63 * coef ,"iniAngulo": -Math.PI / 2, "finAngulo": -Math.PI}
        let area13 = {"iniX":(91.4 - 14.63) * coef ,"iniY":25.67 * coef, "finX": (91.4 - 14.63) * coef,"finY": 29.33 * coef}
        let lPunteada = 5 * coef;
        let lineaCorto11 = {"iniX":91.4 * coef ,"iniY":20.67 * coef, "finX": 92.2 * coef,"finY": 20.67 * coef}
        let lineaCorto12 = {"iniX":91.4 * coef ,"iniY":15.67 * coef, "finX": 92.2 * coef,"finY": 15.67 * coef}
        let lineaCorto21 = {"iniX":91.4 * coef ,"iniY":34.33 * coef, "finX": 92.2 * coef,"finY": 34.33 * coef}
        let lineaCorto22 = {"iniX":91.4 * coef ,"iniY":39.33 * coef, "finX": 92.2 * coef,"finY": 39.33 * coef}
        let lineaLateral15 = {"iniX":(91.4 - 14.63) * coef ,"iniY":0 * coef, "finX": (91.4 - 14.63) * coef,"finY": -0.8 * coef}
        let linea2Lateral15 = {"iniX":(91.4 - 14.63) * coef ,"iniY":55 * coef, "finX": (91.4 - 14.63) * coef,"finY": 55.8 * coef}
        let puntoPenal = {"iniX":(91.4 - 6.475) * coef ,"iniY": 27.5 * coef,"radio":0.2 * coef ,"iniAngulo": 0, "finAngulo": Math.PI * 2}


        context.beginPath();
        context.moveTo(lineaArco11.iniX, lineaArco11.iniY);
        context.lineTo(lineaArco11.finX, lineaArco11.finY);
        context.moveTo(lineaArco12.iniX, lineaArco12.iniY);
        context.lineTo(lineaArco12.finX, lineaArco12.finY);
        context.moveTo(lineaArco13.iniX, lineaArco13.iniY);
        context.lineTo(lineaArco13.finX, lineaArco13.finY);

        context.moveTo(lineaCorto11.iniX, lineaCorto11.iniY);
        context.lineTo(lineaCorto11.finX, lineaCorto11.finY);
        context.moveTo(lineaCorto12.iniX, lineaCorto12.iniY);
        context.lineTo(lineaCorto12.finX, lineaCorto12.finY);

        context.moveTo(lineaCorto21.iniX, lineaCorto21.iniY);
        context.lineTo(lineaCorto21.finX, lineaCorto21.finY);
        context.moveTo(lineaCorto22.iniX, lineaCorto22.iniY);
        context.lineTo(lineaCorto22.finX, lineaCorto22.finY);

        context.moveTo(lineaLateral15.iniX, lineaLateral15.iniY);
        context.lineTo(lineaLateral15.finX, lineaLateral15.finY);

        context.moveTo(linea2Lateral15.iniX, linea2Lateral15.iniY);
        context.lineTo(linea2Lateral15.finX, linea2Lateral15.finY);

        context.moveTo(puntoPenal.iniX, puntoPenal.iniY);
        context.arc(puntoPenal.iniX, puntoPenal.iniY, puntoPenal.radio, puntoPenal.iniAngulo, puntoPenal.finAngulo);
        context.fill();

        //area
        context.moveTo(area11.iniX, area11.iniY + area11.radio);
        context.arc(area11.iniX, area11.iniY, area11.radio, area11.iniAngulo, area11.finAngulo);
        context.moveTo(area12.iniX, area12.iniY - area11.radio);
        context.arc(area12.iniX, area12.iniY, area12.radio, area12.iniAngulo, area12.finAngulo, true);
        context.moveTo(area13.iniX, area13.iniY);
        context.lineTo(area13.finX, area13.finY);
        context.stroke();
        //Punteada

        context.setLineDash([0.7 * coef, 3 * coef]);
        context.moveTo(area11.iniX , area11.iniY + area11.radio + lPunteada);
        context.arc(area11.iniX , area11.iniY , area11.radio + lPunteada, area11.iniAngulo, area11.finAngulo);
        context.moveTo(area12.iniX , area12.iniY - area12.radio);
        context.arc(area12.iniX, area12.iniY, area12.radio + lPunteada, area12.iniAngulo, area12.finAngulo, true);
        context.moveTo(area13.iniX - lPunteada, area13.iniY);
        context.lineTo(area13.finX - lPunteada, area13.finY);
        context.stroke();
    }

    dibujarZona25Espejo(canvas, context, zoom){
        context.translate(canvas.width * zoom, canvas.height * zoom)
        //context.translate(canvas.height * zoom, -canvas.width * zoom)
        context.rotate(Math.PI)
        context.beginPath();
        this.dibujarZona25(context, this.escala, zoom);
    }

    setConfigsDibujo(context){
        context.strokeStyle = 'white';
        context.fillStyle = 'white';
        this.retiros = {"x":5 * this.escala,"y": 4 * this.escala};
    }

    rotarVertical(canvas, context){
        if(this.orientacion == "vertical"){
            context.rotate(Math.PI / 2);
            context.translate(0, - canvas.width );
            //context.translate(0, - this.anchoCancha * this.escala);
        }
    }

    dibujarCancha(canvas, context, zoom){
        this.setConfigsDibujo(context);

        context.save();
        this.rotarVertical(canvas, context);
        this.dibujarLineasCancha(context, zoom);
        context.restore();

        context.save();
        this.rotarVertical(canvas, context);
        this.dibujarZona25(context, zoom);
        context.restore();

        context.save();
        this.rotarVertical(canvas, context);
        this.dibujarZona75(context, zoom);
        context.restore();
    }
}

class CreardorZonaCancha{
    /**
     * La siguiente clase es encargada de crear todos los elementos de un ejercicio.
     * Posee los listeners de interacciones del usuario con el canvas (click, move).
     * @param {*} idCanvas 
     */
    constructor(idCanvas, orientacion, idCanvasZoom){
        this.canvas = document.getElementById(idCanvas);
        this.context = this.canvas.getContext("2d");
        this.canvas.addEventListener('mousedown', this.mouseClick.bind(this));
        this.canvas.addEventListener('touchstart', this.mouseClick.bind(this));
        this.canvas.addEventListener('mousemove', this.mouseMove.bind(this));
        this.canvas.addEventListener('touchmove', this.mouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.mouseUp.bind(this));
        this.canvas.addEventListener('touchend', this.mouseUp.bind(this));
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.orientacion = orientacion || "horizontal";
        this.cancha = new CanchaHockey(this.orientacion);
        this.idCanvasZoom = idCanvasZoom;
        this.canvasZonaZoom = document.getElementById(idCanvasZoom);
        this.contextZonaZoom = this.canvasZonaZoom.getContext("2d");
        this.dibujando = false;
        this.zonaZoom = null;
        this.zonaZoomMod = null;
    }

    mouseClick(event){
        let mousePos = this.getMousePos(this.canvas, event);
        this.dibujando = true;
        this.zonaZoom = {"iniX":mousePos.x, "iniY":mousePos.y,"finX":mousePos.x, "finY":mousePos.y}
        this.zonaZoomMod = {"iniX":mousePos.x, "iniY":mousePos.y,"finX":mousePos.x, "finY":mousePos.y}
    }

    mouseMove(event){
        if(this.dibujando){
            let mousePos = this.getMousePos(this.canvas, event);
            this.setZonaZoomFin(mousePos);
            let orientacion = this.getOrientacion(this.obtenerRectangulo(this.zonaZoom));
            let recs = null;
            if (orientacion == "horizontal"){
                recs = this.ajusteZonaHorizontal(this.obtenerRectangulo(this.zonaZoom), this.canvasZonaZoom);
            }
            else{
                recs = this.ajusteZonaVertical(this.obtenerRectangulo(this.zonaZoom), this.canvasZonaZoom);
            }
            this.zonaZoomMod = recs[1];
        }
    }

    mouseUp(event){
        this.dibujando = false;
        this.hacerZoomZona(this.zonaZoomMod)
    }

    setZonaZoomFin(pos){
        this.zonaZoom.finX = pos.x;
        this.zonaZoom.finY = pos.y;
    }

    setZonaZoom(rect, newCanvasZoom){
        let zoom = newCanvasZoom || 1;
        let rectMod = {"x": rect.x * zoom,"y": rect.y * zoom, "largo":rect.largo * zoom, "ancho":rect.ancho * zoom}
        this.zonaZoom = rectMod;
    }

    getOrientacion(rect){
        if(rect.largo >= rect.ancho){
            return "horizontal"
        }
        else{
            //console.log(largo,ancho, "vertical")
            return "vertical"
        }
    }

    ajusteZonaHorizontal(rec, canvas){
        let canvasLargo = canvas.width
        let canvasAncho = canvas.height
        let rec_mod = rec;
        let proporcionLargoAncho = canvasLargo/canvasAncho;
        let proporcionLargoAnchoRec = rec.largo/rec.ancho
        if(proporcionLargoAncho > proporcionLargoAnchoRec){
            // si la relacion largo/ancho en el canvas es mas grande que en el cuadrado, debo dejar fijo
            // el largo del cuadrado y agrandar el largo
            let nuevoLargo = rec.ancho * proporcionLargoAncho
            let diferencia = (nuevoLargo - rec_mod.largo);
            rec_mod.largo = nuevoLargo;
            rec_mod.x -= diferencia / 2;//(nuevoLargo - rec_mod.largo) / 2;
            

        } else if (proporcionLargoAncho < proporcionLargoAnchoRec){
            let nuevoAncho = rec.ancho * proporcionLargoAnchoRec / proporcionLargoAncho
            let diferenciaAncho = (nuevoAncho - rec_mod.ancho);
            rec_mod.ancho = nuevoAncho;
            rec_mod.y -= diferenciaAncho / 2;


        } 
        return [rec, rec_mod]
    }

    ajusteZonaVertical(rec, canvas){
        let canvasLargo = canvas.width
        let canvasAncho = canvas.height
        let rec_mod = rec;
        let proporcionLargoAncho = canvasAncho/canvasLargo;
        let proporcionLargoAnchoRec = rec.largo/rec.ancho
        //console.log(proporcionLargoAncho, proporcionLargoAnchoRec)
        if(proporcionLargoAncho > proporcionLargoAnchoRec){
            // si la relacion largo/ancho en el canvas es mas grande que en el cuadrado, debo dejar fijo
            // el largo del cuadrado y agrandar el largo
            let nuevoLargo = rec.ancho * proporcionLargoAncho
            let diferencia = (nuevoLargo - rec_mod.largo);
            rec_mod.largo = nuevoLargo;
            rec_mod.x -= diferencia / 2;//(nuevoLargo - rec_mod.largo) / 2;
            

        } else if (proporcionLargoAncho < proporcionLargoAnchoRec){
            let nuevoAncho = rec.ancho * proporcionLargoAnchoRec / proporcionLargoAncho
            let diferenciaAncho = (nuevoAncho - rec_mod.ancho);
            rec_mod.ancho = nuevoAncho;
            rec_mod.y -= diferenciaAncho / 2;


        } 
        return [rec, rec_mod]
    }

    hacerZoomZona(rectangulo){

        let orientacion = this.getOrientacion(rectangulo);
        console.log(rectangulo)
        this.camaraZoom = new ZonaEjercicio(this.idCanvasZoom, rectangulo, orientacion,);
    }

    
    

    actualizarPizarra(timestamp){
        
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight); // En cada frame se dibuja partiendo de un canvas vacio
        if (!this.previous) this.previous = timestamp;

        // cancha
        this.cancha.setEscala(this.canvasWidth, this.canvasHeight)
        this.cancha.dibujarCancha(this.canvas, this.context, 1);
        if(this.zonaZoom){
            //console.log("lala",this.zonaZoom,  this.zonaZoomMod)
            this.dibujarCuadrado(this.context, this.zonaZoom, {"colorLinea":"red"});
        }
        if(this.zonaZoomMod){
            this.dibujarCuadrado(this.context, this.obtenerCoordenadasRectangulo(this.zonaZoomMod), {"colorLinea":"yellow"});
        }

        window.requestAnimationFrame(this.actualizarPizarra.bind(this));
    }
}

class ZonaEjercicio{
    constructor(idCanvas, zonaZoom, orientacionCancha){
        this.canvas = document.getElementById(idCanvas);
        this.context = this.canvas.getContext("2d");
        this.zonaZoom = zonaZoom;
        this.orientacionCancha = orientacionCancha;
        this.cancha = new CanchaHockey(this.orientacionCancha);
        this.cancha.setEscala(this.canvas.width, this.canvas.height)
        this.cancha.dibujarCancha(this.canvas, this.context, 0.6)
        this.dibujarZona()
    }

    dibujarZona(){
        this.trasladarZonaZoom(0.6)
        let rect = this.obtenerCoordenadasRectangulo(this.zonaZoom)
        console.log(rect)
        this.dibujarCuadrado(this.context, rect)
    }

    trasladarZonaZoom(zoom){
        if (this.orientacionCancha == "horizontal"){
            let zonaZoomMod = {"x":this.zonaZoom.x * zoom,"y":this.zonaZoom.y * zoom, "ancho":this.zonaZoom.ancho * zoom,"largo":this.zonaZoom.largo * zoom}
            this.zonaZoom = zonaZoomMod;
        }

        else if (this.orientacionCancha == "vertical"){
            let zonaZoomMod = {"x": -this.zonaZoom.y * zoom + this.canvas.width - this.zonaZoom.ancho * zoom,"y":this.zonaZoom.x * zoom, "ancho":this.zonaZoom.largo * zoom,"largo":this.zonaZoom.ancho * zoom}
            this.zonaZoom = zonaZoomMod;
        }
    }
}

CreardorZonaCancha.prototype.dibujarCuadrado = dibujarCuadrado;
CreardorZonaCancha.prototype.obtenerRectangulo = obtenerRectangulo;
CreardorZonaCancha.prototype.obtenerCoordenadasRectangulo = obtenerCoordenadasRectangulo;
CreardorZonaCancha.prototype.getMousePos = getMousePos;

ZonaEjercicio.prototype.dibujarCuadrado = dibujarCuadrado;
ZonaEjercicio.prototype.obtenerCoordenadasRectangulo = obtenerCoordenadasRectangulo;

var d = new CreardorZonaCancha("canvas-campo-juego", "horizontal","canvas-camara");
d.actualizarPizarra(d.canvas, d.context, d.escala, d.zoom);