import os
import re

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminUsers.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add formErrors state
content = content.replace(
"""    const [editForm, setEditForm] = useState({ fullName: '', country: '', city: '', phone: '' });""",
"""    const [editForm, setEditForm] = useState({ fullName: '', country: '', city: '', phone: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});"""
)

# 2. Reset formErrors on modal open
content = content.replace(
"""    const openEditModal = (user: UserDbStats) => {
        setEditUser(user);
        setEditForm({""",
"""    const openEditModal = (user: UserDbStats) => {
        setFormErrors({});
        setEditUser(user);
        setEditForm({"""
)

# 3. Validation logic in saveUserDetails
content = content.replace(
"""    const saveUserDetails = async () => {
        if (!editUser) return;
        
        if (editForm.phone && !/^\d{9}$/.test(editForm.phone)) {
            alert('El teléfono debe tener exactamente 9 dígitos numéricos.');
            return;
        }""",
"""    const saveUserDetails = async () => {
        if (!editUser) return;
        
        setFormErrors({});
        if (editForm.phone && !/^\d{9}$/.test(editForm.phone)) {
            setFormErrors({ phone: 'El teléfono debe tener exactamente 9 dígitos numéricos.' });
            return;
        }"""
)

# 4. Insert error message below phone input
phone_input = """<input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: +51 999 888 777" />"""
phone_input_with_error = """<input type="text" value={editForm.phone} onChange={(e) => { setEditForm({...editForm, phone: e.target.value}); setFormErrors({...formErrors, phone: ''}); }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: formErrors.phone ? '1px solid #ef4444' : '1px solid #cbd5e1' }} placeholder="Ej: 999888777" />
                                {formErrors.phone && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{formErrors.phone}</div>}"""

content = content.replace(phone_input, phone_input_with_error)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)


# --- LOGIN.TSX ---
login_file_path = r"D:\BD II PROYECTO\frontend\src\pages\Login.tsx"
with open(login_file_path, "r", encoding="utf-8") as f:
    login_content = f.read()

# Add fieldErrors state
login_content = login_content.replace(
"""    const [errorMsg, setErrorMsg] = useState('');""",
"""    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});"""
)

# Reset field errors when switching mode
login_content = login_content.replace(
"""setIsRegistering(true); setErrorMsg('');""",
"""setIsRegistering(true); setErrorMsg(''); setFieldErrors({});"""
)
login_content = login_content.replace(
"""setIsRegistering(false); setErrorMsg('');""",
"""setIsRegistering(false); setErrorMsg(''); setFieldErrors({});"""
)

# Validation logic in handleRegister
val_start = """        // Validaciones
        if (!regName.trim() || !regCountry.trim() || !regCity.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword.trim()) {
            setErrorMsg('Todos los campos son obligatorios.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(regEmail)) {
            setErrorMsg('El formato del correo es inválido.');
            return;
        }

        const phoneRegex = /^\\d{9}$/;
        if (!phoneRegex.test(regPhone)) {
            setErrorMsg('El teléfono debe tener exactamente 9 dígitos numéricos.');
            return;
        }

        if (regPassword.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
            return;
        }"""

val_new = """        // Validaciones
        const errors: Record<string, string> = {};
        if (!regName.trim()) errors.name = 'Campo obligatorio';
        if (!regCountry.trim()) errors.country = 'Requerido';
        if (!regCity.trim()) errors.city = 'Requerido';
        
        if (!regPhone.trim()) errors.phone = 'Campo obligatorio';
        else if (!/^\\d{9}$/.test(regPhone)) errors.phone = 'Exactamente 9 dígitos numéricos';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regEmail.trim()) errors.email = 'Campo obligatorio';
        else if (!emailRegex.test(regEmail)) errors.email = 'Formato inválido';

        if (!regPassword.trim()) errors.password = 'Campo obligatorio';
        else if (regPassword.length < 6) errors.password = 'Mínimo 6 caracteres';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});"""

login_content = login_content.replace(val_start, val_new)

# Add error spans to inputs in Login.tsx
def add_err(content, search_pattern, error_key):
    # Regex to find the </div> that closes the input wrapper
    # Actually it's easier to just append the error div after the input tag inside the wrapper if it's position absolute etc.
    # But in Login.tsx, inputs are inside flex containers or relative divs.
    return content

# Since Login UI has inputs grouped tightly, I'll manually replace each input to include the error msg just below the input box.

login_content = re.sub(
    r'(<input type="text" placeholder="Nombre Completo" value=\{regName\} onChange=\{e => setRegName\(e\.target\.value\)\} style=\{inputStyle\} />)',
    r'\1\n{fieldErrors.name && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.name}</div>}',
    login_content
)

login_content = re.sub(
    r'(<select value=\{regCountry\}.*?</select>)',
    r'\1\n{fieldErrors.country && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.country}</div>}',
    login_content, flags=re.DOTALL
)

login_content = re.sub(
    r'(<select value=\{regCity\}.*?</select>)',
    r'\1\n{fieldErrors.city && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.city}</div>}',
    login_content, flags=re.DOTALL
)

login_content = re.sub(
    r'(<input type="text" placeholder="Celular" value=\{regPhone\} onChange=\{e => setRegPhone\(e\.target\.value\)\} style=\{inputStyle\} />)',
    r'\1\n{fieldErrors.phone && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.phone}</div>}',
    login_content
)

login_content = re.sub(
    r'(<input type="email" placeholder="Correo Electrónico" value=\{regEmail\} onChange=\{e => setRegEmail\(e\.target\.value\)\} style=\{inputStyle\} />)',
    r'\1\n{fieldErrors.email && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.email}</div>}',
    login_content
)

login_content = re.sub(
    r'(<input type="password" placeholder="Contraseña" value=\{regPassword\} onChange=\{e => setRegPassword\(e\.target\.value\)\} style=\{inputStyle\} />)',
    r'\1\n{fieldErrors.password && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.password}</div>}',
    login_content
)

# Because absolute positioning might overlap with the next input if there's no margin, we should increase the gap of the form
login_content = login_content.replace(
    """<form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>""",
    """<form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>"""
)

# onChange to clear error
login_content = login_content.replace("setRegName(e.target.value)", "setRegName(e.target.value); setFieldErrors({...fieldErrors, name: ''})")
login_content = login_content.replace("setRegCountry(e.target.value); setRegCity('');", "setRegCountry(e.target.value); setRegCity(''); setFieldErrors({...fieldErrors, country: '', city: ''})")
login_content = login_content.replace("setRegCity(e.target.value)", "setRegCity(e.target.value); setFieldErrors({...fieldErrors, city: ''})")
login_content = login_content.replace("setRegPhone(e.target.value)", "setRegPhone(e.target.value); setFieldErrors({...fieldErrors, phone: ''})")
login_content = login_content.replace("setRegEmail(e.target.value)", "setRegEmail(e.target.value); setFieldErrors({...fieldErrors, email: ''})")
login_content = login_content.replace("setRegPassword(e.target.value)", "setRegPassword(e.target.value); setFieldErrors({...fieldErrors, password: ''})")

with open(login_file_path, "w", encoding="utf-8") as f:
    f.write(login_content)

