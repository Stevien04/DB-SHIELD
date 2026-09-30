const fs = require('fs');
const file = 'd:/BD II PROYECTO/frontend/src/pages/Databases.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \[dbs, setDbs\] = useState\(\[[\s\S]*?\]\);/,
    const [dbs, setDbs] = useState(() => {
        const token = localStorage.getItem('token');
        let username = 'default';
        if (token && token.split('.').length === 3) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub || 'default';
            } catch (e) { console.error(e); }
        }
        const saved = localStorage.getItem('dbs_' + username);
        if (saved) return JSON.parse(saved);
        return []; // Empieza vacío para nuevos usuarios
    });
);

content = content.replace(
    /export default function Databases\(\) \{/,
    import { useEffect } from 'react';\n\nexport default function Databases() {
);

content = content.replace(
    /const \[showModal, setShowModal\] = useState\(false\);/,
    const [showModal, setShowModal] = useState(false);

    // Guardar en localStorage asociado al usuario cada vez que cambie 'dbs'
    useEffect(() => {
        const token = localStorage.getItem('token');
        let username = 'default';
        if (token && token.split('.').length === 3) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub || 'default';
            } catch (e) { console.error(e); }
        }
        localStorage.setItem('dbs_' + username, JSON.stringify(dbs));
    }, [dbs]);
);

fs.writeFileSync(file, content);
