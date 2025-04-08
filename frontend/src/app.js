import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ambientLight, directionalLight } from './components/light.js';
import { initializeModelNavigation } from './components/arrowController.js';
import { camera } from './components/camera.js';
import { initializeGUI, guiParams } from './components/guiController.js';

// Crear el renderer
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});

// Reloj y Mixer para las animaciones
const clock = new THREE.Clock();
let mixer = null;
let isAnimated = false; // Flag to track if model is animated

// Sombras
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Configurar el renderer
const renderContainer = document.getElementById('render-container');
renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderContainer.appendChild(renderer.domElement);

// URL base para las peticiones API
const API_URL = 'https://trabajo-3d-backend.onrender.com'

// Crear la escena
const scene = new THREE.Scene();
scene.add(camera);

// Controles de cámara
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;

// Añadir luces
scene.add(ambientLight);
scene.add(directionalLight);

let mesh = null; // Variable global para almacenar el modelo cargado
let originalMaterials = new Map(); // Guardar materiales originales
let meshesWithWireframe = new Set(); // Track meshes that need wireframes

// Definir el matcap
let matcapTexture = null;
const textureLoader = new THREE.TextureLoader();

// Cargar la textura matcap usando textureLoader
function loadMatcapTexture() {
    matcapTexture = textureLoader.load('/textures/matcap.jpg');
}

// cargar la textura al inicializar
loadMatcapTexture();

// Function to clear all wireframes from scene
function clearAllWireframes() {
    scene.children = scene.children.filter(child => !child.isWireframeHelper);
    meshesWithWireframe.clear();
}

// Function to update or create wireframes
function updateWireframes() {
    if (!mesh || !guiParams.wireframe) return;
    
    // First remove all existing wireframes
    scene.children = scene.children.filter(child => !child.isWireframeHelper);
    
    // If there are animated models, recreate wireframes each frame
    if (isAnimated) {
        mesh.traverse((child) => {
            if (child.isMesh && meshesWithWireframe.has(child.uuid)) {
                // Create new wireframe from current geometry state
                const wireGeometry = new THREE.WireframeGeometry(child.geometry);
                const wireMaterial = new THREE.LineBasicMaterial({ 
                    color: 0xffffff,
                    linewidth: 1
                });
                const wireframe = new THREE.LineSegments(wireGeometry, wireMaterial);
                
                // Copy transform from mesh
                wireframe.position.copy(child.position);
                wireframe.quaternion.copy(child.quaternion);
                wireframe.scale.copy(child.scale);
                
                // Apply world matrix from mesh
                wireframe.applyMatrix4(child.matrixWorld);
                
                // Mark as wireframe helper for later filtering
                wireframe.isWireframeHelper = true;
                
                // Add to scene
                scene.add(wireframe);
            }
        });
    }
}

// Funcion para actualizar la apariencia del modelo según los ajustes
function updateModelAppearance() {
    if (!mesh) return;
    
    // Clear any existing wireframes
    clearAllWireframes();
    
    mesh.traverse((child) => {
        if (child.isMesh) {
            // Recuperar el material original
            const originalMaterial = originalMaterials.get(child.uuid);
            
            // Decidir qué material aplicar basado en las opciones de la GUI
            if (guiParams.useMatcap && matcapTexture) {
                // Usar material MatCap
                const matcapMaterial = new THREE.MeshMatcapMaterial({
                    matcap: matcapTexture,
                    transparent: guiParams.modelOpacity,
                    opacity: guiParams.modelOpacity ? 0.6 : 1.0
                });
                
                child.material = matcapMaterial;
            } else {
                // Usar material original con posible opacidad
                child.material = originalMaterial.clone();
                
                if (guiParams.modelOpacity) {
                    child.material.transparent = true;
                    child.material.opacity = 0.6;
                }
            }
            
            // Ensure shadows are enabled
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Add to set if wireframe is enabled
            if (guiParams.wireframe) {
                meshesWithWireframe.add(child.uuid);
            }
        }
    });
    
    // Initial creation of wireframes
    updateWireframes();
}

// Funcion para manejar el callback de las actualizaciones del mesh
function handleMeshUpdate(type, data) {
    if (type === 'backgroundColor') {
        const colorValue = new THREE.Color(data.value);
        renderer.setClearColor(colorValue, 1);
    } else if (type === 'rotation' && mesh) { 
        mesh.rotation[data.axis] = data.value;
    } else if (type === 'wireframe') {
        if (data.value) {
            // Wireframe enabled
            if (mesh) {
                mesh.traverse(child => {
                    if (child.isMesh) {
                        meshesWithWireframe.add(child.uuid);
                    }
                });
            }
        } else {
            // Wireframe disabled
            clearAllWireframes();
        }
        updateModelAppearance();
    } else if (type === 'modelOpacity') {
        updateModelAppearance();
    } else if (type === 'matcap') {
        if (data.enabled !== undefined) {
            guiParams.useMatcap = data.enabled;
        }
        updateModelAppearance();
    }
}

// Inicializar la GUI
initializeGUI(renderContainer, handleMeshUpdate, { ambientLight, directionalLight });

// Función para cargar modelos
function loadModel(modelFolder) {
    // Limpiar la escena
    scene.children = scene.children.filter(child => 
        child === ambientLight || 
        child === directionalLight || 
        child === camera ||
        child.isMesh && child.material instanceof THREE.ShadowMaterial
    );
    
    // Limpiar wireframes
    clearAllWireframes();
    
    // Limpiar materiales originales guardados de otros modelos
    originalMaterials.clear();
    
    // Establecer mesh a null mientras se carga
    mesh = null;
    mixer = null;
    isAnimated = false;

    // Contactar con el backend para obtener los modelos
    const loader = new GLTFLoader().setPath(`${API_URL}/models/${modelFolder}/`);
    loader.load('scene.glb', (gltf) => {
        mesh = gltf.scene;  

        // Guardar materiales originales y configurar sombras
        mesh.traverse((child) => {
            if (child.isMesh) {
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
                
                originalMaterials.set(child.uuid, child.material.clone());
            }
        });

        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(mesh);
            
            gltf.animations.forEach((clip) => {
              const action = mixer.clipAction(clip);
              action.play(); // Reproduce la animación
            });
            
            isAnimated = true; // Mark as animated
        }
        
        // Aplicar rotación inicial
        mesh.rotation.set(guiParams.rotationX, guiParams.rotationY, guiParams.rotationZ);

        // Aplicar las configuraciones activadas en la GUI
        updateModelAppearance();

        // Agregar el modelo a la escena
        scene.add(mesh);
    }, undefined, (error) => {
        console.error(`Error loading model from ${modelFolder}:`, error);
    });
}

// Manejar el redimensionamiento
function onWindowResize() {
    camera.aspect = renderContainer.clientWidth / renderContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
}
window.addEventListener('resize', onWindowResize);

// Animación
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta); // Actualizar las animaciones

    // If model is animated and wireframe is enabled, update wireframes
    if (isAnimated && guiParams.wireframe) {
        updateWireframes();
    }

    controls.update();
    renderer.render(scene, camera);
}

initializeModelNavigation(loadModel);
animate();