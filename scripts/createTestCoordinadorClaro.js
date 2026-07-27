const User = require('../models/User');

async function run() {
    try {
        const existing = await User.getByUsername('test_coord_claro');
        if (existing) {
            console.log('Ya existe. username: test_coord_claro');
            process.exit(0);
        }
        const user = await User.create({
            username: 'test_coord_claro',
            password: 'test1234',
            full_name: 'Test Coordinador Claro',
            role: 'coordinador',
            sede: 'bogota',
            departamento: 'claro'
        });
        console.log('Creado:', JSON.stringify(user));
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
    process.exit(0);
}
run();
