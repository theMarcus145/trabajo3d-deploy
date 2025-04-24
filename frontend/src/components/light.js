import * as THREE from '/node_modules/three/build/three.module.js';

// Crear un objeto invisible al que apuntan las luces
const targetOrigin = new THREE.Object3D();
targetOrigin.position.set(0, 0, 0);

// Función para crear cada luz direccional
function createDirectionalLight() {
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
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
// Las coordenadas representan las 8 esquinas de un cubo
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

function adjustLights(center, maxDimension) {
    if (!center || !maxDimension) return;
    
    // Posicionar el target al centro del modelo
    targetOrigin.position.copy(center);
    
    // Calcular la distancia de la luz
    const lightDistance = maxDimension * 1.5;
    
    // Posicionar las luces en un cubo imaginario alrededor del objeto
    directionalLight1.position.set(
        center.x - lightDistance,
        center.y + lightDistance,
        center.z + lightDistance
    );
    
    directionalLight2.position.set(
        center.x + lightDistance,
        center.y + lightDistance,
        center.z + lightDistance
    );

    directionalLight3.position.set(
        center.x - lightDistance,
        center.y + lightDistance,
        center.z - lightDistance
    );
    
    directionalLight4.position.set(
        center.x + lightDistance,
        center.y + lightDistance,
        center.z - lightDistance
    );
    
    directionalLight5.position.set(
        center.x - lightDistance,
        center.y - lightDistance,
        center.z + lightDistance
    );

    directionalLight6.position.set(
        center.x + lightDistance,
        center.y - lightDistance,
        center.z + lightDistance
    );
    
    directionalLight7.position.set(
        center.x - lightDistance,
        center.y - lightDistance,
        center.z - lightDistance
    );
    
    directionalLight8.position.set(
        center.x + lightDistance,
        center.y - lightDistance,
        center.z - lightDistance
    );
    
    // Ajustar las sombras dependiendo del tamaño del objeto
    [directionalLight1, directionalLight2, directionalLight3, directionalLight4,
     directionalLight5, directionalLight6, directionalLight7, directionalLight8].forEach(light => {
        light.shadow.camera.left = -maxDimension;
        light.shadow.camera.right = maxDimension;
        light.shadow.camera.top = maxDimension;
        light.shadow.camera.bottom = -maxDimension;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = lightDistance * 4;
        light.shadow.camera.updateProjectionMatrix();
    });
}

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
    adjustLights
};