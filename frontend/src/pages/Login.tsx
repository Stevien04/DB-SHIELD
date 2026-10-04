import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import GoogleSignIn from '../components/GoogleSignIn';
import { ShieldCheck, Eye, EyeOff, User, Lock, Mail, MapPin, Phone } from 'lucide-react';

const locationData: Record<string, string[]> = {
    "Perú": ["Lima", "Arequipa", "Cusco", "Piura", "Tacna"],
    "Colombia": ["Bogotá", "Medellín", "Cali", "Cartagena"],
    "Chile": ["Santiago", "Valparaíso", "Concepción"],
    "México": ["CDMX", "Guadalajara", "Monterrey"]
};

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);

    // Login state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Register state
    const [regName, setRegName] = useState('');
    const [regCountry, setRegCountry] = useState('');
    const [regCity, setRegCity] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        
        try {
            const { data } = await api.post('/auth/login', { username, password });
            login(data.token, data.role);
            navigate('/');
        } catch (error: any) {
            if (error.response?.data?.message === "THREAT_DETECTED") { setErrorMsg("¡ATAQUE BLOQUEADO! WAF interceptó intento de Inyección SQL."); } else { setErrorMsg("Credenciales inválidas"); }
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        // Validaciones
        const errors: Record<string, string> = {};
        if (!regName.trim()) errors.name = 'Campo obligatorio';
        if (!regCountry.trim()) errors.country = 'Requerido';
        if (!regCity.trim()) errors.city = 'Requerido';
        
        if (!regPhone.trim()) errors.phone = 'Campo obligatorio';
        else if (!/^\d{9}$/.test(regPhone)) errors.phone = 'Exactamente 9 dígitos numéricos';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regEmail.trim()) errors.email = 'Campo obligatorio';
        else if (!emailRegex.test(regEmail)) errors.email = 'Formato inválido';

        if (!regPassword.trim()) errors.password = 'Campo obligatorio';
        else if (regPassword.length < 6) errors.password = 'Mínimo 6 caracteres';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        try {
            const { data } = await api.post('/auth/register', {
                email: regEmail,
                password: regPassword,
                fullName: regName,
                country: regCountry,
                city: regCity,
                phone: regPhone
            });
            // Auto login after register
            login(data.token, data.role);
            navigate('/');
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || 'Error al registrar el usuario');
        }
    };

    const inputStyle = {
        width: '100%', 
        padding: '12px 20px 12px 45px', 
        background: '#ffffff', 
        border: '2px solid transparent', 
        borderRadius: '50px', 
        color: '#000000', 
        fontSize: '1rem',
        fontWeight: '500',
        outline: 'none',
        boxSizing: 'border-box' as const,
        transition: 'all 0.3s'
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center',
            backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(0, 212, 255, 0.25) 0%, rgba(9, 9, 121, 0.7) 50%, rgba(2, 0, 36, 1) 100%), url("https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop")',
            backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'sans-serif', color: 'white', overflow: 'hidden', position: 'relative'
        }}>
            <style>
                {`
                body, html { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; background-color: #020024; }
                input::placeholder { color: #6b7280; }
                input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active {
                    -webkit-text-fill-color: black !important;
                    -webkit-box-shadow: 0 0 0 30px white inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                `}
            </style>

            <div style={{ position: 'absolute', bottom: '20px', right: '25px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem', fontWeight: 'bold' }}>
                v 1.0.0
            </div>

            <h1 style={{ fontSize: '3.5rem', letterSpacing: '0.15rem', color: '#ffffff', margin: '0 0 1.5rem 0', textShadow: '0 0 15px rgba(0, 212, 255, 0.8)' }}>
                DB-SHIELD
            </h1>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'center' }}>
                
                {/* Panel Izquierdo: Escudo */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px', padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)', width: '320px', boxSizing: 'border-box'
                }}>
                    <ShieldCheck size={180} color="#00d4ff" style={{ filter: 'drop-shadow(0 0 25px rgba(0, 212, 255, 0.9))', strokeWidth: 1.2 }} />
                </div>

                {/* Panel Derecho: Formularios */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px', padding: '3rem', width: '420px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box'
                }}>
                    {errorMsg && (
                        <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {errorMsg}
                        </div>
                    )}

                    {!isRegistering ? (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <User size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                <input type="text" placeholder="Username (o Correo)" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Lock size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#000000', padding: 0 }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', opacity: 0.9, padding: '0 10px', marginTop: '-5px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    Remember me
                                </label>
                                <a href="#" style={{ color: 'white', textDecoration: 'none' }}>forgot password ?</a>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(true); setErrorMsg(''); setFieldErrors({}); }} style={{ color: '#00d4ff', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 'bold' }}>
                                    Crear cuenta
                                </a>
                                <button type="submit" style={{ padding: '10px 40px', backgroundColor: '#00d4ff', color: '#000', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', boxShadow: '0 0 15px rgba(0, 212, 255, 0.5)' }}>
                                    Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <User size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                <input type="text" placeholder="Nombre y Apellido" value={regName} onChange={e => { setRegName(e.target.value); setFieldErrors({...fieldErrors, name: ''}) }} style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                    <MapPin size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                    <select value={regCountry} onChange={e => { setRegCountry(e.target.value); setRegCity(''); setFieldErrors({...fieldErrors, country: '', city: ''}) }} style={{...inputStyle, appearance: 'none', cursor: 'pointer', color: regCountry ? '#000' : '#757575'}}>
                                        <option value="" disabled>País</option>
                                        {Object.keys(locationData).map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
{fieldErrors.country && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.country}</div>}
                                </div>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                    <select value={regCity} onChange={e => { setRegCity(e.target.value); setFieldErrors({...fieldErrors, city: ''}) }} style={{...inputStyle, paddingLeft: '20px', appearance: 'none', cursor: 'pointer', color: regCity ? '#000' : '#757575'}} disabled={!regCountry}>
                                        <option value="" disabled>Ciudad</option>
                                        {regCountry && locationData[regCountry]?.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
{fieldErrors.city && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.city}</div>}
                                </div>
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Phone size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                <input type="text" placeholder="Celular" value={regPhone} onChange={e => { setRegPhone(e.target.value); setFieldErrors({...fieldErrors, phone: ''}) }} style={inputStyle} />
{fieldErrors.phone && <div style={{color: "#fca5a5", fontSize: "0.75rem", position: "absolute", bottom: "-18px", left: "15px"}}>{fieldErrors.phone}</div>}
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Mail size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                <input type="email" placeholder="Correo (Fundamental)" value={regEmail} onChange={e => { setRegEmail(e.target.value); setFieldErrors({...fieldErrors, email: ''}) }} style={inputStyle} />
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Lock size={20} color="#000000" style={{ position: 'absolute', left: '15px' }} />
                                <input type={showPassword ? "text" : "password"} placeholder="Contraseña" value={regPassword} onChange={e => { setRegPassword(e.target.value); setFieldErrors({...fieldErrors, password: ''}) }} style={inputStyle} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#000000', padding: 0 }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(false); setErrorMsg(''); setFieldErrors({}); }} style={{ color: '#00d4ff', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 'bold' }}>
                                    Ya tengo cuenta
                                </a>
                                <button type="submit" style={{ padding: '10px 40px', backgroundColor: '#00d4ff', color: '#000', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', boxShadow: '0 0 15px rgba(0, 212, 255, 0.5)' }}>
                                    Registrarse
                                </button>
                            </div>
                        </form>
                    )}
                    <GoogleSignIn />
                </div>
            </div>
        </div>
    );
}
