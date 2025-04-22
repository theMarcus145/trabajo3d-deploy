import { GUI } from 'dat.gui';

// These are the GUI parameters with their default values
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
    directionalLightIntensity: 2,
    directionalLightColor: 0xffffff,
};

// Variables to store references
let animationController = null;
let normalsController = null;
let materialFolder = null;
let colorControllers = {};

// Initialize the GUI
function initializeGUI(renderContainer, meshUpdateCallback, lights) {
    const { directionalLight, directionalLight2, directionalLight3 } = lights;
    
    const gui = new GUI({ autoPlace: false });
    GUI.TEXT_CLOSED = "CERRAR CONTROLES";
    GUI.TEXT_OPEN = "ABRIR CONTROLES";

    gui.width = 200;

    // Background folder
    const folderBackground = gui.addFolder("Fondo");
    folderBackground.addColor(guiParams, 'backgroundColor').name("Color").onChange((value) => {
        meshUpdateCallback('backgroundColor', { value });
    });

    // Model control folder
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

    folderModel.add(guiParams, 'useNormalMap').name('NormalMap').onChange((value) => {
        meshUpdateCallback('useNormalMap', { value });
    });

    folderModel.add(guiParams, 'removeTextures').name('Sin Texturas').onChange((value) => {
        meshUpdateCallback('removeTextures', { value });
    });

    // Normal controller with animation exclusivity
    normalsController = folderModel.add(guiParams, 'vertexNormals').name('Normales').onChange((value) => {
        if (value && guiParams.animation) {
            // If normals are activated and animation is active, deactivate it
            guiParams.animation = false;
            // Update animation controller to stop animation
            animationController.updateDisplay();
            meshUpdateCallback('animation', false);
        }
        meshUpdateCallback('vertexNormals', { value });
    });

    // Animation controller with normals exclusivity
    animationController = folderModel.add(guiParams, 'animation').name('Animación').onChange((value) => {
        if (value && guiParams.vertexNormals) {
            // Same, if animation is activated and normals are active, deactivate normals
            guiParams.vertexNormals = false;
            // Update normals to deactivate them
            normalsController.updateDisplay();
            meshUpdateCallback('vertexNormals', { value: false });
        }
        meshUpdateCallback('animation', value);
    });
    
    // Material colors folder
    materialFolder = gui.addFolder("Colores de Materiales");
    
    // Directional light folder
    const directionalFolder = gui.addFolder("Iluminación direccional");

    directionalFolder.addColor(guiParams, 'directionalLightColor').name("Color").onChange((value) => {
        directionalLight.color.set(value);
        directionalLight2.color.set(value);
        directionalLight3.color.set(value);
    });
    
    directionalFolder.add(guiParams, 'directionalLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        directionalLight.intensity = value;
        directionalLight2.intensity = value;
        directionalLight3.intensity = value;
    });

    const folders = [folderBackground, folderModel, directionalFolder, materialFolder];

    setupAccordion(gui, folders);

    // Add GUI where the 3D viewer container is located
    const guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.appendChild(gui.domElement);
    renderContainer.appendChild(guiContainer);

    return { gui, guiParams };
}

// Function for accordion effect (when you open one folder, others close)
function setupAccordion(gui, folders) {
    // For each folder...
    folders.forEach(folder => {
      // Get the folder title
      const titleElement = folder.domElement.querySelector('.title');
      
      // If found a folder, then...
      if (titleElement) {
        titleElement.addEventListener('click', () => {
          // Check if it's being opened
          if (!folder.domElement.classList.contains('open')) {
            // Close the rest of the folders
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

// Update controllers for material controls in the GUI
function updateMaterialControllers(colorMap) {
    // Clear colors from all controllers (to update)
    colorControllers = {};
    
    // Clear previous controllers
    if (materialFolder) {
        for (let i = materialFolder.__controllers.length - 1; i >= 0; i--) {
            materialFolder.remove(materialFolder.__controllers[i]);
        }
    }
    
    // Clear existing material colors in materialColors
    guiParams.materialColors = {};
    
    // Add a new controller for each group (groups are objects that all have the same color)
    let colorIndex = 0;
    for (const [colorHex, materials] of colorMap.entries()) {
        const colorName = `Material ${colorIndex + 1}`;
        // Initialize with the existing color
        guiParams.materialColors[colorHex] = `#${colorHex}`;
        
        // Add controller to the folder
        const controller = materialFolder.addColor(guiParams.materialColors, colorHex)
            .name(colorName)
            .onChange((value) => {
                materials.forEach(mat => {
                    mat.color.set(value);
                    mat.needsUpdate = true;
                });
                
                // Update controller background color with active controller color
                updateColorButtonBackground(colorHex, value);
            });
        
        // Store reference
        colorControllers[colorHex] = controller;
        
        // Set initial background color after a small delay to ensure DOM is ready
        updateColorButtonBackground(colorHex, `#${colorHex}`);

        colorIndex++;
    }
}

function updateColorButtonBackground(colorHex, colorValue) {
    const controller = colorControllers[colorHex];
    if (!controller || !controller.domElement) return;

    // controller.domElement is the li element containing the button
    const liElement = controller.domElement.closest('li.cr.color');
    
    if (liElement) {
        // Set background color for the entire li element
        liElement.style.backgroundColor = colorValue;
    }
}


function updateGuiControllers() {
    if (animationController) animationController.updateDisplay();
    if (normalsController) normalsController.updateDisplay();
}

export { initializeGUI, guiParams, updateGuiControllers, updateMaterialControllers };