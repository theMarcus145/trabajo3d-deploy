import { GUI } from 'dat.gui';

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
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    ambientLightIntensity: 4,
    ambientLightColor: 0xffffff,
    directionalLightIntensity: 0,
    directionalLightColor: 0xffffff,
    directionalLightX: 20,
    directionalLightY: 0,
    directionalLightZ: 0,
    materialColors: {}
};

// Variables para almacenar referencias
let animationController = null;
let normalsController = null;
let materialFolder = null;
// Almacenar los colorcontrollers para referenciarlos luego
let colorControllers = {};

// Inicializar la GUI
function initializeGUI(renderContainer, meshUpdateCallback, lights) {
    const { ambientLight, directionalLight } = lights;
    
    const gui = new GUI({ autoPlace: false });
    GUI.TEXT_CLOSED = "CERRAR CONTROLES";
    GUI.TEXT_OPEN = "ABRIR CONTROLES";

    gui.width = 200;

    // Carpeta del fondo
    const folderBackground = gui.addFolder("Fondo");
    folderBackground.addColor(guiParams, 'backgroundColor').name("Color").onChange((value) => {
        meshUpdateCallback('backgroundColor', { value });
    });

    // Carpeta para controlar el modelo
    const folderModel = gui.addFolder("Controles de Modelo");
    folderModel.add(guiParams, 'rotationX', -Math.PI, Math.PI, 0.01).name("X").onChange(() => {
        meshUpdateCallback('rotation', { axis: 'x', value: guiParams.rotationX });
    });

    folderModel.add(guiParams, 'rotationY', -Math.PI, Math.PI, 0.01).name("Y").onChange(() => {
        meshUpdateCallback('rotation', { axis: 'y', value: guiParams.rotationY });
    });

    folderModel.add(guiParams, 'rotationZ', -Math.PI, Math.PI, 0.01).name("Z").onChange(() => {
        meshUpdateCallback('rotation', { axis: 'z', value: guiParams.rotationZ });
    });

    folderModel.add(guiParams, 'wireframe').name('Wireframe').onChange((value) => {
        meshUpdateCallback('wireframe', { value });
    });
    
    folderModel.add(guiParams, 'modelOpacity').name('Opacidad').onChange((value) => {
        meshUpdateCallback('modelOpacity', { value });
    });
    
    folderModel.add(guiParams, 'useMatcap').name('MatCap').onChange((value) => {
        meshUpdateCallback('matcap', { enabled: value });
    });

    folderModel.add(guiParams, 'removeTextures').name('Sin Texturas').onChange((value) => {
        meshUpdateCallback('removeTextures', { value });
    });

    // Control de normales con exclusividad con animacion
    normalsController = folderModel.add(guiParams, 'vertexNormals').name('Normales').onChange((value) => {
        if (value && guiParams.animation) {
            // Si se activan las normales y la animación está activa, desactivarla
            guiParams.animation = false;
            // Actualizar el animation controller para que se pare la animación
            animationController.updateDisplay();
            meshUpdateCallback('animation', false);
        }
        meshUpdateCallback('vertexNormals', { value });
    });

    folderModel.add(guiParams, 'useNormalMap').name('Mapa de normales').onChange((value) => {
        meshUpdateCallback('useNormalMap', { value });
    });

    // Controlador de animaciones con exclusividad con las normales
    animationController = folderModel.add(guiParams, 'animation').name('Animación').onChange((value) => {
        if (value && guiParams.vertexNormals) {
            // Lo mismo, si se activa la animación y están las normales activas, desactivar las normales
            guiParams.vertexNormals = false;
            // Actualizar las normales para desactivarlas
            normalsController.updateDisplay();
            meshUpdateCallback('vertexNormals', { value: false });
        }
        meshUpdateCallback('animation', value);
    });
    
    // Carpeta para los colores de los materiales
    materialFolder = gui.addFolder("Colores de Materiales");
    
    // Carpeta para la luz ambiental
    const folderLights = gui.addFolder("Iluminación ambiental");

    folderLights.addColor(guiParams, 'ambientLightColor').name("Color").onChange((value) => {
        ambientLight.color.set(value);
    });
    
    folderLights.add(guiParams, 'ambientLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        ambientLight.intensity = value;
    });
    
    // Carpeta para la luz direccional
    const directionalFolder = gui.addFolder("Iluminación direccional");

    directionalFolder.addColor(guiParams, 'directionalLightColor').name("Color").onChange((value) => {
        directionalLight.color.set(value);
    });
    
    directionalFolder.add(guiParams, 'directionalLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        directionalLight.intensity = value;
    });

    
    directionalFolder.add(guiParams, 'directionalLightX', -30, 30, 1).name("X").onChange((value) => {
        directionalLight.position.x = value;
    });
    
    directionalFolder.add(guiParams, 'directionalLightY', -30, 30, 1).name("Y").onChange((value) => {
        directionalLight.position.y = value;
    });
    
    directionalFolder.add(guiParams, 'directionalLightZ', -30, 30, 1).name("Z").onChange((value) => {
        directionalLight.position.z = value;
    });

    const folders = [folderBackground, folderModel, folderLights, directionalFolder, materialFolder];

    setupAccordion(gui, folders);

    // Añadir la GUI donde se encuentre el contenedor del visor 3d
    const guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.appendChild(gui.domElement);
    renderContainer.appendChild(guiContainer);

    return { gui, guiParams };
}

//Funcion para el efecto de acordeón (cuando abres una carpeta, se cierran las demás)
function setupAccordion(gui, folders) {
    // Por cada carpeta...
    folders.forEach(folder => {
      // Coger el título de la carpeta
      const titleElement = folder.domElement.querySelector('.title');
      
      // Si encuentra una carpeta, entonces...
      if (titleElement) {
        titleElement.addEventListener('click', () => {
          // Ver si está siendo abierta
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

// Actualizar los controladores para los controles de los materiales en la GUI
function updateMaterialControllers(colorMap) {
    // Limpiar los colores de todos los controllers (para actualizar)
    colorControllers = {};
    
    // Limpiar anteriores controladores
    if (materialFolder) {
        for (let i = materialFolder.__controllers.length - 1; i >= 0; i--) {
            materialFolder.remove(materialFolder.__controllers[i]);
        }
    }
    
    // Limpiar los colores de los materiales existentes en materialColors
    guiParams.materialColors = {};
    
    // AAñadir un nuevo controlador por cada grupo (los grupos son objetos que tienen todos el mismo color)
    let colorIndex = 0;
    for (const [colorHex, materials] of colorMap.entries()) {
        const colorName = `Material ${colorIndex + 1}`;
        // Inicializar con el color existente
        guiParams.materialColors[colorHex] = `#${colorHex}`;
        
        // Añadir el controlador a la carpeta
        const controller = materialFolder.addColor(guiParams.materialColors, colorHex)
            .name(colorName)
            .onChange((value) => {

                materials.forEach(mat => {
                    mat.color.set(value);
                    mat.needsUpdate = true;
                });
                
                // Actualizar el color de fondo del controlador pasando el color activo del controlador
                updateColorButtonBackground(colorHex, value);
            });
        
        // Almacenar referencia
        colorControllers[colorHex] = controller;
        
        // Set initial background color after a small delay to ensure DOM is ready
        updateColorButtonBackground(colorHex, `#${colorHex}`);

        colorIndex++;
    }
}


function updateColorButtonBackground(colorHex, colorValue) {
    const controller = colorControllers[colorHex];
    if (!controller || !controller.domElement) return;

    // El controller.domElement es el elemento li que contiene el botón
    const liElement = controller.domElement.closest('li.cr.color');
    
    if (liElement) {
        // Establecer el color de fondo para todo el elemento li
        liElement.style.backgroundColor = colorValue;

    }
}

// Convertir de Hex a RGB
function hexToRgb(hex) {
    // quitar el # si existe
    hex = hex.replace('#', '');

    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) return null;
    
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function updateGuiControllers() {
    if (animationController) animationController.updateDisplay();
    if (normalsController) normalsController.updateDisplay();
}


export { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers };