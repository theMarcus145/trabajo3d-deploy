import { GUI } from 'dat.gui';

// Estos son los parámetros de la GUI junto con todos sus valores por defecto
const guiParams = {
    backgroundColor: '#000000',
    wireframe: false,
    modelOpacity: false,
    useMatcap: false,
    animation: false,
    vertexNormals: false,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    ambientLightIntensity: 4,
    directionalLightIntensity: 0,
    directionalLightX: 20,
    directionalLightY: 0,
    directionalLightZ: 0,
};

// Función para manejar la activación de las opciones de "exclusión mutua"
function handleExclusiveOptionChange(changedOption) {
    // Desactivar todas las opciones y activar solo la seleccionada
    ['wireframe', 'modelOpacity', 'useMatcap', 'vertexNormals', 'animation'].forEach(option => {
        guiParams[option] = false;  // Desactivar todas
    });
    guiParams[changedOption] = true;  // Activar la opción seleccionada
}

// Función para asegurar que la animación y las normales no estén activadas simultáneamente
function handleAnimationAndNormalsChange(changedOption) {
    if (changedOption === 'animation') {
        guiParams['vertexNormals'] = false;  // Desactivar normales si la animación está activada
    } else if (changedOption === 'vertexNormals') {
        guiParams['animation'] = false;  // Desactivar animación si las normales están activadas
    }
}

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
        if (value) handleExclusiveOptionChange('wireframe');
        meshUpdateCallback('wireframe', { value });
    });
    
    folderModel.add(guiParams, 'modelOpacity').name('Opacidad').onChange((value) => {
        if (value) handleExclusiveOptionChange('modelOpacity');
        meshUpdateCallback('modelOpacity', { value });
    });
    
    folderModel.add(guiParams, 'useMatcap').name('MatCap').onChange((value) => {
        if (value) handleExclusiveOptionChange('useMatcap');
        meshUpdateCallback('matcap', { enabled: value });
    });

    folderModel.add(guiParams, 'vertexNormals').name('Normales').onChange((value) => {
        if (value) handleAnimationAndNormalsChange('vertexNormals');  // Verificar exclusión mutua
        meshUpdateCallback('vertexNormals', { value });
    });

    folderModel.add(guiParams, 'animation').name('Animación').onChange((value) => {
        if (value) handleAnimationAndNormalsChange('animation');  // Verificar exclusión mutua
        meshUpdateCallback('animation', value);
    });

    // Carpeta de controles de iluminación
    const folderLights = gui.addFolder("Iluminación ambiental");
    
    folderLights.add(guiParams, 'ambientLightIntensity', 0, 4, 0.1).name("Intensidad").onChange((value) => {
        ambientLight.intensity = value;
    });
    
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

    // Añadir la GUI al contenedor donde se encuentra el visor
    const guiContainer = document.createElement('div');
    guiContainer.style.position = 'absolute';
    guiContainer.style.top = '10px';
    guiContainer.style.right = '10px';
    guiContainer.appendChild(gui.domElement);
    renderContainer.appendChild(guiContainer);

    return { gui, guiParams };
}

export { initializeGUI, guiParams };
