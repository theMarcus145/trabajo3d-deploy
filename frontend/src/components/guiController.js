import { GUI } from 'dat.gui';

// Create GUI parameters
const guiParams = {
    backgroundColor: '#000000',
    wireframe: false,
    modelOpacity: false,
    useMatcap: false,     // Option to enable/disable MatCap
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    ambientLightIntensity: 2.5,
    directionalLightIntensity: 0,
    directionalLightX: 20,
    directionalLightY: 0,
    directionalLightZ: 0,
};

// Initialize GUI
function initializeGUI(renderContainer, meshUpdateCallback, lights) {
    const { ambientLight, directionalLight } = lights;
    
    const gui = new GUI({ autoPlace: false });
    GUI.TEXT_CLOSED = "CERRAR CONTROLES";
    GUI.TEXT_OPEN = "ABRIR CONTROLES";

    gui.width = 200;

    // Background color control
    const folderBackground = gui.addFolder("Fondo");
    folderBackground.addColor(guiParams, 'backgroundColor').name("Color").onChange((value) => {
        // Update the renderer's clear color
        meshUpdateCallback('backgroundColor', { value });
    });

    // Model Controls folder
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
    
    // MatCap toggle - simple on/off without type selector
    folderModel.add(guiParams, 'useMatcap').name('MatCap').onChange((value) => {
        meshUpdateCallback('matcap', { enabled: value });
    });
    
    // Light Controls folder
    const folderLights = gui.addFolder("Iluminación ambiental");
    
    // Ambient light
    folderLights.add(guiParams, 'ambientLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        ambientLight.intensity = value;
    });
    
    // Directional light
    const directionalFolder = gui.addFolder("Iluminación direccional");
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

export { initializeGUI, guiParams };