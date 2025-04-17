import * as THREE from '/node_modules/three/build/three.module.js';

// Crear una luz de ambiente
const ambientLight = new THREE.AmbientLight(0xffffff, 4);

// Función para configurar una luz direccional
function createDirectionalLight(x, y, z) {
    const light = new THREE.DirectionalLight(0xffffff, 4); // Ajustar la intensidad
    light.position.set(x, y, z);
    light.castShadow = true;

    // Propiedades de sombra
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -30;
    light.shadow.camera.right = 30;
    light.shadow.camera.top = 30;
    light.shadow.camera.bottom = -30;

    return light;
}

// Crear las luces direccionales
const directionalLight = createDirectionalLight(-10, 0, 0);
const directionalLight2 = createDirectionalLight(0, -10, 0);
const directionalLight3 = createDirectionalLight(10, 10, 0);

export {
    ambientLight,
    directionalLight,
    directionalLight2,
    directionalLight3
};