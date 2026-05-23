# Guia de arranque del Proyecto Integrador (desde plantilla 260523)

Esta guia esta pensada para que empieces hoy mismo tu primera version del proyecto usando la base que ya funciona en VR.

## 1) Que carpeta usar y que NO tocar al inicio

- Base disponible: `260523/three-webxr` y `260523/babylon-webxr`.
- Recomendacion: cada equipo elige un motor (Three o Babylon) y trabaja sobre su carpeta.
- En la primera sesion, modifica solo `js/world-config.js`.
- Evita tocar `js/main-interaccion.js` al principio para no romper locomocion, XR o colisiones.

## 2) Objetivo de la primera version (hoy)

Tu version 1 debe tener, como minimo:

1. Nombre de experiencia y autor del equipo.
2. Modelo 3D propio cargado en escena.
3. Spawn correcto (inicio del usuario en lugar logico).
4. Mision funcionando (orbes + boton + puerta).
5. Zonas narrativas con textos de tu tematica.
6. Prueba funcional en desktop y prueba inicial en VR.

## 3) Paso a paso de modificacion (orden recomendado)

## Paso 0 - Publica temprano y valida desde enlace

Tu flujo principal sera por enlace publicado (no por localhost), para probar igual que en entrega final.

### Opcion A: GitHub Pages (recomendada)

1. Crea repo nuevo para tu equipo (ejemplo: `p3d-equipo3-three` o `p3d-equipo3-babylon`).
2. Sube el contenido completo de la carpeta elegida (`three-webxr` o `babylon-webxr`).
3. En GitHub: `Settings > Pages`.
4. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Espera que GitHub genere la URL publica.

### Opcion B: Netlify (alternativa)

1. Conecta el repo en Netlify.
2. Publica como sitio estatico sin build complejo.
3. Usa la URL de Netlify para pruebas.

### Validacion de enlace

1. Abre la URL en navegador de escritorio.
2. Abre la misma URL en navegador de Meta Quest 3/3s.
3. Si no tienes visor en ese momento, usa `Immersive Web Emulator` en Chrome para validar flujo XR basico.

### Mini flujo con Immersive Web Emulator

1. Instala extension `Immersive Web Emulator` en Chrome.
2. Abre la URL publicada del proyecto.
3. Activa emulacion WebXR desde la extension.
4. Selecciona un perfil de visor y controladores.
5. Ejecuta `Enter VR` para verificar botones, HUD y flujo de mision.

Nota: el emulador sirve para validacion rapida de desarrollo, pero la prueba final siempre debe hacerse en Quest.

## Paso 1 - Define tema y objetivo jugable

Antes de editar, define en 3 lineas:

- Tema (ejemplo: museo, laboratorio, santuario, fabrica, base espacial).
- Objetivo (que debe lograr el usuario).
- Cierre (como sabra que termino).

## Paso 2 - Cambios minimos en world-config.js

### Si usas Three.js

Archivo: `three-webxr/js/world-config.js`

Cambiar primero:

- `meta.worldName`
- `meta.author`
- `spawnPoint`
- `worldModel.url`
- `interactionZones` (titulos y mensajes)

### Si usas Babylon.js

Archivo: `babylon-webxr/js/world-config.js`

Cambiar primero:

- `meta.worldName`
- `meta.author`
- `spawnPoint`
- `worldModel.rootPath` y `worldModel.fileName`
- `interactionZones` (titulos y mensajes)
- Si joystick va invertido en VR: `movement.vrAxisForwardSign` y `movement.vrAxisStrafeSign`

## Paso 3 - Ajusta juego y recorrido

En `world-config.js` de tu motor:

- `objectives.requiredCollectibles`: define dificultad (3 a 5 recomendado).
- `collectibles`: reubica orbes en puntos de interes del recorrido.
- `button`: ubicalo cerca de zona final.
- `door`: ubicala como cierre de experiencia.
- `obstacles`: protege zonas para evitar atravesar objetos clave.

Regla practica: todo lo interactivo debe quedar entre 0.4 y 1.6 en eje Y para que sea comodo.

## Paso 4 - Ajusta escala del mundo

Si el modelo queda gigante o pequeno:

- Cambia `worldModel.autoScaleTo` (rango sugerido 1.2 a 4.0).
- Si el modelo flota/hunde: ajusta `worldModel.offset.y`.
- Si queda descentrado: ajusta `worldModel.offset.x` y `worldModel.offset.z`.

## 4) Rutas de complejidad recomendadas (anti frustracion)

Empieza simple, valida que funciona, y luego sube complejidad.

### Ruta A - V1 minima (dia 1)

- 1 archivo `GLB` principal.
- 1 entorno sencillo + 1 objeto interactivo propio.
- Triangulos sugeridos: 10k a 60k total.
- 1 a 3 materiales maximo.
- Texturas `1024` maximo en V1.

Objetivo: confirmar carga, escala, navegacion e interaccion sin errores.

### Ruta B - V1.5 estable (dia 2)

- Mantener entorno y sumar props.
- Ajustar narrativa de zonas.
- Incluir segundo modelo propio visible y coherente.
- Triangulos sugeridos: 60k a 120k total.

Objetivo: mejorar direccion visual sin romper rendimiento.

### Ruta C - V2 avanzada (despues de validar V1)

- Escena mas detallada.
- Animacion propia relevante.
- Interaccion extra (palanca, llave, panel, etc.).
- Texturas 2K solo en elementos clave.

Objetivo: pulido para entrega final.

## 5) Exportacion desde Blender (detallada)

## A. Preparacion antes de exportar

1. Organiza la escena por colecciones (Entorno, Props, Interactivos).
2. Nombra objetos y materiales de forma clara (`env_sala`, `obj_puerta`, etc.).
3. Aplica transformaciones: `Ctrl + A > Rotation & Scale`.
4. Verifica UVs (sin UV correcta no se veran bien las texturas).
5. Revisa normales hacia afuera (no invertidas).
6. Si usaste nodos procedurales, hornea texturas antes de exportar.

## B. Materiales para evitar problemas

- Usa flujo PBR basico (Base Color, Roughness, Metallic, Normal).
- Evita nodos complejos no compatibles con glTF.
- Si hay transparencias, revisa alpha en material antes de exportar.

## C. Exportar a GLB (menu y opciones)

Ruta: `File > Export > glTF 2.0 (.glb/.gltf)`

Opciones sugeridas para V1:

- Format: `glTF Binary (.glb)`
- Include: `Selected Objects` (si exportas solo parte de la escena)
- Transform: mantener valores por defecto del exportador
- Geometry:
  - `Apply Modifiers`: ON
  - `UVs`: ON
  - `Normals`: ON
  - `Tangents`: ON si usas normal map
- Materials: ON
- Images: Automatic
- Animation:
  - OFF si tu V1 no usa animacion
  - ON solo si ya tienes animacion probada
- Compression (Draco): OFF en V1 para evitar errores iniciales

## D. Ruta de archivo recomendada en proyecto

1. Copia el archivo exportado a `models/`.
2. Usa nombres simples y sin espacios, por ejemplo:
   - `models/mi_escena_v1.glb`
   - `models/mi_objeto_clave.glb`
3. Conecta el modelo en `world-config.js`.

Recomendacion fuerte: en V1 usa un solo `.glb` principal. Cuando todo funcione, divide por modulos si hace falta.

## 6) Exportacion desde Maya (detallada)

## A. Preparacion antes de exportar

1. Limpia escena: `Delete History`, `Freeze Transforms`, `Center Pivot`.
2. Revisa UVs por objeto.
3. Renombra materiales y objetos de forma clara.
4. Evita shaders muy complejos; pasa a PBR basico.

## B. Exportar a GLB

Dependiendo del plugin instalado:

- Ruta comun: `File > Export Selection` (o `Export All`) y elegir formato glTF.
- Si usas exportador Khronos/Babylon glTF, selecciona `.glb` binario.

Opciones sugeridas V1:

- Binary glTF (`.glb`)
- Embed/Include resources: ON
- Triangulate: ON
- Bake animation: OFF (si no animas aun)
- Up Axis: Y
- Units coherentes con metros

## C. Ruta de archivo recomendada

1. Exporta con nombre simple: `mi_escena_v1.glb`.
2. Copia en carpeta `models/` del motor elegido.
3. Ajusta escala final desde `worldModel.autoScaleTo`.

## 7) Texturas y materiales (reglas practicas)

- Potencias de 2: `512`, `1024`, `2048`.
- V1 recomendada: mayormente `1024`.
- `JPG` para BaseColor sin alpha.
- `PNG` para transparencias.
- No mezclar demasiadas texturas 4K en Quest.
- Mantener estilo visual coherente entre entorno y objetos.

## 8) Diseno de escena y entorno (desde la plantilla)

Tu escena debe sentirse intencional, no solo "modelo suelto".

Checklist de entorno:

- Inicio claro: donde aparece el usuario (`spawnPoint`).
- Recorrido: 2 o 3 zonas con mensajes en `interactionZones`.
- Meta jugable: recolecta + activa + abre.
- Cierre claro: puerta final, mensaje final o area final.
- Espacio navegable: evita bloquear completamente el movimiento.

## 9) Snippets de referencia rapida

### Three - cambio de modelo

```js
worldModel: {
  url: './models/mi_escena_v1.glb',
  autoScaleTo: 2.2,
  centerToFloor: true,
  offset: { x: 0, y: 0, z: 0 }
}
```

### Babylon - cambio de modelo

```js
worldModel: {
  rootPath: './models/',
  fileName: 'mi_escena_v1.glb',
  autoScaleTo: 2.2,
  centerToFloor: true,
  offset: { x: 0, y: 0, z: 0 }
}
```

## 10) Entrega de hoy (primera version)

Debes cerrar la clase con:

- Enlace publicado activo (GitHub Pages o Netlify).
- Proyecto abre sin errores en desktop.
- Modelo propio cargado y bien escalado.
- Mision base funcionando (orbes, boton, puerta).
- Zonas narrativas personalizadas.
- Prueba en Quest con enlace publicado o validacion previa con Immersive Web Emulator.
- Captura o video corto de prueba.

Si logras esto hoy, ya tienes una V1 funcional sobre la cual agregar:

- animacion propia relevante,
- mejora visual/materiales,
- interacciones adicionales,
- pulido para entrega final.

## 11) Siguientes mejoras (V2)

Cuando V1 este estable, recien ahi editar `js/main-interaccion.js` para:

- nueva interaccion (palanca, panel, llave, interruptor),
- logica de mision por etapas,
- feedback audiovisual adicional,
- animaciones personalizadas del equipo.
