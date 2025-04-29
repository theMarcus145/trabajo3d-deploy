import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { upload, updateModelsJson } from './src/components/uploadController.js';
import { verifyCredentials, generateToken, verifyToken } from './src/components/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://3dsoulschoolvisor.netlify.app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware con opciones de CORS mejoradas
app.use(cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS, DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Servir archivos estáticos para modelos, previsualizaciones, etc.
app.use('/models', express.static(path.join(__dirname, 'public', 'models')));
app.use('/models.json', express.static(path.join(__dirname, 'public', 'models.json')));
app.use('/previews', express.static(path.join(__dirname, 'public', 'previews')));

// Endpoint para verificar si el servidor está funcionando
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor en funcionamiento' });
});

// Ruta de inicio de sesión
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Solicitud de inicio de sesión:', { username });
        
        // Validar entrada
        if (!username || !password) {
            console.log('Falta usuario o contraseña');
            return res.status(400).json({
                error: 'Se requiere usuario y contraseña'
            });
        }
        
        // Verificar credenciales
        const isValid = await verifyCredentials(username, password);
        
        console.log('Credenciales válidas:', isValid);
        
        if (!isValid) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }
        
        // Generar token
        const token = generateToken(username);
        
        // Enviar token al cliente
        res.json({
            message: 'Autenticación exitosa',
            token
        });
    } catch (error) {
        console.error('Error de autenticación:', error);
        res.status(500).json({
            error: 'Error en el servidor',
            message: error.message
        });
    }
});

// Ruta para verificar token
app.get('/verify-token', verifyToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user.username
    });
});

// Ruta para subir modelo 3D y previsualización
app.post('/upload', verifyToken, upload.fields([
    { name: 'model', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Solicitud de subida recibida:', req.body);
        console.log('Archivos recibidos:', req.files ? Object.keys(req.files) : 'Sin archivos');
        
        const { modelName } = req.body;
        
        if (!req.files || !req.files['model'] || !req.files['preview']) {
            return res.status(400).json({ 
                error: 'Se requieren ambos archivos: modelo y previsualización' 
            });
        }
        
        const modelFile = req.files['model'][0];
        const previewFile = req.files['preview'][0];

        // Validar entradas
        if (!modelName) {
            return res.status(400).json({ 
                error: 'Se requiere el nombre del modelo' 
            });
        }

        console.log('Procesando subida del modelo:', modelName);

        // Actualizar models.json y mover archivos
        const updatedModel = await updateModelsJson(
            modelName, 
            modelFile, 
            previewFile
        );

        console.log('Subida exitosa:', updatedModel);

        res.json({
            message: 'Modelo correctamente subido',
            model: updatedModel
        });
    } catch (error) {
        console.error('Error al subir:', error);
        res.status(500).json({ 
            error: 'Error al subir el modelo',
            message: error.message 
        });
    }
});

// Servir models.json desde el directorio público
app.get('/models.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'models.json'));
});

// Crear directorios necesarios al iniciar
async function ensureDirectories() {
    const dirs = [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'public', 'models'),
        path.join(__dirname, 'public', 'previews'),
        path.join(__dirname, 'public', 'temp')
    ];
    
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`Directorio asegurado: ${dir}`);
        } catch (err) {
            console.warn(`No se pudo crear el directorio ${dir}:`, err);
        }
    }
    
    // Asegurarse de que models.json exista
    const modelsJsonPath = path.join(__dirname, 'public', 'models.json');
    try {
        await fs.access(modelsJsonPath);
    } catch (err) {
        // El archivo no existe, se crea
        await fs.writeFile(modelsJsonPath, JSON.stringify({ models: [] }, null, 2));
        console.log('Archivo inicial models.json creado');
    }
}

// Iniciar servidor
ensureDirectories().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor en ejecución en el puerto ${PORT}`);
        console.log(`Accede al backend en https://trabajo-3d-backend.onrender.com:${PORT}`);
    });
}).catch(err => {
    console.error('No se pudo inicializar el servidor:', err);
});

// Ruta para eliminar modelo
app.post('/delete-model', verifyToken, async (req, res) => {
    try {
        const { modelName, modelPath, imagePath } = req.body;
        
        console.log('Solicitud de eliminación recibida:', { modelName, modelPath, imagePath });
        
        // Validar entrada
        if (!modelName || !modelPath || !imagePath) {
            return res.status(400).json({ 
                error: 'Falta información del modelo' 
            });
        }
        
        // Leer models.json
        const modelsJsonPath = path.join(__dirname, 'public', 'models.json');
        let modelsData;
        
        try {
            const existingData = await fs.readFile(modelsJsonPath, 'utf8');
            modelsData = JSON.parse(existingData);
        } catch (error) {
            console.error('Error al leer models.json:', error);
            return res.status(500).json({ 
                error: 'No se pudo leer el archivo de modelos' 
            });
        }
        
        // Buscar el modelo en el array
        const modelIndex = modelsData.models.findIndex(
            model => model.name.toLowerCase() === modelName.toLowerCase()
        );
        
        if (modelIndex === -1) {
            return res.status(404).json({ 
                error: 'Modelo no encontrado' 
            });
        }
        
        // Obtener datos del modelo antes de eliminar
        const modelToDelete = modelsData.models[modelIndex];
        
        // Rutas absolutas
        const modelDir = path.join(__dirname, 'public', 'models', modelName);
        const previewFile = path.join(__dirname, 'public', imagePath);
        
        // Eliminar directorio del modelo
        try {
            await fs.rm(modelDir, { recursive: true, force: true });
            console.log('Directorio del modelo eliminado:', modelDir);
        } catch (error) {
            console.warn('Error al eliminar directorio del modelo:', error);
            // Continuar aunque falle la eliminación del directorio
        }
        
        // Eliminar imagen de previsualización
        try {
            await fs.unlink(previewFile);
            console.log('Imagen de previsualización eliminada:', previewFile);
        } catch (error) {
            console.warn('Error al eliminar imagen de previsualización:', error);
            // Continuar aunque falle la eliminación de la imagen
        }
        
        // Eliminar modelo del array
        modelsData.models.splice(modelIndex, 1);
        
        // Escribir models.json actualizado
        await fs.writeFile(
            modelsJsonPath, 
            JSON.stringify(modelsData, null, 2)
        );
        
        console.log('Modelo eliminado correctamente:', modelName);
        
        res.json({
            message: `Modelo "${modelName}" eliminado correctamente`,
            deleted: modelToDelete
        });
    } catch (error) {
        console.error('Error al eliminar el modelo:', error);
        res.status(500).json({ 
            error: 'Fallo al eliminar el modelo',
            message: error.message 
        });
    }
});
