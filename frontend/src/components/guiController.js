import { GUI } from 'dat.gui';
import { directionalLight, directionalLight2, directionalLight3, directionalLight4 } from './light';

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
    directionalLightIntensity: 2,
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

    const { directionalLight, directionalLight2, directionalLight3, directionalLight4 } = lights;
    
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

    folderModel.add(guiParams, 'wireframe').name('Wireframe').onChange((value) => {
        meshUpdateCallback('wireframe', { value });
    });
    
    folderModel.add(guiParams, 'modelOpacity').name('Opacidad').onChange((value) => {
        meshUpdateCallback('modelOpacity', { value });
    });
    
    matcapController = folderModel.add(guiParams, 'useMatcap').name('MatCap').onChange((value) => {
        if (value && guiParams.useNormalMap) {
            // Si se activa el matcap, desactivar el normalmap
            guiParams.useNormalMap = false;
            // Actualizar la UI del controller del normalmap
            normalMapController.updateDisplay();
        }
        meshUpdateCallback('matcap', { enabled: value });
    });

    normalMapController = folderModel.add(guiParams, 'useNormalMap').name('NormalMap').onChange((value) => {
        if (value && guiParams.useMatcap) {
            // Si se activa el normalmap, desactivar el matcap
            guiParams.useMatcap = false;
            // Actualizar la UI del controller del matcap
            matcapController.updateDisplay();
        }
        meshUpdateCallback('useNormalMap', { enabled: value });
    });

    folderModel.add(guiParams, 'removeTextures').name('Sin Texturas').onChange((value) => {
        meshUpdateCallback('removeTextures', { value });
    });

    // Controlador de normales con exclusividad respecto a animación
    normalsController = folderModel.add(guiParams, 'vertexNormals').name('Normales').onChange((value) => {
        if (value && guiParams.animation) {
            // Si se activan las normales y la animación está activa, se desactiva la animación
            guiParams.animation = false;
            // Actualizar el controlador de animación para detenerla
            animationController.updateDisplay();
            meshUpdateCallback('animation', false);
        }
        meshUpdateCallback('vertexNormals', { value });
    });

    // Controlador de animación con exclusividad respecto a normales
    animationController = folderModel.add(guiParams, 'animation').name('Animación').onChange((value) => {
        if (value && guiParams.vertexNormals) {
            // Lo mismo, si se activa la animación y las normales están activadas, se desactivan las normales
            guiParams.vertexNormals = false;
            // Actualizar las normales para desactivarlas
            normalsController.updateDisplay();
            meshUpdateCallback('vertexNormals', { value: false });
        }
        meshUpdateCallback('animation', value);
    });
    
    // Carpeta de colores de materiales
    materialFolder = gui.addFolder("Colores de Materiales");
    
    // Carpeta de iluminación direccional
    const directionalFolder = gui.addFolder("Iluminación");

    directionalFolder.add(guiParams, 'directionalLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        directionalLight.intensity = value;
        directionalLight2.intensity = value;
        directionalLight3.intensity = value;
        directionalLight4.intensity = value;
    });

    const folders = [folderBackground, folderModel, directionalFolder, materialFolder];

    setupAccordion(gui, folders);

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
function setupAccordion(gui, folders) {
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

function updateGuiControllers() {
    // referenciar a la gui
    const gui = materialFolder.__gui;
    
    // Actualizar todos los controladores en todas las carpetas
    for (var i = 0; i < Object.keys(gui.__folders).length; i++) {
        var key = Object.keys(gui.__folders)[i];
        for (var j = 0; j < gui.__folders[key].__controllers.length; j++) {
            gui.__folders[key].__controllers[j].updateDisplay();
        }
    }
    
    // Actualizar los controladores que no estén en carpetas
    if (gui.__controllers) {
        for (var k = 0; k < gui.__controllers.length; k++) {
            gui.__controllers[k].updateDisplay();
        }
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

    // Reinicar la intensidad de la luz
    directionalLight.intensity = defaultSettings.directionalLightIntensity;
    directionalLight2.intensity = defaultSettings.directionalLightIntensity;
    directionalLight3.intensity = defaultSettings.directionalLightIntensity;
    directionalLight4.intensity = defaultSettings.directionalLightIntensity;

    const settingsToReset = [
        'wireframe', 
        'modelOpacity', 
        'useMatcap', 
        'vertexNormals', 
        'useNormalMap', 
        'removeTextures',
        'animation'
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

    // Actualizar los controllers para que se apliquen sus valores por defecto visualmente
    updateGuiControllers();

    meshUpdateCallback('resetMaterials', true);
}

export { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers, resetSettings };