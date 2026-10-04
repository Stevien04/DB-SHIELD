import re

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminPanel.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update interface UserDbStats
content = content.replace(
"""interface UserDbStats {
    email: string;""",
"""interface UserDbStats {
    id: number;
    role: string;
    isActive: boolean;
    email: string;"""
)

# 2. Update mapping in fetchUsersAndStats
content = content.replace(
"""                    return {
                        email: u.username,""",
"""                    return {
                        id: u.id,
                        role: u.role,
                        isActive: u.isActive,
                        email: u.username,"""
)

# 3. Add state for History and Edit Role
content = content.replace(
"""    const [selectedUser, setSelectedUser] = useState<UserDbStats | null>(null);""",
"""    const [selectedUser, setSelectedUser] = useState<UserDbStats | null>(null);
    const [historyUser, setHistoryUser] = useState<UserDbStats | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);"""
)

# 4. Modify toggleBan
content = content.replace(
"""    const toggleBan = (email: string) => {
        setBannedUsers(prev => ({ ...prev, [email]: !prev[email] }));
    };""",
"""    const toggleBan = async (user: UserDbStats) => {
        try {
            await api.put(`/users/${user.id}`, { role: user.role, isActive: !user.isActive });
            setStats(prev => prev.map(s => s.id === user.id ? { ...s, isActive: !user.isActive } : s));
        } catch(e) {
            console.error("Error toggling ban", e);
        }
    };

    const changeRole = async (user: UserDbStats, newRole: string) => {
        try {
            await api.put(`/users/${user.id}`, { role: newRole, isActive: user.isActive });
            setStats(prev => prev.map(s => s.id === user.id ? { ...s, role: newRole } : s));
            alert("Rol actualizado correctamente.");
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
    };"""
)

# 5. Modify the table rows
content = re.sub(
r"const isBanned = bannedUsers\[stat\.email\];",
r"const isBanned = !stat.isActive;",
content
)

# Replace Ban button code
content = content.replace(
"""                                            {stat.email !== 'admin' && (
                                                <button 
                                                    onClick={() => toggleBan(stat.email)}
                                                    style={{ background: isBanned ? '#fef2f2' : '#fff1f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}
                                                >
                                                    <Ban size={16} /> {isBanned ? 'Reactivar' : 'Banear'}
                                                </button>
                                            )}""",
"""                                            <button 
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
                                            )}"""
)

# Update the display of roles
content = content.replace(
"""                                        {stat.email === 'admin' && <span style={{ marginLeft: '10px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Admin</span>}""",
"""                                        <span style={{ marginLeft: '10px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => {
                                            if(stat.email !== 'admin') {
                                                const newRole = prompt("Nuevo rol (ADMIN_DBA o CLIENT):", stat.role);
                                                if (newRole && (newRole === 'ADMIN_DBA' || newRole === 'CLIENT')) {
                                                    changeRole(stat, newRole);
                                                }
                                            }
                                        }}>
                                            {stat.role === 'ADMIN_DBA' ? 'Admin' : 'Cliente'} ✎
                                        </span>"""
)

# 6. Add History Modal at the bottom
history_modal = """
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
"""

content = content.replace("        </div>\n    );\n}", history_modal + "        </div>\n    );\n}")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
