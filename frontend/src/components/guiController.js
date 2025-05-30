import { GUI } from 'dat.gui';
import { directionalLight1, directionalLight2, directionalLight3, directionalLight4, 
         directionalLight5, directionalLight6, directionalLight7, directionalLight8 } from './light';

// Estos son los parámetros de la GUI con sus valores por defecto
const guiParams = {
    backgroundColor: '#000000',
    wireframe: false,
    modelOpacity: false,
    useMatcap: false,
    vertexNormals: false,
    useNormalMap: false,
    removeTextures: false,  
    animation: false,
    directionalLightIntensity: 1.6,
    castShadows: true,
};

const defaultSettings = structuredClone(guiParams);

// Variables para almacenar referencias
let animationController = null;
let normalsController = null;
let matcapController = null;
let normalMapController = null;
let meshUpdateCallback = null;
let colorControllers = {};
let materialFolder = null;

// Inicializar la GUI
function initializeGUI(renderContainer, callback, lights) {
    meshUpdateCallback = callback;

    const { directionalLight1, directionalLight2, directionalLight3, directionalLight4,
            directionalLight5, directionalLight6, directionalLight7, directionalLight8 } = lights;
    
    const gui = new GUI({ autoPlace: false });
    GUI.TEXT_CLOSED = "CERRAR CONTROLES";
    GUI.TEXT_OPEN = "ABRIR CONTROLES";

    gui.width = 200;

    // Carpeta de fondo
    const folderBackground = gui.addFolder("Fondo");
    folderBackground.addColor(guiParams, 'backgroundColor').listen().name("Color").onChange((value) => {
        meshUpdateCallback('backgroundColor', { value });
    });

    // Carpeta de control del modelo
    const folderModel = gui.addFolder("Controles de Modelo");

    folderModel.add(guiParams, 'wireframe').listen().name('Wireframe').onChange((value) => {
        meshUpdateCallback('wireframe', { value });
    });
    
    folderModel.add(guiParams, 'modelOpacity').listen().name('Opacidad').onChange((value) => {
        meshUpdateCallback('modelOpacity', { value });
    });
    
    matcapController = folderModel.add(guiParams, 'useMatcap').listen().name('MatCap').onChange((value) => {
        if (value && guiParams.useNormalMap) {
            // Si se activa el matcap, desactivar el normalmap
            guiParams.useNormalMap = false;
        }
        meshUpdateCallback('matcap', { enabled: value });
    });

    normalMapController = folderModel.add(guiParams, 'useNormalMap').listen().name('NormalMap').onChange((value) => {
        if (value && guiParams.useMatcap) {
            // Si se activa el normalmap, desactivar el matcap
            guiParams.useMatcap = false;
        }
        meshUpdateCallback('useNormalMap', { enabled: value });
    });

    folderModel.add(guiParams, 'removeTextures').listen().name('Sin Texturas').onChange((value) => {
        meshUpdateCallback('removeTextures', { value });
    });

    // Controlador de normales con exclusividad respecto a animación
    normalsController = folderModel.add(guiParams, 'vertexNormals').listen().name('Normales').onChange((value) => {
        if (value && guiParams.animation) {
            // Si se activan las normales y la animación está activa, se desactiva la animación
            guiParams.animation = false;
            meshUpdateCallback('animation', false);
        }
        meshUpdateCallback('vertexNormals', { value });
    });

    // Controlador de animación con exclusividad respecto a normales
    animationController = folderModel.add(guiParams, 'animation').listen().name('Animación').onChange((value) => {
        if (value && guiParams.vertexNormals) {
            // Lo mismo, si se activa la animación y las normales están activadas, se desactivan las normales
            guiParams.vertexNormals = false;
            meshUpdateCallback('vertexNormals', { value: false });
        }
        meshUpdateCallback('animation', value);
    });
    
    // Carpeta de colores de materiales
    materialFolder = gui.addFolder("Colores de Materiales");
    
    // Carpeta de iluminación direccional
    const directionalFolder = gui.addFolder("Iluminación");

    directionalFolder.add(guiParams, 'directionalLightIntensity', 0, 4, 0.1).listen().name("Intensidad").onChange((value) => {
        directionalLight1.intensity = value;
        directionalLight2.intensity = value;
        directionalLight3.intensity = value;
        directionalLight4.intensity = value;
        directionalLight5.intensity = value;
        directionalLight6.intensity = value;
        directionalLight7.intensity = value;
        directionalLight8.intensity = value;
    });

    // Añadir control para activar/desactivar sombras
    directionalFolder.add(guiParams, 'castShadows').listen().name("Sombras").onChange((value) => {
        directionalLight1.castShadow = value;
        directionalLight2.castShadow = value;
        directionalLight3.castShadow = value;
        directionalLight4.castShadow = value;
        directionalLight5.castShadow = value;
        directionalLight6.castShadow = value;
        directionalLight7.castShadow = value;
        directionalLight8.castShadow = value;
        
        meshUpdateCallback('castShadows', { value });
    });

    const folders = [folderBackground, folderModel, directionalFolder, materialFolder];

    setupAccordion(folders);

    // Añadir la GUI en el contenedor del visor 3D
    const guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.appendChild(gui.domElement);
    renderContainer.appendChild(guiContainer);

    return { gui, guiParams };
}

// Función para el efecto acordeón (cuando se abre una carpeta, se cierran las otras)
function setupAccordion(folders) {
    // Para cada carpeta...
    folders.forEach(folder => {
      // Obtener el título de la carpeta
      const titleElement = folder.domElement.querySelector('.title');
      
      // Si se encuentra una carpeta, entonces...
      if (titleElement) {
        titleElement.addEventListener('click', () => {
          // Comprobar si se está abriendo
          if (!folder.domElement.classList.contains('open')) {
            // Cerrar el resto de carpetas
            folders.forEach(otherFolder => {
              if (otherFolder !== folder) {
                otherFolder.close();
              }
            });
          }
        });
      }
    });
}

// Actualizar los controladores para los materiales en la GUI
function updateMaterialControllers(colorMap) {
    // Limpiar los colores de todos los controladores (para actualizar)
    colorControllers = {};
    
    // Eliminar los controladores anteriores
    if (materialFolder) {
        for (let i = materialFolder.__controllers.length - 1; i >= 0; i--) {
            materialFolder.remove(materialFolder.__controllers[i]);
        }
    }
    
    // Limpiar colores existentes de materiales en materialColors
    guiParams.materialColors = {};
    
    // Añadir un nuevo controlador para cada grupo (los grupos son objetos que tienen el mismo color)
    let colorIndex = 0;
    for (const [colorHex, materials] of colorMap.entries()) {
        const colorName = `Material ${colorIndex + 1}`;
        // Inicializar con el color existente
        guiParams.materialColors[colorHex] = `#${colorHex}`;
        
        // Añadir controlador a la carpeta
        const controller = materialFolder.addColor(guiParams.materialColors, colorHex)
            .name(colorName)
            .onChange((value) => {
                materials.forEach(mat => {
                    mat.color.set(value);
                    mat.needsUpdate = true;
                });
                
                // Actualizar el color de fondo del botón del controlador activo
                updateColorButtonBackground(colorHex, value);
            });
        
        // Almacenar la referencia
        colorControllers[colorHex] = controller;
        
        // Establecer el color de fondo inicial tras un pequeño retraso para asegurar que el DOM esté listo
        updateColorButtonBackground(colorHex, `#${colorHex}`);

        colorIndex++;
    }
}

function updateColorButtonBackground(colorHex, colorValue) {
    const controller = colorControllers[colorHex];
    if (!controller || !controller.domElement) return;

    // controller.domElement es el elemento li que contiene el botón
    const liElement = controller.domElement.closest('li.cr.color');
    
    if (liElement) {
        // Establecer el color de fondo de todo el elemento li
        liElement.style.backgroundColor = colorValue;
    }
}


function resetSettings() {
    // Reiniciar todos los parámetros a sus valores iniciales
    for (const [key, value] of Object.entries(defaultSettings)) {
        guiParams[key] = value;
    }

    // Reiniciar los colores de los materiales
    if (guiParams.materialColors) {
        for (const colorHex in guiParams.materialColors) {
            // Reiniciar cada color a su color Hex por defecto
            guiParams.materialColors[colorHex] = `#${colorHex}`;
            
            if (colorControllers[colorHex]) {
                colorControllers[colorHex].updateDisplay();
            }
        }
    }
    // Reiniciar el color de fondo
    meshUpdateCallback('backgroundColor', { value: defaultSettings.backgroundColor });

    // Reiniciar la intensidad de la luz (corregido)
    directionalLight1.intensity = defaultSettings.directionalLightIntensity;
    directionalLight2.intensity = defaultSettings.directionalLightIntensity;
    directionalLight3.intensity = defaultSettings.directionalLightIntensity;
    directionalLight4.intensity = defaultSettings.directionalLightIntensity;
    directionalLight5.intensity = defaultSettings.directionalLightIntensity;
    directionalLight6.intensity = defaultSettings.directionalLightIntensity;
    directionalLight7.intensity = defaultSettings.directionalLightIntensity;
    directionalLight8.intensity = defaultSettings.directionalLightIntensity;
    
    // Reiniciar las sombras
    directionalLight1.castShadow = defaultSettings.castShadows;
    directionalLight2.castShadow = defaultSettings.castShadows;
    directionalLight3.castShadow = defaultSettings.castShadows;
    directionalLight4.castShadow = defaultSettings.castShadows;
    directionalLight5.castShadow = defaultSettings.castShadows;
    directionalLight6.castShadow = defaultSettings.castShadows;
    directionalLight7.castShadow = defaultSettings.castShadows;
    directionalLight8.castShadow = defaultSettings.castShadows;

    const settingsToReset = [
        'wireframe', 
        'modelOpacity', 
        'useMatcap', 
        'vertexNormals', 
        'useNormalMap', 
        'removeTextures',
        'animation',
        'castShadows'
    ];

    for (const setting of settingsToReset) {
        if (setting === 'useMatcap' || setting === 'useNormalMap') {
            meshUpdateCallback(setting, { enabled: defaultSettings[setting] });
        } else if (setting === 'animation' || setting === 'vertexNormals') {
            meshUpdateCallback(setting, defaultSettings[setting]);
        } else {
            meshUpdateCallback(setting, { value: defaultSettings[setting] });
        }
    }

    meshUpdateCallback('resetMaterials', true);
}

export { initializeGUI, guiParams, updateMaterialControllers, resetSettings };