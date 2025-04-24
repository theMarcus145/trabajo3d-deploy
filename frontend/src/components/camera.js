import * as THREE from '/node_modules/three/build/three.module.js';

function getCameraAspect() {
    const renderContainer = document.getElementById('render-container');
    return renderContainer ? 
        renderContainer.clientWidth / renderContainer.clientHeight : 
        16 / 9; 
}

const camera = new THREE.PerspectiveCamera(
    45,  // FOV
    getCameraAspect(),  // Aspect ratio
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Añadir un resize event listener para cambiar el aspect ratio de la página cuando este cambie
window.addEventListener('resize', () => {
    camera.aspect = getCameraAspect();
    camera.updateProjectionMatrix();
});

function adjustCamera(model, controls) {
    if (!model) return;
    
    // Crear una bounding box del objeto
    const boundingBox = new THREE.Box3().setFromObject(model);
    
    // Obtener el tamaño y el centro del modelo
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    // Calcular la posición de la cámara (fórmula sacada de https://wejn.org/2020/12/cracking-the-threejs-object-fitting-nut/)
    const fov = camera.fov * (Math.PI/180);
    const fovh = 2 * Math.atan(Math.tan(fov/2) * camera.aspect);
    let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
    let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
    let cameraZ = Math.max(dx, dy) * 1.2; // Add a small margin
    
    // Posicionar la cámara
    camera.position.set(0, size.y/4, cameraZ);
    
    // Hacer que la cámara mire al centro
    camera.lookAt(center);
    
    const minZ = boundingBox.min.z;
    const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
    
    // Ajustar el cono de visión
    camera.near = cameraToFarEdge * 0.01;
    camera.far = cameraToFarEdge * 3;
    camera.updateProjectionMatrix();
    
    // Update orbit controls to target the center of the model
    if (controls !== undefined) {
        controls.target.copy(center);
        controls.maxDistance = cameraToFarEdge * 2;
        controls.update();
    }
    
    return {
        center,
        size,
        maxDimension: Math.max(size.x, size.y, size.z)
    };
}

export { camera, adjustCamera };