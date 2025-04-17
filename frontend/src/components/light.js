import * as THREE from '/node_modules/three/build/three.module.js';

// Crear un objeto vacío al que apuntan las luces
const targetOrigin = new THREE.Object3D();
targetOrigin.position.set(0, 0, 0);

// Function to create a directional light
function createDirectionalLight(x, y, z) {
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(x, y, z);
    light.castShadow = true;

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
    
    return { light };
}

const directionalLight = createDirectionalLight(-15, 5, -15); 
const directionalLight2 = createDirectionalLight(15, 5, -15);
const directionalLight3 = createDirectionalLight(0, 0, 15);

export {
    directionalLight,
    directionalLight2,
    directionalLight3,
    targetOrigin,
};