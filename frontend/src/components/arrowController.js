import * as THREE from '/node_modules/three/build/three.module.js';

export function initializeModelNavigation(loadModel, url) {
    const modelListContainer = document.getElementById('model-list');
    const prevButton = document.getElementById('prev-model');
    const nextButton = document.getElementById('next-model');

    // URL base para las peticiones API
    const API_URL = url;
    
    // Flag para rastrear el estado de carga
    let isLoading = false;
    // Referencia al cargador actual para cancelación
    let currentLoader = null;

    // Función loadModel modificada que verifica el estado de carga
    function safeLoadModel(modelName) {
        // Si ya se está cargando, cancelar la carga actual y limpiar la escena
        if (isLoading && currentLoader) {
            currentLoader.cancel();
            clearScene(); // Asegurarse de que la escena se limpia
        }
        
        // Establecer la bandera de carga y llamar a loadModel original con nuestro controlador
        isLoading = true;
        currentLoader = {
            cancel: () => {
                isLoading = false;
                currentLoader = null;
            },
            complete: () => {
                isLoading = false;
                currentLoader = null;
            }
        };
        
        // Llamar a la función loadModel original con nuestro controlador
        loadModel(modelName, currentLoader);
    }

    // Obtener los modelos disponibles y crear los botones
    async function fetchAndCreateModelButtons() {
        try {
            let models;
            try {
                const response = await fetch(`${API_URL}/models.json`);
                
                if (!response.ok) {
                    console.warn('Error al obtener models.json');
                    return; // Salir si fetch devuelve un error
                }

                models = await response.json();
                
                // Asegurarse de que hay un array de modelos
                if (!models.models || !Array.isArray(models.models)) {
                    console.warn('Estructura de modelos no válida');
                    return; // Salir si la estructura es incorrecta
                }
                models.models = models.models.map(model => ({
                    ...model,
                    imagePath: `${API_URL}/${model.imagePath}`
                }));
                
                createModelButtons(models.models);
            } catch (error) {
                console.error('Error al obtener los modelos:', error);
            }
        } catch (error) {
            console.error('Error completo en la navegación de modelos:', error);
        }
    }

    function createModelButtons(models) {
        // Salir si no hay modelos o no se encuentra el contenedor de modelos
        if (!models || !models.length || !modelListContainer) {
            console.error('No hay modelos disponibles o no se encontró el contenedor de modelos');
            return;
        }

        // Crear los botones dinámicamente
        models.forEach((model, index) => {
            const button = document.createElement('button');
            button.classList.add('model-button');
            if (index === 0) button.classList.add('active');
            // Darle nombre al botón
            button.dataset.model = model.name;
            
            const span = document.createElement('span');
            span.textContent = model.name.replace(/_/g, ' ');
            
            const img = document.createElement('img');
            img.src = model.imagePath;
            img.alt = `Modelo ${model.name}`;
            img.classList.add('button-image');
            
            button.appendChild(span);
            button.appendChild(img);
            
            modelListContainer.appendChild(button);
            
            button.addEventListener('click', () => {
                // No permitir hacer clic si ya se está cargando
                if (isLoading) return;
                
                document.querySelectorAll('.model-button').forEach(btn => 
                    btn.classList.remove('active'));
                button.classList.add('active');
                safeLoadModel(model.name);
            });
        });

        // Configuración de la navegación y carga del primer modelo
        setupModelNavigation(models[0].name);
    }

    function setupModelNavigation(initialModel) {
        const buttons = Array.from(modelListContainer.querySelectorAll('.model-button'));
        
        if (!buttons.length) {
            console.warn('No se encontraron botones de modelos');
            return;
        }

        function navigateModels(direction) {
            // No permitir la navegación si ya se está cargando
            if (isLoading) return;
            
            const currentIndex = buttons.findIndex(button => button.classList.contains('active'));
            
            if (currentIndex === -1) {
                console.warn('No se encontró el botón de modelo activo');
                return;
            }
            
            let newIndex;
            if (direction === 'next') {
                newIndex = (currentIndex + 1) % buttons.length;
            } else {
                newIndex = (currentIndex - 1 + buttons.length) % buttons.length;
            }

            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[newIndex].classList.add('active');

            safeLoadModel(buttons[newIndex].dataset.model);
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                // Verificar si ya se está cargando
                if (isLoading) return;
                navigateModels('prev');
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                // Verificar si ya se está cargando
                if (isLoading) return;
                navigateModels('next');
            });
        }

        if (initialModel) {
            safeLoadModel(initialModel);
        }
    }

    function clearScene() {
        const clearEvent = new CustomEvent('clearScene');
        document.dispatchEvent(clearEvent);
    }

    fetchAndCreateModelButtons();
}
