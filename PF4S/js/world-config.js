/*
    CONFIGURACION DEL MUNDO (Three.js)

    Este archivo esta pensado para estudiantes de multimedia:
    - Cambias parametros narrativos/espaciales sin tocar la logica del motor.
    - Evita romper funciones complejas de input, XR, colision y render.

    Convencion de unidades:
    - 1 unidad ~= 1 metro.

    Flujo recomendado:
    1) Ajustar `meta.worldName`.
    2) Ajustar `spawnPoint`.
    3) Cambiar `worldModel.url` por tu GLB.
    4) Ajustar `collectibles`, `button`, `door` y `interactionZones`.
    5) Probar en desktop y luego en VR.
*/

export const WORLD_CONFIG = {
    // Datos descriptivos para HUD y documentacion.
    meta: {
        worldName: 'Lego Night Hours',
        author: 'Rebeca Castañeda Andrade',
    },

    // Tamano general de la sala de trabajo.
    // halfSize=4.5 implica sala de 9x9 aprox en plano XZ.
    room: {
        halfSize: 4.5,
        wallDistanceOffset: 0.5,
    },

    // Punto de arranque del usuario (camara) al cargar.
    spawnPoint: { x: 0, y: 0.5, z: 10 },

    // Parametros de locomocion y giro.
    movement: {
        teleportMaxDistance: 10,
        desktopMoveSpeed: 2.8,
        desktopRunSpeed: 4.2,
        vrMoveSpeed: 3.0,
        axisDeadzone: 0.15,
        snapTurnDegrees: 30,
    },

    // Intensidad base del vignette de confort.
    comfort: {
        desktopBaseOpacity: 0.07,
        vrBaseOpacity: 0.14,
    },

    // Modelo principal del mundo.
    // Recomendado: GLB (binario) por simplicidad de distribucion.
    // Si cambias de modelo, mantén ruta relativa dentro de /models.
    worldModel: {
        url: './models/escaparate.glb',
        // Escala automatica: el lado mayor del modelo quedara aprox en este valor.
        autoScaleTo: 10.0,
        // Si true: centra en XZ y apoya en piso (Y=0).
        centerToFloor: true,
        // Desplazamiento final opcional tras centrar/escalar.
        offset: { x: 0, y: 0, z: 0 },
    },

    // Objetivos de la mision.
    objectives: {
        requiredCollectibles: 4,
    },

    // Distancias de interaccion.
    interaction: {
        // Distancia para usar boton/puerta.
        interactDistance: 1.2,
        // Distancia para recoger orbes.
        pickupDistance: 0.62,
    },

    // Boton que dispara mecanismo (apertura de puerta).
    button: {
        id: 'boton_puerta',
        position: { x: 0, y: 1.05, z: -3.1 },
        radius: 0.22,
        height: 0.12,
        color: 0xffa94d,
    },

    // Puerta del objetivo final.
    door: {
        id: 'puerta_principal',
        position: { x: 0, y: 1.2, z: -4.25 },
        size: { x: 1.8, y: 2.4, z: 0.22 },
        colorClosed: 0x5b6776,
        colorOpen: 0x54c77a,
        openLift: 2.6,
        blockRadius: 1.05,
    },

    // Objetos coleccionables para progresion de mision.
    // Puedes agregar mas elementos siguiendo el mismo formato.
    collectibles: [
        { id: 'orbe_a', position: { x: -1.6, y: 0.45, z: -0.9 }, color: 0xffcf5a },
        { id: 'orbe_b', position: { x: 1.5, y: 0.45, z: -0.5 }, color: 0x6ed9ff },
        { id: 'orbe_c', position: { x: 0.1, y: 0.45, z: 1.0 }, color: 0xa8ff91 },
        { id: 'orbe_d', position: { x: -0.8, y: 0.45, z: 1.2 }, color: 0xff6b6b },
    ],

    // Zonas narrativas: actualizan panel de detalles al entrar.
    interactionZones: [
        {
            id: 'zona_inicio',
            center: { x: 0, y: 1.6, z: 2.5 },
            radius: 1.1,
            title: 'Inicio',
            message: 'Explora, recolecta 4 orbes y luego pulsa el boton para abrir la puerta.',
        },
        {
            id: 'zona_modelo',
            center: { x: 0, y: 1.6, z: 0 },
            radius: 1.2,
            title: 'Punto de interes',
            message: 'Aqui puedes colocar un modelo propio del estudiante y construir narrativa.',
        },
        {
            id: 'zona_puerta',
            center: { x: 0, y: 1.6, z: -3.5 },
            radius: 1.0,
            title: 'Objetivo final',
            message: 'Si ya tienes los orbes, activa el boton para abrir la puerta.',
        },
    ],

    // Obstaculos circulares simples para colision de jugador (en XZ).
    // Util para proteger objetos centrales o areas importantes.
    obstacles: [
        { x: 0, z: 0, r: 0.95 },
    ],

    // Herramientas de depuracion visual.
    debug: {
        // Muestra esferas wireframe de cada zona.
        showZoneMeshes: false,
    },
};
