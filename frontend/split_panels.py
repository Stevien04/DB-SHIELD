import os
import re

frontend_src = r"D:\BD II PROYECTO\frontend\src\pages"

def edit_admin_users():
    path = os.path.join(frontend_src, "AdminUsers.tsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Rename component
    content = content.replace("export default function AdminPanel() {", "export default function AdminUsers() {")

    # Update Title
    content = content.replace("Panel de Control Global (DBA)", "Gestión de Usuarios")
    content = content.replace("Vista general de inquilinos, consumo de recursos y motores de antivirus desplegados.", "Administra roles, accesos y revisa el historial de acciones de los inquilinos.")

    # Remove Lockdown button
    lockdown_button_regex = re.compile(r"<div>\s*<button[^>]+togglePanic[^>]+>.*?</button>\s*</div>", re.DOTALL)
    content = lockdown_button_regex.sub("", content)

    # Remove the KPIs except the first one (Usuarios Registrados)
    # Actually, we can just remove the whole "KPIs y Orígenes" and "Rendimiento en Vivo" blocks entirely for simplicity, 
    # or keep a smaller top section.
    kpi_block_start = "                {/* KPIs y Orígenes */}"
    server_block_end = "                {/* Filtro y Tabla */}"
    
    start_idx = content.find(kpi_block_start)
    end_idx = content.find(server_block_end)
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

    # Remove "BDs" and "Ancho de Banda" columns
    content = content.replace("<th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>BDs</th>", "")
    content = content.replace("<th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Ancho de Banda</th>", "")
    
    # Remove DBs and BW data cells
    db_td = re.compile(r"<td style={{ padding: '1\.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }}>\s*\{stat\.dbCount\}\s*</td>", re.DOTALL)
    content = db_td.sub("", content)
    
    bw_td = re.compile(r"<td style={{ padding: '1\.2rem 1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>\s*\{panicMode \|\| !stat.isActive \? <span style={{color: '#94a3b8'}}>Bloqueado</span> : <><Activity size=\{16\} /> \{stat\.bandwidthUsed\}</>\}\s*</td>", re.DOTALL)
    content = bw_td.sub("", content)

    # Remove "Ver BDs" button
    ver_bds_btn = re.compile(r"<button\s+onClick=\{\(\) => setSelectedUser\(stat\)\}[^>]+>\s*<Eye size=\{16\} /> Ver BDs\s*</button>", re.DOTALL)
    content = ver_bds_btn.sub("", content)

    # Remove DB Modal & Limiting DB Modal
    db_modal_start = "{/* Modal de Detalle de BDs */}"
    history_modal_start = "{/* Modal de Historial */}"
    
    idx_db = content.find(db_modal_start)
    idx_hist = content.find(history_modal_start)
    if idx_db != -1 and idx_hist != -1:
        content = content[:idx_db] + content[idx_hist:]

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def edit_admin_dbs():
    path = os.path.join(frontend_src, "AdminDBs.tsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Rename component
    content = content.replace("export default function AdminPanel() {", "export default function AdminDBs() {")

    # Update Title
    content = content.replace("Panel de Control Global (DBA)", "Gestión de Bases de Datos")

    # Remove editing roles and ban buttons from table
    # Role span -> make it unclickable
    role_span = re.compile(r"<span style=\{\{\s*marginLeft:\s*'10px',\s*background:\s*'#3b82f6'.*?</span>", re.DOTALL)
    content = role_span.sub(r"""<span style={{ marginLeft: '10px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{stat.role === 'ADMIN_DBA' ? 'Admin' : 'Cliente'}</span>""", content)

    # Remove Historial and Banear buttons
    historial_btn = re.compile(r"<button\s+onClick=\{\(\) => fetchHistory\(stat\)\}[^>]+>\s*<Activity size=\{16\} /> Historial\s*</button>", re.DOTALL)
    content = historial_btn.sub("", content)

    banear_btn = re.compile(r"\{stat\.email !== 'admin' && \(\s*<button\s+onClick=\{\(\) => toggleBan\(stat\)\}[^>]+>.*?</button>\s*\)\}", re.DOTALL)
    content = banear_btn.sub("", content)

    # Remove History Modal
    history_modal_start = "{/* Modal de Historial */}"
    idx_hist = content.find(history_modal_start)
    if idx_hist != -1:
        content = content[:idx_hist] + "        </div>\n    );\n}"

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

edit_admin_users()
edit_admin_dbs()
