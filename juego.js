class Dibujante{
    /**
     * La siguiente clase es encargada de crear todos los elementos de un ejercicio.
     * Posee los listeners de interacciones del usuario con el canvas (click, move).
     * @param {*} idCanvas 
     */
    constructor(idCanvas){
        this.canvas = document.getElementById(idCanvas);
        this.canvas.addEventListener('mousedown', this.eventClick.bind(this));
        this.canvas.addEventListener('mousemove', this.eventMove.bind(this));
        this.canvas.addEventListener('mouseup', this.eventUp.bind(this));
        this.context = this.canvas.getContext("2d");
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.escenaActual = 0;
        this.elementosEscenas = {'0':[]};
        this.jugadores = [];
        this.seleccionador = new Seleccionador(this);
        this.listaCambiosIdx = -1;
        this.listaCambios = [];

        this.mouseX = 0;
        this.mouseY = 0;

        this.models = [];
        this.renders = [];
        this.currentView = null;      
    }


    buscarRendererClass(classType){
        let idx = -1;
        for (let i in this.renders){
            if (this.renders[i].constructor === classType){
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

    terminarDibujo(modelo){
        this.agregarModeloPorClase(modelo); // Se agrega el modelo a la lista de modelos
        let idx = this.buscarRendererClass(this.currentView.constructor);
        if (idx == -1){
            // si no existe un render para esta clase, asigno el recien creado
            this.renders.push(this.currentView)
        }
        else{
            this.renders[idx].agregarModelo(modelo)
        }
        this.currentView = null;
        this.escuchando = this.seleccionador;
        this.escuchando.seleccionar(modelo)
    }

    getMousePos(canvas, evt) {
        let rect = canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
            y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
        };
    }

    eventClick(event){
        let pos = this.getMousePos(this.canvas, event);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        if(this.escuchando){
            this.escuchando.mouseDown(pos);
        }
        this.dibujando = false;
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
        this.definirEscuchando(new MovimientoLibreModel(this, jugSeleccionado));
        this.currentView = new MovimientoLibreView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoPase(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        let pase = new PaseModel(this, jugSeleccionado)
        pase.entrar(jugSeleccionado.obtenerPosicionProxAccion());
        this.definirEscuchando(pase);
        this.currentView = new PaseView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoConduccionRecta(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        let pase = new ConduccionRectaModel(this, jugSeleccionado)
        pase.entrar(jugSeleccionado.obtenerPosicionProxAccion());
        this.definirEscuchando(pase);
        this.currentView = new ConduccionRectaView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoConduccionLibre(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        this.models.forEach(elem => {elem.desSeleccionar()});
        this.definirEscuchando(new ConduccionLibreModel(this, jugSeleccionado));
        this.currentView = new ConduccionLibreView();
        this.currentView.agregarModelo(this.escuchando);
    }

    comenzarDibujoJugador(){
        this.models.forEach(elem => {elem.desSeleccionar()}) // Si hay elementos seleccionados los des selecciono
        this.definirEscuchando(new JugadorModel(this)); 
        this.currentView = new JugadorView();
        this.currentView.agregarModelo(this.escuchando)
    }

    comenzarDibujoBocha(){
        this.models.forEach(elem => {elem.desSeleccionar()})
        this.definirEscuchando(new BochaModel(this));
        this.currentView = new BochaView();
        this.currentView.agregarModelo(this.escuchando)
    }

    comenzarDibujoConos(){
        this.models.forEach(elem => {elem.desSeleccionar()})
        this.definirEscuchando(new ConoLineaModel(this));
        this.currentView = new ConoView();
        this.currentView.agregarModelo(this.escuchando)
    }

    comenzarDibujoMovimientoRecto(){
        let jugSeleccionado = this.escuchando.elementoSeleccionado;
        let movRecto = new MovimientoRectoModel(this, jugSeleccionado);
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
        let entidad = this.listaCambios[this.listaCambiosIdx];
        entidad.deshacer();
        this.listaCambiosIdx --;
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
        this.listaCambiosIdx ++;
        let entidad = this.listaCambios[this.listaCambiosIdx]
        entidad.rehacer();
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
        
    }

    crearModeloReproduccion(mod){
        if(mod instanceof JugadorModel){
            //console.log("creacion jugador ", new ReproducirMovimientoJugador(mod, this))
            return new ReproducirMovimientoJugador(mod, this);
        }
        if(mod instanceof BochaModel){
            //console.log("creacion bocha", new ReproducirMovimientoBocha(mod, this))
            return new ReproducirMovimientoBocha(mod, this);
        }
    }

    reproducirEjercicio(){
        let modelosDibujar = this.dibujante.recolectarElementos();
        this.modelosEstaticos = modelosDibujar.estaticos;
        this.modelosDinamicos = modelosDibujar.dinamicos;
        let dinIni = []
        this.modelosDinamicos.forEach(elem => {
            let j = this.crearModeloReproduccion(elem)
            j.entrar();
            dinIni.push(j);
        })
        this.modelosDinamicos = dinIni;
        this.modelosDinamicos.forEach(elem =>{
            elem.actualizarReferenciasReproduccion()
        })
        this.frame()
    }

    dibujarEstaticos(context){

    }

    dibujarDinamicos(elapsed, context){
        this.modelosDinamicos.forEach(j => {
            if (elapsed > 0){
                j.actualizar(elapsed);
                
                //
                let l = [];
                this.modelosDinamicos.forEach(md => {
                    if(md.getActividad()){
                        l.push(md)
                    }
                })
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

var dibujanteEstatico = new Dibujante("creacionEntrenamiento"); // Se crea el dibujante con el correspondiente canvas
dibujanteEstatico.actualizarPizarra(); // Comienza el loop del dibujo de ejercicio
var juego = new Entrenamiento("visorEntrenamiento", dibujanteEstatico)


function run(){
    
    juego.reproducirEjercicio();
}

    

