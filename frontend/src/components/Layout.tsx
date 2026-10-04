import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, Database, AlertOctagon, Activity, FileText, PieChart, Network } from 'lucide-react';

export default function Layout() {
    const { role, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    let menuItems = [];
    if (role === 'ADMIN_DBA' || role === 'ROLE_ADMIN_DBA') {
        menuItems = [
            { path: '/admin/users', label: 'Usuarios', icon: <FileText size={22} /> },
            { path: '/admin/dbs', label: 'Base de Datos', icon: <Database size={22} /> },
            { path: '/dashboard', label: 'Reportes', icon: <PieChart size={22} /> },
            { path: '/proxy', label: 'Proxy', icon: <Network size={22} /> },
            { path: '/integration', label: 'API', icon: <ShieldCheck size={22} /> }
        ];
    } else {
        menuItems = [
            { path: '/databases', label: 'Bases de Datos', icon: <Database size={22} /> },
            { path: '/quarantine', label: 'Cuarentena', icon: <AlertOctagon size={22} /> },
            { path: '/dam', label: 'DAM Monitor', icon: <Activity size={22} /> },
            { path: '/proxy', label: 'Proxy', icon: <Network size={22} /> },
            { path: '/integration', label: 'API', icon: <ShieldCheck size={22} /> },
        ];
    }

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
            <style>
                {`
                body, html {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100%;
                    height: 100%;
                }
                * {
                    box-sizing: border-box;
                }
                `}
            </style>
            <aside style={{ 
                width: '260px', 
                /* Mismos colores profundos del Login */
                background: 'linear-gradient(180deg, #020024 0%, #090979 100%)', 
                color: 'white', 
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
                zIndex: 10
            }}>
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                        <div style={{ border: '2px solid rgba(255,255,255,0.8)', borderRadius: '12px', padding: '15px', display: 'inline-block' }}>
                            <ShieldCheck size={40} color="#00d4ff" />
                        </div>
                    </div>
                    <h2 style={{ margin: '5px 0', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 'bold' }}>DB-SHIELD</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#00d4ff', fontWeight: 'bold' }}>Protección: Activada</p>
                </div>
                
                <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '1rem' }}>
                    {menuItems.map(item => {
                        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/admin');
                        return (
                            <Link key={item.path} to={item.path} style={{ 
                                color: isActive ? 'white' : 'rgba(255,255,255,0.7)', 
                                textDecoration: 'none', 
                                padding: '1.2rem 1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                borderLeft: isActive ? '4px solid #00d4ff' : '4px solid transparent',
                                transition: 'all 0.2s',
                                fontSize: '1rem'
                            }}>
                                {item.icon}
                                <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                
                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={handleLogout} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'none', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', width: '100%', padding: '10px', fontSize: '1rem' }} onMouseOver={(e) => e.currentTarget.style.color='white'} onMouseOut={(e) => e.currentTarget.style.color='rgba(255,255,255,0.7)'}>
                        <LogOut size={22} /> Salir
                    </button>
                </div>
            </aside>
            
            <main style={{ flex: 1, backgroundColor: 'white', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </main>
        </div>
    );
}
