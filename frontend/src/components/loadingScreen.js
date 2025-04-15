export function createLoadingScreen() {
    // Crear el contenedor de la pantalla de carga
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.style.display = 'none';
    
    // Contenedor de la barra de carga
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    // Texto de cargando
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Cargando modelo...';
    
    // Barra de progreso
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar-container';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-bar-fill';
    progressFill.style.width = '0%';
    
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    progressText.textContent = '0%';
    
    // Juntar los componentes
    progressBar.appendChild(progressFill);
    progressBar.appendChild(progressText);
    
    progressContainer.appendChild(loadingText);
    progressContainer.appendChild(progressBar);
    loadingScreen.appendChild(progressContainer);
    
    // Añadir al render container
    const renderContainer = document.getElementById('render-container');
    renderContainer.appendChild(loadingScreen);
    
    // Los 2 modos: show, hide, y actualizar el progreso
    return {
        show: () => {
            loadingScreen.style.display = 'flex';
        },
        hide: () => {
            loadingScreen.style.display = 'none';
        },
        updateProgress: (percent) => {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}%`;
        }
    };
}