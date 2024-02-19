class ControladorBarra{
    constructor(){
        this.menuEdicion = document.getElementById("cont-menu-edicion");
        this.menuReproduccion = document.getElementById("cont-menu-reproduccion");
        this.menuAcciones = document.getElementById("cont-acciones");
        this.menuConfigs = document.getElementById("cont-configs");
        this.canvasEdicion = document.getElementById("cont-canvas-creacion");
        this.canvasReproduccion = document.getElementById("cont-canvas-reproduccion");
    }

    habilitarElemento(elem){
        elem.style.display = '';
    }h

    deshabilitarElemento(elem){
        elem.style.display = 'none';
    }

    deshabilitarCanvasReproduccion(){
        this.deshabilitarElemento(this.canvasReproduccion);
    }

    habilitarCanvasReproduccion(){
        this.habilitarElemento(this.canvasReproduccion);
    }

    deshabilitarCanvasEdicion(){
        this.deshabilitarElemento(this.canvasEdicion);
    }

    habilitarCanvasEdicion(){
        this.habilitarElemento(this.canvasEdicion);
    }

    habilitarMenuReproduccion(){
        this.habilitarElemento(this.menuReproduccion);
    }

    deshabilitarMenuReproduccion(){
        this.deshabilitarElemento(this.menuReproduccion);
    }

    habilitarMenuConfigs(){
        this.habilitarElemento(this.menuConfigs);
    }

    deshabilitarMenuConfigs(){
        this.deshabilitarElemento(this.menuConfigs);
    }

    habilitarMenuAcciones(){
        this.habilitarElemento(this.menuAcciones);
    }

    deshabilitarMenuAcciones(){
        this.deshabilitarElemento(this.menuAcciones);
    }

    habilitarMenuEdicion(){
        this.habilitarElemento(this.menuEdicion);
    }

    deshabilitarMenuEdicion(){
        this.deshabilitarElemento(this.menuEdicion);
    }

    inicializarCreacionEjercicio(){
        this.deshabilitarMenuAcciones();
        this.deshabilitarMenuConfigs();
        this.deshabilitarCanvasReproduccion();
        this.deshabilitarMenuReproduccion();
    }

    cambiarEdicion(){
        this.deshabilitarCanvasReproduccion();
        this.deshabilitarMenuReproduccion();
        this.habilitarCanvasEdicion();
        this.habilitarMenuEdicion();
    }

    cambiarReproduccion(){
        this.deshabilitarCanvasEdicion();
        this.deshabilitarMenuEdicion();
        this.habilitarCanvasReproduccion();
        this.habilitarMenuReproduccion();
    }

    habilitarMenuJugador(){
        this.habilitarMenuAcciones();
        this.habilitarMenuConfigs();
    }

    deshabilitarMenuJugador(){
        this.deshabilitarMenuAcciones();
        this.deshabilitarMenuConfigs();
    }
}

class Dibujante{
    /**
     * La siguiente clase es encargada de crear todos los elementos de un ejercicio.
     * Posee los listeners de interacciones del usuario con el canvas (click, move).
     * @param {*} idCanvas 
     */
    constructor(idCanvas, controladorMenu){
        this.canvas = document.getElementById(idCanvas);
        this.canvas.addEventListener('mousedown', this.eventClick.bind(this));
        this.canvas.addEventListener('touchstart', this.eventClick.bind(this));
        this.canvas.addEventListener('mousemove', this.eventMove.bind(this));
        this.canvas.addEventListener('touchmove', this.eventMove.bind(this));
        this.canvas.addEventListener('mouseup', this.eventUp.bind(this));
        this.canvas.addEventListener('touchend', this.eventUp.bind(this));
        this.context = this.canvas.getContext("2d");
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.controladorMenu = controladorMenu;
        this.escenaActual = 0;
        this.elementosEscenas = {'0':[]};
        this.jugadores = [];
        this.seleccionador = new Seleccionador(this);
        this.listaCambiosIdx = -1;
        this.listaCambios = [];
        this.ultimoId = -1;

        this.mouseX = 0;
        this.mouseY = 0;

        this.models = [];
        this.renders = [];
        this.currentView = null;      
    }

    getProximoId(){
        return ++ this.ultimoId;
    }

    borrarElemento(elem){
        this.removerModelo(elem.getId());
    }


    buscarRendererClass(classType){
        let idx = -1;
        for (let i in this.renders){
            if (this.renders[i].constructor.name === classType){
                return i;
            }
        }
        return idx;
    }

    agregarModeloPorClase(modelo){
        this.models.push(modelo);
        if (modelo instanceof JugadorModel){
            this.jugadores.push(modelo);
        }
    }

    removerModelo(id){
        let idx = this.models.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            let dibujoRemovido = this.models.splice(idx, 1)[0];
            if(dibujoRemovido instanceof JugadorModel){
                this.removerJugador(id);
            }
            this.removerDibujoRender(id, dibujoRemovido.getClaseRender())
        }
    }

    removerJugador(id){
        let idx = this.jugadores.findIndex(e => {return e.getId() == id});
        if(idx >= 0){
            this.jugadores.splice(idx, 1);
        }
    }

    removerDibujoRender(id, nombreClase){
        let idx = this.buscarRendererClass(nombreClase);
        if(idx >= 0){
            this.renders[idx].removerModelo(id);
        }

    }

    recrearModelo(modelo){
        let clase = modelo.getClaseRender();
        this.agregarModeloPorClase(modelo);
        this.agregarModeloRender(modelo, clase);
    }

    terminarDibujo(modelo){
        this.agregarModeloPorClase(modelo); // Se agrega el modelo a la lista de modelos
        this.agregarModeloRender(modelo, this.currentView.constructor.name);
        this.currentView = null;
        this.escuchando = this.seleccionador;
        this.escuchando.seleccionar(modelo)
    }

    agregarModeloRender(modelo, clase){
        let idx = this.buscarRendererClass(clase);
        if (idx == -1){
            // si no existe un render para esta clase, asigno el recien creado
            this.renders.push(this.currentView);
        }
        else{
            this.renders[idx].agregarModelo(modelo);
        }
    }

    getMousePos(canvas, evt) {
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

    eventClick(event){
        let pos = this.getMousePos(this.canvas, event);
        console.log(pos)
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        if(this.escuchando){
            this.escuchando.mouseDown(pos);
        }
        this.dibujando = false;
    }

    cambiarVelocidad(vel){
        this.seleccionador.cambiarVelocidad(vel);
    }

    cambiarColor(color){
        this.seleccionador.cambiarColor(color);
    }

    eventMove(event){
        let pos = this.getMousePos(this.canvas, event);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        if (this.escuchando){
            this.escuchando.mouseMove(pos);
        }
    }

    eventUp(){
        if (this.moviendo){
            this.moviendo = false;
            this.accionUsuario = 'btn-seleccionar';
        }

        if (this.escuchando){
            this.escuchando.mouseUp();
        }
        
    }

    setAccionUsuario(elem){
        this.accionUsuario = elem.id;
        this.quitarSeleccion();
    }


    agregarJugador(jug){
        this.jugadores.push(jug);
    }

    /**
     * Se define el modelo del elemento que va a reaccionar a las acciones del usuario
     * @param {Estado} objeto - Subclase de Estado (JugadorModel, etc)
     */
    definirEscuchando(objeto){
        this.escuchando = objeto;
    }

    jugadorEnPosicion(pos){
        let colis = null
        colis = this.buscarColisionesJugadores(pos.x, pos.y);
        return colis[0];
    }

    buscarColisionesJugadores(mouseX, mouseY){
        let colisiones = [];
        this.jugadores.reverse().forEach(elem => {
            let res = elem.hayColisionPunto(mouseX, mouseY);
            if (res) {
                colisiones.push(elem)
            }
        })
        return colisiones
    }

    buscarColisionesClase(x, y, clase, radio=0){
        let colisiones = [];
        this.models.reverse().forEach(elem => {
            let res = false;
            if (elem.constructor.name == clase){
                res = elem.hayColisionPunto(x, y, radio);
            }
            if (res){
                colisiones.push(elem);
            }
        })
        return colisiones
    }

    bochaEnPosicion(pos, radio){
        let colis = null;
        colis = this.buscarColisionesClase(pos.x, pos.y, 'BochaModel', radio);
        return colis[0];
    }

    buscarColision(pos){
        let colisiones = [];
        this.models.forEach(model => {
            let res = model.hayColisionPunto(pos.x, pos.y)
            if (res){
                colisiones.push(model)
            }
        })
        return colisiones[0]
    }

    comenzarDibujoLibre(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        let id = this.getProximoId();
        this.definirEscuchando(new MovimientoLibreModel(this, id, jugSeleccionado));
        this.currentView = new MovimientoLibreView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoPase(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        let id = this.getProximoId();
        let pase = new PaseModel(this, id, jugSeleccionado)
        pase.entrar(jugSeleccionado.obtenerPosicionProxAccion());
        this.definirEscuchando(pase);
        this.currentView = new PaseView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoConduccionRecta(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        let id = this.getProximoId();
        let pase = new ConduccionRectaModel(this, id, jugSeleccionado)
        pase.entrar(jugSeleccionado.obtenerPosicionProxAccion());
        this.definirEscuchando(pase);
        this.currentView = new ConduccionRectaView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoConduccionLibre(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        let id = this.getProximoId();
        this.definirEscuchando(new ConduccionLibreModel(this, id, jugSeleccionado));
        this.currentView = new ConduccionLibreView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoJugador(){
        this.models.forEach(elem => {elem.desSeleccionar()}) // Si hay elementos seleccionados los des selecciono
        let id = this.getProximoId();
        this.definirEscuchando(new JugadorModel(this, id)); 
        this.currentView = new JugadorView();
        this.currentView.agregarModelo(this.escuchando)
    }

    comenzarDibujoBocha(){
        this.models.forEach(elem => {elem.desSeleccionar()})
        let id = this.getProximoId();
        this.definirEscuchando(new BochaModel(this, id));
        this.currentView = new BochaView();
        this.currentView.agregarModelo(this.escuchando)
    }

    comenzarDibujoConos(){
        this.models.forEach(elem => {elem.desSeleccionar()})
        let id = this.getProximoId();
        this.definirEscuchando(new ConoLineaModel(this, id));
        this.currentView = new ConoView();
        this.currentView.agregarModelo(this.escuchando)
    }

    comenzarDibujoMovimientoRecto(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        let id = this.getProximoId();
        let movRecto = new MovimientoRectoModel(this, id, jugSeleccionado);
        this.models.forEach(elem => {elem.desSeleccionar()});
        movRecto.entrar(jugSeleccionado.obtenerPosicionProxAccion());
        this.definirEscuchando(movRecto);
        this.currentView = new MovimientoRectoView();
        this.currentView.agregarModelo(this.escuchando);
    }

    seleccionarElemento(){
        this.models.forEach(elem => {elem.desSeleccionar()})
        this.escuchando = this.seleccionador
    }

    recolectarElementos(){
        let estaticos = [];
        let dinamicos = [];
        this.models.forEach(elem => {
            if (elem.esVisibleReproduccion()){
                if (elem.esEstaticoReproduccion()){
                    estaticos.push(elem)
                }
                else{
                    dinamicos.push(elem)
                }
            }
        })
        let result = {estaticos: estaticos, dinamicos: dinamicos};
        return result;
    }

    actualizarPizarra(timestamp){
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight); // En cada frame se dibuja partiendo de un canvas vacio
        if (!this.previous) this.previous = timestamp;

        if (this.currentView){
            this.currentView.dibujar(this.context);
        }

        if (this.renders.length > 0){
            this.renders.forEach(render =>{
                render.dibujar(this.context);
            })
        }

        window.requestAnimationFrame(this.actualizarPizarra.bind(this));
    }

    deshacer(){
        if(this.listaCambiosIdx >= 0){
            let entidad = this.listaCambios[this.listaCambiosIdx];
            entidad.deshacer();
            this.listaCambiosIdx --;
        }
    }

    agregarCambio(cambio){
        // si agrego un cambio elimino todos los elementos posteriores al idx actual
        let cantidadBorrar = this.listaCambios.length -1 - this.listaCambiosIdx;
        this.listaCambios.splice((this.listaCambiosIdx + 1), cantidadBorrar);
        //agrego el cambio como ultimo elemento
        this.listaCambios.push(cambio);
        this.listaCambiosIdx ++;
    }

    rehacer(){
        if(this.listaCambiosIdx < (this.listaCambios.length - 1)){
            this.listaCambiosIdx ++;
            let entidad = this.listaCambios[this.listaCambiosIdx]
            entidad.rehacer();
        }
    }

    borrar(){
        this.seleccionador.borrar();
    }

    activarMenuJugador(){
        this.controladorMenu.habilitarMenuJugador();
    }

    desActivarMenuJugador(){
        this.controladorMenu.deshabilitarMenuJugador();
    }
}


class Entrenamiento{
    constructor(idCanvas, dibujante){
        this.canvas = document.getElementById(idCanvas);
        this.context = this.canvas.getContext("2d");
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.dibujante = dibujante;
        this.modelos = [];
        this.viewsEstaticas = new Map();
        
    }

    crearModeloReproduccion(mod){
        if(mod instanceof JugadorModel){
            return new ReproducirMovimientoJugador(mod, this);
        }
        if(mod instanceof BochaModel){
            return new ReproducirMovimientoBocha(mod, this);
        }
    }

    reproducirEjercicio(){
        let modelosDibujar = this.dibujante.recolectarElementos();
        this.modelosEstaticos = modelosDibujar.estaticos;
        this.modelosDinamicos = modelosDibujar.dinamicos;
        let dinIni = [];
        this.modelosDinamicos.forEach(elem => {
            let j = this.crearModeloReproduccion(elem);
            j.entrar();
            dinIni.push(j);
        })
        this.modelosDinamicos = dinIni;
        this.modelosDinamicos.forEach(elem =>{
            elem.actualizarReferenciasReproduccion();
        })
        this.crearViewsEstaticas();
        this.frame();
    }

    crearViewsEstaticas(){
        this.modelosEstaticos.forEach(mod =>{
            //para cada modelo buscar si existe un render
            if(this.viewsEstaticas.has(mod.constructor.name)){
                let view = this.viewsEstaticas.get(mod.constructor.name);
                view.agregarModelo(mod);
            }
            else{
                let newView = this.crearViewModelo(mod.constructor.name);
                newView.agregarModelo(mod);
                this.viewsEstaticas.set(mod.constructor.name, newView);
            }
        })
    }

    crearViewModelo(claseModelo){
        if(claseModelo == 'ConoLineaModel'){
            return new ConoView();
        }
    }

    buscarRendererClass(classType){
        let idx = -1;
        for (let i in this.renders){
            if (this.renders[i].constructor.name === classType){
                return i;
            }
        }
        return idx;
    }

    dibujarEstaticos(context){
        this.viewsEstaticas.forEach((val, key) => {
            val.dibujar(context);
        })
    }

    agregarModeloRender(modelo, clase){
        let idx = this.buscarRendererClass(clase);
        if (idx == -1){
            // si no existe un render para esta clase, asigno el recien creado
            let view = this.crearRenderClase(clase, modelo);
            this.renders.push(this.currentView);
        }
        else{
            this.renders[idx].agregarModelo(modelo);
        }
    }

    dibujarDinamicos(elapsed, context){
        this.modelosDinamicos.forEach(j => {
            if (elapsed > 0){
                j.actualizar(elapsed);
                
                //
                //let l = [];
                //this.modelosDinamicos.forEach(md => {
                //    if(md.getActividad()){
                //        l.push(md)
                //    }
                //})
                let colision = this.buscarColision(j);
                if (colision){
                    this.resolverColision(j, colision);
                }
                j.dibujar(context);
            }
        })
    }

    resolverColision(obj1, obj2){
        let listaClases = [];
        listaClases.push(obj1.constructor.name);
        listaClases.push(obj2.constructor.name);
        if((listaClases.includes("ReproducirMovimientoJugador")) & (listaClases.includes("ReproducirMovimientoBocha"))){
            this.resolverColisionBochaJugador(obj1, obj2);
        }
    }

    resolverColisionBochaJugador(obj1, obj2){
        if(obj1 instanceof ReproducirMovimientoJugador){
            obj1.setElementoActual(obj2);
            obj2.setPoseedor(obj1)
        }
        else{
            obj2.setElementoActual(obj1);
            obj1.setPoseedor(obj2)
        }
    }

    buscarColision(din){
        if(din.getActividad()){
            // si no tiene actividad busco colisiones
            let colisiones = [];
            this.modelosDinamicos.forEach(md => {
                if((! (md === din)) & (md.getActividad())){
                    // si no es el mismo objeto
                    let res = din.hayColisionPunto(md.getPosicionActual().x, md.getPosicionActual().y);
                    if (res){
                        colisiones.push(md);
                    }
                }
            })
            return colisiones[0];
        }
    }

    frame(timestamp){
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        if (!this.previous) this.previous = timestamp;
        var elapsed = timestamp - this.previous;
        this.dibujarEstaticos(this.context);
        this.dibujarDinamicos(elapsed, this.context);
        this.previous = timestamp;
        window.requestAnimationFrame(this.frame.bind(this));
    }
}

var ctrl_menu = new ControladorBarra();
ctrl_menu.inicializarCreacionEjercicio();
var dibujanteEstatico = new Dibujante("creacionEntrenamiento", ctrl_menu); // Se crea el dibujante con el correspondiente canvas
dibujanteEstatico.actualizarPizarra(); // Comienza el loop del dibujo de ejercicio
var juego = new Entrenamiento("visorEntrenamiento", dibujanteEstatico);

var canvas = document.getElementById("creacionEntrenamiento")
canvas.style="";  // remove CSS scaling
//canvas.width = document.body.clientWidth * 0.9;
//canvas.height = document.body.clientHeight;


function run(){
    
    juego.reproducirEjercicio();
}

    

