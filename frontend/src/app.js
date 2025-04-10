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

// Crear la escena
const scene = new THREE.Scene();
scene.add(camera);

// Controles de cámara
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;

// Reloj y Mixer para las animaciones
const clock = new THREE.Clock();
let mixer = null;

// Crear grupo para las vertexNormals
let vertexNormalsGroup = new THREE.Group();
scene.add(vertexNormalsGroup);

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

// Añadir luces
scene.add(ambientLight);
scene.add(directionalLight);

let mesh = null; // Variable global para almacenar el modelo cargado
let originalMaterials = new Map(); // Guardar materiales originales

// Definir el matcap
let matcapTexture = null;
const textureLoader = new THREE.TextureLoader();

// Cargar la textura matcap usando textureLoader
function loadMatcapTexture() {
    matcapTexture = textureLoader.load('/textures/matcap.jpg');
}

// cargar la textura al inicializar
loadMatcapTexture();

function updateWireframe(rootObject) {
    // Eliminar wireframes previos
    rootObject.traverse(child => {
        child.children = child.children.filter(c => !c.isLineSegments);
    });

    if (!guiParams.wireframe) return;

    // Crear nuevo wireframe
    rootObject.traverse(child => {
        if (child.isMesh && child.geometry) {
            const edges = new THREE.EdgesGeometry(child.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0xffffff,
                depthTest: true
            });
            const wireframe = new THREE.LineSegments(edges, lineMaterial);

            // Obtener posición global y orientación
            child.updateWorldMatrix(true, false); // importante para que el worldMatrix esté actualizado
            child.getWorldPosition(wireframe.position);
            child.getWorldQuaternion(wireframe.quaternion);
            wireframe.scale.copy(child.getWorldScale());

            scene.add(wireframe);
        }
    });
}


// Función para actualizar la apariencia del modelo según los ajustes
function updateModelAppearance() {
    if (!mesh) return;
    
    // Primero, limpiar cualquier normal de vértices existente
    cleanupVertexNormals();
    
    mesh.traverse((child) => {
        if (child.isMesh) {
            // Si no es un wireframe
            if (!child.isLineSegments) {
                
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
                    
                    // Aplicar opacidad si está habilitada en la GUI
                    child.material.transparent = guiParams.modelOpacity > 0;
                    child.material.opacity = guiParams.modelOpacity ? 0.6 : 1.0;
                }
                // Dibujar normales de los vértices si está habilitado
                if (guiParams.vertexNormals) {
                    const geometry = child.geometry;
                    geometry.computeVertexNormals();
            
                    // Obtener la posición y atributos de la normal
                    const positions = geometry.attributes.position;
                    const normals = geometry.attributes.normal;
            
                    // Eliminar el límite de normales a cargar, procesamos todas las normales
                    const stride = 1; // No limitar la cantidad de normales
            
                    // Crear segmentos de línea
                    const normalPoints = [];
            
                    const worldMatrix = child.matrixWorld;
            
                    for (let i = 0; i < positions.count; i += stride) {
                        // Punto de comienzo
                        const start = new THREE.Vector3();
                        start.fromBufferAttribute(positions, i);
                        start.applyMatrix4(worldMatrix);
                
                        // Punto final (vertex position + normal direction)
                        const end = new THREE.Vector3();
                        end.fromBufferAttribute(normals, i);
                        end.multiplyScalar(0.1); // Longitud de la normal
                        end.add(start);
                
                        normalPoints.push(start, end);
                    }
                    // Crear segmentos de línea por cada normal
                    const normalGeometry = new THREE.BufferGeometry().setFromPoints(normalPoints);
                    const normalMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                    const normalLines = new THREE.LineSegments(normalGeometry, normalMaterial);
                    
                    vertexNormalsGroup.add(normalLines);
                }
                // Asegurar que las sombras estén habilitadas
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Manejar wireframes
                updateWireframe(child);
            }
        }
    });
}

// Function to clean up vertex normals
function cleanupVertexNormals() {
    // Remove all children
    while (vertexNormalsGroup.children.length > 0) {
        const object = vertexNormalsGroup.children[0];
        
        // Dispose of geometries and materials
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        
        vertexNormalsGroup.remove(object);
    }
}


let enableAnimation = false;
// Funcion para manejar el callback de las actualizaciones del mesh
function handleMeshUpdate(type, data) {
    if (type === 'backgroundColor') {
        const colorValue = new THREE.Color(data.value);
        renderer.setClearColor(colorValue, 1);
    } else if (type === 'rotation' && mesh) { 
        mesh.rotation[data.axis] = data.value;
    } else if (type === 'wireframe') {
        updateModelAppearance();
    } else if (type === 'modelOpacity') {
        updateModelAppearance();
    } else if (type === 'matcap') {
        if (data.enabled !== undefined) {
            guiParams.useMatcap = data.enabled;
        }
        updateModelAppearance();
    } else if (type === 'animation') {
        enableAnimation = data;

        // Si existe el mixer y el modelo tiene animaciones (ya que el array es mayor que 0), entonces pausa o reanuda la animación
        if (mixer && animationActions.length > 0) {
            animationActions.forEach(action => {
                action.paused = !enableAnimation;
            });
        }
        
    } else if (type === 'vertexNormals') {
        updateModelAppearance();
    }
}

// Inicializar la GUI
initializeGUI(renderContainer, handleMeshUpdate, { ambientLight, directionalLight });

// Esta variable almacena si el modelo tiene una animación o no
let hasAnimation = false;

// Este array almacena todas las acciones de las animaciones del modelo actualmente cargado
let animationActions = []; 

// Función para cargar modelos
function loadModel(modelFolder) {
    // Limpiar la escena
    scene.children = scene.children.filter(child => 
        child === ambientLight || 
        child === directionalLight || 
        child === camera ||
        child === vertexNormalsGroup ||
        child.isMesh && child.material instanceof THREE.ShadowMaterial
    );
    
    // Limpiar materiales originales guardados de otros modelos
    originalMaterials.clear();
    
    // Resetear mixer
    mixer = null;
    
    // Establecer mesh a null mientras se carga
    mesh = null;

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
        // Si el modelo tiene una animación, entonces la longitud será mayor a 0
        hasAnimation = gltf.animations && gltf.animations.length > 0;

        // Manejar animaciones
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(mesh);
            animationActions = []; // Reiniciar 
        
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
                action.paused = !enableAnimation; // Pausar si está desactivado
                animationActions.push(action); // Guardar acción
            });
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
    
    // Solo actualizar las animaciones si están habilitadas
    if (enableAnimation && hasAnimation) {
        mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
}


initializeModelNavigation(loadModel);
animate();