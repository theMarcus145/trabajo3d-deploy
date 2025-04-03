import * as THREE from '/node_modules/three/build/three.module.js';

// Crear una luz de ambiente
const ambientLight = new THREE.AmbientLight(0xffffff, 1);

// Crear una luz direccional
const directionalLight = new THREE.DirectionalLight(0xffffff, 0);
directionalLight.position.set(20, 10, 20);
directionalLight.castShadow = true;

// Propiedades de las sombras
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;

export { 
    ambientLight, 
    directionalLight, 
};