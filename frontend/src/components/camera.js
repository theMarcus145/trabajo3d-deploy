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

    const boundingBox = new THREE.Box3().setFromObject(model);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const fov = camera.fov * (Math.PI/180);
    const fovh = 2 * Math.atan(Math.tan(fov/2) * camera.aspect);
    let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
    let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
    let cameraZ = Math.max(dx, dy) * 1.2;

    // Posicionar la cámara algo elevada en el eje Y
    camera.position.set(0, size.y * 0.6, cameraZ);

    // Apuntar un poco más abajo del centro para crear inclinación
    const lookAtTarget = center.clone();
    lookAtTarget.y -= size.y * 0.2; // mirar ligeramente más abajo
    camera.lookAt(lookAtTarget);

    const minZ = boundingBox.min.z;
    const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;

    camera.near = cameraToFarEdge * 0.01;
    camera.far = cameraToFarEdge * 3;
    camera.updateProjectionMatrix();

    if (controls !== undefined) {
        controls.target.copy(center);
        controls.update();
    }
}


export { camera, adjustCamera };