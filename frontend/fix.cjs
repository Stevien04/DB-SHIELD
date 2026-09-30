const fs = require('fs');
const file = 'd:/BD II PROYECTO/frontend/src/pages/Databases.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add isAlert to initial state
content = content.replace(
    /const \[confirmDialog, setConfirmDialog\] = useState\(\{\s*isOpen: false,\s*title: '',\s*message: '',\s*\}\);/g,
    'const [confirmDialog, setConfirmDialog] = useState({\n        isOpen: false,\n        title: \"\",\n        message: \"\",\n        isDanger: false,\n        isAlert: false,\n        onConfirm: () => {},\n    });'
);

// 2. Fix handleDisable
content = content.replace(
    /setConfirmDialog\(\{\s*isOpen: true,\s*title: 'Desconectar Base de Datos',/g,
    'setConfirmDialog({\n            isOpen: true,\n            title: \"Desconectar Base de Datos\",'
).replace(
    /isDanger: true,\s*onConfirm/g,
    'isDanger: true,\n            isAlert: false,\n            onConfirm'
);

// 3. Fix handleEnable
content = content.replace(
    /isDanger: false,\s*onConfirm:/g,
    'isDanger: false,\n            isAlert: false,\n            onConfirm:'
);

// 4. Replace alerts in handleSave
content = content.replace(/alert\('Por favor, ingrese un nombre para la Base de Datos.'\);/g, 
    'setConfirmDialog({ isOpen: true, title: \"Atención\", message: \"Por favor, ingrese un nombre para la Base de Datos.\", isDanger: true, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });');
    
content = content.replace(/alert\('Host y Puerto son requeridos.'\);/g, 
    'setConfirmDialog({ isOpen: true, title: \"Atención\", message: \"Host y Puerto son requeridos.\", isDanger: true, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });');

content = content.replace(/alert\([^;]+'Conexi[^;]+;\s*/g, 
    'setConfirmDialog({ isOpen: true, title: \"Conexión Exitosa\", message: \"¡\" + (data.message || \"Conexión Exitosa\") + \"!\", isDanger: false, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });\n            ');

content = content.replace(/alert\(La base de datos[^;]+PROTEGIDA.\);/g, 
    'setConfirmDialog({ isOpen: true, title: \"Información\", message: La base de datos \"\\" ya está registrada y actualmente está PROTEGIDA., isDanger: false, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });');

content = content.replace(/alert\(❌ ERROR DE CONEXI[^;]+\);/g, 
    'setConfirmDialog({ isOpen: true, title: \"❌ Error de Conexión\", message: No se pudo establecer conexión con \:\.\\n\\nDetalles: \, isDanger: true, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });');

// 5. Hide cancel button if isAlert
content = content.replace(
    /<button \s*onClick=\{\(\) => setConfirmDialog/g,
    '{!confirmDialog.isAlert && <button \n                                onClick={() => setConfirmDialog'
).replace(
    /Cancelar\s*<\/button>/g,
    'Cancelar\n                            </button>}'
);

// 6. Fix pre-wrap for the message paragraph
content = content.replace(
    /lineHeight: '1\.6', fontSize: '1\.05rem' \}\}>/g,
    'lineHeight: \"1.6\", fontSize: \"1.05rem\", whiteSpace: \"pre-wrap\" }}>'
);

fs.writeFileSync(file, content);
