import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'desarrollo_secreto_inseguro';

// Credenciales hardcoded (en producción deberían estar en base de datos)
// Nota: En un entorno de producción, estas credenciales deberían estar en una base de datos
// y las contraseñas deberían estar hasheadas con bcrypt
const USERS = [
    {
        username: 'admin',
        passwordHash: 'marco'  // En producción esto debería ser un hash generado con bcrypt
    }
];

// Función para verificar credenciales
export const verifyCredentials = async (username, password) => {
    console.log(`Verificando credenciales para: ${username}`);
    
    const user = USERS.find(user => user.username === username);
    if (!user) {
        console.log('Usuario no encontrado');
        return false;
    }
    
    try {
        // Comparación directa para entorno de desarrollo
        // En producción, usar bcrypt.compare(password, user.passwordHash)
        const isMatch = (password === user.passwordHash);
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
        
        // Añadir información del usuario al request
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            error: 'Token inválido o expirado',
            message: error.message
        });
    }
};