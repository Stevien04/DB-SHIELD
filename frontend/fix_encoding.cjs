const fs = require('fs');
const file = 'd:/BD II PROYECTO/frontend/src/pages/Databases.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace any potentially garbled spanish words
content = content.replace(/Atencin/g, 'Atencion')
                 .replace(/Atención/g, 'Atencion')
                 .replace(/Conexin/g, 'Conexion')
                 .replace(/Conexión/g, 'Conexion')
                 .replace(/Informacin/g, 'Informacion')
                 .replace(/Información/g, 'Informacion')
                 .replace(/proteccin/g, 'proteccion')
                 .replace(/protección/g, 'proteccion')
                 .replace(/estǭ/g, 'esta')
                 .replace(/está/g, 'esta')
                 .replace(//g, '') // remove any other replacement characters
                 .replace(/❌/g, 'X') // replace emoji just in case
                 .replace(/¡/g, '')
                 .replace(/¿/g, '');

fs.writeFileSync(file, content);
