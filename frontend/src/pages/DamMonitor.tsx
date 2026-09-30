import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Database, Terminal, Play, Square } from 'lucide-react';

export default function DamMonitor() {
    // Usar el contexto global para que siga corriendo en background
    const { token, isDamLive, setIsDamLive, damEvents, setDamEvents, damSelectedDb, setDamSelectedDb } = useAuth();
    
    const [databases, setDatabases] = useState<any[]>([]);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Cargar las bases de datos del usuario actual
    useEffect(() => {
        let username = 'default';
        if (token && token.split('.').length === 3) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub || 'default';
            } catch (e) {}
        }
        const saved = localStorage.getItem('dbs_' + username);
        if (saved) {
            const parsed = JSON.parse(saved);
            setDatabases(parsed);
            if (parsed.length > 0 && !damSelectedDb) {
                setDamSelectedDb(parsed[0].id.toString());
            }
        }
    }, [token, damSelectedDb, setDamSelectedDb]);

    // Auto-scroll del terminal
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [damEvents]);

    const handleToggleLive = () => {
        if (!damSelectedDb) {
            alert('Por favor, selecciona una Base de Datos primero.');
            return;
        }
        if (!isDamLive) {
            setDamEvents([]); // Limpiar terminal al iniciar
        }
        setIsDamLive(!isDamLive);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif' }}>
            {/* Banner Superior */}
            <div style={{ background: 'linear-gradient(90deg, #064e3b 0%, #10b981 100%)', padding: '3.5rem 3rem', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={32} /> Monitor de Actividad (DAM)
                </h1>
                <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Supervisión y auditoría de consultas en tiempo real (Persistente en Background).</p>
            </div>

            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem', display: 'flex', flexDirection: 'column' }}>
                
                {/* Controles */}
                <div style={{ marginBottom: '2rem', display: 'flex', gap: '15px', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <Database size={24} color="#64748b" />
                    
                    <select 
                        value={damSelectedDb} 
                        onChange={e => { setDamSelectedDb(e.target.value); setIsDamLive(false); }} 
                        style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a', fontWeight: 'bold' }}
                    >
                        {databases.length === 0 && <option value="">No hay bases de datos configuradas</option>}
                        {databases.map(db => (
                            <option key={db.id} value={db.id.toString()}>
                                {db.name} ({db.type} - {db.host})
                            </option>
                        ))}
                    </select>

                    <button 
                        onClick={handleToggleLive} 
                        disabled={databases.length === 0}
                        style={{ 
                            padding: '12px 25px', 
                            background: isDamLive ? '#ef4444' : '#10b981', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: databases.length === 0 ? 'not-allowed' : 'pointer', 
                            fontWeight: 'bold', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            boxShadow: isDamLive ? '0 4px 15px rgba(239, 68, 68, 0.4)' : '0 4px 15px rgba(16, 185, 129, 0.4)',
                            transition: 'all 0.3s',
                            opacity: databases.length === 0 ? 0.5 : 1
                        }}
                    >
                        {isDamLive ? (
                            <><Square size={18} fill="currentColor" /> Detener Monitor</>
                        ) : (
                            <><Play size={18} fill="currentColor" /> Iniciar Tráfico en Vivo</>
                        )}
                    </button>
                </div>
                
                {/* Consola Terminal */}
                <div style={{ 
                    background: '#0f172a', 
                    color: '#10b981', 
                    padding: '2rem', 
                    borderRadius: '12px', 
                    fontFamily: '"Fira Code", monospace', 
                    flex: 1,
                    minHeight: '400px',
                    overflowY: 'auto', 
                    boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}>
                    {/* Indicador de estado */}
                    <div style={{ position: 'absolute', top: '15px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isDamLive ? '#10b981' : '#64748b', boxShadow: isDamLive ? '0 0 10px #10b981' : 'none', transition: 'all 0.3s' }}></div>
                        <span style={{ color: isDamLive ? '#10b981' : '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {isDamLive ? 'INTERCEPTANDO...' : 'STANDBY'}
                        </span>
                    </div>

                    <div style={{ marginBottom: '20px', color: '#64748b', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                        <Terminal size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        DB-Shield Activity Monitor v1.0.0
                        <br />
                        [SYSTEM] Conectado al socket de auditoría. Esperando comandos...
                    </div>

                    {damEvents.map((e) => (
                        <div key={e.id} style={{ marginBottom: '15px', paddingLeft: '15px', borderLeft: e.state === 'blocked' ? '2px solid #ef4444' : '2px solid #334155', background: e.state === 'blocked' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', padding: e.state === 'blocked' ? '10px 15px' : '0 0 0 15px', borderRadius: '0 8px 8px 0' }}>
                            <div style={{ color: e.state === 'blocked' ? '#ef4444' : '#38bdf8', fontSize: '0.9rem' }}>
                                <strong>[{e.durationSeconds.toFixed(3)}s]</strong> {e.username}@{e.clientAddress} {e.state === 'blocked' && ' ⚠️ [INTRUSION INTERCEPTADA]'}
                            </div>
                            <div style={{ color: e.state === 'blocked' ? '#fca5a5' : '#f8fafc', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontWeight: e.state === 'blocked' ? 'bold' : 'normal' }}>
                                <span style={{ color: '#f43f5e' }}>&gt;</span> {e.query}
                            </div>
                        </div>
                    ))}
                    
                    {damEvents.length === 0 && isDamLive && (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '10px' }}>
                            Escuchando consultas entrantes en background...
                        </div>
                    )}
                    
                    {damEvents.length === 0 && !isDamLive && (
                        <div style={{ color: '#64748b', textAlign: 'center', marginTop: '15%' }}>
                            Selecciona una base de datos e inicia el monitor para ver el tráfico.
                        </div>
                    )}

                    <div ref={terminalEndRef} />
                </div>
            </div>
        </div>
    );
}