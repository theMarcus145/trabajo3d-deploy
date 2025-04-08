import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para los modelos y las previews
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        let uploadPath;
        if (file.fieldname === 'model') {
            // Localización temporal del modelo antes de enviarlo
            uploadPath = path.join(__dirname, '..', '..', 'public', 'models', 'temp');
        } else if (file.fieldname === 'preview') {
            uploadPath = path.join(__dirname, '..', '..', 'public', 'previews');
        }
        
        // Crear directorio si este no existe
        try {
            await fs.mkdir(uploadPath, { recursive: true });
        } catch (err) {
            console.warn(`Warning: Could not create directory ${uploadPath}:`, err);
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        if (file.fieldname === 'model') {
            cb(null, 'scene.glb');
        } else {
            // Añadir un nombre único a las previews
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'model') {
            // Ver si es un archivo .glb
            if (path.extname(file.originalname).toLowerCase() === '.glb') {
                return cb(null, true);
            }
            cb(new Error('Solo se permiten archivos GLB para modelos 3D'));
        } else if (file.fieldname === 'preview') {
            // Check for valid image types
            const allowedTypes = ['.png', '.jpg', '.jpeg', '.webp'];
            const ext = path.extname(file.originalname).toLowerCase();
            if (allowedTypes.includes(ext)) {
                return cb(null, true);
            }
            cb(new Error('Solo se permiten imágenes PNG, JPG o WEBP para previews'));
        } else {
            cb(new Error('Tipo de archivo no soportado'));
        }
    }
});

// Función para actualizar el archivo .json cada vez que se suben o 
async function updateModelsJson(modelName, modelFile, previewFile) {
    const modelsJsonPath = path.join(__dirname, '..', '..', 'public', 'models.json');
    const publicPath = path.join(__dirname, '..', '..', 'public');
    
    try {
        let modelsData;
        try {
            const existingData = await fs.readFile(modelsJsonPath, 'utf8');
            modelsData = JSON.parse(existingData);
        } catch (readError) {
            modelsData = { models: [] };
        }

        // Crear carpeta del modelo
        const modelDir = path.join(publicPath, 'models', modelName);
        await fs.mkdir(modelDir, { recursive: true });

        // Mover el archivo del modelo a su localización final
        // Antes de moverlo, hay que comprobar que existe la carpeta temp
        const tempModelPath = modelFile.path;
        const finalModelPath = path.join(modelDir, 'scene.glb');
        
        try {
            await fs.access(tempModelPath);
            await fs.copyFile(tempModelPath, finalModelPath);
            await fs.unlink(tempModelPath); 
        } catch (moveError) {
            console.error('Error moving model file:', moveError);
            throw new Error('Error al mover el archivo del modelo');
        }

        // Comprobar si ya existe el modelo
        const existingModelIndex = modelsData.models.findIndex(
            model => model.name.toLowerCase() === modelName.toLowerCase()
        );

        // Crear entrada del modelo en el archivo .json
        const modelEntry = {
            name: modelName,
            modelPath: `models/${modelName}/scene.glb`,
            imagePath: `previews/${previewFile.filename}`
        };

        if (existingModelIndex !== -1) {
            // If updating existing model, remove old preview if different
            const oldModel = modelsData.models[existingModelIndex];
            if (oldModel.imagePath !== modelEntry.imagePath) {
                try {
                    await fs.unlink(path.join(publicPath, oldModel.imagePath));
                } catch (unlinkError) {
                    console.log('No previous preview to delete or unable to delete');
                }
            }
            modelsData.models[existingModelIndex] = modelEntry;
        } else {
            modelsData.models.push(modelEntry);
        }

        await fs.writeFile(
            modelsJsonPath, 
            JSON.stringify(modelsData, null, 2)
        );

        return modelEntry;
    } catch (error) {
        console.error('Error updating models.json:', error);
        // Attempt to clean up any partial uploads
        try {
            if (modelFile && modelFile.path) {
                await fs.unlink(modelFile.path);
            }
            if (previewFile && previewFile.path) {
                await fs.unlink(previewFile.path);
            }
        } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
        }
        throw error;
    }
}

export { upload, updateModelsJson };