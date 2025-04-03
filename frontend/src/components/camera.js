import * as THREE from '/node_modules/three/build/three.module.js';

// Get render container dimensions after the DOM is loaded
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

export { camera };