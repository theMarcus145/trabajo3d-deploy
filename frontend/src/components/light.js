import * as THREE from '/node_modules/three/build/three.module.js';

// Crear un objeto vacío al que apuntan las luces
const targetOrigin = new THREE.Object3D();
targetOrigin.position.set(0, 0, 0);

// Function to create a directional light and its helper
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

    light.target = targetOrigin;

    // Create helper for this light
    const helper = new THREE.DirectionalLightHelper(light, 5);
    
    return { light, helper };
}

// Crear 3 luces que hagan un triángulo, now with helpers
const { light: directionalLight, helper: directionalLightHelper } = createDirectionalLight(-10, 0, -10); 
const { light: directionalLight2, helper: directionalLightHelper2 } = createDirectionalLight(10, 0, -10);
const { light: directionalLight3, helper: directionalLightHelper3 } = createDirectionalLight(0, 0, 10);

// Helper visibility control
let helpersVisible = false;

// Function to toggle all helpers' visibility
function toggleLightHelpers(visible) {
    helpersVisible = visible;
    directionalLightHelper.visible = visible;
    directionalLightHelper2.visible = visible;
    directionalLightHelper3.visible = visible;
}

// Function to update helper positions
function updateLightHelpers() {
    if (helpersVisible) {
        directionalLightHelper.update();
        directionalLightHelper2.update();
        directionalLightHelper3.update();
    }
}

export {
    directionalLight,
    directionalLight2,
    directionalLight3,
    directionalLightHelper,
    directionalLightHelper2,
    directionalLightHelper3,
    targetOrigin,
    toggleLightHelpers,
    updateLightHelpers,
    helpersVisible
};