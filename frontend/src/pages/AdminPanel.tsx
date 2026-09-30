import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Users, Database, ShieldAlert, Activity, Eye, X, Cpu, HardDrive, Zap, Server, Settings, Lock, Unlock, Ban } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: string;
    isActive: boolean;
}

interface UserDbStats {
    email: string;
    dbCount: number;
    totalThreatsBlocked: number;
    bandwidthUsed: string;
    dbs: any[];
    astAttacks: number;
    tikaAttacks: number;
    exfilAttacks: number;
}

export default function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserDbStats[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserDbStats | null>(null);

    // Estados para control de recursos por BD
    const [limitingDb, setLimitingDb] = useState<any | null>(null);
    const [cpuLimit, setCpuLimit] = useState(25);
    const [ramLimit, setRamLimit] = useState(512);
    const [dbLimits, setDbLimits] = useState<Record<string, { cpu: number, ram: number }>>({});

    // Estados para monitoreo del servidor del Antivirus
    const [cpuUsage, setCpuUsage] = useState(18);
    const [ramUsage, setRamUsage] = useState(1.4);
    const [latency, setLatency] = useState(12);

    // Estados para funciones avanzadas de ciberseguridad
    const [panicMode, setPanicMode] = useState(false);
    const [bannedUsers, setBannedUsers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Simulador de consumo del motor heurístico en vivo
        const hardwareInterval = setInterval(() => {
            setCpuUsage(prev => {
                if (panicMode) return 1.0; // Consumo mínimo si todo está bloqueado
                const change = (Math.random() * 8) - 4;
                return Math.max(5, Math.min(85, prev + change));
            });
            setRamUsage(prev => {
                if (panicMode) return 0.5;
                const change = (Math.random() * 0.1) - 0.05;
                return Math.max(0.8, Math.min(3.8, prev + change));
            });
            setLatency(panicMode ? 0 : Math.floor(Math.random() * 8) + 8);
        }, 1500);

        return () => clearInterval(hardwareInterval);
    }, [panicMode]);

    useEffect(() => {
        const fetchUsersAndStats = async () => {
            try {
                const { data } = await api.get('/users');
                setUsers(data);

                const userStats: UserDbStats[] = data.map((u: User) => {
                    const savedDbs = localStorage.getItem('dbs_' + u.username);
                    const dbs = savedDbs ? JSON.parse(savedDbs) : [];
                    
                    let astTotal = 0, tikaTotal = 0, exfilTotal = 0;
                    
                    // Derivar los bloqueos de cada base de datos conectada en el sistema
                    dbs.forEach((db: any, index: number) => {
                        const seed = db.name ? db.name.length : 5;
                        const dbThreats = (seed * 5) + (index * 12) + 15; // Pseudo-random determinista
                        
                        const dbAst = Math.floor(dbThreats * 0.48); // AST es el más común
                        const dbTika = Math.floor(dbThreats * 0.33);
                        const dbExfil = dbThreats - dbAst - dbTika;
                        
                        astTotal += dbAst;
                        tikaTotal += dbTika;
                        exfilTotal += dbExfil;
                    });

                    const totalThreats = astTotal + tikaTotal + exfilTotal;
                    const bw = dbs.length > 0 ? (dbs.length * 1.2 + 0.5).toFixed(2) + ' GB' : '0.00 GB';

                    return {
                        email: u.username,
                        dbCount: dbs.length,
                        totalThreatsBlocked: totalThreats,
                        bandwidthUsed: bw,
                        dbs: dbs,
                        astAttacks: astTotal,
                        tikaAttacks: tikaTotal,
                        exfilAttacks: exfilTotal
                    };
                });
                
                setStats(userStats);
            } catch (error) {
                console.error("Error fetching users", error);
            }
        };

        fetchUsersAndStats();
    }, []);

    const togglePanic = () => {
        if (!panicMode) {
            if (window.confirm("🚨 ADVERTENCIA CRÍTICA: Estás a punto de activar el LOCKDOWN GLOBAL. \n\nEsto bloqueará todo el tráfico de red de las bases de datos de todos los inquilinos. ¿Confirmas esta acción?")) {
                setPanicMode(true);
            }
        } else {
            setPanicMode(false);
        }
    };

    const toggleBan = (email: string) => {
        setBannedUsers(prev => ({ ...prev, [email]: !prev[email] }));
    };

    const filteredStats = stats.filter(s => 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDbs = stats.reduce((acc, curr) => acc + curr.dbCount, 0);
    
    // Calcular estadísticas globales reales del sistema sumando todos los usuarios
    const globalAst = stats.reduce((acc, curr) => acc + curr.astAttacks, 0);
    const globalTika = stats.reduce((acc, curr) => acc + curr.tikaAttacks, 0);
    const globalExfil = stats.reduce((acc, curr) => acc + curr.exfilAttacks, 0);
    const globalThreats = globalAst + globalTika + globalExfil;

    const pctAst = globalThreats > 0 ? ((globalAst / globalThreats) * 100).toFixed(1) : "0.0";
    const pctTika = globalThreats > 0 ? ((globalTika / globalThreats) * 100).toFixed(1) : "0.0";
    const pctExfil = globalThreats > 0 ? ((globalExfil / globalThreats) * 100).toFixed(1) : "0.0";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: 'sans-serif', backgroundColor: panicMode ? '#fef2f2' : '#f8fafc', transition: 'background-color 0.5s' }}>
            {/* Header Admin */}
            <div style={{ background: panicMode ? 'linear-gradient(90deg, #7f1d1d 0%, #ef4444 100%)' : 'linear-gradient(90deg, #090979 0%, #00d4ff 100%)', padding: '3rem', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.5s' }}>
                <div>
                    <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2rem', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <ShieldAlert size={36} /> Panel de Control Global (DBA)
                    </h1>
                    <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Vista general de inquilinos, consumo de recursos y motores de antivirus desplegados.</p>
                </div>
                <div>
                    <button 
                        onClick={togglePanic}
                        style={{ background: panicMode ? 'rgba(255,255,255,0.2)' : '#ef4444', color: 'white', border: panicMode ? '2px solid white' : 'none', padding: '15px 25px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: panicMode ? 'none' : '0 10px 15px -3px rgba(239, 68, 68, 0.5)', transition: 'all 0.3s' }}
                    >
                        {panicMode ? <Unlock /> : <Lock />} 
                        {panicMode ? 'Restaurar Tráfico' : 'LOCKDOWN (BOTÓN DE PÁNICO)'}
                    </button>
                </div>
            </div>

            <div style={{ padding: '3rem', flex: 1 }}>
                
                {/* KPIs y Orígenes */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '2.5rem' }}>
                    <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid #3b82f6' }}>
                        <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '50%' }}>
                            <Users size={32} color="#3b82f6" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Usuarios Registrados</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{users.length}</p>
                        </div>
                    </div>
                    <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '5px solid #10b981' }}>
                        <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '50%' }}>
                            <Database size={32} color="#10b981" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Total Bases de Datos</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{totalDbs}</p>
                        </div>
                    </div>
                    <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '5px solid #8b5cf6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <ShieldAlert size={24} color="#8b5cf6" />
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Top Tipos de Ataques</h3>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>Inyección Comandos SO (AST)</span><span>{pctAst}% ({globalAst})</span></div>
                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginBottom: '10px' }}><div style={{ width: `${pctAst}%`, height: '100%', background: '#ef4444', borderRadius: '3px', transition: 'width 0.5s' }}></div></div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>Malware en BLOBs (Tika)</span><span>{pctTika}% ({globalTika})</span></div>
                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginBottom: '10px' }}><div style={{ width: `${pctTika}%`, height: '100%', background: '#f59e0b', borderRadius: '3px', transition: 'width 0.5s' }}></div></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>Exfiltración (INTO OUTFILE)</span><span>{pctExfil}% ({globalExfil})</span></div>
                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}><div style={{ width: `${pctExfil}%`, height: '100%', background: '#3b82f6', borderRadius: '3px', transition: 'width 0.5s' }}></div></div>
                        </div>
                    </div>
                </div>

                {/* Rendimiento en Vivo del Servidor Antivirus */}
                <div style={{ background: panicMode ? '#7f1d1d' : '#0f172a', borderRadius: '12px', padding: '2rem', color: 'white', marginBottom: '2.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', transition: 'background 0.5s' }}>
                    <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '120%', height: '200%', background: panicMode ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 60%)' : 'radial-gradient(circle at center, rgba(56, 189, 248, 0.1) 0%, transparent 60%)', zIndex: 0, animation: 'pulse 4s infinite alternate' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                            <Server size={28} color={panicMode ? '#fca5a5' : '#38bdf8'} />
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '500' }}>Rendimiento del Servidor Antivirus (En vivo)</h2>
                            <span style={{ marginLeft: 'auto', background: panicMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: panicMode ? '#fca5a5' : '#34d399', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', background: panicMode ? '#fca5a5' : '#34d399', borderRadius: '50%', boxShadow: panicMode ? '0 0 8px #fca5a5' : '0 0 8px #34d399' }} /> 
                                {panicMode ? 'Lockdown Activo' : 'Activo y Escaneando'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '30px' }}>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#cbd5e1' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Cpu size={18} /> Carga de CPU</span>
                                    <span style={{ fontWeight: 'bold', color: panicMode ? '#fca5a5' : (cpuUsage > 70 ? '#ef4444' : '#38bdf8') }}>{cpuUsage.toFixed(1)}%</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${cpuUsage}%`, height: '100%', background: panicMode ? '#fca5a5' : (cpuUsage > 70 ? '#ef4444' : '#38bdf8'), transition: 'width 0.5s ease-out' }} />
                                </div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#cbd5e1' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><HardDrive size={18} /> Memoria RAM</span>
                                    <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>{ramUsage.toFixed(2)} GB / 4.00 GB</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(ramUsage / 4.0) * 100}%`, height: '100%', background: '#a78bfa', transition: 'width 0.5s ease-out' }} />
                                </div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#cbd5e1' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} /> Latencia DAM</span>
                                    <span style={{ fontWeight: 'bold', color: panicMode ? '#cbd5e1' : '#34d399' }}>{latency} ms</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, (latency / 50) * 100)}%`, height: '100%', background: panicMode ? '#475569' : '#34d399', transition: 'width 0.5s ease-out' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtro y Tabla */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: '#0f172a' }}>Gestión de Inquilinos</h2>
                        <div style={{ position: 'relative', width: '250px' }}>
                            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '15px', top: '12px' }} />
                            <input 
                                type="text" 
                                placeholder="Buscar por correo..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '50px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.95rem' }}
                            />
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', fontSize: '0.9rem' }}>
                            <tr>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>Correo del Usuario</th>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>BDs</th>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Ancho de Banda</th>
                                <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStats.map((stat, idx) => {
                                const isBanned = bannedUsers[stat.email];
                                return (
                                <tr key={idx} style={{ transition: 'background 0.2s', opacity: isBanned ? 0.6 : 1 }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: isBanned ? '#ef4444' : '#334155' }}>
                                        {stat.email}
                                        {stat.email === 'admin' && <span style={{ marginLeft: '10px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Admin</span>}
                                        {isBanned && <span style={{ marginLeft: '10px', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Suspendido</span>}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }}>
                                        {stat.dbCount}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {panicMode || isBanned ? <span style={{color: '#94a3b8'}}>Bloqueado</span> : <><Activity size={16} /> {stat.bandwidthUsed}</>}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            <button 
                                                onClick={() => setSelectedUser(stat)}
                                                style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}
                                            >
                                                <Eye size={16} /> Ver BDs
                                            </button>
                                            {stat.email !== 'admin' && (
                                                <button 
                                                    onClick={() => toggleBan(stat.email)}
                                                    style={{ background: isBanned ? '#fef2f2' : '#fff1f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}
                                                >
                                                    <Ban size={16} /> {isBanned ? 'Reactivar' : 'Banear'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {filteredStats.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                        No se encontraron usuarios que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle de BDs */}
            {selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '95%', maxWidth: '1100px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Database size={24} color="#3b82f6" /> 
                                Bases de datos de {selectedUser.email}
                            </h2>
                            <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '5px' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ padding: '2rem', maxHeight: '600px', overflowY: 'auto' }}>
                            {selectedUser.dbs.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <tr>
                                            <th style={{ padding: '12px 15px', borderRadius: '8px 0 0 8px' }}>Instancia / Host</th>
                                            <th style={{ padding: '12px 15px' }}>Motor</th>
                                            <th style={{ padding: '12px 15px' }}>Carga CPU</th>
                                            <th style={{ padding: '12px 15px' }}>RAM Asignada</th>
                                            <th style={{ padding: '12px 15px', textAlign: 'center' }}>Estado</th>
                                            <th style={{ padding: '12px 15px', borderRadius: '0 8px 8px 0', textAlign: 'center' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedUser.dbs.map((db, i) => {
                                            const limits = dbLimits[db.name] || { cpu: 100, ram: 2048 };
                                            const baseRam = (db.name ? db.name.length * 15 : 100) + (i * 40) + 150;
                                            
                                            let dbCpu = (Math.random() * 5 + 0.5);
                                            if (dbCpu > limits.cpu) dbCpu = limits.cpu * (Math.random() * 0.8 + 0.1);
                                            let dbRamValue = baseRam + Math.random() * 4 - 2;
                                            if (dbRamValue > limits.ram) dbRamValue = limits.ram - Math.random() * 2;
                                            
                                            const dbCpuStr = panicMode || bannedUsers[selectedUser.email] ? "0.0" : dbCpu.toFixed(1);
                                            const dbRamStr = panicMode || bannedUsers[selectedUser.email] ? "0" : dbRamValue.toFixed(0);
                                            
                                            return (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '15px', maxWidth: '300px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>{db.name || 'db_desconocida'}</div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '3px', wordBreak: 'break-all' }}>{db.host || 'localhost'}</div>
                                                </td>
                                                <td style={{ padding: '15px', color: '#64748b', fontWeight: '500' }}>{db.engine || 'PostgreSQL'}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: parseFloat(dbCpuStr) > (limits.cpu * 0.8) ? '#f59e0b' : '#3b82f6', fontWeight: 'bold', width: '40px' }}>{dbCpuStr}%</span>
                                                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(100, parseFloat(dbCpuStr) * (100/limits.cpu))}%`, height: '100%', background: parseFloat(dbCpuStr) > (limits.cpu * 0.8) ? '#f59e0b' : '#3b82f6' }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '15px', color: '#8b5cf6', fontWeight: 'bold' }}>
                                                    {dbRamStr} MB
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    {panicMode ? (
                                                        <span style={{ display: 'inline-block', padding: '4px 12px', background: '#fef2f2', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            AISLADA (LOCKDOWN)
                                                        </span>
                                                    ) : bannedUsers[selectedUser.email] ? (
                                                        <span style={{ display: 'inline-block', padding: '4px 12px', background: '#fef2f2', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            BLOQUEADA
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-block', padding: '4px 12px', background: '#ecfdf5', color: '#10b981', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            Protegida
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                                    <button 
                                                        onClick={() => {
                                                            setLimitingDb(db);
                                                            setCpuLimit(dbLimits[db.name]?.cpu || 10);
                                                            setRamLimit(dbLimits[db.name]?.ram || 256);
                                                        }}
                                                        disabled={panicMode || bannedUsers[selectedUser.email]}
                                                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: (panicMode || bannedUsers[selectedUser.email]) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', opacity: (panicMode || bannedUsers[selectedUser.email]) ? 0.5 : 1 }}
                                                    >
                                                        <Settings size={14} /> Asignar
                                                    </button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    <Database size={48} style={{ opacity: 0.2, margin: '0 auto 15px auto' }} />
                                    <p style={{ margin: 0, fontSize: '1.1rem' }}>Este usuario aún no ha registrado ninguna base de datos.</p>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>
                            <button onClick={() => setSelectedUser(null)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-modal para limitar recursos de la BD */}
            {limitingDb && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '450px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem', color: '#0f172a' }}>
                            <Settings size={28} color="#3b82f6" />
                            <h2 style={{ margin: 0 }}>Control de Recursos</h2>
                        </div>
                        <p style={{ color: '#475569', marginBottom: '2rem', lineHeight: '1.5' }}>
                            Asigna el límite máximo de procesamiento y memoria en caché que el motor heurístico puede usar para <strong>{limitingDb.name}</strong>.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontWeight: 'bold', color: '#334155' }}>Límite Máximo de CPU</label>
                                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{cpuLimit}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="20" 
                                step="1"
                                value={cpuLimit} 
                                onChange={(e) => setCpuLimit(parseInt(e.target.value))} 
                                style={{ width: '100%', cursor: 'pointer' }} 
                            />
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontWeight: 'bold', color: '#334155' }}>Límite de RAM (Caché)</label>
                                <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{ramLimit} MB</span>
                            </div>
                            <input 
                                type="range" 
                                min="64" 
                                max="1024" 
                                step="64" 
                                value={ramLimit} 
                                onChange={(e) => setRamLimit(parseInt(e.target.value))} 
                                style={{ width: '100%', cursor: 'pointer' }} 
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button 
                                onClick={() => setLimitingDb(null)} 
                                style={{ padding: '10px 20px', background: 'transparent', color: '#64748b', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    setDbLimits(prev => ({ ...prev, [limitingDb.name]: { cpu: cpuLimit, ram: ramLimit } }));
                                    setLimitingDb(null);
                                }} 
                                style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Aplicar Límites
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
