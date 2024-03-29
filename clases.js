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
        this.elementoActual = elem;
    }

    getElementoActual(){
        return this.elementoActual;
    }

    quitarElementoActual(){
        this.setElementoActual(null);
    }

    removerAccionActual(){
        this.setAccionActual(null);
    }

    setAccionActual(acc){
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

    constructor(fsm, id) {
        if (this.constructor == Estado) {
            throw new Error("Clase abstracta no puede ser instanciada");
        }
        this.fsm = fsm;
        this.id = id;
        this.estaticoReproduccion = false;
        this.visibleReproduccion = true;
        this.objetoReproductor = null;
        this.restauradorActual = [];
        this.restauradores = [];
        this.restauradoresIdx = -1;
        this.ultimoIdRestaurador = -1;
    }

    getId(){
        return this.id;
    }

    getProximoIdRestaurador(){
        return ++ this.ultimoIdRestaurador;
    }

    getClaseRender(){
        throw new Error("Metodo 'getClaseRender()' debe ser implementado.");
    }

    getJuego(){
        return this.fsm;
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

    removerRestauradorActual(id){
        let idx = this.restauradorActual.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.restauradorActual.splice(idx, 1);
        }
    }

    agregarRestaurador(){
        this.restauradorActual.forEach(res =>{
            if(! res.hayCambio()){
                this.removerRestauradorActual(res.getId());
            }
        })
        if(this.restauradorActual.length > 0){
            // si agrego un cambio elimino todos los elementos posteriores al idx actual
            let cantidadBorrar = this.restauradores.length -1 - this.restauradoresIdx;
            this.restauradores.splice((this.restauradoresIdx + 1), cantidadBorrar);
            this.restauradores.push(this.restauradorActual);
            this.restauradoresIdx ++;
            if(this.restauradorActual.length > 0){
                this.fsm.agregarCambio(this);
            }
            this.restauradorActual = [];
        }
    }

    deshacer(){
        let entidades = this.restauradores[this.restauradoresIdx];
        entidades.forEach(rest => {
            rest.deshacer();
        });
        this.restauradoresIdx --;
    }

    rehacer(){
        this.restauradoresIdx ++;
        let entidades = this.restauradores[this.restauradoresIdx];
        entidades.slice().reverse().forEach(rest => {
            rest.rehacer();
        });
    }

    setRestauradorActual(rest){
        this.restauradorActual.push(rest);
    }

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

    terminarRestauradores(){
        if(this.restauradorActual.length > 0){
            this.restauradorActual.forEach(rest => {
                rest.setEstadoPosterior();
            });
        }    
    }

    borrar(){
        let id = this.getProximoIdRestaurador();
        this.setRestauradorActual(new RestauradorDeEstadoBorrar(this, id));
        this.agregarRestaurador();
        this.fsm.borrarElemento(this);
    }
}

class MovimientoLibreModel extends Estado{
    constructor(fsm, id, jugador, velocidad){
        super(fsm, id);
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
        this.proximaAccion = null;
        this.visibleReproduccion = false;
    }

    cambiarVelocidad(vel){
        this.velocidad = vel * 0.001;
    }

    getClaseRender(){
        return "MovimientoLibreView";
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
        this.getProximoIdRestaurador();
        let id = this.JugadorMovimiento.getProximoIdRestaurador();
        this.JugadorMovimiento.setRestauradorActual(new RestauradorDeEstadoCreacion(this, id));
        this.JugadorMovimiento.agregarRestaurador();
    }

    setProximaAccion(acc){
        this.proximaAccion = acc;
    }

    getProximaAccion(){
        return this.proximaAccion;
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

    borrar(){
        this.JugadorMovimiento.borrarAccion(this);
    }

}


class MovimientoLibreView{
    constructor(){
        this.models = [];
        this.tamanoFlecha = 10;
    }

    removerModelo(id){
        let idx = this.models.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.models.splice(idx, 1);
        }
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
    constructor(fsm, id){
        super(fsm, id)
        this.posicion = null;
        this.radio = 25;
        this.dibujando = false;
        this.color = "blue";
        this.seleccionado = true;
        this.acciones = [];
        this.elemento = null;
        this.restauradorActual = [];
        this.restauradores = [];
        this.restauradoresIdx = -1;
    }

    cambiarColor(color){
        this.color = color;
    }

    getClaseRender(){
        return "JugadorView";
    }

    mover(pos){
        this.actualizar(pos);
        if (this.acciones.length >0){
            this.cambiarPosicionAccionInicial(pos);
        }
        if(this.elemento){
            this.actualizarPosicionElemento();
        }
    }

    cambiarPosicionAccionInicial(pos){
        this.acciones[0].definirPosicionInicial(pos);
    }

    actualizarPosicionElemento(){
        let posElem = this.posicionElemento();
        this.elemento.mover(posElem);
    }

    agregarAccion(accion){
        if(this.acciones.length > 0){
            this.acciones[(this.acciones.length -1)].setProximaAccion(accion);
        }
        this.acciones.push(accion);
        
    }

    entrar(pos) {
        this.posicion = pos;
        //this.radio = 25;
      }

    setPosicion(pos){
        this.posicion = pos;
    }
    
    actualizar(pos) {
        this.setPosicion(pos);
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
        let id = this.getProximoIdRestaurador();
        this.setRestauradorActual(new RestauradorDeEstadoCreacion(this, id));
        this.agregarRestaurador();
        // terminar dibujo y avisar al dibujante
      }

    desSeleccionar(){
        this.seleccionado = false;
        this.fsm.desActivarMenuJugador();
    }

    seleccionar(){
        this.seleccionado = true;
        this.fsm.activarMenuJugador();
    }

    terminarMover(){
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

    getPosicion(){
        return this.posicion;
    }

    getElemento(){
        return this.elemento;
    }

    obtenerPosicionProxAccion(){
        let pos = this.posicion;
        let l = this.acciones.length;
        if (l > 0){
            pos = this.acciones[(l -1)].obtenerPosicionFinalMov();
        }
        return pos;
    }

    setElemento(elem){
        this.elemento = elem;
    }

    agarrarElemento(elem){
        //
        this.setElemento(elem);
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
            let id = this.getProximoIdRestaurador();
            this.restauradorActual.push(new RestauradorDeEstadoAgarrarBocha(this, elem, id));
            this.agarrarElemento(elem);
            elem.definirPoseedor(this);
            let posElem = this.posicionElemento();
            this.elemento.mover(posElem);
        }
    }

    setRestauradorActual(rest){
        this.restauradorActual.push(rest);
    }

    agregarRestaurador(){
        // si agrego un cambio elimino todos los elementos posteriores al idx actual
        let cantidadBorrar = this.restauradores.length -1 - this.restauradoresIdx;
        this.restauradores.splice((this.restauradoresIdx + 1), cantidadBorrar);
        this.restauradorActual = this.restauradorActual.filter((rest) => {return rest.hayCambio();});
        if(this.restauradorActual.length > 0){
            this.restauradores.push(this.restauradorActual);
            this.restauradoresIdx ++;
        }
        if(this.restauradorActual.length > 0){
            this.fsm.agregarCambio(this);
        }
        this.restauradorActual = [];
    }

    deshacer(){
        let entidades = this.restauradores[this.restauradoresIdx];
        entidades.forEach(rest => {
            rest.deshacer();
        });
        this.restauradoresIdx --;
    }

    rehacer(){
        this.restauradoresIdx ++;
        let entidades = this.restauradores[this.restauradoresIdx];
        entidades.slice().reverse().forEach(rest => {
            rest.rehacer();
        });
    }

    tieneAcciones(){
        return this.acciones.length > 0;
    }

    borrarAccion(accion){
        let id = accion.getId();
        let idx = this.acciones.findIndex(e => {return e.getId() == id});
        let cantidadBorrar = this.acciones.length - idx;
        this.borrarAccionesDesde(idx, cantidadBorrar);
        this.agregarRestaurador();


        this.acciones.splice(idx, cantidadBorrar);

    }

    borrarAccionesDesde(idx, cantidadBorrar){
        let accionesBorrar = this.acciones.slice().splice(idx, cantidadBorrar);
        accionesBorrar.forEach(acc => {
            let id = this.getProximoIdRestaurador();
            this.setRestauradorActual(new RestauradorDeEstadoBorrar(acc, id));
            this.fsm.borrarElemento(acc);
        })
    }

    borrar(){
        if(this.acciones.length > 0){
            this.borrarAccionesDesde(0, this.acciones.length);
        }
        // sacar posecion bocha
        if(this.elemento){
            let id = this.getProximoIdRestaurador();
            this.setRestauradorActual(new RestauradorDeEstadoBorrar(this.elemento, id));
            this.fsm.borrarElemento(this.elemento);
            //this.quitarElemento();
        }
        super.borrar();
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

    removerModelo(id){
        let idx = this.models.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.models.splice(idx, 1);
        }
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
    constructor(fsm, id, jugador, velocidad){
        super(fsm, id);
        this.posInicial = null;
        this.posFinal = null;
        this.dibujando = true;
        this.seleccionado = false;
        this.rotacion = 0;
        this.largo = 0;
        this.JugadorMovimiento = jugador;
        this.velocidad = velocidad || 1;
        this.proximaAccion = null;
        this.visibleReproduccion = false;
    
    }

    cambiarVelocidad(vel){
        this.velocidad = vel * 0.01;
    }

    getClaseRender(){
        return "MovimientoRectoView";
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
            this.setPosicionFinal(pos)
            this.calcularLargo();
            this.calcularRotacion();
        }
    }

    salir(){
        this.JugadorMovimiento.agregarAccion(this);
        this.fsm.terminarDibujo(this);
        let id = this.JugadorMovimiento.getProximoIdRestaurador();
        this.JugadorMovimiento.setRestauradorActual(new RestauradorDeEstadoCreacion(this, id));
        this.JugadorMovimiento.agregarRestaurador();
    }

    mover(pos){
        this.dibujando = true;
        this.setPosicionFinal(pos);
        this.calcularLargo();
        this.calcularRotacion();
    }

    terminarMover(){
        this.dibujando = false;
        this.actualizarProximaAccion();
    }

    actualizarProximaAccion(){
        if(this.proximaAccion){
            this.proximaAccion.definirPosicionInicial(this.obtenerPosicionFinalMov());
        }
    }

    setProximaAccion(acc){
        this.proximaAccion = acc;
    }

    getProximaAccion(){
        return this.proximaAccion;
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
        this.setPosicionFinal(pos);
    }

    setPosicionFinal(pos){
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

    borrar(){
        this.JugadorMovimiento.borrarAccion(this);
    }

}

MovimientoRectoModel.prototype.calcularDistanciaPunto = pDistance;

class MovimientoRectoView{
    constructor(){
        this.models = [];
        this.tamanoFlecha = 10;
    }

    removerModelo(id){
        let idx = this.models.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.models.splice(idx, 1);
        }
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
        this.huboMovimiento = false;
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
            this.elementoSeleccionado.setRestauradorActual(this.construirRestaurador());
        }
    }
    
    construirRestaurador(){
        if(this.elementoSeleccionado instanceof JugadorModel){
            let id = this.elementoSeleccionado.getProximoIdRestaurador();
            return new RestauradorDeEstadoMovimientoJugador(this.elementoSeleccionado, id);
        }
        if(this.elementoSeleccionado instanceof BochaModel){
            let id = this.elementoSeleccionado.getProximoIdRestaurador();
            return new RestauradorDeEstadoMovimientoBocha(this.elementoSeleccionado, id);
        }
        if(this.elementoSeleccionado instanceof ConoLineaModel){
            let id = this.elementoSeleccionado.getProximoIdRestaurador();
            return new RestauradorDeEstadoMovimientoCono(this.elementoSeleccionado, id);
        }
        if(this.elementoSeleccionado instanceof MovimientoRectoModel){
            let id = this.elementoSeleccionado.getProximoIdRestaurador();
            return new RestauradorDeEstadoPosicionFinalAccion(this.elementoSeleccionado, id);
        }
        return null;
        
    }

    cambiarVelocidad(vel){
        this.elementoSeleccionado.cambiarVelocidad(vel);
    }

    cambiarColor(color){
        this.elementoSeleccionado.cambiarColor(color);
    }

    activarMovimiento(){
        this.huboMovimiento = true;
    }

    desactivarMovimiento(){
        this.huboMovimiento = false;
    }

    getHuboMovimiento(){
        return this.huboMovimiento;
    }
    
    mouseMove(pos){
        if (this.mover){
            this.elementoSeleccionado.mover(pos);
            this.activarMovimiento();
        }
    }

    mouseUp(){
        if (this.mover){
            this.mover = false;
            this.elementoSeleccionado.terminarMover();
            this.elementoSeleccionado.terminarRestauradores();
            //if(this.getHuboMovimiento()){
            this.elementoSeleccionado.agregarRestaurador();
            //}
            this.desactivarMovimiento();
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

    borrar(){
        this.elementoSeleccionado.borrar();
    }
}

class PaseModel extends MovimientoRectoModel{
    constructor(fsm, id, jugador){
        super(fsm, id, jugador);
    }

    getClaseRender(){
        return "PaseView" ;
    }

    obtenerPosicionFinalMov(){
        return this.obtenerPosicionInicial();
    }

    definirPosicionInicial(pos){
        let posF = this.obtenerPosicionFinal();
        this.posInicial = pos;
        this.definirPosicionFinal(posF)
        this.calcularLargo();
        this.calcularRotacion();
        if(this.proximaAccion){
            this.proximaAccion.definirPosicionInicial(this.obtenerPosicionFinalMov());
        }
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
    constructor(fsm, id, jugador){
        super(fsm, id, jugador);
    }

    getClaseRender(){
        return "ConduccionRectaView";
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
    constructor(fsm, id, jugador){
        super(fsm, id, jugador);
    }

    getClaseRender(){
        return "ConduccionLibreView";
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
    constructor(fsm, id){
        super(fsm, id);
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
        this.estaticoReproduccion = true;
    }

    getClaseRender(){
        return "ConoView";
    }

    entrar(pos){
        this.setPosicionInicial(pos);
    }

    setPosicionInicial(pos){
        this.posicionInicial = pos;
    }

    getPosicionInicial(){
        return this.posicionInicial;
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
            this.setPosicionInicial(pos);
        }
        else{
            this.posicionFinal = pos;
        }
    }

    esLinea(){
        return this.posiciones.length > 1;
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
            this.setPosicionFinal(pos);
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
        let id = this.getProximoIdRestaurador();
        this.setRestauradorActual(new RestauradorDeEstadoCreacion(this, id));
        this.agregarRestaurador();
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

    setPosicionFinal(pos){
        this.posicionFinal = pos;
    }

    getPosicionFinal(){
        if(! this.posicionFinal){
            return {x:null, y:null}
        }
        return this.posicionFinal;
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

    removerModelo(id){
        let idx = this.models.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.models.splice(idx, 1);
        }
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
    constructor(fsm, id){
        super(fsm, id);
        this.color = "yellow";
        this.radio = 8;
        this.posicion = null;
        this.poseedor = null;
        this.agarrable = true;
        this.seleccionado = false;
        this. dibujando =  true;
        this.estaticoReproduccion = false;
        this.restauradorActual = [];
        this.restauradores = [];
        this.restauradoresIdx = -1;
    }

    getClaseRender(){
        return "BochaView";
    }

    entrar(pos) {
        if (this.dibujando){
            this.posicion = pos;
        }
    }

    seleccionar(){
        this.seleccionado = true;
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
                let id = this.getProximoIdRestaurador();
                this.restauradorActual.push(new RestauradorDeEstadoDefinirPoseedor(this, jug, id));
                this.definirPoseedor(jug);
                this.posicion = jug.posicionElemento();
            }
        }
    }

    getPosicion(){
        return this.posicion;
    }

    definirPoseedor(jug){
        this.poseedor = jug;
    }

    getPoseedor(){
        return this.poseedor;
    }

    setPosicion(pos){
        this.posicion = pos;
    }

    mover(pos){
        this.dibujando = true;
        this.setPosicion(pos);
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
        let id = this.getProximoIdRestaurador();
        this.setRestauradorActual(new RestauradorDeEstadoCreacion(this, id));
        this.agregarRestaurador();
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

    removerModelo(id){
        let idx = this.models.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.models.splice(idx, 1);
        }
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

class RestauradorDeEstado{
    constructor(entidad, id){
        if (this.constructor == RestauradorDeEstado){
            throw new Error("Clase abstracta no puede ser instanciada");
        }

        this.entidad = entidad;
        this.estadoPrevio = null;
        this.estadoPosterior = null;
        this.id = id;
    }

    hayCambio(){
        throw new Error("Metodo 'hayCambio()' debe ser implementado.");
    }

    removerReferencias(){
        throw new Error("Metodo 'removerReferencias()' debe ser implementado.");
    }

    setEstadoPrevio(){
        throw new Error("Metodo 'setEstadoPrevio()' debe ser implementado.");
    }

    setEstadoPosterior(){
        throw new Error("Metodo 'setEstadoPosterior()' debe ser implementado.");
    }

    deshacer(){
        this.entidad.setPosicion(this.estadoPrevio.posicionActual);
    }

    rehacer(){
        this.entidad.setPosicion(this.estadoPosterior.posicionActual);
    }

    getId(){
        return this.id;
    }


}

class RestauradorDeEstadoMovimientoJugador extends RestauradorDeEstado{
    constructor(entidad){
        super(entidad);
        this.setEstadoPrevio()
    }
    // las coliciones con elementos se realizan con el mouse up, por lo cual deberia revisar la posecion de elementos

    setEstadoPrevio(){
        let posicionPrevia = {x:null, y:null};
        let elementoPrevio = null;
        posicionPrevia.x = this.entidad.getPosicion().x;
        posicionPrevia.y = this.entidad.getPosicion().y;
        this.estadoPrevio = {posicionActual: posicionPrevia};
    }

    setEstadoPosterior(){
        let posicionPosterior = {x:null, y:null};
        posicionPosterior.x = this.entidad.getPosicion().x;
        posicionPosterior.y = this.entidad.getPosicion().y;
        this.estadoPosterior = {posicionActual: posicionPosterior};
    }

    hayCambio(){
        let condition = ((this.estadoPrevio.posicionActual.x != this.estadoPosterior.posicionActual.x) || 
        (this.estadoPrevio.posicionActual.y != this.estadoPosterior.posicionActual.y));
        return condition;
    }

    deshacer(){
        this.entidad.setPosicion(this.estadoPrevio.posicionActual);
        if(this.entidad.getElemento()){
            this.entidad.actualizarPosicionElemento();
        }
        if(this.entidad.tieneAcciones()){
            this.entidad.cambiarPosicionAccionInicial(this.estadoPrevio.posicionActual);
        }
    }

    rehacer(){
        this.entidad.setPosicion(this.estadoPosterior.posicionActual);
        if(this.entidad.getElemento()){
            this.entidad.actualizarPosicionElemento();
        }
        if(this.entidad.tieneAcciones()){
            this.entidad.cambiarPosicionAccionInicial(this.estadoPosterior.posicionActual);
        }
    }
}

class RestauradorDeEstadoMovimientoBocha extends RestauradorDeEstado{
    constructor(entidad){
        super(entidad);
        this.setEstadoPrevio();
    }
    // las coliciones con elementos se realizan con el mouse up, por lo cual deberia revisar la posecion de elementos

    setEstadoPrevio(){
        let posicionPrevia = {x:null, y:null};
        posicionPrevia.x = this.entidad.getPosicion().x;
        posicionPrevia.y = this.entidad.getPosicion().y;
        this.estadoPrevio = {posicionActual: posicionPrevia};
    }

    setEstadoPosterior(){
        let posicionPosterior = {x:null, y:null};
        posicionPosterior.x = this.entidad.getPosicion().x;
        posicionPosterior.y = this.entidad.getPosicion().y;
        this.estadoPosterior = {posicionActual: posicionPosterior};
    }

    deshacer(){
        this.entidad.setPosicion(this.estadoPrevio.posicionActual);
    }

    rehacer(){
        this.entidad.setPosicion(this.estadoPosterior.posicionActual);
    }

    hayCambio(){
        let condition = ((this.estadoPrevio.posicionActual.x != this.estadoPosterior.posicionActual.x) || 
        (this.estadoPrevio.posicionActual.y != this.estadoPosterior.posicionActual.y));
        return condition;
    }
}

class RestauradorDeEstadoMovimientoCono extends RestauradorDeEstado{
    constructor(entidad){
        super(entidad);
        this.setEstadoPrevio();
    }

    setEstadoPrevio(){
        let posicionInicialPrevia = {x:null, y:null};
        let posicionFinalPrevia = null;
        posicionInicialPrevia.x = this.entidad.getPosicionInicial().x;
        posicionInicialPrevia.y = this.entidad.getPosicionInicial().y;
        if(this.entidad.esLinea()){
            posicionFinalPrevia = {x:null, y:null};
            posicionFinalPrevia.x = this.entidad.getPosicionFinal().x;
            posicionFinalPrevia.y = this.entidad.getPosicionFinal().y;
        }
        this.estadoPrevio = {posicionInicial: posicionInicialPrevia, 
            posicionFinal:posicionFinalPrevia};
    }

    setEstadoPosterior(){
        let posicionInicialPosterior = {x:null, y:null};
        let posicionFinalPosterior = null;
        posicionInicialPosterior.x = this.entidad.getPosicionInicial().x;
        posicionInicialPosterior.y = this.entidad.getPosicionInicial().y;
        if(this.entidad.esLinea()){
            posicionFinalPosterior = {x:null, y:null};
            posicionFinalPosterior.x = this.entidad.getPosicionFinal().x;
            posicionFinalPosterior.y = this.entidad.getPosicionFinal().y;
        }
        
        this.estadoPosterior = {posicionInicial: posicionInicialPosterior, posicionFinal:posicionFinalPosterior};
    }

    deshacer(){
        this.entidad.setPosicionInicial(this.estadoPrevio.posicionInicial);
        this.entidad.setPosicionFinal(this.estadoPrevio.posicionFinal);
    }

    rehacer(){
        this.entidad.setPosicionInicial(this.estadoPosterior.posicionInicial);
        this.entidad.setPosicionFinal(this.estadoPosterior.posicionFinal);
    }

    hayCambio(){
        let condition = ((this.estadoPrevio.posicionInicial.x != this.estadoPosterior.posicionInicial.x) || 
        (this.estadoPrevio.posicionInicial.y != this.estadoPosterior.posicionInicial.y) ||
        (this.estadoPrevio.posicionFinal.x != this.estadoPosterior.posicionFinal.x) || 
        (this.estadoPrevio.posicionFinal.y != this.estadoPosterior.posicionFinal.y));
        return condition;
    }
}

class RestauradorDeEstadoAgarrarBocha extends RestauradorDeEstado{
    constructor(entidad, bocha){
        //Se encarga de mover la bocha a su posicion antes y despues de de la posesion
        //Tambien cambia el poseedor de la bocha y el elemento del jugador
        super(entidad);
        this.bocha = bocha;
        this.setEstadoPrevio()
    }

    setEstadoPrevio(){
        let posicionBochaPrevia = {x:null, y:null};
        posicionBochaPrevia.x = this.bocha.getPosicion().x;
        posicionBochaPrevia.y = this.bocha.getPosicion().y;
        this.estadoPrevio = {posicionActual: posicionBochaPrevia};
    }

    setEstadoPosterior(){
        let posicionBochaPosterior = {x:null, y:null};
        posicionBochaPosterior.x = this.bocha.getPosicion().x;
        posicionBochaPosterior.y = this.bocha.getPosicion().y;
        this.estadoPosterior = {posicionActual: posicionBochaPosterior, elementoActual:this.bocha};
    }

    deshacer(){
        //bocha a posicion anterior
        this.bocha.setPosicion(this.estadoPrevio.posicionActual);
        //bocha sin poseedor
        this.bocha.definirPoseedor(null);
        //jugador sin bocha
        this.entidad.setElemento(null);
    }

    rehacer(){
        //bocha a posicion posterior
        this.bocha.setPosicion(this.estadoPosterior.posicionActual);
        //bocha sin poseedor
        this.bocha.definirPoseedor(this.entidad);
        //jugador sin bocha
        this.entidad.setElemento(this.bocha);
    }

    hayCambio(){
        return true;
    }

}

class RestauradorDeEstadoDefinirPoseedor extends RestauradorDeEstado{
    constructor(entidad, jugador){
        //Se encarga de mover la bocha a su posicion antes y despues de de la posesion
        //Tambien cambia el poseedor de la bocha y el elemento del jugador
        super(entidad);
        this.jugador = jugador;
        this.setEstadoPrevio()
    }

    setEstadoPrevio(){
        let posicionBochaPrevia = {x:null, y:null};
        posicionBochaPrevia.x = this.jugador.getPosicion().x;
        posicionBochaPrevia.y = this.jugador.getPosicion().y;
        this.estadoPrevio = {posicionActual: posicionBochaPrevia};
    }

    setEstadoPosterior(){
        let posicionBochaPosterior = {x:null, y:null};
        posicionBochaPosterior.x = this.jugador.getPosicion().x;
        posicionBochaPosterior.y = this.jugador.getPosicion().y;
        this.estadoPosterior = {posicionActual: posicionBochaPosterior, elementoActual:this.bocha};
    }

    deshacer(){
        //bocha a posicion anterior
        this.jugador.setPosicion(this.estadoPrevio.posicionActual);
        //bocha sin poseedor
        this.jugador.setElemento(null);
        //jugador sin bocha
        this.entidad.definirPoseedor(null);
    }

    rehacer(){
        //bocha a posicion posterior
        this.entidad.setPosicion(this.estadoPosterior.posicionActual);
        //bocha sin poseedor
        this.entidad.definirPoseedor(this.jugador);
        //jugador sin bocha
        this.jugador.setElemento(this.entidad);  
    }

    hayCambio(){
        return true;
    }

}

class RestauradorDeEstadoPosicionFinalAccion extends RestauradorDeEstado{
    constructor(entidad, id){
        super(entidad);
        this.setEstadoPrevio();
        this.id = id;
    }

    hayCambio(){
        let condition = ((this.estadoPrevio.posicionFinal.x != this.estadoPosterior.posicionFinal.x) || 
        (this.estadoPrevio.posicionFinal.y != this.estadoPosterior.posicionFinal.y));
        return condition;
    }

    removerReferencias(){
        throw new Error("Metodo 'removerReferencias()' debe ser implementado.");
    }

    setEstadoPrevio(){
        let posicionFinalPrevia = {x:null, y:null};
        posicionFinalPrevia.x = this.entidad.obtenerPosicionFinal().x;
        posicionFinalPrevia.y = this.entidad.obtenerPosicionFinal().y;
        this.estadoPrevio = {posicionFinal: posicionFinalPrevia};
    }

    setEstadoPosterior(){
        let posicionFinalPosterior = {x:null, y:null};
        posicionFinalPosterior.x = this.entidad.obtenerPosicionFinal().x;
        posicionFinalPosterior.y = this.entidad.obtenerPosicionFinal().y;
        this.estadoPosterior = {posicionFinal: posicionFinalPosterior};
    }

    deshacer(){
        this.entidad.mover(this.estadoPrevio.posicionFinal);
        this.entidad.actualizarProximaAccion();
    }

    rehacer(){
        this.entidad.mover(this.estadoPosterior.posicionFinal);
        this.entidad.actualizarProximaAccion();
    }


}

class RestauradorDeEstadoCreacion extends RestauradorDeEstado{
    constructor(entidad){
        super(entidad)
        this.juego = this.entidad.getJuego();
    }

    hayCambio(){
        return true;
    }

    removerReferencias(){
        throw new Error("Metodo 'removerReferencias()' debe ser implementado.");
    }

    deshacer(){
        this.juego.removerModelo(this.entidad.getId());
    }

    rehacer(){
        this.juego.recrearModelo(this.entidad);
    }


}

class RestauradorDeEstadoBorrar extends RestauradorDeEstadoCreacion{
    constructor(entidad){
        super(entidad)
    }

    deshacer(){
        this.juego.recrearModelo(this.entidad);
        this.recrearAccion();
        //this.recrearPosesionBocha();
    }

    rehacer(){
        this.juego.removerModelo(this.entidad.getId());
    }

    recrearAccion(){
        let claseAcciones = ["MovimientoLibreModel", "MovimientoRectoModel", "PaseModel", "ConduccionLibreModel", "ConduccionRectaModel"]
        if(claseAcciones.includes(this.entidad.constructor.name)){
            this.entidad.JugadorMovimiento.agregarAccion(this.entidad);
        }
    }

}


    
