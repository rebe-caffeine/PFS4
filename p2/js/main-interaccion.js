import * as THREE from './three.module.min.js';
import { VRButton } from './VRButton.js';
import { GLTFLoader } from './GLTFLoader.js';
import { OrbitControls } from './OrbitControls.js';
import { WORLD_CONFIG } from './world-config.js';

/*
    GUIA RAPIDA PARA ESTUDIANTES - BLOQUE 6 (Three.js)

    Objetivo:
    - Construir un mundo propio interactivo a partir de una configuracion.
    - Mantener locomocion/teleport/snap turn del bloque anterior.
    - Completar una mini mision: recolectar orbes, activar boton y abrir puerta.

    Edicion sugerida para estudiantes:
    - Personalizar `js/world-config.js`:
      nombre del mundo, spawn, zonas, collectibles, puerta y boton.
    - Reemplazar `worldModel.url` por su propio .glb.

    Lectura recomendada para entender este archivo:
    1) Seccion 1: parametros y estado global.
    2) Seccion 2: inicializacion y loop.
    3) Seccion 3: escena, modelo y objetos de mision.
    4) Seccion 4-5: XR + locomocion + colision.
    5) Seccion 6: interacciones de gameplay.
    6) Seccion 7: HUD, confort y utilidades.
*/

// ============================================================================
// 1) PARAMETROS Y ESTADO GLOBAL
// ============================================================================

const CFG = WORLD_CONFIG;

// Recomendacion docente:
// si quieres modificar la experiencia, primero prueba hacerlo desde
// `world-config.js` antes de tocar logica de este archivo.

const ROOM_HALF_SIZE = CFG.room?.halfSize ?? 4.5;
const ROOM_WALL_DISTANCE = ROOM_HALF_SIZE + (CFG.room?.wallDistanceOffset ?? 0.5);
const PLAYER_RADIUS = 0.28;

const TELEPORT_MAX_DISTANCE = CFG.movement?.teleportMaxDistance ?? 10;
const DESKTOP_MOVE_SPEED = CFG.movement?.desktopMoveSpeed ?? 2.8;
const DESKTOP_RUN_SPEED = CFG.movement?.desktopRunSpeed ?? 4.2;
const VR_MOVE_SPEED = CFG.movement?.vrMoveSpeed ?? 3.0;

const AXIS_DEADZONE = CFG.movement?.axisDeadzone ?? 0.15;
const SNAP_TURN_ANGLE = THREE.MathUtils.degToRad(CFG.movement?.snapTurnDegrees ?? 30);
const SNAP_TURN_THRESHOLD = 0.75;
const SNAP_TURN_RESET_THRESHOLD = 0.2;

const INTERACT_DISTANCE = CFG.interaction?.interactDistance ?? 1.2;
const PICKUP_DISTANCE = CFG.interaction?.pickupDistance ?? 0.62;

const comfortDesktopBase = CFG.comfort?.desktopBaseOpacity ?? 0.07;
const comfortVRBase = CFG.comfort?.vrBaseOpacity ?? 0.14;

const spawnPoint = vec3FromConfig(CFG.spawnPoint, { x: 0, y: 1.6, z: 2.8 });
const XR_START_HEAD = new THREE.Vector3(spawnPoint.x, 0, spawnPoint.z);

const keyState = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ShiftLeft: false,
    ShiftRight: false,
};

const player = new THREE.Group();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121418);
scene.add(player);

// `player` es la referencia de locomocion.
// Al mover `player`, se mueve todo el punto de vista del usuario.

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, spawnPoint.y, 0);
camera.lookAt(new THREE.Vector3(0, 0.8, 0));
player.add(camera);
player.position.set(spawnPoint.x, 0, spawnPoint.z);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// El canvas de render se crea desde JS y se inserta en body.
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.0;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.48;

// OrbitControls solo aplica en desktop.
// En XR se desactiva para evitar conflicto con tracking del headset.

const infoElement = document.getElementById('info');
const detailsPanelElement = document.getElementById('detailsPanel');

const comfortVignette = createComfortVignette();
let vignetteOpacity = 0.08;
let vignetteTurnBoost = 0;

const clock = new THREE.Clock();
const teleportRaycaster = new THREE.Raycaster();

const xrControllers = [];
const controllerButtonState = new Map();
const snapTurnState = { ready: true };

let teleportEnabled = true;
let pendingXRRecenteringFrames = 0;
let ground = null;

const worldUp = new THREE.Vector3(0, 1, 0);
const movementDelta = new THREE.Vector3();
const cameraForwardFlat = new THREE.Vector3();
const cameraRightFlat = new THREE.Vector3();
const candidatePosition = new THREE.Vector3();
const resolvedPosition = new THREE.Vector3();
const previousPosition = new THREE.Vector3();
const correctionDelta = new THREE.Vector3();

const teleportOrigin = new THREE.Vector3();
const teleportDirection = new THREE.Vector3();
const teleportQuaternion = new THREE.Quaternion();
const headWorldPosition = new THREE.Vector3();
const beforeTurnHead = new THREE.Vector3();
const afterTurnHead = new THREE.Vector3();

const tmpBox = new THREE.Box3();
const tmpCenter = new THREE.Vector3();
const tmpSize = new THREE.Vector3();

const tmpControllerPos = new THREE.Vector3();
const tmpControllerQuat = new THREE.Quaternion();

const baseObstacles = (CFG.obstacles || []).map((obstacle) => ({
    x: obstacle.x,
    z: obstacle.z,
    r: obstacle.r,
}));

const modelObstacle = {
    enabled: false,
    x: 0,
    z: 0,
    r: 0.9,
};

const doorState = {
    mesh: null,
    baseY: 0,
    currentLift: 0,
    targetLift: 0,
    openLift: CFG.door?.openLift ?? 2.6,
    obstacle: {
        x: CFG.door?.position?.x ?? 0,
        z: CFG.door?.position?.z ?? -4,
        r: CFG.door?.blockRadius ?? 1.05,
    },
};

const buttonState = {
    mesh: null,
};

const collectibleState = [];
let loadedWorldModel = null;

const zoneState = {
    defaultTitle: 'LEGO: NIGHT HOURS',
    defaultMessage: 'Welcome to LEGO: Night Hours. See the dark in a whole new light.',
    activeZoneId: null,
};

const zones = [];

const missionState = {
    requiredCollectibles: Math.max(1, CFG.objectives?.requiredCollectibles ?? (CFG.collectibles?.length || 3)),
    collectedCount: 0,
    doorOpen: false,
    statusMessage: '',
    statusTimer: 0,
};

// `missionState` concentra progreso de juego (orbes/puerta/mensajes).

// ============================================================================
// 2) INICIALIZACION Y BUCLE PRINCIPAL
// ============================================================================

createEnvironment();
loadWorldModel();
createMissionObjects();
createInteractionZones();
setupAudioAndGuide(); // AÑADÍ ESTA BASURA 🔴🔴🔴🔴🔴🔴


const controller0 = createXRController(0);
const controller1 = createXRController(1);
xrControllers.push(controller0, controller1);
updateControllerRayState();

setupDesktopControls();
setupWindowEvents();
updateDetailsPanelDefault();
updateHUD();

renderer.xr.addEventListener('sessionstart', () => {
    // Al entrar a XR se desactiva orbit y se ejecuta recentrado inicial.
    document.body.classList.add('xr-mode');
    controls.enabled = false;
    pendingXRRecenteringFrames = 12;
    console.log('[B6] Sesion XR iniciada');
    updateHUD();
});

renderer.xr.addEventListener('sessionend', () => {
    // Al salir de XR se restaura el modo desktop.
    document.body.classList.remove('xr-mode');
    controls.enabled = true;
    pendingXRRecenteringFrames = 0;
    controllerButtonState.clear();
    snapTurnState.ready = true;
    console.log('[B6] Sesion XR finalizada');
    updateHUD();
});

renderer.setAnimationLoop(() => {
    // Loop principal: aqui corre TODA la simulacion por frame.
    const dt = Math.min(clock.getDelta(), 0.05);

    if (renderer.xr.isPresenting && pendingXRRecenteringFrames > 0) {
        // Recentrado en primeros frames para evitar saltos de tracking.
        recenterPlayerToXRStart();
        pendingXRRecenteringFrames -= 1;
    }

    let moveIntensity = 0;
    if (renderer.xr.isPresenting) {
        // Rama VR: locomocion por joystick + snap turn + botones.
        moveIntensity = updateVRContinuousMovement(dt);
        updateVRSnapTurn();
        updateVRButtonShortcuts();
    } else {
        // Rama desktop: locomocion teclado + orbit camera.
        moveIntensity = updateDesktopMovement(dt);
        controls.update();
    }

    updateDoorAnimation(dt);
    updateCollectibleAnimation(dt);
    updateZoneHints();
    updateStatusMessageTimer(dt);
    updateComfortVignette(dt, moveIntensity);

    renderer.render(scene, camera);
});

// ============================================================================
// 3) ENTORNO, MODELO Y OBJETOS DE MISION
// ============================================================================

function createEnvironment() {
    // Escena base: luces + suelo + rejilla + paredes de orientacion.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.72);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 7, 3);
    dir.castShadow = true;
    scene.add(dir);

    const groundGeo = new THREE.PlaneGeometry(ROOM_HALF_SIZE * 2 + 3, ROOM_HALF_SIZE * 2 + 3);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95, metalness: 0.05 });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(ROOM_HALF_SIZE * 2 + 3, 28, 0x343434, 0x242424);
    grid.position.y = 0.01;
    scene.add(grid);

    // createWall(new THREE.Vector3(0, 2, -ROOM_WALL_DISTANCE), 0, 0x6b2a2a, 'FRENTE');
    // createWall(new THREE.Vector3(-ROOM_WALL_DISTANCE, 2, 0), Math.PI / 2, 0x224070, 'IZQUIERDA');
    // createWall(new THREE.Vector3(ROOM_WALL_DISTANCE, 2, 0), -Math.PI / 2, 0x266b3b, 'DERECHA');
}

function createWall(position, rotationY, color, labelText) {
    // Cada pared incluye un rotulo para orientar al usuario.
    const wallGeo = new THREE.PlaneGeometry(ROOM_HALF_SIZE * 2 + 3, 4);
    const wallMat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.9, metalness: 0.02 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.copy(position);
    wall.rotation.y = rotationY;
    scene.add(wall);

    const label = createWallLabel(labelText);
    label.position.copy(position);
    label.position.y = 3.2;
    label.position.x += Math.sin(rotationY) * 0.12;
    label.position.z += Math.cos(rotationY) * 0.12;
    label.rotation.y = rotationY;
    scene.add(label);
}

function createWallLabel(text) {
    // El texto se genera con Canvas2D y luego se usa como textura.
    // Esto evita depender de librerias de texto 3D.
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.53);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.8),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
    );
}

function loadWorldModel() {
    // Carga del modelo principal definido en world-config.
    const modelUrl = CFG.worldModel?.url;
    if (!modelUrl) return;

    const loader = new GLTFLoader();
    loader.load(
        modelUrl,
        (gltf) => {
            loadedWorldModel = gltf.scene;
            scene.add(loadedWorldModel);
            fitWorldModel(loadedWorldModel);
            // refreshWorldModelObstacle(); 🔴CAMBIO PARA DESACTIVAR EL CALCULO AUTOMATICO DE COLISIÓN
            console.log('[B6] Modelo de mundo cargado:', modelUrl);
        },
        undefined,
        (error) => {
            console.error('[B6] Error cargando modelo de mundo:', error);
        }
    );
}

function fitWorldModel(model) {
    // Ajuste automatico para que el modelo sea usable en la sala:
    // - escala,
    // - centrado,
    // - apoyo sobre piso,
    // - offset final opcional.
    tmpBox.setFromObject(model);
    if (tmpBox.isEmpty()) return;

    const targetSize = CFG.worldModel?.autoScaleTo ?? 1.8;
    if (targetSize > 0) {
        tmpBox.getSize(tmpSize);
        const maxDim = Math.max(tmpSize.x, tmpSize.y, tmpSize.z);
        if (maxDim > 0) {
            const scale = targetSize / maxDim;
            model.scale.setScalar(scale);
        }
    }

    tmpBox.setFromObject(model);
    tmpBox.getCenter(tmpCenter);

    if (CFG.worldModel?.centerToFloor !== false) {
        model.position.x -= tmpCenter.x;
        model.position.z -= tmpCenter.z;
        model.position.y -= tmpBox.min.y;
    }

    const offset = vec3FromConfig(CFG.worldModel?.offset, { x: 0, y: 0, z: 0 });
    model.position.x += offset.x;
    model.position.y += offset.y;
    model.position.z += offset.z;
}

function refreshWorldModelObstacle() {
    // Crea/actualiza obstaculo circular basado en el bounding box del modelo.
    // Sirve para que el jugador no atraviese el objeto central.
    if (!loadedWorldModel) return;

    tmpBox.setFromObject(loadedWorldModel);
    if (tmpBox.isEmpty()) return;

    tmpBox.getCenter(tmpCenter);
    tmpBox.getSize(tmpSize);

    modelObstacle.enabled = true;
    modelObstacle.x = tmpCenter.x;
    modelObstacle.z = tmpCenter.z;
    modelObstacle.r = Math.max(0.75, Math.max(tmpSize.x, tmpSize.z) * 0.5 + 0.18);
}

function createMissionObjects() {
    // Objetos interactivos de gameplay (boton, puerta, orbes).
    createButton();
    createDoor();
    createCollectibles();
}

function createButton() {
    // Boton que, al interactuar, intenta abrir la puerta.
    const cfg = CFG.button || {};
    const position = vec3FromConfig(cfg.position, { x: 0, y: 1.05, z: -3.1 });

    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(cfg.radius ?? 0.22, cfg.radius ?? 0.22, cfg.height ?? 0.12, 28, 1),
        new THREE.MeshStandardMaterial({ color: cfg.color ?? 0xffa94d, roughness: 0.35, metalness: 0.15, emissive: 0x2a1a00 })
    );

    mesh.name = cfg.id || 'boton_puerta';
    mesh.position.copy(position);
    mesh.castShadow = true;
    scene.add(mesh);
    buttonState.mesh = mesh;
}

function createDoor() {
    // Puerta que se eleva cuando se cumplen condiciones de mision.
    const cfg = CFG.door || {};
    const size = cfg.size || { x: 1.8, y: 2.4, z: 0.22 };
    const position = vec3FromConfig(cfg.position, { x: 0, y: 1.2, z: -4.25 });

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshStandardMaterial({ color: cfg.colorClosed ?? 0x5b6776, roughness: 0.4, metalness: 0.2 })
    );

    mesh.name = cfg.id || 'puerta_principal';
    mesh.position.copy(position);
    mesh.castShadow = true;
    scene.add(mesh);

    doorState.mesh = mesh;
    doorState.baseY = mesh.position.y;
    doorState.currentLift = 0;
    doorState.targetLift = 0;
    doorState.openLift = cfg.openLift ?? 2.6;
    doorState.obstacle.x = position.x;
    doorState.obstacle.z = position.z;
    doorState.obstacle.r = cfg.blockRadius ?? 1.05;
}

// AQUÍ CAMBIÉ COSAS 🔴🔴🔴🔴

function createCollectibles() {
    const list = CFG.collectibles || [];
    const loader = new GLTFLoader();

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const position = vec3FromConfig(item.position, { x: 0, y: 0.45, z: 0 });

        // Usamos un grupo como contenedor para evitar errores de carga asíncrona
        const group = new THREE.Group();
        group.name = item.id || `orbe_${i + 1}`;
        group.position.copy(position);
        scene.add(group);

        collectibleState.push({
            id: group.name,
            mesh: group,
            collected: false,
            baseY: group.position.y,
            phase: Math.random() * Math.PI * 2,
        });

        // Cargar el modelo .glb de tu pieza de lego
        if (item.url) {
            loader.load(
                item.url,
                (gltf) => {
                    const model = gltf.scene;
                    model.scale.setScalar(item.scale || 1.0);
                    // Asegurar que las piezas proyecten sombras
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    group.add(model);
                },
                undefined,
                (error) => console.error('[B6] Error cargando pieza lego:', error)
            );
        }
    }
}

//-----------------------------------------------------

function createInteractionZones() {
    // Zonas narrativas que actualizan el panel lateral al entrar.
    const zoneList = CFG.interactionZones || [];
    for (const zoneCfg of zoneList) {
        const center = vec3FromConfig(zoneCfg.center, { x: 0, y: 1.6, z: 0 });
        const zone = {
            id: zoneCfg.id,
            center,
            radius: zoneCfg.radius ?? 1,
            title: zoneCfg.title || 'Zona',
            message: zoneCfg.message || '',
        };

        zones.push(zone);

        if (CFG.debug?.showZoneMeshes) {
            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(zone.radius, 18, 14),
                new THREE.MeshBasicMaterial({ color: 0x53d0ff, wireframe: true, transparent: true, opacity: 0.2 })
            );
            marker.position.copy(zone.center);
            scene.add(marker);
        }
    }
}

// ============================================================================
// 4) XR, INPUT Y TELEPORT
// ============================================================================

function createXRController(index) {
    // Configura controlador XR + eventos de interaccion.
    const controller = renderer.xr.getController(index);

    controller.addEventListener('connected', (event) => {
        controller.userData.inputSource = event.data;
    });

    controller.addEventListener('disconnected', () => {
        controller.userData.inputSource = null;
    });

    controller.addEventListener('selectstart', () => {
        // Prioridad: teleport si esta habilitado; fallback a interaccion.
        if (teleportEnabled) {
            const teleported = tryTeleport(controller);
            if (teleported) return;
        }

        tryInteractFromController(controller);
    });

    controller.addEventListener('squeezestart', () => {
        tryInteractFromController(controller);
    });

    const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -TELEPORT_MAX_DISTANCE),
    ];
    const rayGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const rayMaterial = new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.95 });
    const ray = new THREE.Line(rayGeometry, rayMaterial);
    ray.name = 'teleportRay';
    controller.add(ray);

    // Importante: anclar controladores al player para que acompanen
    // la locomocion artificial (WASD/joystick/teleport) del usuario.
    player.add(controller);
    return controller;
}

function setupDesktopControls() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearMovementKeys);
}

function setupWindowEvents() {
    window.addEventListener('resize', () => {
        const width = Math.max(1, window.innerWidth);
        const height = Math.max(1, window.innerHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
}

function tryTeleport(controller) {
    // Teleport manual por raycast al suelo.
    if (!renderer.xr.isPresenting || !ground) return false;

    teleportOrigin.setFromMatrixPosition(controller.matrixWorld);
    controller.getWorldQuaternion(teleportQuaternion);
    teleportDirection.set(0, 0, -1).applyQuaternion(teleportQuaternion).normalize();

    teleportRaycaster.set(teleportOrigin, teleportDirection);
    teleportRaycaster.far = TELEPORT_MAX_DISTANCE;

    const hits = teleportRaycaster.intersectObject(ground, false);
    if (!hits.length) return false;

    const targetPoint = hits[0].point;
    getCurrentHeadPosition(headWorldPosition);

    movementDelta.set(targetPoint.x - headWorldPosition.x, 0, targetPoint.z - headWorldPosition.z);
    const moved = attemptMove(movementDelta);
    return moved > 0;
}

// ============================================================================
// 5) LOCOMOCION, SNAP TURN Y COLISION
// ============================================================================

function updateVRContinuousMovement(dt) {
    // Locomocion VR continua (stick izq prioritario, fallback por magnitud).
    const session = renderer.xr.getSession();
    if (!session) return 0;

    let activeSource = null;
    let fallbackSource = null;
    let fallbackMagnitude = 0;

    for (const source of session.inputSources) {
        const gamepad = source.gamepad;
        if (!gamepad || !gamepad.axes || !gamepad.axes.length) continue;

        const strafeAxis = getPreferredAxis(gamepad, 2, 0);
        const forwardAxis = getPreferredAxis(gamepad, 3, 1);
        const magnitude = Math.hypot(strafeAxis, forwardAxis);

        if (source.handedness === 'left') {
            activeSource = source;
            break;
        }

        if (magnitude > fallbackMagnitude) {
            fallbackMagnitude = magnitude;
            fallbackSource = source;
        }
    }

    if (!activeSource) activeSource = fallbackSource;
    if (!activeSource || !activeSource.gamepad) return 0;

    let strafe = getPreferredAxis(activeSource.gamepad, 2, 0);
    let forward = -getPreferredAxis(activeSource.gamepad, 3, 1);

    strafe = applyDeadzone(strafe, AXIS_DEADZONE);
    forward = applyDeadzone(forward, AXIS_DEADZONE);

    const inputMagnitude = Math.min(1, Math.hypot(strafe, forward));
    if (inputMagnitude <= 0) return 0;

    buildCameraMoveBasis();
    movementDelta.copy(cameraForwardFlat).multiplyScalar(forward * VR_MOVE_SPEED * dt);
    movementDelta.addScaledVector(cameraRightFlat, strafe * VR_MOVE_SPEED * dt);
    attemptMove(movementDelta);

    return inputMagnitude;
}

function updateDesktopMovement(dt) {
    // Locomocion de teclado en desktop.
    if (renderer.xr.isPresenting) return 0;

    let forward = 0;
    let strafe = 0;

    if (keyState.KeyW) forward += 1;
    if (keyState.KeyS) forward -= 1;
    if (keyState.KeyD) strafe += 1;
    if (keyState.KeyA) strafe -= 1;

    const inputMagnitude = Math.hypot(strafe, forward);
    if (inputMagnitude <= 0) return 0;

    const normalizedForward = forward / inputMagnitude;
    const normalizedStrafe = strafe / inputMagnitude;
    const speed = (keyState.ShiftLeft || keyState.ShiftRight) ? DESKTOP_RUN_SPEED : DESKTOP_MOVE_SPEED;

    buildCameraMoveBasis();
    movementDelta.copy(cameraForwardFlat).multiplyScalar(normalizedForward * speed * dt);
    movementDelta.addScaledVector(cameraRightFlat, normalizedStrafe * speed * dt);
    attemptMove(movementDelta);

    return Math.min(1, inputMagnitude);
}

function buildCameraMoveBasis() {
    // Base de movimiento en plano XZ (forward/right relativo a camara).
    camera.getWorldDirection(cameraForwardFlat);
    cameraForwardFlat.y = 0;
    if (cameraForwardFlat.lengthSq() < 1e-6) cameraForwardFlat.set(0, 0, -1);
    cameraForwardFlat.normalize();

    cameraRightFlat.crossVectors(cameraForwardFlat, worldUp);
    if (cameraRightFlat.lengthSq() < 1e-6) cameraRightFlat.set(1, 0, 0);
    cameraRightFlat.normalize();
}

function updateVRSnapTurn() {
    // Snap turn por pasos para confort en VR.
    const session = renderer.xr.getSession();
    if (!session) {
        snapTurnState.ready = true;
        return;
    }

    let axisRight = 0;
    let axisFallback = 0;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const axis = getPreferredAxis(source.gamepad, 2, 0);

        if (source.handedness === 'right') {
            axisRight = axis;
            break;
        }

        if (Math.abs(axis) > Math.abs(axisFallback)) axisFallback = axis;
    }

    const axis = axisRight !== 0 ? axisRight : axisFallback;
    if (Math.abs(axis) > SNAP_TURN_THRESHOLD && snapTurnState.ready) {
        camera.getWorldPosition(beforeTurnHead);

        player.rotation.y += axis > 0 ? -SNAP_TURN_ANGLE : SNAP_TURN_ANGLE;

        camera.getWorldPosition(afterTurnHead);
        correctionDelta.set(beforeTurnHead.x - afterTurnHead.x, 0, beforeTurnHead.z - afterTurnHead.z);
        attemptMove(correctionDelta);

        vignetteTurnBoost = 1;
        snapTurnState.ready = false;
    }

    if (Math.abs(axis) < SNAP_TURN_RESET_THRESHOLD) {
        snapTurnState.ready = true;
    }
}

function updateVRButtonShortcuts() {
    // Atajos de botones VR (toggle teleport).
    const session = renderer.xr.getSession();
    if (!session) {
        controllerButtonState.clear();
        return;
    }

    for (let i = 0; i < session.inputSources.length; i++) {
        const source = session.inputSources[i];
        if (!source.gamepad) continue;

        const id = `${source.handedness}-${i}`;
        const previous = controllerButtonState.get(id) || [];
        const current = source.gamepad.buttons.map((button) => !!button.pressed);

        const risingEdge = (index) => current[index] && !previous[index];

        if (source.handedness === 'left' && (risingEdge(3) || risingEdge(4))) {
            toggleTeleport();
        }

        controllerButtonState.set(id, current);
    }
}

function recenterPlayerToXRStart() {
    // Recentrado inicial en XR al punto de inicio configurado.
    const xrCamera = renderer.xr.getCamera(camera);
    if (!xrCamera) return;

    xrCamera.getWorldPosition(headWorldPosition);

    const clampedX = THREE.MathUtils.clamp(XR_START_HEAD.x, -ROOM_HALF_SIZE + PLAYER_RADIUS, ROOM_HALF_SIZE - PLAYER_RADIUS);
    const clampedZ = THREE.MathUtils.clamp(XR_START_HEAD.z, -ROOM_HALF_SIZE + PLAYER_RADIUS, ROOM_HALF_SIZE - PLAYER_RADIUS);

    movementDelta.set(clampedX - headWorldPosition.x, 0, clampedZ - headWorldPosition.z);
    attemptMove(movementDelta);
}

function attemptMove(deltaVector) {
    // Movimiento robusto: calcula destino, resuelve colision y aplica desplazamiento.
    if (deltaVector.lengthSq() <= 1e-10) return 0;

    previousPosition.copy(player.position);
    candidatePosition.copy(player.position).add(deltaVector);
    resolvePlayerPosition(candidatePosition, previousPosition, resolvedPosition);

    const movedX = resolvedPosition.x - previousPosition.x;
    const movedZ = resolvedPosition.z - previousPosition.z;
    if (Math.abs(movedX) < 1e-7 && Math.abs(movedZ) < 1e-7) return 0;

    player.position.x = resolvedPosition.x;
    player.position.z = resolvedPosition.z;

    if (!renderer.xr.isPresenting) {
        controls.target.x += movedX;
        controls.target.z += movedZ;
    }

    return Math.hypot(movedX, movedZ);
}

function resolvePlayerPosition(candidate, previous, out) {
    // Colision simple contra:
    // - limites de sala,
    // - obstaculos base,
    // - obstaculo del modelo,
    // - puerta cerrada.
    out.copy(candidate);

    const min = -ROOM_HALF_SIZE + PLAYER_RADIUS;
    const max = ROOM_HALF_SIZE - PLAYER_RADIUS;

    out.x = THREE.MathUtils.clamp(out.x, min, max);
    out.z = THREE.MathUtils.clamp(out.z, min, max);

    for (const obstacle of baseObstacles) {
        solveObstacleSeparation(out, previous, obstacle);
    }

    if (modelObstacle.enabled) {
        solveObstacleSeparation(out, previous, modelObstacle);
    }

    if (!missionState.doorOpen && doorState.mesh) {
        solveObstacleSeparation(out, previous, doorState.obstacle);
    }

    out.x = THREE.MathUtils.clamp(out.x, min, max);
    out.z = THREE.MathUtils.clamp(out.z, min, max);
    out.y = previous.y;
    return out;
}

function solveObstacleSeparation(out, previous, obstacle) {
    const minDistance = obstacle.r + PLAYER_RADIUS;
    const dx = out.x - obstacle.x;
    const dz = out.z - obstacle.z;
    const distSq = dx * dx + dz * dz;

    if (distSq >= minDistance * minDistance) return;

    let nx = dx;
    let nz = dz;

    if (distSq < 1e-8) {
        nx = out.x - previous.x;
        nz = out.z - previous.z;
        const nLen = Math.hypot(nx, nz);
        if (nLen < 1e-8) {
            nx = 1;
            nz = 0;
        } else {
            nx /= nLen;
            nz /= nLen;
        }
    } else {
        const invLen = 1 / Math.sqrt(distSq);
        nx *= invLen;
        nz *= invLen;
    }

    out.x = obstacle.x + nx * minDistance;
    out.z = obstacle.z + nz * minDistance;
}

// ============================================================================
// 6) INTERACCION DE MUNDO (ORBES, BOTON, PUERTA, ZONAS)
// ============================================================================

function tryInteractFromController(controller) {
    // Interaccion contextual desde posicion de controlador.
    tmpControllerPos.setFromMatrixPosition(controller.matrixWorld);
    return tryInteractAtPosition(tmpControllerPos);
}

function tryInteractFromHead() {
    // Interaccion contextual desde cabeza/camara (desktop y fallback).
    getCurrentHeadPosition(headWorldPosition);
    return tryInteractAtPosition(headWorldPosition);
}

function tryInteractAtPosition(position) {
    // Regla de prioridad de interaccion:
    // 1) recoger orbe
    // 2) pulsar boton
    // 3) consultar puerta
    const nearestCollectible = findNearestCollectible(position, PICKUP_DISTANCE);
    if (nearestCollectible) {
        collectItem(nearestCollectible);
        return true;
    }

    if (buttonState.mesh && position.distanceTo(buttonState.mesh.position) <= INTERACT_DISTANCE) {
        activateDoorButton();
        return true;
    }

    if (doorState.mesh && !missionState.doorOpen && position.distanceTo(doorState.mesh.position) <= INTERACT_DISTANCE) {
        const remaining = Math.max(0, missionState.requiredCollectibles - missionState.collectedCount);
        setStatusMessage(`Puerta cerrada. Faltan ${remaining} orbes.`);
        return false;
    }

    setStatusMessage('No hay un elemento interactivo cerca.', 1.4);
    return false;
}

function findNearestCollectible(position, maxDistance) {
    const maxDistSq = maxDistance * maxDistance;
    let nearest = null;
    let nearestDistSq = maxDistSq;

    for (const item of collectibleState) {
        if (item.collected || !item.mesh.visible) continue;
        const distSq = position.distanceToSquared(item.mesh.position);
        if (distSq > nearestDistSq) continue;
        nearest = item;
        nearestDistSq = distSq;
    }

    return nearest;
}

function collectItem(item) {
    // Actualiza progreso de mision al recolectar.
    item.collected = true;
    item.mesh.visible = false;
    missionState.collectedCount += 1;

//AQUÍ CAMBIE COSAS 🔴🔴🔴🔴

    // Reproducir audio de recolección
    if (audioReady && sfxPickup && sfxPickup.buffer) {
        if (sfxPickup.isPlaying) sfxPickup.stop();
        sfxPickup.play();
    }
    //====================================================

    console.log('[B6] Orbe recolectado:', item.id);

    if (missionState.collectedCount >= missionState.requiredCollectibles && !missionState.doorOpen) {
        setStatusMessage('Objetivo cumplido. Activa el boton para abrir la puerta.');
    } else {
        setStatusMessage(
            `Recolectado ${missionState.collectedCount}/${missionState.requiredCollectibles}`,
            1.8
        );
    }

    updateHUD();
}

function activateDoorButton() {
    // Abre puerta solo si se cumplieron orbes requeridos.
    if (missionState.doorOpen) {
        setStatusMessage('La puerta ya esta abierta.', 1.6);
        return;
    }

    if (missionState.collectedCount < missionState.requiredCollectibles) {
        const remaining = missionState.requiredCollectibles - missionState.collectedCount;
        setStatusMessage(`Faltan ${remaining} orbes para abrir la puerta.`);
        return;
    }

    missionState.doorOpen = true;
    doorState.targetLift = doorState.openLift;
    if (doorState.mesh?.material?.color) {
        doorState.mesh.material.color.setHex(CFG.door?.colorOpen ?? 0x54c77a);
    }

    setStatusMessage('Puerta abierta. Avanza al objetivo final.', 2.6);
    console.log('[B6] Puerta abierta');
    updateHUD();
}

function updateDoorAnimation(dt) {
    // Animacion suave de apertura de puerta (traslacion en Y).
    if (!doorState.mesh) return;

    const diff = doorState.targetLift - doorState.currentLift;
    if (Math.abs(diff) < 1e-4) return;

    const speed = 1.9;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    doorState.currentLift += step;
    doorState.mesh.position.y = doorState.baseY + doorState.currentLift;
}

function updateCollectibleAnimation(dt) {
    // Flotacion + giro de orbes para legibilidad visual.
    const t = clock.elapsedTime;
    for (const item of collectibleState) {
        if (item.collected || !item.mesh.visible) continue;
        item.mesh.position.y = item.baseY + Math.sin(t * 1.8 + item.phase) * 0.06;
        item.mesh.rotation.y += dt * 1.2;
    }
}

function updateZoneHints() {
    // Detecta zona activa y actualiza panel de texto lateral.
    if (!detailsPanelElement) return;

    getCurrentHeadPosition(headWorldPosition);

    let currentZone = null;
    for (const zone of zones) {
        if (headWorldPosition.distanceToSquared(zone.center) <= zone.radius * zone.radius) {
            currentZone = zone;
            break;
        }
    }

    if (!currentZone) {
        if (zoneState.activeZoneId !== null) {
            zoneState.activeZoneId = null;
            updateDetailsPanelDefault();
        }
        return;
    }

    if (zoneState.activeZoneId === currentZone.id) return;

    zoneState.activeZoneId = currentZone.id;
    detailsPanelElement.innerHTML = `<strong>${currentZone.title}</strong><br>${currentZone.message}`;
}

function updateDetailsPanelDefault() {
    if (!detailsPanelElement) return;
    detailsPanelElement.innerHTML = `<strong>${zoneState.defaultTitle}</strong><br>${zoneState.defaultMessage}`;
}

function setStatusMessage(message, duration = 2.2) {
    // Mensaje temporal de sistema (feedback para usuario).
    missionState.statusMessage = message;
    missionState.statusTimer = duration;
    updateHUD();
}

function updateStatusMessageTimer(dt) {
    if (missionState.statusTimer <= 0) return;

    missionState.statusTimer -= dt;
    if (missionState.statusTimer <= 0) {
        missionState.statusTimer = 0;
        missionState.statusMessage = '';
        updateHUD();
    }
}

function getCurrentHeadPosition(out) {
    if (renderer.xr.isPresenting) {
        const xrCamera = renderer.xr.getCamera(camera);
        if (xrCamera) {
            xrCamera.getWorldPosition(out);
            return out;
        }
    }

    camera.getWorldPosition(out);
    return out;
}

// ============================================================================
// 7) UI, CONFORT Y UTILIDADES
// ============================================================================

function createComfortVignette() {
    // Overlay de confort para reducir mareo en movimiento continuo.
    const vignette = document.createElement('div');
    vignette.id = 'comfortVignette';
    vignette.style.position = 'fixed';
    vignette.style.inset = '0';
    vignette.style.zIndex = '9';
    vignette.style.pointerEvents = 'none';
    vignette.style.opacity = '0.08';
    vignette.style.background = 'radial-gradient(circle at center, rgba(0,0,0,0) 42%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.78) 100%)';
    document.body.appendChild(vignette);
    return vignette;
}

function updateComfortVignette(dt, moveIntensity) {
    vignetteTurnBoost = Math.max(0, vignetteTurnBoost - dt * 1.8);

    const baseOpacity = renderer.xr.isPresenting ? comfortVRBase : comfortDesktopBase;
    const targetOpacity = THREE.MathUtils.clamp(
        baseOpacity + moveIntensity * 0.35 + vignetteTurnBoost * 0.24,
        baseOpacity,
        0.8
    );

    const smoothing = 1 - Math.exp(-dt * 8);
    vignetteOpacity += (targetOpacity - vignetteOpacity) * smoothing;
    comfortVignette.style.opacity = vignetteOpacity.toFixed(3);
}

function updateHUD() {
    // HUD dinamico con progreso, estado de puerta, teleport y ayudas.
    if (!infoElement) return;

    const mode = renderer.xr.isPresenting ? 'VR' : 'Desktop';
    const teleportState = teleportEnabled ? 'ON' : 'OFF';
    const doorStateLabel = missionState.doorOpen ? 'ABIERTA' : 'CERRADA';

    let text =
        `Interaccion 06 | ${mode} | ${CFG.meta?.worldName || 'Mundo propio'} | ` +
        `Orbes ${missionState.collectedCount}/${missionState.requiredCollectibles} | ` +
        `Puerta ${doorStateLabel} | Teleport ${teleportState} (T desktop / X-Y izq VR) | ` +
        `E interactuar | R reiniciar mision`;

    if (missionState.statusMessage) {
        text += ` | ${missionState.statusMessage}`;
    }

    infoElement.textContent = text;
}

function toggleTeleport() {
    teleportEnabled = !teleportEnabled;
    updateControllerRayState();
    updateHUD();
    console.log(`[B6] Teleport ${teleportEnabled ? 'ON' : 'OFF'}`);
}

function updateControllerRayState() {
    const color = teleportEnabled ? 0x66ccff : 0x616161;
    const opacity = teleportEnabled ? 0.95 : 0.45;

    for (const controller of xrControllers) {
        const ray = controller.getObjectByName('teleportRay');
        if (!ray || !ray.material) continue;
        ray.material.color.setHex(color);
        ray.material.opacity = opacity;
    }
}

function onKeyDown(event) {
    // Atajos desktop:
    // T toggle teleport, E interactuar, R reiniciar mision.
    const code = event.code;

    if (code === 'KeyT' && !event.repeat) {
        toggleTeleport();
        return;
    }

    if (code === 'KeyE' && !event.repeat) {
        tryInteractFromHead();
        return;
    }

    if (code === 'KeyR' && !event.repeat) {
        resetMissionProgress();
        return;
    }

    if (code in keyState) {
        keyState[code] = true;
        event.preventDefault();
    }
}

function onKeyUp(event) {
    const code = event.code;
    if (code in keyState) {
        keyState[code] = false;
        event.preventDefault();
    }
}

function clearMovementKeys() {
    keyState.KeyW = false;
    keyState.KeyA = false;
    keyState.KeyS = false;
    keyState.KeyD = false;
    keyState.ShiftLeft = false;
    keyState.ShiftRight = false;
}

function resetMissionProgress() {
    // Reinicia estado de mision sin recargar pagina.
    missionState.collectedCount = 0;
    missionState.doorOpen = false;
    missionState.statusMessage = '';
    missionState.statusTimer = 0;

    for (const item of collectibleState) {
        item.collected = false;
        item.mesh.visible = true;
        item.mesh.position.y = item.baseY;
    }

    if (doorState.mesh) {
        doorState.targetLift = 0;
        doorState.currentLift = 0;
        doorState.mesh.position.y = doorState.baseY;
        if (doorState.mesh.material?.color) {
            doorState.mesh.material.color.setHex(CFG.door?.colorClosed ?? 0x5b6776);
        }
    }

    setStatusMessage('Mision reiniciada. Recolecta los orbes nuevamente.', 2.2);
    console.log('[B6] Mision reiniciada');
}

function getPreferredAxis(gamepad, primaryIndex, fallbackIndex) {
    if (!gamepad || !gamepad.axes || !gamepad.axes.length) return 0;
    const primary = gamepad.axes[primaryIndex] ?? 0;
    const fallback = gamepad.axes[fallbackIndex] ?? 0;
    return Math.abs(primary) >= Math.abs(fallback) ? primary : fallback;
}

function applyDeadzone(value, deadzone) {
    if (Math.abs(value) < deadzone) return 0;
    const scaled = (Math.abs(value) - deadzone) / (1 - deadzone);
    return Math.sign(value) * THREE.MathUtils.clamp(scaled, 0, 1);
}

function vec3FromConfig(value, fallback) {
    return new THREE.Vector3(
        value?.x ?? fallback.x,
        value?.y ?? fallback.y,
        value?.z ?? fallback.z
    );
}

// AQUÍ TERMINA EL CODIGO DE LA INTERACCION Y EMPIEZA EL DE AUDIO Y GUIA 🔴🔴🔴🔴
// ============================================================================
// 8) SISTEMA DE AUDIO Y GUÍA LEGO (CON MODELO .GLB)
// ============================================================================
let audioReady = false;
let sfxPickup = null;
let sfxGuide = null;
let bgm = null;

function setupAudioAndGuide() {
    const audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    const audioLoader = new THREE.AudioLoader();
    const gltfLoader = new GLTFLoader();

    // 1. Efecto de recolectar pieza
    sfxPickup = new THREE.Audio(audioListener);
    audioLoader.load('./audio/pick.mp3', (buffer) => {
        sfxPickup.setBuffer(buffer);
        sfxPickup.setVolume(0.5);
    });

    // 2. Música de fondo
    bgm = new THREE.Audio(audioListener);
    audioLoader.load('./audio/moodmode.mp3', (buffer) => {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume(0.15); 
    });

    // 3. Crear contenedor del Monito Guía y cargar su modelo .glb
    const guideGroup = new THREE.Group();
    guideGroup.position.set(2, 0, -2); // Posición cerca de tu zona_guia
    scene.add(guideGroup);

    gltfLoader.load('./models/legoman.glb', (gltf) => { // <-- PON AQUÍ EL NOMBRE DEL .GLB DE TU MONITO
        const model = gltf.scene;
        model.scale.setScalar(1.0); // Ajusta la escala si es necesario
        guideGroup.add(model);
    });
    
    // 4. Audio espacial anclado al Guía
    sfxGuide = new THREE.PositionalAudio(audioListener);
    audioLoader.load('./audio/legomeme.mp3', (buffer) => { // <-- PON AQUÍ EL AUDIO QUE DICE TU MONITO
        sfxGuide.setBuffer(buffer);
        sfxGuide.setRefDistance(1.0); // La distancia ideal para que suene fuerte
        sfxGuide.setRolloffFactor(2.5); // Hace que se apague rápido al alejarte
        sfxGuide.setLoop(true);
        guideGroup.add(sfxGuide); // Se lo pegamos al monito
    });

    // 5. Desbloqueo de audio por reglas de navegador
    window.addEventListener('pointerdown', async () => {
        if (!audioReady) {
            if (audioListener.context.state !== 'running') {
                await audioListener.context.resume();
            }
            bgm.play();
            if (sfxGuide && sfxGuide.buffer) sfxGuide.play();
            audioReady = true;
        }
    }, { once: true });
}
