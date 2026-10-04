import { useState } from 'react';
import { Search, Calendar, ShieldAlert, CheckCircle2, X, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const attackCategories = [
    { label: 'Inyección SQL', color: '#ef4444' },
    { label: 'Comandos del sistema (AST)', color: '#f97316' },
    { label: 'Malware en BLOB (Tika)', color: '#8b5cf6' },
    { label: 'Exfiltración de datos', color: '#3b82f6' },
    { label: 'Evasión de privilegios', color: '#f59e0b' },
    { label: 'Otros ataques', color: '#64748b' }
];

function classifyAttack(value: string) {
    const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/BLOB|MALWARE|TIKA/.test(text)) return 2;
    if (/COMANDOS SO|COMANDOS DEL SISTEMA|XP_CMDSHELL|COPY.*PROGRAM/.test(text)) return 1;
    if (/EXFILTRACION DATOS|EXFILTRATION|INTO\s+OUTFILE/.test(text)) return 3;
    if (/PRIVILEG|GRANT\s|REVOKE\s/.test(text)) return 4;
    if (/INYECCION|SQL_INJECTION|SQLI|AUTH BYPASS|UNION\s|DROP\s|OR\s+1\s*=\s*1|SLEEP\s*\(/.test(text)) return 0;
    return 5;
}

export default function Dashboard() {
    const { damEvents } = useAuth();
    const attackCounts = attackCategories.map(() => 0);
    const quarantinedPayloads = new Map<string, number>();
    // Usar los registros existentes de cuarentena y del monitor, sin inventar cantidades.
    try {
        const saved: unknown = JSON.parse(localStorage.getItem('quarantine_threats') || '[]');
        if (Array.isArray(saved)) saved.forEach(threat => {
            if (!threat || threat.isQuarantined !== true) return;
            attackCounts[classifyAttack(String(threat.threatType || ''))]++;
            if (typeof threat.payload === 'string') {
                const key = threat.payload.trim();
                quarantinedPayloads.set(key, (quarantinedPayloads.get(key) || 0) + 1);
            }
        });
    } catch { /* Sin registros válidos, mostrar los eventos disponibles del monitor. */ }
    damEvents.filter(event => event.state === 'blocked').forEach(event => {
        const payload = event.query.split(' -- [WAF:')[0].trim();
        const duplicateCount = quarantinedPayloads.get(payload) || 0;
        if (duplicateCount > 0) quarantinedPayloads.set(payload, duplicateCount - 1);
        else attackCounts[classifyAttack(event.query)]++;
    });
    const totalBlockedAttacks = attackCounts.reduce((sum, count) => sum + count, 0);
    const attackScale = Math.max(1, ...attackCounts);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDb, setSelectedDb] = useState<string | null>(null);
    const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
    const [showSafe, setShowSafe] = useState(true);
    const [showAttacks, setShowAttacks] = useState(true);

    const stats = [
        { label: 'Consultas Seguras', percent: 92, color: '#10b981' },
        { label: 'Ataques Interceptados', percent: 8, color: '#ef4444' },
        { label: 'Uptime de Bases de Datos', percent: 99, color: '#3b82f6' },
        { label: 'Uso de CPU del Firewall', percent: 15, color: '#f59e0b' }
    ];

    const databases = [
        { id: '1', name: 'dbshield', type: 'PostgreSQL', queries: 1245, blocked: 12, status: 'Protegida' },
        { id: '2', name: 'ventas_db', type: 'MySQL', queries: 8902, blocked: 145, status: 'Protegida' },
        { id: '3', name: 'rh_db', type: 'PostgreSQL', queries: 432, blocked: 0, status: 'Protegida' }
    ];

    const today = new Date().toISOString().split('T')[0];
    const historyData: Record<string, Array<{date: string, time: string, type: string, query: string, ip: string, threat?: string}>> = {
        '1': [
            { date: today, time: '10:45 AM', type: 'safe', query: 'SELECT * FROM users WHERE id = 1;', ip: '192.168.1.15' },
            { date: today, time: '11:02 AM', type: 'attack', query: 'DROP TABLE pagos;', ip: '192.168.1.99', threat: 'SQL Injection' },
            { date: today, time: '11:30 AM', type: 'safe', query: 'SELECT COUNT(*) FROM sessions;', ip: '192.168.1.15' }
        ],
        '2': [
            { date: today, time: '09:15 AM', type: 'attack', query: "SELECT * FROM users WHERE username = '' OR 1=1;", ip: '10.0.0.5', threat: 'Auth Bypass' },
            { date: today, time: '09:16 AM', type: 'attack', query: 'UNION SELECT password FROM users;', ip: '10.0.0.5', threat: 'UNION SQLi' }
        ],
        '3': [
            { date: today, time: '08:00 AM', type: 'safe', query: 'SELECT * FROM employees;', ip: '192.168.1.50' }
        ]
    };

    const filteredDbs = databases.filter(db => db.name.toLowerCase().includes(searchTerm.toLowerCase()) || db.type.toLowerCase().includes(searchTerm.toLowerCase()));

    const activeDb = databases.find(db => db.id === selectedDb);
    const activeHistory = (selectedDb ? historyData[selectedDb] : [])?.filter(log => {
        if (log.date !== modalDate) return false;
        if (log.type === 'safe' && !showSafe) return false;
        if (log.type === 'attack' && !showAttacks) return false;
        return true;
    });

    
    const handleDownloadPDF = () => {
        if (!activeDb || !activeHistory) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reporte DB-Shield - ${activeDb.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: white; color: #1e293b; padding: 40px; }
                    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
                    .header p { margin: 5px 0 0 0; color: #64748b; }
                    .info { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
                    th { background-color: #f1f5f9; color: #334155; }
                    .attack { color: #ef4444; font-weight: bold; }
                    .safe { color: #10b981; }
                    .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #94a3b8; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Reporte de Seguridad DB-Shield</h1>
                    <p>Sistema de Prevención de Intrusiones y Auditoría DAM</p>
                </div>
                
                <div class="info">
                    <div>
                        <strong>Base de Datos:</strong> ${activeDb.name} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Tipo:</strong> ${activeDb.type}<br>
                        <strong>Fecha del Reporte:</strong> ${modalDate}
                    </div>
                    <div style="text-align: right;">
                        <strong>Total de Registros:</strong> ${activeHistory.length}<br>
                        <strong>Estado Actual:</strong> Protegida
                    </div>
                </div>

                <h2>Detalle de Actividad</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>IP Origen</th>
                            <th>Tipo</th>
                            <th>Sentencia SQL</th>
                            <th>Amenaza Detectada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeHistory.map(log => `
                            <tr>
                                <td>${log.time}</td>
                                <td>${log.ip}</td>
                                <td class="${log.type}">${log.type === 'attack' ? 'ATAQUE BLOQUEADO' : 'CONSULTA SEGURA'}</td>
                                <td style="font-family: monospace; font-size: 0.9em;">${log.query}</td>
                                <td>${log.threat || '-'}</td>
                            </tr>
                        `).join('')}
                        ${activeHistory.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No hay registros para la fecha seleccionada.</td></tr>' : ''}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Reporte generado automáticamente por DB-Shield. CONFIDENCIAL.</p>
                </div>
                <script>
                    window.onload = () => { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div style={{ padding: '30px', color: '#1e293b', height: '100%', overflowY: 'auto', position: 'relative' }}>
            <h1 style={{ marginBottom: '20px', fontSize: '2rem' }}>Dashboard de Reportes</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Vista general del estado de seguridad y rendimiento de DB-Shield.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {stats.map((stat, i) => (
                    <div key={i} style={{ 
                        background: 'white', padding: '25px', borderRadius: '12px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(${stat.color} ${stat.percent}%, #e2e8f0 ${stat.percent}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                            <div style={{ width: '100px', height: '100px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                                {stat.percent}%
                            </div>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#475569', textAlign: 'center' }}>{stat.label}</h3>
                    </div>
                ))}
            </div>

            <section aria-labelledby="blocked-attacks-title" style={{ marginTop: '30px', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <div>
                        <h3 id="blocked-attacks-title" style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldAlert size={22} color="#ef4444" /> Tipos de ataques bloqueados por el antivirus</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Registros en cuarentena y eventos bloqueados disponibles en el monitor DAM.</p>
                    </div>
                    <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold' }}>{totalBlockedAttacks} bloqueados</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: '430px', display: 'grid', gap: '18px' }}>
                        {attackCategories.map((category, index) => (
                            <div key={category.label} style={{ display: 'grid', gridTemplateColumns: '190px minmax(100px, 1fr) 70px', alignItems: 'center', gap: '16px' }}>
                                <span style={{ color: '#475569', fontSize: '0.9rem' }}>{category.label}</span>
                                <div role="img" aria-label={`${category.label}: ${attackCounts[index]} ataques bloqueados`} style={{ height: '28px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${attackCounts[index] / attackScale * 100}%`, background: category.color, borderRadius: '6px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '0.95rem' }}>{attackCounts[index]} <span style={{ fontWeight: 'normal', color: '#94a3b8', fontSize: '0.75rem' }}>({totalBlockedAttacks ? Math.round(attackCounts[index] / totalBlockedAttacks * 100) : 0}%)</span></span>
                            </div>
                        ))}
                        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '190px minmax(100px, 1fr) 70px', gap: '16px', color: '#94a3b8', fontSize: '0.75rem' }}>
                            <span>Cantidad de ataques</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>0</span><span>{attackScale}</span></div>
                        </div>
                    </div>
                </div>
                {totalBlockedAttacks === 0 && <p style={{ margin: '20px 0 0', color: '#64748b', textAlign: 'center' }}>Aún no hay ataques bloqueados registrados.</p>}
            </section>

            <div style={{ marginTop: '30px', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <h3 style={{ margin: 0 }}>Buscador de Actividad</h3>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar base de datos..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 10px 8px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', width: '300px' }}
                        />
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Base de Datos</th>
                            <th style={{ padding: '10px' }}>Tipo</th>
                            <th style={{ padding: '10px' }}>Consultas Totales</th>
                            <th style={{ padding: '10px' }}>Amenazas Bloqueadas</th>
                            <th style={{ padding: '10px' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDbs.map(db => (
                            <tr 
                                key={db.id}
                                style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                                onClick={() => setSelectedDb(db.id)}
                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#0ea5e9' }}>{db.name}</td>
                                <td style={{ padding: '15px 10px', color: '#64748b' }}>{db.type}</td>
                                <td style={{ padding: '15px 10px' }}>{db.queries}</td>
                                <td style={{ padding: '15px 10px', color: db.blocked > 0 ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>{db.blocked}</td>
                                <td style={{ padding: '15px 10px' }}><span style={{ background: '#dcfce3', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>{db.status}</span></td>
                            </tr>
                        ))}
                        {filteredDbs.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No se encontraron bases de datos</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {selectedDb && activeDb && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '90%', maxWidth: '800px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h2 style={{ margin: 0, color: '#0f172a' }}>Historial: {activeDb.name}</h2>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0ea5e9', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    <Download size={18} /> Exportar PDF
                                </button>
                                <button onClick={() => setSelectedDb(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <X size={24} />
                                </button>
                            </div>

                        </div>

                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                                <input 
                                    type="date" 
                                    value={modalDate}
                                    onChange={(e) => setModalDate(e.target.value)}
                                    style={{ padding: '8px 10px 8px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={showSafe} onChange={(e) => setShowSafe(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                                <CheckCircle2 size={18} color="#10b981" /> Consultas Seguras
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={showAttacks} onChange={(e) => setShowAttacks(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ef4444' }} />
                                <ShieldAlert size={18} color="#ef4444" /> Ataques
                            </label>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#f1f5f9' }}>
                            {activeHistory?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {activeHistory.map((log, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `5px solid ${log.type === 'attack' ? '#ef4444' : '#10b981'}` }}>
                                            {log.type === 'attack' ? <ShieldAlert color="#ef4444" size={24} /> : <CheckCircle2 color="#10b981" size={24} />}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>{log.time} • IP: {log.ip} {log.threat && <strong style={{color: '#ef4444', marginLeft: '5px'}}>• {log.threat}</strong>}</div>
                                                <div style={{ fontFamily: 'monospace', background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '0.95rem', color: '#0f172a', border: '1px solid #e2e8f0' }}>{log.query}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                                    No se encontraron registros para estos filtros.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
