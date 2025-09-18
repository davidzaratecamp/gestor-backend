const bcrypt = require('bcryptjs');

const createHannyUser = async () => {
    try {
        // Hash de la contraseña
        const password = 'hannyasiste1010';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Usuario: hannycita10');
        console.log('Contraseña hash:', hashedPassword);
        
        console.log('\n--- COMANDO SQL PARA CREAR USUARIO HANNY ---');
        console.log(`INSERT INTO users (username, password, full_name, role, sede, departamento) VALUES ('hannycita10', '${hashedPassword}', 'Hanny Administradora', 'admin', 'bogota', 'claro');`);
        
    } catch (error) {
        console.error('Error:', error);
    }
};

createHannyUser();