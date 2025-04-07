import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'desarrollo_secreto_inseguro';

// Contraseña hasheada con bcrypt
const USERS = [
    {
        username: 'admin',
        passwordHash: '$2a$10$8pB.S0jGM9/mnbhuxnEctuEkdaMOCrYfaN6EN8LbmgdWQYUm3P9t6'
    }
];

// Función para verificar credenciales
export const verifyCredentials = async (username, passwordHash) => {
    console.log(`Verificando credenciales para: ${username}`);
    
    const user = USERS.find(user => user.username === username);
    if (!user) {
        console.log('Usuario no encontrado');
        return false;
    }
    
    try {
        // Comparar los hashes directamente
        // La contraseña ya viene hasheada desde el frontend
        const isMatch = (passwordHash === user.passwordHash);
        console.log(`Resultado de verificación de contraseña: ${isMatch}`);
        return isMatch;
    } catch (error) {
        console.error('Error al comparar contraseñas:', error);
        return false;
    }
};

// Generar token JWT
export const generateToken = (username) => {
    return jwt.sign(
        { username },
        JWT_SECRET,
        { expiresIn: '1h' } // Token expira en 1 hora
    );
};

// Middleware para verificar token
export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Acceso no autorizado' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            error: 'Token inválido o expirado',
            message: error.message
        });
    }
};