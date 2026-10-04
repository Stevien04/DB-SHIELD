import { useEffect, useState } from 'react';
import api from '../services/api';
type Event = { id: string; timestamp: string; username: string; origin: string; rule: string };
type Status = { enabled: boolean; canConfigure: boolean; message: string; events: Event[]; sshCommand: string; clientPort: number; databaseName: string; databaseUser: string };
export default function ProxyProtection({ databaseId }: { databaseId: string }) {
    const [status, setStatus] = useState<Status | null>(null);
    const [error, setError] = useState('');
    const [configuring, setConfiguring] = useState(false);
    const enableProxy = async () => {
        setConfiguring(true); setError('');
        try { await api.post('/dam/proxy', { databaseId: Number(databaseId) }); }
        catch (failure: any) { setError(failure.response?.data?.message || 'No se pudo habilitar el proxy.'); }
        finally { setConfiguring(false); }
    };
    useEffect(() => {
        setStatus(null); setError('');
        if (!databaseId) return;
        const controller = new AbortController();
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try {
                const { data } = await api.get('/dam/protection', { params: { databaseId }, signal: controller.signal });
                if (!cancelled) { setStatus(data); setError(''); }
            } catch {
                if (!cancelled) { setStatus(null); setError('No se pudo verificar el proxy de protección.'); }
            }
            if (!cancelled) timer = setTimeout(poll, 2000);
        };
        void poll();
        return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
    }, [databaseId]);
    if (!databaseId) return null;
    return <section aria-label="Protección de conexiones" style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: status?.enabled ? '#047857' : '#92400e' }}>{status?.enabled ? 'Proxy PostgreSQL: protección activa' : 'Protección de conexiones'}</h3>
        <p role="status">{error || status?.message || 'Verificando protección…'}</p>
        {status?.canConfigure && !status.enabled && <button disabled={configuring} onClick={enableProxy} style={{ padding: '10px 16px', border: 'none', borderRadius: '8px', background: '#0284c7', color: 'white', cursor: 'pointer' }}>{configuring ? 'Verificando conexión SSL…' : 'Habilitar proxy para esta base'}</button>}
        {status?.enabled && <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
            <p>Para conectar HeidiSQL o tu aplicación, abre este túnel SSH:</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{status.sshCommand}</pre>
            <p>Host: <strong>127.0.0.1</strong> · Puerto: <strong>{status.clientPort}</strong> · Base: <strong>{status.databaseName}</strong> · Usuario: <strong>{status.databaseUser}</strong></p>
            <p>Usa la contraseña de la base. En HeidiSQL desactiva SSL para este túnel: SSH cifra el acceso al proxy y el proxy verifica SSL hacia el proveedor externo.</p>
        </div>}
        <p style={{ color: '#64748b' }}>Se inspeccionan las consultas que pasan por el proxy. Las conexiones directas a otras bases no están protegidas.</p>
        {!!status?.events.length && <div style={{ overflowX: 'auto' }}><h4>Últimos bloqueos de esta base de datos</h4>
            <table style={{ width: '100%', textAlign: 'left' }}><thead><tr><th>Fecha</th><th>Usuario PostgreSQL</th><th>Origen observado</th><th>Motivo</th></tr></thead>
                <tbody>{status.events.map(event => <tr key={event.id}><td>{new Date(event.timestamp).toLocaleString()}</td><td>{event.username}</td><td>{event.origin}</td><td style={{ color: '#dc2626' }}>{event.rule}</td></tr>)}</tbody>
            </table></div>}
        {status?.enabled && !status.events.length && <p>Aún no hay bloqueos registrados para esta base.</p>}
    </section>;
}
