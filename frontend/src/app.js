import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ambientLight, directionalLight } from './components/light.js';
import { initializeModelNavigation } from './components/arrowController.js';
import { camera } from './components/camera.js';
import { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers } from './components/guiController.js';
import { createLoadingScreen } from './components/loadingScreen.js';

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
let originalTextures = new Map(); // Guardar texturas originales

// Definir el matcap
let matcapTexture = null;
const textureLoader = new THREE.TextureLoader();

// Cargar la textura matcap usando textureLoader
function loadMatcapTexture() {
    matcapTexture = textureLoader.load('/textures/matcap.jpg');
}

// cargar la textura al inicializar
loadMatcapTexture();

// Función para manejar el wireframe
function updateWireframe(meshObject) {
    // Eliminar wireframe existente si hay alguno
    meshObject.children = meshObject.children.filter(child => !child.isLineSegments);
    
    // Crear nuevo wireframe si está activado
    if (guiParams.wireframe) {
        const edges = new THREE.EdgesGeometry(meshObject.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            linewidth: 1,
            depthTest: true
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);       
        meshObject.add(wireframe);
    }
}

// Función para actualizar la apariencia del modelo según los ajustes
function updateModelAppearance() {
    if (!mesh) return;
    
    // First, clear the color map before rebuilding it
    colorMap.clear();
    
    // Clean up any existing vertex normals
    cleanupVertexNormals();
    
    mesh.traverse((child) => {
        if (child.isMesh) {
            // If not a wireframe
            if (!child.isLineSegments) {
                
                // Retrieve the original material
                const originalMaterial = originalMaterials.get(child.uuid);
                
                // Decide which material to apply based on GUI options
                if (guiParams.useMatcap && matcapTexture) {
                    // Use MatCap material
                    const matcapMaterial = new THREE.MeshMatcapMaterial({
                        matcap: matcapTexture,
                        transparent: guiParams.modelOpacity > 0,
                        opacity: guiParams.modelOpacity ? 0.6 : 1.0
                    });
                    
                    // Save current color if there is one
                    if (child.material && child.material.color) {
                        matcapMaterial.color = child.material.color.clone();
                    }
                    
                    child.material = matcapMaterial;
                } else {
                    // If switching back from matcap, restore original material
                    // but keep any color changes that were made
                    const previousColor = child.material && child.material.color ? 
                                         child.material.color.clone() : null;
                    
                    // Clone the original material to not modify it
                    child.material = originalMaterial.clone();
                    
                    // If we had a previous color, apply it
                    if (previousColor) {
                        child.material.color = previousColor;
                    }
                    
                    // Apply opacity if enabled in GUI
                    child.material.transparent = guiParams.modelOpacity > 0;
                    child.material.opacity = guiParams.modelOpacity ? 0.6 : 1.0;
                    
                    // Handle texture removal
                    if (guiParams.removeTextures) {
                        // Save original textures if first time
                        if (!originalTextures.has(child.uuid) && child.material.map) {
                            originalTextures.set(child.uuid, child.material.map);
                        }
                        
                        // Remove textures but maintain material color
                        child.material.map = null;
                        
                        // Ensure needsUpdate is true to apply changes
                        child.material.needsUpdate = true;
                    } else {
                        // Restore original texture if it exists
                        if (originalTextures.has(child.uuid)) {
                            child.material.map = originalTextures.get(child.uuid);
                            child.material.needsUpdate = true;
                        }
                    }
                }
                
                // Now, update the colorMap with the current material instance
                if (child.material && child.material.color) {
                    const colorHex = child.material.color.getHexString();
                    
                    // Add this material to the colorMap
                    if (!colorMap.has(colorHex)) {
                        colorMap.set(colorHex, [child.material]);
                    } else {
                        const materials = colorMap.get(colorHex);
                        // Check if this exact material instance is already in the array
                        if (!materials.some(mat => mat === child.material)) {
                            materials.push(child.material);
                        }
                    }
                }
                
                // Draw vertex normals if enabled
                if (guiParams.vertexNormals) { 
                    const geometry = child.geometry; 
                    geometry.computeVertexNormals();
 
                    // Get position and normal attributes
                    const positions = geometry.attributes.position;
                    const normals = geometry.attributes.normal;
 
                    // No limit on normals to load
                    const stride = 1;
 
                    // Create line segments
                    const normalPoints = [];
                    const worldMatrix = child.matrixWorld;
 
                    for (let i = 0; i < positions.count; i += stride) {
                        // Starting point
                        const start = new THREE.Vector3();
 
                        start.fromBufferAttribute(positions, i);
                        start.applyMatrix4(worldMatrix);
 
                        // End point (vertex position + normal direction)
                        const end = new THREE.Vector3();
 
                        end.fromBufferAttribute(normals, i);
                        end.multiplyScalar(0.1); // Normal length
                        end.add(start);
 
                        normalPoints.push(start, end);
                    }
 
                    // Create line segments for each normal
                    const normalGeometry = new THREE.BufferGeometry().setFromPoints(normalPoints);
                    const normalMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                    const normalLines = new THREE.LineSegments(normalGeometry, normalMaterial);

                    vertexNormalsGroup.add(normalLines); 
                }
                
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Handle wireframes
                updateWireframe(child);
            }
        }
    });   
    
    // Refresh the material controllers with the updated colorMap
    updateMaterialControllers(colorMap);
}

// Limpiar las normales
function cleanupVertexNormals() {
    // Eliminar todos los children
    while (vertexNormalsGroup.children.length > 0) {
        const object = vertexNormalsGroup.children[0];
        
        // Eliminar geometría y materiales
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

        // Si estamos activando la animación, asegurarnos de que las normales estén desactivadas
        if (enableAnimation && guiParams.vertexNormals) {
            guiParams.vertexNormals = false;
            // Actualizar la GUI para reflejar el cambio
            updateGuiControllers();
            // Limpiar las normales que podrían estar mostradas
            cleanupVertexNormals();
        }

        // Si existe el mixer y el modelo tiene animaciones (ya que el array es mayor que 0), entonces pausa o reanuda la animación
        if (mixer && animationActions.length > 0) {
            animationActions.forEach(action => {
                action.paused = !enableAnimation;
            });
        }
        
    } else if (type === 'vertexNormals') {
        // Si estamos activando las normales, asegurarnos de que la animación esté desactivada
        if (data.value && enableAnimation) {
            enableAnimation = false;
            guiParams.animation = false;
            // Actualizar la GUI para reflejar el cambio
            updateGuiControllers();
            // Pausar todas las animaciones si existen
            if (mixer && animationActions.length > 0) {
                animationActions.forEach(action => {
                    action.paused = true;
                });
            }
        }
        updateModelAppearance();
    } else if (type === 'removeTextures') {
        // Handle the removeTextures option
        updateModelAppearance();
    }
}

// Inicializar la GUI
initializeGUI(renderContainer, handleMeshUpdate, { ambientLight, directionalLight });


// Esta variable almacena si el modelo tiene una animación o no
let hasAnimation = false;

// Este array almacena todas las acciones de las animaciones del modelo actualmente cargado
let animationActions = []; 

const colorMap = new Map(); // Para guardar los materiales por color base
function loadModel(modelFolder) {
    // 1- Mostrar pantalla de carga
    const loadingUI = createLoadingScreen();
    loadingUI.show();
    
    // 2- Limpiar la escena por completo
    scene.children = scene.children.filter(child => 
        child === ambientLight || 
        child === directionalLight || 
        child === camera ||
        child === vertexNormalsGroup ||
        child.isMesh && child.material instanceof THREE.ShadowMaterial
    );
    
    // 2.1 - Limpiar materiales originales guardados de otros modelos
    originalMaterials.clear();
    originalTextures.clear();

    // 2.2 - Establecer mesh a null mientras se carga (ya que el anterior mesh sigue cargado)
    mesh = null;
    
    // 2.3 - Resetear mixer (para las animaciones)
    mixer = null;
    
    // 2.4 - Limpiar mapa de colores
    colorMap.clear();
    

    // 3 - Crear el LoadingManager para seguir el progreso de carga
    const loadingManager = new THREE.LoadingManager();
    // 3.1 - Seguir el progreso de carga (el progreso es igual a los items cargados/total de items), este progreso 
    // se pasa a update progress para actualizar la barra
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal) * 100;
        loadingUI.updateProgress(progress);
    };
    
    // 3.2 - Cuando se termina de cargar, ocultar el LoadingManager
    loadingManager.onLoad = () => {
        setTimeout(() => {
            loadingUI.hide();
        }, 500); // Pequeño delay
    };
    
    // 3.3 - Manejar errores durante la carga
    loadingManager.onError = (url) => {
        console.error(`Error loading: ${url}`);
        loadingUI.hide();
    };

    // 4 - Contactar con el backend para obtener los modelos
    const loader = new GLTFLoader(loadingManager).setPath(`${API_URL}/models/${modelFolder}/`);
    loader.load('scene.glb', (gltf) => {
        mesh = gltf.scene;  

        // 4.1 - Guardar materiales originales y configurar sombras, agrupar materiales por colores base
        mesh.traverse((child) => {
            if (child.isMesh) {
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
                
                originalMaterials.set(child.uuid, child.material.clone());

                // Almacenar texturas originales (si existen)
                if (child.material.map) {
                    originalTextures.set(child.uuid, child.material.map);
                }

                // Store the reference to the actual material being used
                const material = child.material;

                // Si es un array (múltiples materiales en una malla), recógelos todos
                const materials = Array.isArray(material) ? material : [material];

                materials.forEach((mat) => {
                    if (mat.color) {
                      const colorHex = mat.color.getHexString();
            
                      // Agrupar por color base
                      if (!colorMap.has(colorHex)) {
                        colorMap.set(colorHex, []);
                      }
            
                      // Store reference to the actual material instance
                      colorMap.get(colorHex).push(mat);
                    }
                });
            }
        });

        updateMaterialControllers(colorMap);

        // 4.2 - Si el modelo tiene una animación, entonces la longitud será mayor a 0
        hasAnimation = gltf.animations && gltf.animations.length > 0;

        // 4.3 - Manejar animaciones
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
        
        // 4.4 - Aplicar rotación inicial
        mesh.rotation.set(guiParams.rotationX, guiParams.rotationY, guiParams.rotationZ);

        // 4.5 - Aplicar las configuraciones activadas en la GUI
        updateModelAppearance();

        // 4.6 - Agregar el modelo a la escena
        scene.add(mesh);
    }, 
    // Manejar el progreso de carga de cada archivo
    (xhr) => {
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            loadingUI.updateProgress(percentComplete);
        }
    }, 
    (error) => {
        console.error(`Error loading model from ${modelFolder}:`, error);
        loadingUI.hide();
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