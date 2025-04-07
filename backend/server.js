import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { upload, updateModelsJson } from './src/components/uploadController.js';
import { verifyCredentials, generateToken, verifyToken } from './src/components/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware con opciones de CORS mejoradas
app.use(cors({
    origin: ['https://trabajo-3d-backend.onrender.com', 'https://3dsoulschoolvisor.netlify.app' ],
    methods: ['GET', 'POST', 'OPTIONS, DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve archivos estáticos para modelos, la preview...
app.use('/models', express.static(path.join(__dirname, 'public', 'models')));
app.use('/models.json', express.static(path.join(__dirname, 'public', 'models.json')));
app.use('/previews', express.static(path.join(__dirname, 'public', 'previews')));

// Endpoint para verificar si el servidor está funcionando
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Server running' });
});

// Ruta de login 
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login request:', { username });
        
        // Validar entrada
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({
                error: 'Se requiere usuario y contraseña'
            });
        }
        
        // Verificar credenciales
        const isValid = await verifyCredentials(username, password);
        
        console.log('Credentials valid:', isValid);
        
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

// Upload route for 3D model and preview
app.post('/upload', verifyToken, upload.fields([
    { name: 'model', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Upload request received:', req.body);
        console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');
        
        const { modelName } = req.body;
        
        if (!req.files || !req.files['model'] || !req.files['preview']) {
            return res.status(400).json({ 
                error: 'Both model and preview files are required' 
            });
        }
        
        const modelFile = req.files['model'][0];
        const previewFile = req.files['preview'][0];

        // Validate inputs
        if (!modelName) {
            return res.status(400).json({ 
                error: 'Model name is required' 
            });
        }

        console.log('Processing upload for model:', modelName);

        // Update models.json and move files
        const updatedModel = await updateModelsJson(
            modelName, 
            modelFile, 
            previewFile
        );

        console.log('Upload successful:', updatedModel);

        res.json({
            message: 'Modelo correctamente subido',
            model: updatedModel
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed',
            message: error.message 
        });
    }
});

// Serve models.json from the public directory
app.get('/models.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'models.json'));
});

// Create necessary directories on startup
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
            console.log(`Directory ensured: ${dir}`);
        } catch (err) {
            console.warn(`Could not create directory ${dir}:`, err);
        }
    }
    
    // Ensure models.json exists
    const modelsJsonPath = path.join(__dirname, 'public', 'models.json');
    try {
        await fs.access(modelsJsonPath);
    } catch (err) {
        // File doesn't exist, create it
        await fs.writeFile(modelsJsonPath, JSON.stringify({ models: [] }, null, 2));
        console.log('Created initial models.json file');
    }
}

// Start server
ensureDirectories().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Access the backend at https://trabajo-3d-backend.onrender.com:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize server:', err);
});

// Delete model route
app.post('/delete-model', verifyToken, async (req, res) => {
    try {
        const { modelName, modelPath, imagePath } = req.body;
        
        console.log('Delete request received:', { modelName, modelPath, imagePath });
        
        // Validate input
        if (!modelName || !modelPath || !imagePath) {
            return res.status(400).json({ 
                error: 'Missing model information' 
            });
        }
        
        // Read models.json
        const modelsJsonPath = path.join(__dirname, 'public', 'models.json');
        let modelsData;
        
        try {
            const existingData = await fs.readFile(modelsJsonPath, 'utf8');
            modelsData = JSON.parse(existingData);
        } catch (error) {
            console.error('Error reading models.json:', error);
            return res.status(500).json({ 
                error: 'Could not read models file' 
            });
        }
        
        // Find model in the models array
        const modelIndex = modelsData.models.findIndex(
            model => model.name.toLowerCase() === modelName.toLowerCase()
        );
        
        if (modelIndex === -1) {
            return res.status(404).json({ 
                error: 'Model not found' 
            });
        }
        
        // Get model data before removal
        const modelToDelete = modelsData.models[modelIndex];
        
        // Get absolute paths
        const modelDir = path.join(__dirname, 'public', 'models', modelName);
        const previewFile = path.join(__dirname, 'public', imagePath);
        
        // Delete the model directory
        try {
            await fs.rm(modelDir, { recursive: true, force: true });
            console.log('Model directory deleted:', modelDir);
        } catch (error) {
            console.warn('Error deleting model directory:', error);
            // Continue even if we couldn't delete the directory
        }
        
        // Delete the preview image
        try {
            await fs.unlink(previewFile);
            console.log('Preview image deleted:', previewFile);
        } catch (error) {
            console.warn('Error deleting preview image:', error);
            // Continue even if we couldn't delete the image
        }
        
        // Remove model from the models array
        modelsData.models.splice(modelIndex, 1);
        
        // Write updated models.json
        await fs.writeFile(
            modelsJsonPath, 
            JSON.stringify(modelsData, null, 2)
        );
        
        console.log('Model deleted successfully:', modelName);
        
        res.json({
            message: `Modelo "${modelName}" eliminado correctamente`,
            deleted: modelToDelete
        });
    } catch (error) {
        console.error('Error deleting model:', error);
        res.status(500).json({ 
            error: 'Failed to delete model',
            message: error.message 
        });
    }
});