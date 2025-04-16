import { GUI } from 'dat.gui';

// These are the GUI parameters with their default values
const guiParams = {
    backgroundColor: '#000000',
    wireframe: false,
    modelOpacity: false,
    useMatcap: false,
    vertexNormals: false,
    removeTextures: false,  // Added parameter
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
    // Object to store material colors
    materialColors: {}
};

// Variables to store references to GUI controllers
let animationController = null;
let normalsController = null;
let materialFolder = null;
// Store color controllers for later reference
let colorControllers = {};

// Initialize the GUI
function initializeGUI(renderContainer, meshUpdateCallback, lights) {
    const { ambientLight, directionalLight } = lights;
    
    const gui = new GUI({ autoPlace: false });
    GUI.TEXT_CLOSED = "CERRAR CONTROLES";
    GUI.TEXT_OPEN = "ABRIR CONTROLES";

    gui.width = 200;

    // Background color adjustment
    const folderBackground = gui.addFolder("Fondo");
    folderBackground.addColor(guiParams, 'backgroundColor').name("Color").onChange((value) => {
        meshUpdateCallback('backgroundColor', { value });
    });

    // Model controls folder
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

    // Add the removeTextures option
    folderModel.add(guiParams, 'removeTextures').name('Sin Texturas').onChange((value) => {
        meshUpdateCallback('removeTextures', { value });
    });

    // Add vertexNormals control with mutual exclusivity with animation
    normalsController = folderModel.add(guiParams, 'vertexNormals').name('Normales').onChange((value) => {
        if (value && guiParams.animation) {
            // If enabling normales and animation is already on, disable animation
            guiParams.animation = false;
            // Update the animation controller to reflect the change
            animationController.updateDisplay();
            meshUpdateCallback('animation', false);
        }
        meshUpdateCallback('vertexNormals', { value });
    });

    // Add animation control with mutual exclusivity with vertexNormals
    animationController = folderModel.add(guiParams, 'animation').name('Animación').onChange((value) => {
        if (value && guiParams.vertexNormals) {
            // If enabling animation and normales is already on, disable normales
            guiParams.vertexNormals = false;
            // Update the normales controller to reflect the change
            normalsController.updateDisplay();
            meshUpdateCallback('vertexNormals', { value: false });
        }
        meshUpdateCallback('animation', value);
    });
    
    // Create materials folder for colors
    materialFolder = gui.addFolder("Colores de Materiales");
    
    // Ambient light controls folder
    const folderLights = gui.addFolder("Iluminación ambiental");

    folderLights.addColor(guiParams, 'ambientLightColor').name("Color").onChange((value) => {
        ambientLight.color.set(value);
    });
    
    folderLights.add(guiParams, 'ambientLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        ambientLight.intensity = value;
    });
    
    // Directional light controls folder
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

    // Add the GUI to the container where the viewer is
    const guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.appendChild(gui.domElement);
    renderContainer.appendChild(guiContainer);

    return { gui, guiParams };
}

function setupAccordion(gui, folders) {
    folders.forEach(folder => {
      // Find the title element in each folder
      const titleElement = folder.domElement.querySelector('.title');
      
      if (titleElement) {
        titleElement.addEventListener('click', () => {
          // Check if this folder is being opened (it's currently closed)
          if (!folder.domElement.classList.contains('open')) {
            // Close all other folders
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


// Function to update material controllers in the GUI
function updateMaterialControllers(colorMap) {
    // Clear existing color controllers storage
    colorControllers = {};
    
    // Clear existing material folder controllers
    if (materialFolder) {
        for (let i = materialFolder.__controllers.length - 1; i >= 0; i--) {
            materialFolder.remove(materialFolder.__controllers[i]);
        }
    }
    
    // Clear existing material colors in guiParams
    guiParams.materialColors = {};
    
    // Add new color controllers for each material group
    let colorIndex = 0;
    for (const [colorHex, materials] of colorMap.entries()) {
        const colorName = `Material ${colorIndex + 1}`;
        // Initialize with the existing color or a default
        guiParams.materialColors[colorHex] = `#${colorHex}`;
        
        // Add color controller to the material folder
        const controller = materialFolder.addColor(guiParams.materialColors, colorHex)
            .name(colorName)
            .onChange((value) => {
                // Directly update all materials with this base color
                materials.forEach(mat => {
                    mat.color.set(value);
                    mat.needsUpdate = true;
                });
                
                // Update the background color of the button
                updateColorButtonBackground(colorHex, value);
            });
        
        // Store controller reference by colorHex
        colorControllers[colorHex] = controller;
        
        // Set initial background color after a small delay to ensure DOM is ready
        setTimeout(() => {
            updateColorButtonBackground(colorHex, `#${colorHex}`);
        }, 50);
        
        colorIndex++;
    }
}

// Improved function to update the background color of a color controller button
function updateColorButtonBackground(colorHex, colorValue) {
    const controller = colorControllers[colorHex];
    if (!controller || !controller.domElement) return;

    // El controller.domElement es el elemento li que contiene el botón
    const liElement = controller.domElement.closest('li.cr.color');
    
    if (liElement) {
        // Establecer el color de fondo para todo el elemento li
        liElement.style.backgroundColor = colorValue;
        
        // Calcular la luminancia para determinar si el texto debe ser negro o blanco
        const rgb = hexToRgb(colorValue);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        liElement.style.color = luminance > 0.5 ? '#000000' : '#ffffff';
    }
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle shorthand hex (e.g. #FFF)
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Parse r, g, b values
    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) return null;
    
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

// Expose the controllers so they can be updated from outside
function updateGuiControllers() {
    if (animationController) animationController.updateDisplay();
    if (normalsController) normalsController.updateDisplay();
}


export { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers };