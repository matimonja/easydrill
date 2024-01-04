// TO DO
/*
- BUG (creacion ejercicio) Cuando se suelta la bocha sobre el jugador no se establece la posecion. Creo que tiene que ver con
    que el evento mouse up ocurre al mismo tiempo que la actualizacion de la bocha en base al jugador, por lo tanto no hay posecion
    
- NEW (creacion ejercicio) Poder eliminar acciones, ctrl+z
- NEW (creacion ejercicio) Hacer que las velocidades varien de acuerdo a el tiempo esperado de cada accion
- NEW (reproduccion) Dibujar elementos estaticos
- cambiar nombre de getActividad
*/

function calcularVersor2Puntos(p1X, p1Y, p2X, p2Y){
    v1 = p2X - p1X
    v2 = p2Y - p1Y
    modulo = Math.sqrt(Math.pow(v1, 2) + Math.pow(v2, 2))
    versor = {x: (v1/modulo), y: (v2/modulo)}
    return versor
}

function dibujarCirculo(context, x, y, r, configs) {
    context.save();
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.fillStyle = configs.color;
    context.fill();

    // contorno
    context.strokeStyle = 'white';
    if (configs.seleccionado){  
        context.setLineDash([5,3]);
        context.lineWidth = 4; 
    }
    else{
        context.setLineDash([]); 
    }
    context.stroke();
    context.closePath();
    context.restore();
}

function pDistance(x, y, x1, y1, x2, y2) {

    let A = x - x1;
    let B = y - y1;
    let C = x2 - x1;
    let D = y2 - y1;
  
    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;
  
        let xx, yy;
  
    if (param < 0) {
      xx = x1;
      yy = y1;
    }
    else if (param > 1) {
      xx = x2;
      yy = y2;
    }
    else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
  
    let dx = x - xx;
    let dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

class ReproduccionMovimientoLibreModel{
    constructor(model, jug){
        this.modeloEstatico = model;
        this.posActual = model.posInicial;
        this.movimientoTerminado = false;
        this.recorridoIdx = 0;
        this.jugadorMovimiento = jug;

    }

    actualizar(elapsed){
        if ((!this.movimientoTerminado) & (this.condicionesMovimientoOk())){
            this.recorridoIdx += this.modeloEstatico.velocidad;
            let nuevaPos = this.modeloEstatico.recorrido[Math.floor(this.recorridoIdx)];
            this.setPosicionActual(nuevaPos);
            this.MovimientoFinalizado();
        }
    }

    setPosicionActual(nuevaPos){
        this.posActual = nuevaPos;
    }

    getPosicionActual(){
        return this.posActual;
    }

    MovimientoFinalizado(){
        if (Math.floor(this.recorridoIdx) == this.modeloEstatico.recorrido.length -1){
            this.movimientoTerminado = true;
        }
    }

    getMovimientoFinalizado(){
        return this.movimientoTerminado;
    }

    condicionesMovimientoOk(){
        return ! this.jugadorMovimiento.tieneBocha();
    }
}

class ReproduccionMovimientoRectoModel{
    constructor(model, jug ){
        this.modeloEstatico = model;
        this.posActualX = model.posInicial.x;
        this.posActualY = model.posInicial.y;
        this.velocidadX = this.modeloEstatico.obtenerVelocidad().x;
        this.velocidadY = this.modeloEstatico.obtenerVelocidad().y;
        this.movimientoTerminado = false;
        this.jugadorMovimiento = jug;

    }

    actualizar(elapsed){
        if ((!this.movimientoTerminado) & (this.condicionesMovimientoOk())){
            let deltaX = elapsed * this.velocidadX ;
            let deltaY = elapsed * this.velocidadY;
            let nuevaPosX = this.posActualX + deltaX;
            let nuevaPosY = this.posActualY + deltaY;
            let nuevaPos = this.limitarMovimiento(nuevaPosX, nuevaPosY);
            this.setPosicionActual(nuevaPos.x, nuevaPos.y);
            this.MovimientoFinalizado();
        }
        
    }

    setPosicionActual(nuevaPosX, nuevaPosY){
        this.posActualX = nuevaPosX;
        this.posActualY = nuevaPosY;
    }

    getPosicionActual(){
        let pos = {x: this.posActualX, y:this.posActualY};
        return pos;
    }

    MovimientoFinalizado(){
        if ((this.posActualX == this.modeloEstatico.posFinal.x) & (this.posActualY == this.modeloEstatico.posFinal.y)){
            this.movimientoTerminado = true;
        }
    }

    limitarMovimiento(nuevaX,nuevaY){
        let x;
        let y;
        if (this.velocidadX >= 0){
            x = Math.min(nuevaX, this.modeloEstatico.posFinal.x);
        }
        else{
            x = Math.max(nuevaX, this.modeloEstatico.posFinal.x);
        }
        if (this.velocidadY >= 0){
            y = Math.min(nuevaY, this.modeloEstatico.posFinal.y);
        }
        else{
            y = Math.max(nuevaY, this.modeloEstatico.posFinal.y);
        }

        return {x:x, y:y};

    }

    getMovimientoFinalizado(){
        return this.movimientoTerminado;
    }

    condicionesMovimientoOk(){
        return true;
    }
}

class ReproduccionPaseModel {
    constructor(model, jugador){
        this.jugadorPase = jugador;
        this.modeloEstatico = model;
        this.paseRealizado = false;
    }

    actualizar(elapsed){
        if((!this.paseRealizado) & (this.jugadorPase.tieneBocha())){
            //creo accion para la bocha
            let bocha = this.jugadorPase.getElementoActual();
            let accionMovimiento = new ReproduccionMovimientoRectoModel(this.modeloEstatico, bocha);
            //Quito bocha del jugador
            this.jugadorPase.quitarElementoActual()
            // Quito jugador de la bocha
            bocha.removerPoseedor();
            //asigno accion a la bocha
            bocha.agregarAccion(accionMovimiento);
            bocha.setNuevaAccion();
            // Pase realizado
            this.paseRealizado = true;
        }
    }
    
    getPosicionActual(){
        return this.modeloEstatico.obtenerPosicionInicial();
    }
    
    getMovimientoFinalizado(){
        return this.paseRealizado;
    }

    condicionesMovimientoOk(){
        return this.jugadorPase.tieneBocha();
    }
}

class ReproduccionConduccionLibreModel extends ReproduccionMovimientoLibreModel{
    constructor(model, jugador){
        super(model, jugador);
    }

    condicionesMovimientoOk(){
        return this.jugadorMovimiento.tieneBocha();
    }
}

class ReproduccionConduccionRectaModel extends ReproduccionMovimientoRectoModel{
    constructor(model, jugador){
        super(model, jugador);
    }

    condicionesMovimientoOk(){
        return this.jugadorMovimiento.tieneBocha();
    }

}
class ReproducirMovimientoBocha {
    constructor(model, entrenamiento){
        this.model = model;
        this.entrenamiento = entrenamiento;
        this.accionActual = null;
        this.accionActualIdx = 0;
        this.posicionActual = model.posicion;
        this.acciones = []//model.acciones;
        this.model.setObjetoReproductor(this);
        this.poseedorActual = null;
        if (this.model.poseedor){
            this.poseedorActual = this.model.poseedor;
        }
    }

    entrar(){
        if(this.acciones.length > 0){
            this.actualizarAccionActual();
        }
    }

    actualizarAccionActual(){
        let accionActual = this.acciones[this.accionActualIdx];
        this.setAccionActual(accionActual);
    }

    actualizar(elapsed){
        if (this.accionActual){
            this.accionActual.actualizar(elapsed);
            let pos = this.accionActual.getPosicionActual();
            this.setPosicionActual(pos);
            let finMovimiento = this.accionActual.getMovimientoFinalizado();
            if (finMovimiento){
                if((this.acciones.length -1) > this.accionActualIdx){
                    this.setNuevaAccion();
                }
                else{
                    this.setAccionActual(null);
                }
                
            }
        }

    }

    actualizarReferenciasReproduccion(){
        if (this.poseedorActual){
            this.setPoseedor(this.poseedorActual.getObjetoReproductor());
        }
    }

    setNuevaAccion(){
        if (!this.accionActual){
            // si no hay accion actual pero hay acciones en la lista y el indice es 0
            this.actualizarAccionActual();
        }
        else{
            if (this.accionActualIdx < this.acciones.length -1){ //quedan acciones
                this.accionActualIdx ++;
                this.actualizarAccionActual();
                
            }
        }
    }

    setPosicionActual(pos){
        this.posicionActual = pos;
    }

    getPosicionActual(){
        return this.posicionActual;
    }

    getActividad(){
        if((!this.poseedorActual) & (!this.accionActual)){
            //no  hay accion ni tampoco accion
            return true;
        }
        else{
            return false;
        }
    }

    dibujar(context){
        this.dibujarCirculo(context, this.posicionActual.x, this.posicionActual.y, this.model.radio, {color: this.model.color});
    }
    
    agregarAccion(accion){
        this.acciones.push(accion);
    }

    moverCentro(deltaX, deltaY){
        let nuevaX = this.posicionActual.x + deltaX;
        let nuevaY = this.posicionActual.y + deltaY;
        let pos = {x: nuevaX, y: nuevaY};
        this.setPosicionActual(pos);
    }

    removerPoseedor(){
        this.setPoseedor(null);
    }

    setPoseedor(jug){
        this.poseedorActual = jug;
    }

    getRadio(){
        return this.model.radio;
    }

    hayColisionPunto(x, y){
        if (this.model.distanciaEntrePuntos(x, y, this.posicionActual.x, this.posicionActual.y) < this.getRadio()){
            return true;
        }
        else{
            return false;
        }
    }

    setAccionActual(acc){
        this.accionActual = acc;
    }

}

ReproducirMovimientoBocha.prototype.dibujarCirculo = dibujarCirculo;

class ReproducirMovimientoJugador {
    constructor(model, entrenamiento){
        this.model = model;
        this.entrenamiento = entrenamiento;
        this.accionActual = null;
        this.accionActualIdx = 0;
        this.posicionActual = model.posicion;
        let elem = null;
        if(model.elemento){
            elem = model.elemento;
        }
        this.elementoActual = elem;
        this.model.setObjetoReproductor(this);
    }

    entrar(){
        if (this.model.acciones.length > 0){
            this.actualizarAccionActual();
        }
        
    }

    actualizarAccionActual(){
        let accionActual = this.model.acciones[this.accionActualIdx];
        let accionView = this.crearAccionModel(accionActual);
        this.setAccionActual(accionView);
    }
    
    actualizar(elapsed){
        if (this.accionActual){
            this.accionActual.actualizar(elapsed);
            let pos = this.accionActual.getPosicionActual();
            if(this.elementoActual){
                this.moverElemento(this.posicionActual, pos);
            }
            this.setPosicionActual(pos);
            let finMovimiento = this.accionActual.getMovimientoFinalizado();
            if (finMovimiento){
                this.setNuevaAccion();
            }
        }
    }

    actualizarReferenciasReproduccion(){
        if (this.elementoActual){
            this.setElementoActual(this.elementoActual.getObjetoReproductor());
        }
    }

    setNuevaAccion(){
        if (this.accionActualIdx == this.model.acciones.length -1){
            // termino la ultima accion
            if(this.accionActual.getMovimientoFinalizado()){
                console.log("se remueve accion", this.accionActual, this.accionActual.getMovimientoFinalizado())
                this.removerAccionActual();
            }
        }
        if (this.accionActualIdx < this.model.acciones.length -1){ //quedan acciones
            this.accionActualIdx ++;
            this.actualizarAccionActual();
        }
    }

    setPosicionActual(pos){
        this.posicionActual = pos;
    }

    getPosicionActual(){
        return this.posicionActual;
    }

    dibujar(context){
        this.dibujarCirculo(context, this.posicionActual.x, this.posicionActual.y, this.model.radio, {color: this.model.color});
    }

    moverElemento(posActual, posNueva){
        let deltaX = posNueva.x - posActual.x;
        let deltaY = posNueva.y - posActual.y;
        this.elementoActual.moverCentro(deltaX, deltaY);
    }

    getActividad(){
        if(!this.accionActual){
            // si no tiene accion, devuelve true porque esta inactivo
            return true;
        }
        else if(!this.accionActual.condicionesMovimientoOk()){
            return true;
        }
        else{
            return false;
        }
    }
    

    crearAccionModel(accion){
        if(accion instanceof ConduccionRectaModel){
            let mov = new ReproduccionConduccionRectaModel(accion, this);
            return mov;
        }
        else if(accion instanceof ConduccionLibreModel){
            let mov = new ReproduccionConduccionLibreModel(accion, this);
            return mov;
        }
        else if(accion instanceof MovimientoLibreModel){
            let mov = new ReproduccionMovimientoLibreModel(accion, this);
            return mov;
        }
        else if(accion instanceof PaseModel){
            let mov = new ReproduccionPaseModel(accion, this);
            return mov;
        }
        else if(accion instanceof MovimientoRectoModel){
            let mov = new ReproduccionMovimientoRectoModel(accion, this);
            return mov;
        }
        
    }

    tieneBocha(){
        if (this.elementoActual){
            if (this.elementoActual instanceof ReproducirMovimientoBocha){
                return true;
            }
        }
        return false;
    }

    paseRealizado(){
        this.elementoActual = null;
        this.setNuevaAccion();
    }

    setElementoActual(elem){
        console.log()
        this.elementoActual = elem;
    }

    getElementoActual(){
        return this.elementoActual;
    }

    quitarElementoActual(){
        this.setElementoActual(null);
    }

    removerAccionActual(){
        console.log("accion a null")
        this.setAccionActual(null);
    }

    setAccionActual(acc){
        console.log("Cambio accion",acc)
        this.accionActual = acc;
    }

    getRadio(){
        return this.model.radio
    }

    hayColisionPunto(x, y){
        if (this.model.distanciaEntrePuntos(x, y, this.posicionActual.x, this.posicionActual.y) < this.getRadio()){
            return true;
        }
        else{
            return false;
        }
    }

}

ReproducirMovimientoJugador.prototype.dibujarCirculo = dibujarCirculo;


class Estado {

    constructor(fsm) {
      if (this.constructor == Estado) {
        throw new Error("Clase abstracta no puede ser instanciada");
      }
      this.fsm = fsm;
      this.estaticoReproduccion = false;
      this.visibleReproduccion = true;
      this.objetoReproductor = null;
    }
  
    entrar() {
      throw new Error("Metodo 'entrar()' debe ser implementado.");
    }
  
    actualizar() {
        throw new Error("Metodo 'actualizar()' debe ser implementado.");
    }

    mouseDown(){}

    mouseUp(){}

    mover(){}

    terminarMover(){}

    mouseMove(){}

    mouseOut(){}

    salir(){
        throw new Error("Metodo 'salir()' debe ser implementado.");
    }

    seleccionar(){
        this.seleccionado = true;
    }

    desSeleccionar(){
        this.seleccionado = false;
    }

    esEstaticoReproduccion(){
        return this.estaticoReproduccion;
    }

    esVisibleReproduccion(){
        return this.visibleReproduccion;
    }

    setObjetoReproductor(objetoReproductor){
        this.objetoReproductor = objetoReproductor;
    }

    getObjetoReproductor(){
        return this.objetoReproductor;
    }
}

class MovimientoLibreModel extends Estado{
    constructor(fsm, jugador, velocidad){
        super(fsm);
        this.posInicial = null;
        this.posFinal = null;
        this.posicionActual = null;
        this.recorrido = [];
        this.proximoEstado = null;
        this.dibujando = false;
        this.clickCount = 0;
        this.seleccionado = false;
        this.JugadorMovimiento = jugador;
        this.velocidad = velocidad || 0.1;
    }

    entrar(pos){
        this.posInicial = pos;
        this.posicionActual = pos;
    }

    mouseDown(pos){
        let res = this.JugadorMovimiento.hayColisionPuntoAccion(pos.x, pos.y);
        if (res && (this.clickCount == 0)){
            this.clickCount ++;
            let pos = this.JugadorMovimiento.obtenerPosicionProxAccion();
            this.entrar(pos);
            this.recorrido.push(pos);
            this.dibujando = true;
        }
    }

    mouseMove(pos){
        if (this.dibujando){
            this.actualizar(pos);
        }
    }

    mouseUp(){
        if (this.dibujando){
            this.salir();
        }
        this.dibujando = false;
    }

    actualizar(pos){
        if (this.dibujando){
            this.recorrido.push(pos);
            this.posicionActual = pos;
            this.calcularRotacion();
        }
    }

    salir(){
        this.posFinal = this.posicionActual;
        this.simplificacionRecorrido();
        this.JugadorMovimiento.agregarAccion(this);
        this.fsm.terminarDibujo(this);
    }

    definirPosicionInicial(pos){
        this.posInicial = pos;
        this.recorrido[0] = pos;
    }

    simplificacionRecorrido(){
        let nuevoRec = [this.recorrido[0]];
        for (let i = 0; i < this.recorrido.length -2;){
            let idx = this.minimoMovimiento(this.recorrido, i, i+1)
            nuevoRec.push(this.recorrido[idx])
            i = idx;
        }

        nuevoRec.push(this.posFinal);
        this.recorrido = nuevoRec;
    }

    minimoMovimiento(recorrido, iAct,i){
        if (i >= (recorrido.length - 2)){
            return recorrido.length -1;
        }
        else {
            let posAct = recorrido[iAct];
            let posProx = recorrido[(i)];
            let dist = this.distanciaEntrePuntos(posAct.x, posAct.y, posProx.x, posProx.y);
            if (dist < 20){
                return this.minimoMovimiento(recorrido, iAct, i+1);
            }
            else return i;
        }
    }

    desSeleccionar(){
        this.seleccionado = false
    }

    seleccionar(){
        this.seleccionado = true;
    }

    distanciaEntrePuntos(x1, y1, x2, y2){
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    obtenerRecorrido(){
        return this.recorrido;
    }

    obtenerPosicionInicial(){
        return this.posInicial;
    }

    definirRecorrido(recorrido){
        this.recorrido = recorrido;
    }

    hayColisionPunto(x, y){
        let res = false;
        this.recorrido.forEach(punto => {
            let d = this.distanciaEntrePuntos(x, y, punto.x, punto.y);
            if (d < 15){
                res = true;
            }
        })
        return res;
    }

    obtenerPosicionFinal(){
        return this.posFinal;
    }

    obtenerPosicionFinalMov(){
        return this.obtenerPosicionFinal();
    }

    calcularRotacion(){
        let l = this.recorrido.length;
        if (l > 2){
            let r_aux = Math.atan((this.recorrido[l - 2].y - this.recorrido[l - 1].y) / (this.recorrido[l - 2].x - this.recorrido[l - 1].x) ) ;
            if ((this.recorrido[l - 2].x - this.recorrido[l - 1].x) >= 0){
                r_aux += Math.PI
            }
            this.rotacion = r_aux
        }
    }

    esEstaticoReproduccion(){
        return true;
    }
}


class MovimientoLibreView{
    constructor(){
        this.models = [];
        this.tamanoFlecha = 10;
    }

    dibujar(context){
        this.models.forEach(model => {
            let recorrido = model.obtenerRecorrido();
            context.save();
            this.configuracionesDibujo(context, model);
            if (recorrido.length > 0){
                this.dibujarRecorrido(context, model);
            }
            context.restore();
        });
    }

    dibujarRecorrido(context, model){
        context.save();
        context.beginPath();
        let recorrido = model.recorrido;
        context.moveTo(recorrido[0].x, recorrido[0].y);
        recorrido.forEach(punto => {
            context.lineTo(punto.x, punto.y);
        });
        context.strokeStyle = "red";
        context.stroke();
        context.closePath();
        context.restore();
        this.dibujarFlecha(context, model);

    }

    configuracionesDibujo(context, model){
        context.strokeStyle = "red";
        context.fillStyle = "red";
        if (model.seleccionado){
            context.lineWidth = 4;
            context.setLineDash([6,5]);
        }
        else{
            context.lineWidth = 2;
            context.setLineDash([5,3]);
        }
    }

    dibujarFlecha(context, model){
        let l = model.recorrido.length;
        if (l >= 2){
            context.save();
            context.beginPath();
            context.translate(model.recorrido[l - 1].x, model.recorrido[l - 1].y);
            context.rotate(model.rotacion)
            context.moveTo(0, 0);
            context.lineTo(- this.tamanoFlecha, - this.tamanoFlecha);
            context.lineTo(- this.tamanoFlecha, this.tamanoFlecha);
            context.fillStyle = "red";
            context.fill();
            context.closePath();
            context.restore();
        }
    }

    agregarModelo(modelo){
        this.models.push(modelo);
    }
}

class JugadorModel extends Estado{
    /**
     * 
     * @param {Dibujante} fsm - recibe el objeto dibujante para poder comunicarse con el
     */
    constructor(fsm){
        super(fsm);
        this.posicion = null;
        this.radio = null;
        this.dibujando = false;
        this.color = "blue";
        this.seleccionado = true;
        this.acciones = [];
        this.elemento = null;
    }

    mover(pos){
        this.actualizar(pos);
        if (this.acciones.length >0){
            this.acciones[0].definirPosicionInicial(pos);
        }
        if(this.elemento){
            let posElem = this.posicionElemento();
            this.elemento.mover(posElem);
        }
        /*else {
            let bocha = this.fsm.bochaEnPosicion(pos);
            if (bocha){
                this.elemento = bocha
                let posElem = this.posicionElemento();
                this.elemento.mover(posElem);
            }
        }*/

    }

    agregarAccion(accion){
        this.acciones.push(accion)
    }

    entrar(pos) {
        this.posicion = pos;
        this.radio = 25;
      }
    
    actualizar(pos) {
        this.posicion = pos;
      }
  
    mouseDown(pos){
        this.dibujando = true;
        this.entrar(pos);
      }
  
    mouseUp(){
        let pos = this.posicion;
        this.buscarElemento(pos);
        this.salir();
      }
  
    mouseMove(pos){
        if (this.dibujando){
            this.actualizar(pos);
        }
      }
  
    mouseOut(){
        this.salir();
      }
  
    salir(){
        this.dibujando = false;
        this.fsm.terminarDibujo(this);
        // terminar dibujo y avisar al dibujante
      }

    desSeleccionar(){
        this.seleccionado = false
    }

    seleccionar(){
        this.seleccionado = true;
    }

    terminarMover(){
        //this.dibujando = false;
        this.buscarElemento(this.posicion);
    }

    distanciaEntrePuntos(x1, y1, x2, y2){
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    hayColisionPunto(x, y){
        if (this.distanciaEntrePuntos(x, y, this.posicion.x, this.posicion.y) < this.radio){
            return true;
        }
        else{
            return false;
        }
    }

    hayColisionPuntoAccion(x, y){
        let pos = this.obtenerPosicionProxAccion();
        if (this.distanciaEntrePuntos(x, y, pos.x, pos.y) < this.radio){
            return true;
        }
        else{
            return false;
        }
    }

    obtenerPosicion(){
        return this.posicion;
    }

    obtenerPosicionProxAccion(){
        let pos = this.posicion;
        let l = this.acciones.length;
        if (l > 0){
            pos = this.acciones[(l -1)].obtenerPosicionFinalMov();
        }
        return pos;
    }

    agarrarElemento(elem){
        this.elemento = elem;
        return true;
    }

    posicionElemento(){
        let pos = {'x':this.posicion.x, 'y':this.posicion.y};
        pos.y -= this.elemento.radio + this.radio;
        return pos;
    }

    quitarElemento(){
        this.elemento = null;
    }

    buscarElemento(pos){
        let elem = this.fsm.bochaEnPosicion(pos, this.radio);
        if (elem){
            this.agarrarElemento(elem);
            elem.definirPoseedor(this);
            let posElem = this.posicionElemento();
            this.elemento.mover(posElem);
        }
    }

}

/**
 * Al momento de estar dibujando esta clase se crea especificamente para el jugador en cuestion
 * una vex finalizado el primer jugador, el dibujante tendra una de estas clases para almacenar a todos los modelos de jugadores
 */
class JugadorView{
    constructor(){
        this.models = []
    }

    agregarModelo(modelo){
        this.models.push(modelo);
    }

    /**
     * Se dibujan todos los jugadores
     * @param {Canvas context} context - Contexto 2d del canvas sobre el que se va a dibujar
     */
    dibujar(context){
        this.models.forEach(model => {
            if (model.posicion){
                this.dibujarJugador(context, model);
            }
        });
    }

    /**
     * 
     * @param {Canvas context} context - Id del canvas sobre el cual se va a dibujar
     * @param {JugadorModel} model - Jugador que se va a dibujar
     */
    dibujarJugador(context, model){
        let centerX = model.posicion.x;
        let centerY = model.posicion.y;
        let r = model.radio;
        let configs = {color: model.color, seleccionado: model.seleccionado}

        this.dibujarCirculo(context,centerX, centerY, r, configs)
        
    }

}

JugadorView.prototype.dibujarCirculo = dibujarCirculo;

class MovimientoRectoModel extends Estado{
    constructor(fsm, jugador, velocidad){
        super(fsm);
        this.posInicial = null;
        this.posFinal = null;
        this.dibujando = true;
        this.seleccionado = false;
        this.rotacion = 0;
        this.largo = 0;
        this.JugadorMovimiento = jugador;
        this.velocidad = velocidad || 1;
    
    }

    entrar(pos){
        this.posInicial = pos;
    }

    mouseMove(pos){
        if (this.dibujando){
            this.actualizar(pos);
        }
    }

    mouseUp(){
        if (this.dibujando){
            this.salir();
        }
        this.dibujando = false;
    }

    actualizar(pos){
        if (this.dibujando){
            this.definirPosicionFinal(pos)
            this.calcularLargo();
            this.calcularRotacion();
        }
    }

    salir(){
        this.JugadorMovimiento.agregarAccion(this);
        this.fsm.terminarDibujo(this);
    }

    mover(pos){
        this.dibujando = true;
        this.posFinal = pos;
        this.calcularLargo();
        this.calcularRotacion();
    }

    terminarMover(){
        this.dibujando = false;
    }

    obtenerPosicionInicial(){
        return this.posInicial;
    }

    obtenerPosicionFinal(){
        return this.posFinal;
    }

    obtenerPosicionFinalMov(){
        return this.obtenerPosicionFinal();
    }

    obtenerLargo(){
        return this.largo;
    }

    obtenerRotacion(){
        return this.rotacion;
    }

    obtenerVelocidad(){
        let versor = calcularVersor2Puntos(this.posInicial.x, this.posInicial.y, this.posFinal.x, this.posFinal.y)
        let velocidad = {x: versor.x * this.velocidad, y: versor.y * this.velocidad}
        return velocidad
    }

    definirPosicionFinal(pos){
        this.posFinal = pos;
    }

    definirPosicionInicial(pos){
        let posF = this.obtenerPosicionFinalMov();
        this.posInicial = pos;
        this.definirPosicionFinal(posF)
        this.calcularLargo();
        this.calcularRotacion();
    }

    calcularLargo(){
        this.largo = Math.sqrt(Math.pow(this.posInicial.x - this.posFinal.x, 2) + Math.pow(this.posInicial.y - this.posFinal.y, 2));
    }

    calcularRotacion(){
        let r_aux = Math.atan((this.posInicial.y - this.posFinal.y) / (this.posInicial.x - this.posFinal.x) ) ;
        if ((this.posInicial.x - this.posFinal.x) >= 0){
            r_aux += Math.PI
        }
        this.rotacion = r_aux
    }

    desSeleccionar(){
        this.seleccionado = false
    }

    seleccionar(){
        this.seleccionado = true;
    }

    hayColisionPunto(x, y){
        let d = this.calcularDistanciaPunto(x,y, this.posInicial.x, this.posInicial.y, this.posFinal.x, this.posFinal.y);
        return d < 10;
    }

    esEstaticoReproduccion(){
        return true;
    }

}

MovimientoRectoModel.prototype.calcularDistanciaPunto = pDistance;

class MovimientoRectoView{
    constructor(){
        this.models = [];
        this.tamanoFlecha = 10;
    }

    dibujar(context){
        this.models.forEach(model => {
            context.save();
            this.dibujarRecorrido(context, model);
            context.restore();
        });
    }

    configuracionesDibujo(context, model){
        context.strokeStyle = "red";
        context.fillStyle = "red";
        if (model.seleccionado){
            context.setLineDash([6,5]);
            context.lineWidth = 4;
        }
        else{
            context.setLineDash([5,3]);
            context.lineWidth = 2;
        }
    }

    dibujarRecorrido(context, model){
        context.save();
        context.beginPath();
        let posIni = model.obtenerPosicionInicial();
        let rotacion = model.obtenerRotacion();
        let largo = model.obtenerLargo();
        context.translate(posIni.x, posIni.y);
        context.rotate(rotacion);
        this.configuracionesDibujo(context, model);
        context.moveTo(0, 0);
        context.lineTo(largo, 0);
        context.stroke();
        context.moveTo(largo, 0);
        context.lineTo(largo - this.tamanoFlecha, - this.tamanoFlecha);
        context.lineTo(largo - this.tamanoFlecha, this.tamanoFlecha);
        context.fill();
        context.restore();
    }

    agregarModelo(modelo){
        this.models.push(modelo);
    }
}

class Seleccionador extends Estado{
    constructor(fsm){
        super(fsm);
        this.elementoSeleccionado = null;
        this.mover = false;
    }

    mouseDown(pos){
        if (this.elementoSeleccionado){
            this.elementoSeleccionado.desSeleccionar();
            this.elementoSeleccionado = null;
        }
        let elem = this.fsm.buscarColision(pos);
        if (elem){
            this.seleccionar(elem);
            this.mover = true;
        }
      }
    
    mouseMove(pos){
        if (this.mover){
            this.elementoSeleccionado.mover(pos);
        }
    }

    mouseUp(){
        if (this.mover){
            this.mover = false;
            this.elementoSeleccionado.terminarMover();
        }
        
    }

    desSeleccionar(){
        if (this.elementoSeleccionado){
            this.elementoSeleccionado.desSeleccionar();
        }
    }

    seleccionar(elem){
        this.elementoSeleccionado = elem;
        this.elementoSeleccionado.seleccionar();
    }
}

class PaseModel extends MovimientoRectoModel{
    constructor(fms, jugador){
        super(fms, jugador);
    }

    obtenerPosicionFinalMov(){
        return this.obtenerPosicionInicial();
    }
}

class PaseView extends MovimientoRectoView{
    constructor(){
        super();
    }

    configuracionesDibujo(context, model){
        context.strokeStyle = "blue";
        context.fillStyle = "blue";
        if (model.seleccionado){
            context.lineWidth = 4;
            context.setLineDash([]);
        }
        else{
            context.lineWidth = 2;
            context.setLineDash([]);
        }
    }
}

class ConduccionRectaModel extends MovimientoRectoModel{
    constructor(fms, jugador){
        super(fms, jugador);
    }
}

class ConduccionRectaView extends MovimientoRectoView{
    constructor(){
        super();
    }

    configuracionesDibujo(context, model){
        context.strokeStyle = "red";
        context.fillStyle = "red";
        if (model.seleccionado){
            context.lineWidth = 4;
            context.setLineDash([]);
        }
        else{
            context.lineWidth = 2;
            context.setLineDash([]);
        }
    }
}

class ConduccionLibreModel extends MovimientoLibreModel{
    constructor(fms, jugador){
        super(fms, jugador);
    }
}

class ConduccionLibreView extends MovimientoLibreView{
    constructor(){
        super();
    }

    configuracionesDibujo(context, model){
        context.strokeStyle = "red";
        context.fillStyle = "red";
        if (model.seleccionado){
            context.lineWidth = 4;
            context.setLineDash([]);
        }
        else{
            context.lineWidth = 2;
            context.setLineDash([]);
        }
    }
}

class ConoLineaModel extends Estado{
    constructor(fsm){
        super(fsm);
        this.posicionInicial = null;
        this.posicionFinal = null;
        this.altura = 10;
        this.ancho = 10;
        this.dibujando = false;
        this.color = "orange";
        this.seleccionado = true;
        this.separacion = 70;
        this.linea = true;
        this.largo = 0;
        this.posiciones = [];
        this.idPosMovimiento = null;
        this.posicionInicialMovimiento = null;
    }

    entrar(pos){
        this.posicionInicial = pos;
    }

    mover(pos){
        this.dibujando = true;
        if (! this.posicionInicialMovimiento){
            this.posicionInicialMovimiento = pos;
            if(this.distanciaEntrePuntos(pos.x, pos.y, this.posicionInicial.x, (this.posicionInicial.y + this.altura / 2)) < this.altura){
                this.idPosMovimiento = 0;
            }
            else if(this.distanciaEntrePuntos(pos.x, pos.y, this.posicionFinal.x, (this.posicionFinal.y + this.altura / 2)) < this.altura){
                this.idPosMovimiento = this.posiciones.length - 1;
            }
            else{
                this.idPosMovimiento = -1;
            }
        }
        if (this.idPosMovimiento == -1){
            this.moverEnParalelo(pos);
        }
        else if (this.idPosMovimiento == 0){
            this.posicionInicial = pos;
        }
        else{
            this.posicionFinal = pos;
        }
    }

    moverEnParalelo(pos){
        let deltaX = pos.x - this.posicionInicialMovimiento.x;
        let deltaY = pos.y - this.posicionInicialMovimiento.y;
        this.posicionInicialMovimiento = pos;
        this.posicionInicial.x += deltaX;
        this.posicionInicial.y += deltaY;
        this.posicionFinal.x += deltaX;
        this.posicionFinal.y += deltaY;
    }

    terminarMover(){
        this.dibujar = false;
        this.idPosMovimiento = null;
        this.posicionInicialMovimiento = null;
    }

    mouseMove(pos){
        if (this.dibujando){
            pos = this.obtenerVerticeCono(pos);
            this.actualizar(pos);
        }
    }

    mouseUp(){
        if (this.dibujando){
            this.salir();
        }
        this.dibujando = false;
    }

    mouseDown(pos){
        this.dibujando = true
        pos = this.obtenerVerticeCono(pos);
        this.entrar(pos);
    }

    actualizar(pos){
        if (this.dibujando){
            this.definirPosicionFinal(pos);
            this.calcularLargo();
        }
    }

    calcularPendiente(x1, y1, x2, y2){
        return (y2 - y1) / (x2 - x1);
    }

    obtenerPendiente(){
        return this.calcularPendiente(this.posicionInicial.x, this.posicionInicial.y, this.posicionFinal.x, this.posicionFinal.y);
    }

    calcularOrdenadaAlOrigen(pendiente, x, y){
        return y - pendiente * x;
    }

    calcularPosicionEnY(pendiente, ordenadaOrigen, x){
        return pendiente * x + ordenadaOrigen;
    }


    salir(){
        this.fsm.terminarDibujo(this);
    }

    obtenerVerticeCono(pos){
        let nuevaPos = {'x':pos.x, 'y':pos.y - (this.altura/2)};
        return nuevaPos
    }

    obtenerConos(){
        if (this.posicionInicial){
            if (this.linea){
                return this.generarPosiciones()
            }
            else{
                return [this.posicionInicial]
            }
        }
        else {
            return [];
        }
    }

    definirPosicionFinal(pos){
        this.posicionFinal = pos;
    }

    calcularLargo(){
        this.largo = Math.sqrt(Math.pow(this.posicionInicial.x - this.posicionFinal.x, 2) + Math.pow(this.posicionInicial.y - this.posicionFinal.y, 2));
    }

    generarPosiciones(){
        let posiciones =  [this.posicionInicial]
        if (this.posicionFinal){
            let pend = this.obtenerPendiente();
            let ordOrig = this.calcularOrdenadaAlOrigen(pend, this.posicionInicial.x, this.posicionInicial.y);
            this.calcularLargo();
            let x = this.posicionInicial.x;
            let y = this.posicionInicial.y;
            let n = Math.floor(this.largo / this.separacion);
            let deltaX = (this.posicionFinal.x - this.posicionInicial.x) / n;
            let deltaY = (this.posicionFinal.y - this.posicionInicial.y) / n;
            for (let i =0; i < n; i++){
                x += deltaX;
                if (this.posicionInicial.x == this.posicionFinal.x){
                    y += deltaY
                }
                else{
                    y = this.calcularPosicionEnY(pend, ordOrig, x)
                }
                posiciones.push({'x':x, 'y':y})
            }
            posiciones.push(this.posicionFinal);
            
        }
        this.posiciones = posiciones;
        return posiciones;
    }

    obtenerAlto(){
        return this.altura;
    }

    obtenerAncho(){
        return this.ancho;
    }

    obtenerColor(){
        return this.color
    }

    seleccionar(){
        this.seleccionado = true;
    }

    desSeleccionar(){
        this.seleccionado = false;
    }

    hayColisionPunto(x, y){
        let hayColision = false;
        this.posiciones.forEach(cono =>{
            if( this.distanciaEntrePuntos(x, y, cono.x, (cono.y + this.altura / 2)) < this.altura){
                hayColision = true
            }
        })
        return hayColision;
    }

    distanciaEntrePuntos(x1, y1, x2, y2){
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }
}

class ConoView{
    constructor(){
        this.models = [];
    }

    dibujar(context){
        this.models.forEach(cono => {
            this.dibujarConos(context, cono);
        })
    }

    agregarModelo(modelo){
        this.models.push(modelo);
    }

    dibujarConos(context, model){
        let posiciones = model.obtenerConos();
        posiciones.forEach(pos =>{
            let alto = model.obtenerAlto();
            let ancho = model.obtenerAncho();
            let color = model.obtenerColor();
            let gruesoLinea = 2
            if (model.seleccionado){
                gruesoLinea = 4;
            }
            this.dibujarCono(context, alto, ancho, pos, color, gruesoLinea);
        })
    }

    dibujarCono(context, alto, ancho, pos, color, gruesoLinea){
        context.save();
        context.beginPath();
        context.translate(pos.x, pos.y);
        context.moveTo(0,0);
        context.lineTo(-ancho, alto);
        context.lineTo(ancho, alto);
        context.lineTo(0, 0);
        context.lineWidth = gruesoLinea;
        context.fillStyle = color;
        context.strokeStyle = 'white';
        context.fill();
        context.stroke();
        context.closePath();
        context.restore();
    }
}

class BochaModel extends Estado{
    constructor(fsm){
        super(fsm);
        this.color = "yellow";
        this.radio = 8;
        this.posicion = null;
        this.poseedor = null;
        this.agarrable = true;
        this.seleccionado = false;
        this. dibujando =  true;
        this.estaticoReproduccion = false;
    }

    entrar(pos) {
        if (this.dibujando){
            this.posicion = pos;
        }
    }

    seleccionar(){
        if (this.poseedor){
            this.poseedor.quitarElemento();
            this.poseedor = null;
        }
    }

    actualizar() {
        throw new Error("Metodo 'actualizar()' debe ser implementado.");
    }

    mouseDown(pos){
        this.entrar(pos);
    }

    mouseUp(){
        let pos = this.posicion;
        this.buscarPoseedor(pos);
        this.salir();
    }

    buscarPoseedor(pos){
        let jug = this.fsm.jugadorEnPosicion(pos);
        if (jug){
            let agarrado = jug.agarrarElemento(this);
            if (agarrado){
                this.definirPoseedor(jug);
                this.posicion = jug.posicionElemento();
            }
        }
    }

    definirPoseedor(jug){
        this.poseedor = jug;
    }

    mover(pos){
        this.dibujando = true;
        this.posicion = pos;
    }

    terminarMover(){
        this.dibujando = false;
        this.buscarPoseedor(this.posicion);
    }

    mouseMove(pos){
        if (this.dibujando){
            this.posicion = pos;
        }
    }

    mouseOut(){}

    salir(){
        if (this.dibujando){
            this.dibujando = false;
        }
        this.fsm.terminarDibujo(this);
    }

    hayColisionPunto(x, y, d=0){
        if (d < this.radio){
            d = this.radio
        }
        if (this.distanciaEntrePuntos(x, y, this.posicion.x, this.posicion.y) < d){
            return true;
        }
        else{
            return false;
        }
    }

    distanciaEntrePuntos(x1, y1, x2, y2){
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    esEstaticoReproduccion(){
        return this.estaticoReproduccion;
    }

    
}


class BochaView{
    constructor(){
        this.models = []
    }

    agregarModelo(modelo){
        this.models.push(modelo);
    }

    dibujar(context){
        this.models.forEach(model => {
            if (model.posicion){
                this.dibujarBocha(context, model);
            }
        });
    }

    dibujarBocha(context, model){
        context.save();
        context.beginPath();
        context.arc(model.posicion.x, model.posicion.y, model.radio, 0, 2 * Math.PI);
        context.fillStyle = model.color;
        context.fill();

        // contorno
        context.strokeStyle = 'white';
        if (model.seleccionado){  
            context.setLineDash([5,3]);
            context.lineWidth = 4; 
        }
        else{
            context.setLineDash([]); 
        }
        context.stroke();
        context.closePath();
        context.restore();
    }

}


    
