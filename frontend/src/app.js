import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { directionalLight1, directionalLight2, directionalLight3, directionalLight4, 
         directionalLight5, directionalLight6, directionalLight7, directionalLight8, 
         targetOrigin} from './components/light.js';
import { initializeModelNavigation } from './components/arrowController.js';
import { camera } from './components/camera.js';
import { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers, resetSettings } from './components/guiController.js';
import { createLoadingScreen } from './components/loadingScreen.js';
import { cleanupVertexNormals, updateModelAppearance, initModelController } from './components/modelController.js';

// URL base para las peticiones API
const API_URL = 'https://trabajo-3d-backend.onrender.com'

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
controls.enablePan = true;
controls.enableDamping = true;

// Reloj y Mixer para las animaciones
const clock = new THREE.Clock();
let mixer = null;

// Crear grupo para las vertexNormals
let vertexNormalsGroup = new THREE.Group();
scene.add(vertexNormalsGroup);

// Inicializar el colormap
const colorMap = new Map(); // Para guardar los materiales por color base

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


// Añadir luces a la escena
scene.add(targetOrigin);
scene.add(directionalLight1);
scene.add(directionalLight2);
scene.add(directionalLight3);
scene.add(directionalLight4);
scene.add(directionalLight5);
scene.add(directionalLight6);
scene.add(directionalLight7);
scene.add(directionalLight8);


let mesh = null; // Variable global para almacenar el modelo cargado
let originalMaterials = new Map(); // Guardar materiales originales
let originalTextures = new Map(); // Guardar texturas originales

// Definir el matcap
let matcapTexture = null;
const textureLoader = new THREE.TextureLoader();
loadMatcapTexture();

// cargar la textura al inicializar
function loadMatcapTexture() {
    matcapTexture = textureLoader.load('/textures/matcap.jpg');
}

// Inicializar el model controller
initModelController(mesh, vertexNormalsGroup, colorMap, matcapTexture, originalMaterials, originalTextures);


let enableAnimation = false;
// Funcion que maneja las peticiones de la GUI, se le pasa un tipo y un valor (como un código de color)
function handleMeshUpdate(type, data) {
    switch (type) {
        case 'backgroundColor':
            const colorValue = new THREE.Color(data.value);
            renderer.setClearColor(colorValue, 1);
            break;

        case 'wireframe':
        case 'modelOpacity':
        case 'removeTextures':
            updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
            break;

        case 'resetMaterials':
            // pasar true al final si queremos reiniciar al original
            updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures, true);
            break;

        case 'matcap':
            if (data.enabled !== undefined) {
                guiParams.useMatcap = data.enabled;
                if (data.enabled) {
                    guiParams.useNormalMap = false;
                }
            }
            updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
            break;

        case 'useNormalMap':
            if (data.enabled !== undefined) {
                guiParams.useNormalMap = data.enabled;
                if (data.enabled) {
                    guiParams.useMatcap = false;
                }
            }
            updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
            break;

        case 'vertexNormals':
            if (data.value && enableAnimation) {
                enableAnimation = false;
                guiParams.animation = false;
                updateGuiControllers();
                if (mixer && animationActions.length > 0) {
                    animationActions.forEach(action => {
                        action.paused = true;
                    });
                }
            }
            updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
            break;

        case 'animation':
            enableAnimation = data;
            if (enableAnimation && guiParams.vertexNormals) {
                guiParams.vertexNormals = false;
                updateGuiControllers();
                cleanupVertexNormals(vertexNormalsGroup);
            }

            if (mixer && animationActions.length > 0) {
                animationActions.forEach(action => {
                    action.paused = !enableAnimation;
                });
            }
            break;
        case 'castShadows':
            const enableShadows = data.value;
            directionalLight1.castShadow = enableShadows;
            directionalLight2.castShadow = enableShadows;
            directionalLight3.castShadow = enableShadows;
            directionalLight4.castShadow = enableShadows;
            directionalLight5.castShadow = enableShadows;
            directionalLight6.castShadow = enableShadows;
            directionalLight7.castShadow = enableShadows;
            directionalLight8.castShadow = enableShadows;
                
            // Si hay un modelo cargado, actualiza todas sus mallas para recibir sombras
            if (mesh) {
                mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = enableShadows;
                        child.receiveShadow = enableShadows;
                    }
                });
            }
            break;
    }
}

// Inicializar la GUI
initializeGUI(renderContainer, handleMeshUpdate, { 
    directionalLight1, 
    directionalLight2, 
    directionalLight3,
    directionalLight4,
    directionalLight5,
    directionalLight6,
    directionalLight7,
    directionalLight8
});

// Esta variable almacena si el modelo tiene una animación o no
let hasAnimation = false;

// Este array almacena todas las acciones de las animaciones del modelo actualmente cargado
let animationActions = []; 

function loadModel(modelFolder) {
    // 1- Mostrar pantalla de carga
    const loadingUI = createLoadingScreen();
    loadingUI.show();
    
    // 2- Limpiar la escena por completo
    scene.children = scene.children.filter(child => 
        child === directionalLight1 || 
        child === directionalLight2 ||
        child === directionalLight3 ||
        child === directionalLight4 ||
        child === directionalLight5 || 
        child === directionalLight6 ||
        child === directionalLight7 ||
        child === directionalLight8 ||
        child === camera ||
        child === vertexNormalsGroup ||
        child === targetOrigin ||
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

        
        mesh.traverse((child) => {
            if (child.isMesh) {
                // Guardar materiales originales y configurar sombras
                originalMaterials.set(child.uuid, child.material.clone());
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Almacenar texturas originales (si existen)
                if (child.material.map) {
                    originalTextures.set(child.uuid, child.material.map);
                }

                // Almacenar el material en uso
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
        
                      colorMap.get(colorHex).push(mat);
                    }
                });
            }
        });

        // 4.1 - Re-inicializar los controladores con los nuevos datos del modelo cargado
        initModelController(mesh, vertexNormalsGroup, colorMap, matcapTexture, originalMaterials, originalTextures);

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

        // 4.5 - Aplicar las configuraciones activadas en la GUI
        updateModelAppearance();

        // 4.6 - Agregar el modelo a la escena
        scene.add(mesh);

        adjustCameraAndLights(mesh);
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

function adjustCameraAndLights(model) {
    if (!model) return;

    // Crear una bounding box del objeto
    const boundingBox = new THREE.Box3().setFromObject(model);
    
    // Obtener el tamaño y el centro del modelo
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    // Calcular la dimensión máxima para luego posicionar las luces
    const maxDimension = Math.max(size.x, size.y, size.z);
    
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
    
    // Position lights around the model
    // Set target to the center of the model
    targetOrigin.position.copy(center);
    
    // Calculate light distance based on model size
    const lightDistance = maxDimension * 1.5;
    
    // Position the lights in the 8 corners of an imaginary cube
    // Upper front left corner
    directionalLight1.position.set(
        center.x - lightDistance,
        center.y + lightDistance,
        center.z + lightDistance
    );
    
    // Upper front right corner
    directionalLight2.position.set(
        center.x + lightDistance,
        center.y + lightDistance,
        center.z + lightDistance
    );
    
    // Upper back left corner
    directionalLight3.position.set(
        center.x - lightDistance,
        center.y + lightDistance,
        center.z - lightDistance
    );
    
    // Upper back right corner
    directionalLight4.position.set(
        center.x + lightDistance,
        center.y + lightDistance,
        center.z - lightDistance
    );
    
    // Lower front left corner
    directionalLight5.position.set(
        center.x - lightDistance,
        center.y - lightDistance,
        center.z + lightDistance
    );
    
    // Lower front right corner
    directionalLight6.position.set(
        center.x + lightDistance,
        center.y - lightDistance,
        center.z + lightDistance
    );
    
    // Lower back left corner
    directionalLight7.position.set(
        center.x - lightDistance,
        center.y - lightDistance,
        center.z - lightDistance
    );
    
    // Lower back right corner
    directionalLight8.position.set(
        center.x + lightDistance,
        center.y - lightDistance,
        center.z - lightDistance
    );
    
    // Adjust shadow parameters based on model size
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
// Manejar el redimensionamiento
function onWindowResize() {
    camera.aspect = renderContainer.clientWidth / renderContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
}
window.addEventListener('resize', onWindowResize);

// Manejar el botón de reinicio de los ajustes
document.addEventListener('resetSettings', function() {
    resetSettings();
    
    // Después de reiniciar los ajustes, actualizar el modelo
    updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
    updateGuiControllers();
});

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