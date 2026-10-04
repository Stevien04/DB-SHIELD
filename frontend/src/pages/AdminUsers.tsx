// @ts-nocheck
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Users, Users, Database, ShieldAlert, Activity, Eye, X, Cpu, HardDrive, Zap, Server, Settings, Lock, Unlock, Ban } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: string;
    isActive: boolean;
    banReason?: string;
    bannedAt?: string;
}

interface UserDbStats {
    id: number;
    role: string;
    isActive: boolean;
    banReason?: string;
    bannedAt?: string;
    email: string;
    fullName?: string;
    country?: string;
    city?: string;
    phone?: string;
    dbCount: number;
    totalThreatsBlocked: number;
    bandwidthUsed: string;
    dbs: any[];
    astAttacks: number;
    tikaAttacks: number;
    exfilAttacks: number;
}

const locationData: Record<string, string[]> = {
    "Perú": ["Lima", "Arequipa", "Cusco", "Piura", "Tacna"],
    "Colombia": ["Bogotá", "Medellín", "Cali", "Cartagena"],
    "Chile": ["Santiago", "Valparaíso", "Concepción"],
    "México": ["CDMX", "Guadalajara", "Monterrey"]
};

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserDbStats[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserDbStats | null>(null);
    const [historyUser, setHistoryUser] = useState<UserDbStats | null>(null);
    const [editUser, setEditUser] = useState<UserDbStats | null>(null);
    const [editForm, setEditForm] = useState({ fullName: '', country: '', city: '', phone: '', role: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [popupMessage, setPopupMessage] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [banModal, setBanModal] = useState<{ visible: boolean, user: UserDbStats | null, reason: string }>({ visible: false, user: null, reason: '' });

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
                        id: u.id,
                        role: u.role,
                        isActive: u.active !== undefined ? u.active : u.isActive,
                        email: u.username,
                        fullName: u.fullName,
                        country: u.country,
                        city: u.city,
                        phone: u.phone,
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

    const toggleBan = async (user: UserDbStats) => {
        if (user.isActive) {
            setBanModal({ visible: true, user, reason: '' });
            return;
        }
        try {
            await api.put(`/users/${user.id}`, { role: user.role, active: true });
            setStats(prev => prev.map(s => s.id === user.id ? { ...s, isActive: true, banReason: undefined, bannedAt: undefined } : s));
        } catch(e) {
            console.error("Error toggling ban", e);
        }
    };

    const confirmBan = async () => {
        if (!banModal.user) return;
        try {
            await api.put(`/users/${banModal.user.id}`, { role: banModal.user.role, active: false, banReason: banModal.reason });
            setStats(prev => prev.map(s => s.id === banModal.user.id ? { ...s, isActive: false, banReason: banModal.reason, bannedAt: new Date().toISOString() } : s));
            setBanModal({ visible: false, user: null, reason: '' });
        } catch(e) {
            console.error("Error toggling ban", e);
        }
    };

    const openEditModal = (user: UserDbStats) => {
        setFormErrors({});
        setEditUser(user);
        setEditForm({
            fullName: user.fullName || '',
            country: user.country || '',
            city: user.city || '',
            role: user.role,
            phone: user.phone || ''
        });
    };

    const saveUserDetails = async () => {
        if (!editUser) return;
        
        setFormErrors({});
        if (editForm.phone && !/^\d{9}$/.test(editForm.phone)) {
            setFormErrors({ phone: 'El teléfono debe tener exactamente 9 dígitos numéricos.' });
            return;
        }
        try {
            await api.put(`/users/${editUser.id}`, { 
                role: editForm.role, 
                active: editUser.isActive,
                ...editForm 
            });
            setStats(prev => prev.map(s => s.id === editUser.id ? { ...s, ...editForm } : s));
            setEditUser(null);
            setPopupMessage({title: 'Éxito', message: 'Datos actualizados correctamente.', type: 'success'});
        } catch(e) {
            setPopupMessage({title: 'Error', message: 'Hubo un error al guardar los cambios.', type: 'error'}); console.error("Error updating user details", e);
        }
    };

    const changeRole = async (user: UserDbStats, newRole: string) => {
        try {
            await api.put(`/users/${user.id}`, { role: newRole, active: user.isActive });
            setStats(prev => prev.map(s => s.id === user.id ? { ...s, role: newRole } : s));
            setPopupMessage({title: 'Éxito', message: 'Rol actualizado correctamente.', type: 'success'});
        } catch(e) {
            console.error("Error changing role", e);
        }
    };

    const fetchHistory = async (user: UserDbStats) => {
        try {
            const { data } = await api.get('/audit-log');
            const filtered = data.filter((log: any) => log.username === user.email);
            setAuditLogs(filtered);
            setHistoryUser(user);
        } catch(e) {
            console.error("Error fetching history", e);
        }
    };

    const filteredStats = stats.filter(s => 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalUsers = stats.length;
    const onlineUsers = 1; // Solo el admin actual esta en linea
    const bannedUsers = stats.filter(s => !s.isActive).length;

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
                        <ShieldAlert size={36} /> Gestión de Usuarios
                    </h1>
                    <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Administra roles, accesos y revisa el historial de acciones de los inquilinos.</p>
                </div>
                
            </div>

            <div style={{ padding: '3rem', flex: 1 }}>
                
                                {/* Cards Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '12px', color: '#3b82f6' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Usuarios Registrados</p>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>{totalUsers}</h3>
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', color: '#10b981' }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Usuarios en Línea</p>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>{onlineUsers}</h3>
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '12px', color: '#ef4444' }}>
                            <Ban size={24} />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>Usuarios Baneados</p>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>{bannedUsers}</h3>
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
                                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>Rol</th>
                                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Uso de Red</th>
                                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStats.map((stat, idx) => {
                                const isBanned = !stat.isActive;
                                return (
                                <tr key={idx} style={{ transition: 'background 0.2s', opacity: isBanned ? 0.6 : 1 }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: isBanned ? '#ef4444' : '#334155' }}>
                                        <span onClick={() => openEditModal(stat)} style={{ cursor: 'pointer', textDecoration: 'underline' }} title="Ver/Editar Detalles">{stat.email}</span>
                                      </td>
                                      <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
                                          <span style={{ background: stat.role === 'ADMIN_DBA' ? '#3b82f6' : '#8b5cf6', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                              {stat.role === 'ADMIN_DBA' ? 'Administrador' : 'Cliente'}
                                          </span>
                                          {isBanned && stat.banReason && (
                                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ef4444' }}>
                                                  <strong>Motivo:</strong> {stat.banReason} <br/>
                                                  <strong>Fecha:</strong> {stat.bannedAt ? new Date(stat.bannedAt).toLocaleString() : 'Reciente'}
                                              </div>
                                          )}
                                        {isBanned && <span style={{ marginLeft: '10px', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Suspendido</span>}
                                    </td>
                                    
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {panicMode || isBanned ? <span style={{color: '#94a3b8'}}>Bloqueado</span> : <><Activity size={16} /> {stat.bandwidthUsed}</>}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            
                                            <button 
                                                onClick={() => fetchHistory(stat)}
                                                style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}
                                            >
                                                <Activity size={16} /> Historial
                                            </button>
                                            {stat.email !== 'admin' && (
                                                <button 
                                                    onClick={() => toggleBan(stat)}
                                                    style={{ background: isBanned ? '#ecfdf5' : '#fff1f2', color: isBanned ? '#10b981' : '#ef4444', border: `1px solid ${isBanned ? '#a7f3d0' : '#fecaca'}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}
                                                >
                                                    {isBanned ? <><Unlock size={16} /> Reactivar</> : <><Ban size={16} /> Banear</>}
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

            {/* Modal de Historial */}
            {historyUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '95%', maxWidth: '800px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={24} color="#3b82f6" /> 
                                Historial de {historyUser.email}
                            </h2>
                            <button onClick={() => setHistoryUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ padding: '2rem', maxHeight: '500px', overflowY: 'auto' }}>
                            {auditLogs.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                            <th style={{ padding: '10px' }}>Fecha</th>
                                            <th style={{ padding: '10px' }}>Acción</th>
                                            <th style={{ padding: '10px' }}>Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map((log, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px', fontSize: '0.9rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                                <td style={{ padding: '10px', fontWeight: 'bold', color: '#3b82f6', fontSize: '0.9rem' }}>{log.action}</td>
                                                <td style={{ padding: '10px', fontSize: '0.9rem' }}>{log.details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    No hay historial para este usuario.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Editar Detalles Personales */}
            {editUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '95%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={24} color="#3b82f6" /> 
                                Detalles del Usuario
                            </h2>
                            <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ padding: '2rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '5px' }}>Correo Electrónico (No modificable)</label>
                                <input type="text" value={editUser.email} disabled style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#94a3b8' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>Nombre Completo</label>
                                <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({...editForm, fullName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Juan Pérez" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>País</label>
                                <select value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value, city: ''})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}>
                                    <option value="" disabled>Seleccione un País</option>
                                    {Object.keys(locationData).map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>Ciudad</label>
                                <select value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }} disabled={!editForm.country}>
                                    <option value="" disabled>Seleccione una Ciudad</option>
                                    {editForm.country && locationData[editForm.country] ? locationData[editForm.country].map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    )) : <option value={editForm.city}>{editForm.city}</option>}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>Teléfono</label>
                                <input type="text" value={editForm.phone} onChange={(e) => { setEditForm({...editForm, phone: e.target.value}); setFormErrors({...formErrors, phone: ''}); }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: formErrors.phone ? '1px solid #ef4444' : '1px solid #cbd5e1' }} placeholder="Ej: 999888777" />
                                {formErrors.phone && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{formErrors.phone}</div>}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button onClick={() => setEditUser(null)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                                <button onClick={saveUserDetails} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        
            {/* Modal de Aviso General */}
            {popupMessage && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: popupMessage.type === 'error' ? '#ef4444' : '#10b981', marginBottom: '10px' }}>
                            {popupMessage.title}
                        </div>
                        <div style={{ color: '#475569', marginBottom: '20px' }}>
                            {popupMessage.message}
                        </div>
                        <button onClick={() => setPopupMessage(null)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
            {banModal.visible && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '550px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Motivo de Suspensión</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Ingrese el motivo por el cual suspenderá al usuario <strong>{banModal.user?.email}</strong>.
                        </p>
                        <textarea
                            value={banModal.reason}
                            onChange={e => setBanModal({ ...banModal, reason: e.target.value })}
                            placeholder="Ej: Intentos reiterados de inyección SQL"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', marginBottom: '1.5rem', minHeight: '100px', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setBanModal({ visible: false, user: null, reason: '' })} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>
                                Cancelar
                            </button>
                            <button onClick={confirmBan} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                                Confirmar Baneo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}