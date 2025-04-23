import * as THREE from '/node_modules/three/build/three.module.js';

// Crear un objeto invisible al que apuntan las luces
const targetOrigin = new THREE.Object3D();
targetOrigin.position.set(0, 0, 0);

// Función para crear cada luz direccional
function createDirectionalLight(x, y, z) {
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(x, y, z);
    light.castShadow = false;

    // Sombras
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -30;
    light.shadow.camera.right = 30;
    light.shadow.camera.top = 30;
    light.shadow.camera.bottom = -30;
    light.shadow.bias = -0.005;

    light.target = targetOrigin;
    
    return light;
}

// Crear 8 luces direccionales en las esquinas de un cubo imaginario
// Las coordenadas representan las 8 esquinas de un cubo (x, y, z) donde cada valor es 1 o -1
// Esquina superior frontal izquierda
const directionalLight1 = createDirectionalLight(-15, 15, 15);
// Esquina superior frontal derecha
const directionalLight2 = createDirectionalLight(15, 15, 15);
// Esquina superior trasera izquierda
const directionalLight3 = createDirectionalLight(-15, 15, -15);
// Esquina superior trasera derecha
const directionalLight4 = createDirectionalLight(15, 15, -15);
// Esquina inferior frontal izquierda
const directionalLight5 = createDirectionalLight(-15, -15, 15);
// Esquina inferior frontal derecha
const directionalLight6 = createDirectionalLight(15, -15, 15);
// Esquina inferior trasera izquierda
const directionalLight7 = createDirectionalLight(-15, -15, -15);
// Esquina inferior trasera derecha
const directionalLight8 = createDirectionalLight(15, -15, -15);

export {
    directionalLight1,
    directionalLight2,
    directionalLight3,
    directionalLight4,
    directionalLight5,
    directionalLight6,
    directionalLight7,
    directionalLight8,
    targetOrigin,
};