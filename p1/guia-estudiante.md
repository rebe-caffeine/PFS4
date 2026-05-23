## Guia Estudiante - Three WebXR (260523)

Esta guia explica el proyecto **sin entrar al codigo** para que puedas usarlo en la sesion practica.

## 1) Estructura de archivos que debes conocer

- `index.html`: pagina principal, solo carga interfaz y scripts.
- `js/world-config.js`: **archivo principal para personalizar tu mundo**.
- `js/main-interaccion.js`: logica del motor (locomocion, XR, mision, HUD).
- `models/`: carpeta para tus modelos 3D.

## 2) Flujo general del proyecto

1. Se carga `world-config.js`.
2. `main-interaccion.js` crea sala, camara y controles.
3. Se carga el modelo 3D principal (`worldModel.url`).
4. Se crean objetos de mision:
   - orbes coleccionables,
   - boton,
   - puerta.
5. En cada frame se actualiza:
   - movimiento (desktop o VR),
   - interacciones,
   - estado de mision,
   - HUD y panel de zonas.

## 3) Controles de uso

### Desktop
- `W/A/S/D`: mover.
- `Shift`: correr.
- `T`: activar/desactivar teleport.
- `E`: interactuar cerca (orbes, boton, puerta).
- `R`: reiniciar mision.

### VR
- Stick izquierdo: locomocion.
- Stick derecho: snap turn.
- `X/Y` (segun runtime): toggle teleport.
- Trigger/Grip: interactuar.

## 4) Que puedes cambiar sin romper nada

Editar solo `js/world-config.js`:

- `meta.worldName`: nombre de tu experiencia.
- `spawnPoint`: donde aparece el usuario.
- `worldModel.url`: modelo 3D principal.
- `collectibles`: cuantos orbes hay y donde.
- `button` y `door`: mecanismo de objetivo final.
- `interactionZones`: textos por zona para narrativa.

## 5) Relacion entre bloques internos (conceptual)

- **Parametros globales**: leen la configuracion.
- **Inicializacion**: crea escena y activa loop.
- **Entorno/modelo**: construye el mundo visual.
- **Input/XR**: conecta teclado, mouse y visores.
- **Locomocion/colision**: evita salir de sala o atravesar obstaculos.
- **Interaccion/mision**: aplica reglas de gameplay.
- **HUD/confort**: muestra estado y mejora experiencia de uso.

## 6) Importar modelos 3D al proyecto

### Formato recomendado

- Usa **GLB** (`.glb`) porque es un solo archivo con malla, materiales y texturas.

### Exportar desde Blender (recomendado)

1. En Blender, revisa escala y orientacion de tu escena.
2. Selecciona modelo(s) a exportar.
3. `File > Export > glTF 2.0`.
4. Formato: **glTF Binary (.glb)**.
5. Opciones sugeridas:
   - Include: `Selected Objects` (si aplica).
   - Transform: aplica transformaciones (si tu flujo lo requiere).
   - Geometry: normal export.
   - Materials: habilitado.
6. Exporta el archivo en `models/`.

### Conectar el modelo en proyecto

1. Copia tu archivo a `models/`, por ejemplo `models/mi_mundo.glb`.
2. En `js/world-config.js`, cambia:
   - `worldModel.url: './models/mi_mundo.glb'`
3. Ajusta:
   - `worldModel.autoScaleTo`
   - `worldModel.centerToFloor`
   - `worldModel.offset`

## 7) Checklist rapido para entrega

- [ ] El mundo carga sin errores de consola.
- [ ] El modelo se ve con escala correcta.
- [ ] El spawn inicia en lugar adecuado.
- [ ] Se pueden recolectar orbes.
- [ ] El boton abre la puerta solo al completar objetivo.
- [ ] El panel de zonas cambia texto al entrar.
- [ ] Funciona en desktop y en VR.

## 8) Errores comunes

- Modelo no aparece: ruta incorrecta en `worldModel.url`.
- Modelo gigante/mini: ajustar `autoScaleTo`.
- Modelo flotando o hundido: ajustar `centerToFloor` y `offset.y`.
- Interacciones lejos: revisar posiciones de orbes/boton/puerta.
