import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { loadDatabaseConnections } from '../services/databaseConnections';
import { Activity, Database, Terminal, Play, Square } from 'lucide-react';

export default function DamMonitor() {
    // Usar el contexto global para que siga corriendo en background
    const { token, isDamLive, setIsDamLive, damEvents, setDamEvents, damSelectedDb, setDamSelectedDb, damError, damLastUpdated } = useAuth();
    
    const [databases, setDatabases] = useState<any[]>([]);
    const [popupMessage, setPopupMessage] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    const [manualQuery, setManualQuery] = useState('');
    const [executing, setExecuting] = useState(false);
    const manualSequence = useRef(0);
    const [queryResult, setQueryResult] = useState<{ columns: string[], rows: (string | null)[][] } | null>(null);
    const selectedRef = useRef(damSelectedDb);
    selectedRef.current = damSelectedDb;
    useEffect(() => {
        let cancelled = false;
        loadDatabaseConnections().then(({ databases: saved }) => {
            if (cancelled) return;
            const active = saved.filter(db => db.active);
            setDatabases(active);
            if (!active.some(db => String(db.id) === damSelectedDb)) {
                setIsDamLive(false);
                setDamSelectedDb(active.length ? String(active[0].id) : '');
            }
        }).catch(error => { if (!cancelled) setPopupMessage({ title: 'Error de conexión', message: error.response?.data?.message || 'No se pudieron cargar las conexiones registradas.', type: 'error' }); });
        return () => { cancelled = true; };
    }, [token]);
    const executeQuery = async () => {
        if (!manualQuery.trim() || !damSelectedDb || executing) return;
        const databaseId = Number(damSelectedDb);
        const connection = databases.find(db => Number(db.id) === databaseId);
        // El VPS también se sirve por HTTP, donde randomUUID no está disponible.
        const eventId = `manual:${databaseId}:${Date.now()}:${++manualSequence.current}`;
        const query = manualQuery;
        setExecuting(true); setQueryResult(null);
        setDamEvents(prev => [...prev, { id: eventId, databaseId, source: 'manual', username: connection?.user || '', clientAddress: connection?.host || '', state: 'evaluating', query, durationSeconds: 0 }]);
        const start = performance.now();
        try {
            const { data } = await api.post('/dam/execute', { query, databaseId });
            setDamEvents(prev => prev.map(event => event.id === eventId ? { ...event, state: 'completed', durationSeconds: data.durationSeconds } : event));
            if (selectedRef.current !== String(databaseId)) return;
            setQueryResult({ columns: data.columns || [], rows: data.rows || [] });
            setPopupMessage({ title: 'Consulta ejecutada', message: data.message, type: 'success' });
            setManualQuery('');
        } catch (error: any) {
            const blocked = error.response?.status === 406;
            setDamEvents(prev => prev.map(event => event.id === eventId ? { ...event, state: blocked ? 'blocked' : 'error', durationSeconds: (performance.now() - start) / 1000 } : event));
            if (selectedRef.current !== String(databaseId)) return;
            setPopupMessage({ title: blocked ? 'Consulta bloqueada' : 'Error de consulta', message: error.response?.data?.message || 'No se pudo consultar la conexión seleccionada.', type: 'error' });
        } finally { setExecuting(false); }
    };

    // Auto-scroll del terminal
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [damEvents]);

    const handleToggleLive = () => {
        if (!damSelectedDb) {
            setPopupMessage({title: "Atención", message: "Por favor, selecciona una Base de Datos primero.", type: "error"});
            return;
        }
        if (!isDamLive) {
            setDamEvents([]); // Limpiar terminal al iniciar
        }
        setIsDamLive(!isDamLive);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif' }}>
            
            {popupMessage && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: popupMessage.type === 'error' ? '#ef4444' : '#10b981', marginBottom: '15px' }}>
                            {popupMessage.title}
                        </div>
                        <div style={{ color: '#475569', marginBottom: '25px', fontSize: '1.1rem' }}>
                            {popupMessage.message}
                        </div>
                        <button onClick={() => setPopupMessage(null)} style={{ padding: '10px 25px', backgroundColor: popupMessage.type === 'error' ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Banner Superior */}
            <div style={{ background: 'linear-gradient(90deg, #064e3b 0%, #10b981 100%)', padding: '3.5rem 3rem', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={32} /> Monitor de Actividad (DAM)
                </h1>
                <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Consultas activas reales de la base seleccionada, visibles según los permisos de conexión.</p>
            </div>

            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem', display: 'flex', flexDirection: 'column' }}>
                
                {/* Controles */}
                <div style={{ marginBottom: '2rem', display: 'flex', gap: '15px', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <Database size={24} color="#64748b" />
                    
                    <select 
                        value={damSelectedDb} 
                        onChange={e => { setDamSelectedDb(e.target.value); setIsDamLive(false); setQueryResult(null); }} 
                        style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a', fontWeight: 'bold' }}
                    >
                        {databases.length === 0 && <option value="">No hay bases de datos configuradas</option>}
                        {databases.map(db => (
                            <option key={db.id} value={db.id.toString()}>
                                {db.name} ({db.type} - {db.host})
                            </option>
                        ))}
                    </select>
                    <input type="text" value={manualQuery} onChange={event => setManualQuery(event.target.value)} placeholder="Consulta SELECT de solo lectura..." aria-label="Consulta SQL" style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <button onClick={executeQuery} disabled={executing || !damSelectedDb || !manualQuery.trim()} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: executing ? 'wait' : 'pointer', fontWeight: 'bold' }}>{executing ? 'Consultando…' : 'Ejecutar SELECT'}</button>


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
                
                {damError && <p role="alert" style={{ color: '#b91c1c', background: '#fef2f2', padding: '16px', borderRadius: '8px' }}>{damError}</p>}
                {damLastUpdated && <p style={{ color: '#64748b', marginTop: 0 }}>Última consulta al servidor: {damLastUpdated}. Actualización cada 2 segundos.</p>}
                {queryResult && queryResult.columns.length > 0 && <div style={{ overflowX: 'auto', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginTop: 0 }}>Resultado de la consulta (máximo 50 filas)</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{queryResult.columns.map((column, index) => <th key={index} style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #e2e8f0' }}>{column}</th>)}</tr></thead>
                    <tbody>{queryResult.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>{cell ?? 'NULL'}</td>)}</tr>)}</tbody></table>
                    {!queryResult.rows.length && <p>La consulta no devolvió filas.</p>}
                </div>}
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
                            {isDamLive ? 'CONSULTANDO...' : 'DETENIDO'}
                        </span>
                    </div>

                    <div style={{ marginBottom: '20px', color: '#64748b', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                        <Terminal size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        DB-Shield Activity Monitor v1.0.0
                        <br />
                        [SISTEMA] Sesiones activas de la base seleccionada. Las consultas rápidas pueden terminar entre actualizaciones.
                    </div>

                    {damEvents.filter(event => String(event.databaseId) === damSelectedDb).map((e) => (
                        <div key={e.id} style={{ marginBottom: '15px', paddingLeft: '15px', borderLeft: e.state === 'blocked' ? '2px solid #ef4444' : '2px solid #334155', background: e.state === 'blocked' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', padding: e.state === 'blocked' ? '10px 15px' : '0 0 0 15px', borderRadius: '0 8px 8px 0' }}>
                            <div style={{ color: e.state === 'blocked' ? '#ef4444' : '#38bdf8', fontSize: '0.9rem' }}>
                                <strong>[{e.durationSeconds.toFixed(3)}s]</strong> {e.username}@{e.clientAddress} • {e.source === 'live' ? 'Sesión activa' : 'Consulta manual: ' + e.state} {e.state === 'blocked' && ' ⚠️ [INTRUSION INTERCEPTADA]'}
                            </div>
                            <div style={{ color: e.state === 'blocked' ? '#fca5a5' : '#f8fafc', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontWeight: e.state === 'blocked' ? 'bold' : 'normal' }}>
                                <span style={{ color: '#f43f5e' }}>&gt;</span> {e.query}
                            </div>
                        </div>
                    ))}
                    
                    {damEvents.length === 0 && isDamLive && (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '10px' }}>
                            No hay consultas activas visibles en la base seleccionada en esta actualización.
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
