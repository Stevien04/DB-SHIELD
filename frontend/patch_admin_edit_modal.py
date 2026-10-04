import os
import re

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminUsers.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update UserDbStats interface
content = content.replace(
"""interface UserDbStats {
    id: number;
    role: string;
    isActive: boolean;
    email: string;""",
"""interface UserDbStats {
    id: number;
    role: string;
    isActive: boolean;
    email: string;
    fullName?: string;
    country?: string;
    city?: string;
    phone?: string;"""
)

# 2. Update fetch mapping
content = content.replace(
"""                        role: u.role,
                        isActive: u.isActive,
                        email: u.username,""",
"""                        role: u.role,
                        isActive: u.isActive,
                        email: u.username,
                        fullName: u.fullName,
                        country: u.country,
                        city: u.city,
                        phone: u.phone,"""
)

# 3. Add selectedEditUser state
content = content.replace(
"""    const [historyUser, setHistoryUser] = useState<UserDbStats | null>(null);""",
"""    const [historyUser, setHistoryUser] = useState<UserDbStats | null>(null);
    const [editUser, setEditUser] = useState<UserDbStats | null>(null);
    const [editForm, setEditForm] = useState({ fullName: '', country: '', city: '', phone: '' });"""
)

# 4. Add save changes method
content = content.replace(
"""    const changeRole = async (user: UserDbStats, newRole: string) => {""",
"""    const openEditModal = (user: UserDbStats) => {
        setEditUser(user);
        setEditForm({
            fullName: user.fullName || '',
            country: user.country || '',
            city: user.city || '',
            phone: user.phone || ''
        });
    };

    const saveUserDetails = async () => {
        if (!editUser) return;
        try {
            await api.put(`/users/${editUser.id}`, { 
                role: editUser.role, 
                isActive: editUser.isActive,
                ...editForm 
            });
            setStats(prev => prev.map(s => s.id === editUser.id ? { ...s, ...editForm } : s));
            setEditUser(null);
            alert("Datos actualizados correctamente.");
        } catch(e) {
            console.error("Error updating user details", e);
        }
    };

    const changeRole = async (user: UserDbStats, newRole: string) => {"""
)

# 5. Make email clickable
content = content.replace(
"""                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: isBanned ? '#ef4444' : '#334155' }}>
                                        {stat.email}""",
"""                                    <td style={{ padding: '1.2rem 1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: isBanned ? '#ef4444' : '#334155' }}>
                                        <span onClick={() => openEditModal(stat)} style={{ cursor: 'pointer', textDecoration: 'underline' }} title="Ver/Editar Detalles">{stat.email}</span>"""
)

# 6. Add Edit Modal UI
edit_modal = """
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
                                <input type="text" value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Perú" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>Ciudad</label>
                                <input type="text" value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Lima" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: '#475569', fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>Teléfono</label>
                                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: +51 999 888 777" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button onClick={() => setEditUser(null)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                                <button onClick={saveUserDetails} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
"""

content = content.replace("        </div>\n    );\n}", edit_modal + "        </div>\n    );\n}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
