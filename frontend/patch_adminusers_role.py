import os
import re

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminUsers.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the prompt() with nothing, just let them edit it in the modal.
# Or keep it as a toggle? Let's just remove the prompt and rely on the modal!
# Wait, the modal doesn't have a role dropdown currently.

# 1. Add role dropdown to edit modal
role_dropdown = """
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>Rol del Sistema</label>
                                <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }} disabled={editUser.email === 'admin'}>
                                    <option value="CLIENT">Cliente</option>
                                    <option value="ADMIN_DBA">Administrador</option>
                                </select>
                            </div>
"""

# Wait, `editForm` doesn't have `role`!
# Let's update `editForm` initialization
content = content.replace("const [editForm, setEditForm] = useState({ fullName: '', country: '', city: '', phone: '' });", "const [editForm, setEditForm] = useState({ fullName: '', country: '', city: '', phone: '', role: '' });")

# Update `openEditModal` to populate `role`
content = content.replace("city: user.city || '',", "city: user.city || '',\n            role: user.role,")

# Add the dropdown to the modal UI right before the Nombre Completo field
content = content.replace("<div style={{ marginBottom: '15px' }}>\n                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>Nombre Completo</label>", role_dropdown + "\n                            <div style={{ marginBottom: '15px' }}>\n                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>Nombre Completo</label>")

# Ensure saveUserDetails sends the modified role
# Current: role: editUser.role
content = content.replace("role: editUser.role,", "role: editForm.role,")

# Remove the prompt() from the badge click
# Find the span with onClick={... prompt ...}
span_to_replace = """<span style={{ marginLeft: '10px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => {
                                            if(stat.email !== 'admin') {
                                                const newRole = prompt("Nuevo rol (ADMIN_DBA o CLIENT):", stat.role);
                                                if (newRole && (newRole === 'ADMIN_DBA' || newRole === 'CLIENT')) {
                                                    changeRole(stat, newRole);
                                                }
                                            }
                                        }}>"""
new_span = """<span style={{ marginLeft: '10px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>"""

content = content.replace(span_to_replace, new_span)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
