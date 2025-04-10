import { GUI } from 'dat.gui';

// Estos son los parámetros de la GUI junto con todos sus valores por defecto
const guiParams = {
    backgroundColor: '#000000',
    wireframe: false,
    modelOpacity: false,
    useMatcap: false,
    vertexNormals: false,
    animation: false,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    ambientLightIntensity: 4,
    directionalLightIntensity: 0,
    directionalLightColor: 0xffffff,
    directionalLightX: 20,
    directionalLightY: 0,
    directionalLightZ: 0,
};

// Variables para almacenar referencias a los controladores de GUI
let animationController = null;
let normalsController = null;

// Inicializar la GUI
function initializeGUI(renderContainer, meshUpdateCallback, lights) {
    const { ambientLight, directionalLight } = lights;
    
    const gui = new GUI({ autoPlace: false });
    GUI.TEXT_CLOSED = "CERRAR CONTROLES";
    GUI.TEXT_OPEN = "ABRIR CONTROLES";

    gui.width = 200;

    // Ajustar el color del fondo
    const folderBackground = gui.addFolder("Fondo");
    folderBackground.addColor(guiParams, 'backgroundColor').name("Color").onChange((value) => {
        meshUpdateCallback('backgroundColor', { value });
    });

    // Carpeta para los controles del modelo
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
    
    // Carpeta de controles de iluminación ambiental
    const folderLights = gui.addFolder("Iluminación ambiental");
    
    folderLights.add(guiParams, 'ambientLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        ambientLight.intensity = value;
    });
    
    // Carpeta de controles de iluminacón direccional
    const directionalFolder = gui.addFolder("Iluminación direccional");
    
    directionalFolder.addColor(guiParams, 'backgroundColor').name("Color").onChange((value) => {
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

    // Añadir la GUI al contenedor donde se encuentra el visor, estaría fuera del mismo sin los siguientes parámetros.
    const guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.appendChild(gui.domElement);
    renderContainer.appendChild(guiContainer);

    return { gui, guiParams };
}

// Expose the controllers so they can be updated from outside
export function updateGuiControllers() {
    if (animationController) animationController.updateDisplay();
    if (normalsController) normalsController.updateDisplay();
}

export { initializeGUI, guiParams, animationController, normalsController };