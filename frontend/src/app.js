import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ambientLight, directionalLight } from './components/light.js';
import { initializeModelNavigation } from './components/arrowController.js';
import { camera } from './components/camera.js';
import { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers } from './components/guiController.js';
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
controls.enablePan = false;
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


// Añadir luces
scene.add(ambientLight);
scene.add(directionalLight);

let mesh = null; // Variable global para almacenar el modelo cargado
let originalMaterials = new Map(); // Guardar materiales originales
let originalTextures = new Map(); // Guardar texturas originales

// Definir el matcap
let matcapTexture = null;
const textureLoader = new THREE.TextureLoader();


// cargar la textura al inicializar
loadMatcapTexture();

// Inicializar el model controller
initModelController(mesh, vertexNormalsGroup, colorMap, matcapTexture, originalMaterials, originalTextures);


let enableAnimation = false;
// Funcion que maneja las peticiones de la GUI, se le pasa un tipo y un valor(como un código de color)
function handleMeshUpdate(type, data) {
    if (type === 'backgroundColor') {
        const colorValue = new THREE.Color(data.value);
        renderer.setClearColor(colorValue, 1);
    } else if (type === 'rotation' && mesh) { 
        mesh.rotation[data.axis] = data.value;
    } else if (type === 'wireframe') {
        updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
    } else if (type === 'modelOpacity') {
        updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
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
            cleanupVertexNormals(vertexNormalsGroup);
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
        updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
    } else if (type === 'useNormalMap'){
        if (data.enabled !== undefined) {
            guiParams.useNormalMap = data.enabled;
        }
        updateModelAppearance();
    } else if (type === 'removeTextures') {
        // Handle the removeTextures option
        updateModelAppearance(mesh, colorMap, matcapTexture, vertexNormalsGroup, originalMaterials, originalTextures);
    }
}

// Inicializar la GUI
initializeGUI(renderContainer, handleMeshUpdate, { ambientLight, directionalLight });


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