import { useState, useEffect } from 'react';
import api from '../services/api';
import { loadDatabaseConnections } from '../services/databaseConnections';
import { ShieldOff, ShieldCheck, AlertTriangle, Info, Edit2 } from 'lucide-react';
const emptyConnection = { name: '', type: 'PostgreSQL', host: '', port: '', user: '', pass: '', sslEnabled: false, sslCaPem: null as string | null, sslCaName: '' };

export default function Databases() {
    const [dbs, setDbs] = useState<any[]>([]);
    const [connectionMessage, setConnectionMessage] = useState('');
    useEffect(() => {
        let cancelled = false;
        loadDatabaseConnections().then(({ databases }) => {
            if (cancelled) return;
            setDbs(databases);
            if (!databases.length) setConnectionMessage('Registra la conexión en el servidor para usar el monitor real. Las conexiones antiguas del navegador no se transfieren automáticamente.');
        }).catch(error => { if (!cancelled) setConnectionMessage(error.response?.data?.message || 'No se pudieron cargar las conexiones del servidor.'); });
        return () => { cancelled = true; };
    }, []);
    const changeStatus = async (id: number, active: boolean) => {
        try {
            const { data } = await api.patch('/databases/' + id + '/status', { active });
            setDbs(prev => prev.map(db => db.id === id ? data : db));
        } catch (error: any) { setConnectionMessage(error.response?.data?.message || 'No se pudo cambiar el estado de la conexión.'); }
    };

    const [showModal, setShowModal] = useState(false);
    const [editDbId, setEditDbId] = useState<number | null>(null);
    const [formData, setFormData] = useState(emptyConnection);
    const [sslFileError, setSslFileError] = useState('');
    const importCa = async (file?: File) => {
        setSslFileError('');
        if (!file) return;
        if (file.size > 262144) { setSslFileError('El certificado no debe superar 256 KB.'); return; }
        try {
            const pem = await file.text();
            if (!pem.includes('-----BEGIN CERTIFICATE-----') || pem.includes('PRIVATE KEY')) {
                setSslFileError('Importa el certificado CA en formato PEM (.pem o .crt), sin claves privadas.'); return;
            }
            setFormData(prev => ({ ...prev, sslEnabled: true, sslCaPem: pem, sslCaName: file.name }));
        } catch { setSslFileError('No se pudo leer el certificado seleccionado.'); }
    };

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
            message: `¿Seguro que desea desconectar la base de datos "${name}"? El monitor dejará de consultar esta conexión.`,
            isDanger: true,
            isAlert: false,
            onConfirm: () => {
                void changeStatus(id, false);
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
                void changeStatus(id, true);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleOpenCreate = () => {
        setFormData(emptyConnection); setSslFileError('');
        setEditDbId(null);
        setShowModal(true);
    };

    const handleEdit = (db: any) => {
        setFormData({
            name: db.name,
            type: db.type,
            host: db.host,
            port: String(db.port || ''),
            user: db.user || '',
            pass: '',
            sslEnabled: !!db.sslEnabled,
            sslCaPem: null,
            sslCaName: db.sslCaName || ''
        });
        setSslFileError('');
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
            
            const payload = { ...formData, port: Number(formData.port) };
            const { data } = editDbId !== null
                ? await api.put('/databases/' + editDbId, payload)
                : await api.post('/databases', payload);
            setDbs(prev => [...prev.filter(db => db.id !== data.id), data]);
            setConnectionMessage('');
            setConfirmDialog({ isOpen: true, title: 'Conexión verificada', message: 'La conexión a ' + data.name + ' se guardó en el servidor.', isDanger: false, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
            closeModal();

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
        setFormData(emptyConnection); setSslFileError('');
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

            {connectionMessage && <p role="alert" style={{ margin: '20px 3rem', padding: '16px', borderRadius: '8px', background: '#fff7ed', color: '#9a3412' }}>{connectionMessage}</p>}
            {/* Modal de Conexión / Edición */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '440px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ marginTop: 0, color: '#0f172a' }}>
                            {editDbId ? 'Editar Conexión de BD' : 'Conectar BD al Antivirus'}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Nombre real de la base de datos</label>
                                <input 
                                    type="text" placeholder="Ej. crm_produccion" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>Motor de Base de Datos</label>
                                <select 
                                    value={formData.type} onChange={e => { setFormData({...formData, type: e.target.value, sslEnabled: false, sslCaPem: null, sslCaName: ''}); setSslFileError(''); }}
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
                                        type="password" placeholder={editDbId ? "Vacío para conservar la contraseña" : "••••••"} 
                                        value={formData.pass} onChange={e => setFormData({...formData, pass: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                    />
                                </div>
                            </div>
                            
                            {formData.type === 'PostgreSQL' && <fieldset style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                                <legend>Conexión SSL</legend>
                                <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input type="checkbox" checked={formData.sslEnabled} onChange={e => setFormData({ ...formData, sslEnabled: e.target.checked })} /> Usar SSL y verificar el servidor
                                </label>
                                {formData.sslEnabled && <>
                                    <label style={{ display: 'block', marginTop: '12px', fontSize: '0.85rem' }}>Importar certificado CA (.pem / .crt)
                                        <input type="file" accept=".pem,.crt,.cer" disabled={isConnecting} onChange={e => { void importCa(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'block', marginTop: '8px', maxWidth: '100%' }} />
                                    </label>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{formData.sslCaName ? 'Certificado: ' + formData.sslCaName : 'Sin archivo: se usarán los certificados públicos de confianza del servidor.'}</p>
                                    {formData.sslCaName && <button type="button" onClick={() => setFormData({ ...formData, sslCaPem: '', sslCaName: '' })} style={{ border: 'none', background: '#f1f5f9', padding: '6px 10px', cursor: 'pointer' }}>Quitar certificado</button>}
                                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Para Aiven, importa su CA certificate. Usa el dominio completo del proveedor.</p>
                                </>}
                                {sslFileError && <p role="alert" style={{ color: '#dc2626', fontSize: '0.85rem' }}>{sslFileError}</p>}
                            </fieldset>}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button disabled={isConnecting || !!sslFileError} onClick={handleSave} style={{ flex: 1, background: isConnecting ? '#cbd5e1' : '#00d4ff', color: '#000', border: 'none', padding: '12px', borderRadius: '50px', cursor: isConnecting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
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
                                    {db.active ? '🟢 Conectada' : '🔴 Desconectada'}
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
