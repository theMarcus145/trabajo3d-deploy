import * as THREE from '/node_modules/three/build/three.module.js';

export function initializeModelNavigation(loadModel) {
    const modelListContainer = document.getElementById('model-list');
    const prevButton = document.getElementById('prev-model');
    const nextButton = document.getElementById('next-model');

    // URL base para las peticiones API
    const API_URL = 'https://trabajo-3d-backend.onrender.com'

    // Fetch a los modelos disponibles y crear los botones
    async function fetchAndCreateModelButtons() {
        try {
            let models;
            try {
                const response = await fetch(`${API_URL}/models.json`);
                
                if (!response.ok) {
                    console.warn('Failed to fetch models.json');
                    return; // Salir si el fetch devuelve un error
                }

                models = await response.json();
                
                // Ensure we have a models array
                if (!models.models || !Array.isArray(models.models)) {
                    console.warn('Invalid models structure');
                    return; // Salir si la estructura es incorrecta
                }
                models.models = models.models.map(model => ({
                    ...model,
                    imagePath: `${API_URL}/${model.imagePath}`
                }));
                
                createModelButtons(models.models);
            } catch (error) {
                console.error('Error fetching models:', error);
            }
        } catch (error) {
            console.error('Complete error in model navigation:', error);
        }
    }

    function createModelButtons(models) {
        // Salir si no encuentra modelos o no encuentra la carpeta donde se almacenan
        if (!models || !models.length || !modelListContainer) {
            console.error('No models available or model container not found');
            return;
        }

        // Crear los botones dinámicamente
        models.forEach((model, index) => {
            const button = document.createElement('button');
            button.classList.add('model-button');
            if (index === 0) button.classList.add('active');
            //Darle nombre al botón
            button.dataset.model = model.name;
            
            const span = document.createElement('span');
            span.textContent = model.name.replace(/_/g, ' ');
            
            const img = document.createElement('img');
            img.src = model.imagePath;
            img.alt = `${model.name} Model`;
            img.classList.add('button-image');
            
            button.appendChild(span);
            button.appendChild(img);
            
            modelListContainer.appendChild(button);
            
            button.addEventListener('click', () => {
                document.querySelectorAll('.model-button').forEach(btn => 
                    btn.classList.remove('active'));
                button.classList.add('active');
                loadModel(model.name);
            });
        });

        // Setup de la navegación y se carga el primer modelo de todos
        setupModelNavigation(models[0].name);
    }

    function setupModelNavigation(initialModel) {
        const buttons = Array.from(modelListContainer.querySelectorAll('.model-button'));
        
        if (!buttons.length) {
            console.warn('No model buttons found');
            return;
        }

        function navigateModels(direction) {
            const currentIndex = buttons.findIndex(button => button.classList.contains('active'));
            
            if (currentIndex === -1) {
                console.warn('No active model button found');
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

            loadModel(buttons[newIndex].dataset.model);
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => navigateModels('prev'));
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => navigateModels('next'));
        }

        if (initialModel) {
            loadModel(initialModel);
        }
    }

    fetchAndCreateModelButtons();
}