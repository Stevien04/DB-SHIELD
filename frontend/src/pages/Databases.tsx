import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldOff, ShieldCheck, AlertTriangle, Info, Edit2 } from 'lucide-react';

export default function Databases() {
    // Añadimos puerto, usuario y contraseña al mock para poder editarlos
    const [dbs, setDbs] = useState<any[]>(() => {
        const token = localStorage.getItem('token');
        let username = 'default';
        if (token && token.split('.').length === 3) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub || 'default';
            } catch (e) {}
        }
        const saved = localStorage.getItem('dbs_' + username);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        let username = 'default';
        if (token && token.split('.').length === 3) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub || 'default';
            } catch (e) {}
        }
        localStorage.setItem('dbs_' + username, JSON.stringify(dbs));
    }, [dbs]);
    
    const [showModal, setShowModal] = useState(false);
    const [editDbId, setEditDbId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'PostgreSQL', host: '', port: '', user: '', pass: '' });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDanger: false,
        isAlert: false
    });

    const handleDisable = (id: number, name: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Desconectar Base de Datos",
            message: `¿Seguro que desea desconectar la base de datos "${name}"? Dejará de estar protegida por el Antivirus.`,
            isDanger: true,
            isAlert: false,
            onConfirm: () => {
                setDbs(prev => prev.map(db => db.id === id ? { ...db, active: false } : db));
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleEnable = (id: number, name: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Habilitar Base de Datos',
            message: `¿Desea reconectar y proteger nuevamente la base de datos "${name}"?`,
            isDanger: false,
            isAlert: false,
            onConfirm: () => {
                setDbs(prev => prev.map(db => db.id === id ? { ...db, active: true } : db));
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleOpenCreate = () => {
        setFormData({ name: '', type: 'PostgreSQL', host: '', port: '', user: '', pass: '' });
        setEditDbId(null);
        setShowModal(true);
    };

    const handleEdit = (db: any) => {
        setFormData({
            name: db.name,
            type: db.type,
            host: db.host,
            port: db.port || '',
            user: db.user || '',
            pass: db.pass || ''
        });
        setEditDbId(db.id);
        setShowModal(true);
    };

    const [isConnecting, setIsConnecting] = useState(false);

    // Funciona tanto para CREAR como para GUARDAR CAMBIOS (Editar)
    const handleSave = async () => {
        if (!formData.name.trim()) {
            setConfirmDialog({ isOpen: true, title: "Atención", message: "Por favor, ingrese un nombre para la Base de Datos.", isDanger: true, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
            return;
        }
        if (!formData.host.trim() || !formData.port.trim()) {
            setConfirmDialog({ isOpen: true, title: "Atención", message: "Host y Puerto son requeridos.", isDanger: true, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
            return;
        }

        try {
            setIsConnecting(true);
            
            // 1. Probar conexión real usando el backend
            // (Si falla, el bloque catch capturará el error y detendrá el proceso)
            const { data } = await api.post('/databases/test', {
                type: formData.type,
                host: formData.host,
                port: formData.port,
                name: formData.name,
                user: formData.user,
                pass: formData.pass
            });

            // 2. Si llegamos aquí, la conexión a la DB real fue exitosa
            setConfirmDialog({ isOpen: true, title: "Conexión Exitosa", message: "¡" + (data.message || "Conexión Exitosa") + "!", isDanger: false, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
            // 3. Guardar en nuestro listado local (Soft Save)
            if (editDbId !== null) {
                setDbs(prev => prev.map(db => db.id === editDbId ? { ...db, ...formData } : db));
                closeModal();
                return;
            }

            const existingDb = dbs.find(db => db.name.toLowerCase() === formData.name.toLowerCase());
            if (existingDb) {
                if (existingDb.active) {
                    setConfirmDialog({ isOpen: true, title: 'Información', message: `La base de datos "${existingDb.name}" ya está registrada y actualmente está PROTEGIDA.`, isDanger: false, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
                } else {
                    setConfirmDialog({
                        isOpen: true,
                        title: 'Reconectar Base de Datos',
                        message: `La Base de Datos "${existingDb.name}" ya existe pero está desconectada. ¿Desea habilitar la protección?`,
                        isDanger: false,
            isAlert: false,
            onConfirm: () => {
                            setDbs(prev => prev.map(db => db.id === existingDb.id ? { ...db, active: true, ...formData } : db));
                            closeModal();
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        }
                    });
                }
            } else {
                const newDb = {
                    id: Date.now(),
                    name: formData.name,
                    host: formData.host,
                    type: formData.type,
                    port: formData.port,
                    user: formData.user,
                    pass: formData.pass,
                    active: true
                };
                setDbs(prev => [...prev, newDb]);
                closeModal();
            }

        } catch (error: any) {
            // Si la conexión falla o el host no existe
            const errorMsg = error.response?.data?.message || 'Error desconocido de red';
            setConfirmDialog({ isOpen: true, title: 'X Error de Conexión', message: `No se pudo establecer conexión con ${formData.host}:${formData.port}.\n\nDetalles: ${errorMsg}`, isDanger: true, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
        } finally {
            setIsConnecting(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditDbId(null);
        setFormData({ name: '', type: 'PostgreSQL', host: '', port: '', user: '', pass: '' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: 'sans-serif' }}>
            <div style={{ background: 'linear-gradient(90deg, #090979 0%, #00d4ff 100%)', padding: '3.5rem 3rem', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '400' }}>Bases de Datos Protegidas</h1>
                        <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>Gestione y conecte los motores externos bajo el escudo del antivirus.</p>
                    </div>
                    <button 
                        onClick={handleOpenCreate} 
                        style={{ padding: '1rem 2rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.3s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                        + Conectar Nueva Base de Datos
                    </button>
                </div>
            </div>

            {/* Modal de Conexión / Edición */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', width: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ marginTop: 0, color: '#0f172a' }}>
                            {editDbId ? 'Editar Conexión de BD' : 'Conectar BD al Antivirus'}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Nombre Identificador</label>
                                <input 
                                    type="text" placeholder="Ej. crm_produccion" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Motor de Base de Datos</label>
                                <select 
                                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                >
                                    <option>PostgreSQL</option>
                                    <option>MySQL</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Host (IP / Dominio)</label>
                                    <input 
                                        type="text" placeholder="127.0.0.1" 
                                        value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Puerto</label>
                                    <input 
                                        type="text" placeholder="Ej. 5432" 
                                        value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Usuario</label>
                                    <input 
                                        type="text" placeholder="root" 
                                        value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Contraseña</label>
                                    <input 
                                        type="password" placeholder="••••••" 
                                        value={formData.pass} onChange={e => setFormData({...formData, pass: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button disabled={isConnecting} onClick={handleSave} style={{ flex: 1, background: isConnecting ? '#cbd5e1' : '#00d4ff', color: '#000', border: 'none', padding: '12px', borderRadius: '50px', cursor: isConnecting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                    {isConnecting ? 'Probando...' : (editDbId ? 'Guardar Cambios' : 'Conectar BD')}
                                </button>
                                <button onClick={closeModal} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación Personalizado Centrado */}
            {confirmDialog.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                        {confirmDialog.isDanger ? (
                            <AlertTriangle size={56} color="#ef4444" style={{ marginBottom: '15px' }} />
                        ) : (
                            <Info size={56} color="#3b82f6" style={{ marginBottom: '15px' }} />
                        )}
                        <h2 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>{confirmDialog.title}</h2>
                        <p style={{ color: '#475569', marginBottom: '2rem', lineHeight: "1.6", fontSize: "1.05rem", whiteSpace: "pre-wrap" }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button 
                                onClick={confirmDialog.onConfirm} 
                                style={{ flex: 1, background: confirmDialog.isDanger ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'filter 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                            >
                                Aceptar
                            </button>
                            {!confirmDialog.isAlert && <button 
                                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
                                style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', padding: '12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e1'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            >
                                Cancelar
                            </button>}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '3rem' }}>
                <table style={{ width: '100%', background: 'white', borderRadius: '12px', overflow: 'hidden', borderCollapse: 'collapse', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <thead style={{ background: '#f1f5f9', textAlign: 'left', color: '#475569' }}>
                        <tr>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Nombre</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Host</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Motor</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Estado</th>
                            <th style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dbs.map(db => (
                            <tr key={db.id} style={{ transition: 'background 0.2s', opacity: db.active ? 1 : 0.6 }}>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}><strong>{db.name}</strong></td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{db.host}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>{db.type}</td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: db.active ? '#10b981' : '#94a3b8' }}>
                                    {db.active ? '🟢 Protegida' : '🔴 Desconectada'}
                                </td>
                                <td style={{ padding: '1.2rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {/* NUEVO BOTÓN DE EDITAR */}
                                        <button 
                                            onClick={() => handleEdit(db)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            <Edit2 size={16} /> Editar
                                        </button>

                                        {db.active ? (
                                            <button 
                                                onClick={() => handleDisable(db.id, db.name)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                <ShieldOff size={16} /> Deshabilitar
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleEnable(db.id, db.name)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#dcfce3', color: '#10b981', border: 'none', padding: '6px 12px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                <ShieldCheck size={16} /> Habilitar
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {dbs.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay bases de datos registradas.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}