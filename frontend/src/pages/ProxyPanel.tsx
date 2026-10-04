import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Network, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { loadDatabaseConnections } from '../services/databaseConnections';

type Status = { enabled: boolean; canConfigure: boolean; clientPort: number; databaseName: string; databaseUser: string; sshCommand: string };
export function CopyBlock({ title, code }: { title: string; code: string }) {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const copy = async () => {
        setError('');
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(code);
            else {
                const input = document.createElement('textarea');
                input.value = code; input.style.position = 'fixed'; input.style.opacity = '0';
                document.body.appendChild(input);
                try { input.select(); if (!document.execCommand('copy')) throw new Error(); }
                finally { input.remove(); }
            }
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        } catch { setError('Selecciona el texto y cópialo con Ctrl+C.'); }
    };
    return <section className="proxy-copy"><div className="proxy-copy-title"><h3>{title}</h3><button onClick={copy}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copiado' : 'Copiar'}</button></div><pre>{code}</pre>{error && <p role="alert">{error}</p>}</section>;
}
export default function ProxyPanel() {
    const [databases, setDatabases] = useState<any[]>([]);
    const [selected, setSelected] = useState('');
    const [status, setStatus] = useState<Status | null>(null);
    const [error, setError] = useState('');
    const [configuring, setConfiguring] = useState(false);
    useEffect(() => {
        let cancelled = false;
        loadDatabaseConnections().then(({ databases: rows }) => {
            if (cancelled) return;
            const active = rows.filter(row => row.active);
            setDatabases(active); setSelected(active.length ? String(active[0].id) : '');
        }).catch(() => { if (!cancelled) setError('No se pudieron cargar tus bases de datos.'); });
        return () => { cancelled = true; };
    }, []);
    useEffect(() => {
        setStatus(null);
        if (!selected) return;
        const controller = new AbortController();
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try {
                const { data } = await api.get('/dam/protection', { params: { databaseId: selected }, signal: controller.signal });
                if (!cancelled) setStatus(data);
            } catch { if (!cancelled) setStatus(null); }
            if (!cancelled) timer = setTimeout(poll, 2000);
        };
        void poll();
        return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
    }, [selected]);
    const environment = status ? `PGHOST=127.0.0.1\nPGPORT=${status.clientPort}\nPGDATABASE=${status.databaseName}\nPGUSER=${status.databaseUser}\nPGPASSWORD=REEMPLAZA_CON_LA_CONTRASENA_DE_TU_BD\nPGSSLMODE=disable` : '';
    return <div className="proxy-panel">
        <style>{`.proxy-panel{padding:32px;background:#f8fafc;min-height:100%;color:#172033}.proxy-panel h1{display:flex;align-items:center;gap:12px;margin:0 0 12px}.proxy-panel p{line-height:1.6}.proxy-selector,.proxy-copy,.proxy-note{background:white;padding:20px;border-radius:12px;margin:20px 0;box-shadow:0 2px 6px #0f172a0d}.proxy-selector label{display:block;font-weight:600;margin-bottom:10px}.proxy-selector select{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px}.proxy-copy-title{display:flex;justify-content:space-between;align-items:center;gap:12px}.proxy-copy h3{margin:0}.proxy-copy button{display:flex;align-items:center;gap:8px;border:0;border-radius:8px;background:#0284c7;color:white;padding:10px 16px;cursor:pointer}.proxy-copy pre{background:#0f172a;color:#e2e8f0;padding:18px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}.proxy-note{border-left:4px solid #f59e0b}.proxy-panel a{color:#0284c7}@media(max-width:700px){.proxy-panel{padding:16px}}`}</style>
        <h1><Network color="#0284c7"/> Proxy DB-Shield</h1>
        <p>Copia la configuración para conectar el backend de tu aplicación al proxy que inspecciona las consultas antes de enviarlas a tu base de datos.</p>
        <div className="proxy-selector"><label htmlFor="proxy-database">Base de datos a proteger</label><select id="proxy-database" value={selected} onChange={event => setSelected(event.target.value)} disabled={!databases.length}>{!databases.length && <option value="">No hay bases activas</option>}{databases.map(db => <option key={db.id} value={db.id}>{db.name} — {db.host}</option>)}</select>{error && <p role="alert">{error}</p>}{!databases.length && <p><Link to="/databases">Registra una base de datos</Link> para configurar su proxy.</p>}</div>
        {status?.canConfigure && !status.enabled && <button disabled={configuring} style={{padding:'10px 16px',border:0,borderRadius:8,background:'#0284c7',color:'white'}} onClick={async()=>{setConfiguring(true);setError('');try{await api.post('/dam/proxy',{databaseId:Number(selected)});}catch(failure:any){setError(failure.response?.data?.message||'No se pudo habilitar el proxy.');}finally{setConfiguring(false);}}}>{configuring?'Verificando conexión…':'Habilitar proxy para esta base'}</button>}
        {status?.enabled && <>
            <CopyBlock title="1. Abre el túnel en el servidor de tu backend" code={status.sshCommand}/>
            <p>El túnel debe permanecer abierto en la misma máquina donde se ejecuta el backend. Para probar con HeidiSQL, ábrelo en tu PC. El puerto 127.0.0.1 del VPS no está publicado en Internet.</p>
            <CopyBlock title="2. Configura la conexión PostgreSQL de tu backend" code={environment}/>
            <p>Reemplaza el marcador de contraseña por la contraseña original de tu base en las variables privadas del servidor. Estas variables son compatibles con libpq y controladores como Node.js pg; en otros frameworks asigna los mismos valores a su configuración de conexión.</p>
            <CopyBlock title="3. Consulta de prueba que debe bloquearse" code="SELECT 1 WHERE 0=1 OR '1'='1';"/>
            <p>Ejecuta la prueba desde tu aplicación o HeidiSQL conectado a este proxy. Debe devolver SQLSTATE 42501 y aparecer en los bloqueos de la base seleccionada.</p>
        </>}
        <div className="proxy-note"><strong>Integración con el backend</strong><p>Frontend → backend → proxy DB-Shield → base de datos. No coloques estas credenciales en el frontend. SSL hacia el proveedor se verifica en el proxy; el túnel SSH cifra el acceso a este.</p><p>Las conexiones directas al proveedor evitan la inspección. Para que el proxy sea obligatorio, restringe el acceso directo a la base a los servidores autorizados.</p></div>
    </div>;
}
