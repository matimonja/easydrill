Cómo probarlo localmente:
Asegúrate de estar en la raíz del proyecto.
Ejecuta npm run dev.
Esto levantará Vite en localhost:5173 (o similar) y el Server en localhost:3000.
Abre la aplicación.
Crea una escena con un Pase largo y un jugador que corre a recibirlo (haz que el pase sea largo y la carrera corta para forzar una desincronización natural).
En el menú de reproducción (abajo), activa el switch "AI Opt".
Dale a Play.
Deberías ver el spinner momentáneamente ("Calculando...").
El jugador debería esperar o correr más lento automáticamente para llegar justo cuando llega la bocha.