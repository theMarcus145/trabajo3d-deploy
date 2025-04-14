import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ambientLight, directionalLight } from './components/light.js';
import { initializeModelNavigation } from './components/arrowController.js';
import { camera } from './components/camera.js';
import { initializeGUI, guiParams, updateGuiControllers } from './components/guiController.js';

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
    }
}

// Inicializar la GUI
initializeGUI(renderContainer, handleMeshUpdate, { ambientLight, directionalLight });

function createLoadingScreen() {
    // Crear el contenedor de la pantalla de carga
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.style.display = 'none';
    
    // Contenedor de la barra de carga
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    // Texto de cargando
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Cargando modelo...';
    
    // Barra de progreso
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar-container';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-bar-fill';
    progressFill.style.width = '0%';
    
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    progressText.textContent = '0%';
    
    // Juntar los componentes
    progressBar.appendChild(progressFill);
    progressBar.appendChild(progressText);
    
    progressContainer.appendChild(loadingText);
    progressContainer.appendChild(progressBar);
    loadingScreen.appendChild(progressContainer);
    
    // Añadir al render container
    const renderContainer = document.getElementById('render-container');
    renderContainer.appendChild(loadingScreen);
    
    // Los 2 modos: show, hide, y actualizar el progreso
    return {
        show: () => {
            loadingScreen.style.display = 'flex';
        },
        hide: () => {
            loadingScreen.style.display = 'none';
        },
        updateProgress: (percent) => {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}%`;
        }
    };
}

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

    // 2.2 - Establecer mesh a null mientras se carga (ya que el anterior mesh sigue cargado)
    mesh = null;
    
    // 2.3 - Resetear mixer (para las animaciones)
    mixer = null;
    

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

                for (const [colorHex, mats] of colorMap.entries()) {
                    console.log(`Color base: #${colorHex}, materiales:`, mats);
                
                    // Por ejemplo, cambiar a rojo
                    mats.forEach(mat => mat.color.set('red'));
                }
            }
        });
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