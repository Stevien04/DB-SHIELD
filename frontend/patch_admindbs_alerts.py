import os

file_path = r"D:\BD II PROYECTO\frontend\src\pages\AdminDBs.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "const [popupMessage" not in content:
    # We might not have formErrors in AdminDBs. Let's see what it has.
    # It has: const [panicMode, setPanicMode] = useState(false);
    state_injection = """
    const [panicMode, setPanicMode] = useState(false);
    const [popupMessage, setPopupMessage] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
"""
    content = content.replace("const [panicMode, setPanicMode] = useState(false);", state_injection.strip())

    content = content.replace('alert("Rol actualizado correctamente.");', "setPopupMessage({title: 'Éxito', message: 'Rol actualizado correctamente.', type: 'success'});")

    popup_jsx = """
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
        </div>
"""
    parts = content.rsplit("</div>", 1)
    content = popup_jsx.join(parts)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
