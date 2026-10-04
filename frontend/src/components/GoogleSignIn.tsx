import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function GoogleSignIn() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const button = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState('Cargando Google…');
    const [credential, setCredential] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [unavailable, setUnavailable] = useState(false);

    async function authenticate(token: string, localPassword?: string) {
        setBusy(true);
        setStatus('Verificando tu cuenta…');
        try {
            const { data } = await api.post('/auth/google', { credential: token, password: localPassword });
            login(data.token, data.role);
            navigate('/');
        } catch (error: any) {
            if (error.response?.data?.code === 'LINK_PASSWORD_REQUIRED') setCredential(token);
            setStatus(error.response?.data?.message || 'No se pudo conectar con Google. Inténtalo de nuevo.');
        } finally { setBusy(false); }
    }

    useEffect(() => {
        let cancelled = false;
        let script: HTMLScriptElement | null = null;
        const renderButton = () => {
            if (cancelled || !button.current) return;
            const google = (window as any).google;
            if (!google?.accounts?.id) return;
            api.get('/auth/google/config').then(({ data }) => {
                if (cancelled) return;
                if (!data.enabled) {
                    setUnavailable(true);
                    setStatus('El acceso con Google estará disponible cuando se complete la configuración.');
                    return;
                }
                google.accounts.id.initialize({ client_id: data.clientId, auto_select: false, callback: (response: { credential: string }) => { if (!cancelled) void authenticate(response.credential); } });
                if (button.current) google.accounts.id.renderButton(button.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320, locale: 'es' });
                setStatus('');
            }).catch(() => { if (!cancelled) { setUnavailable(true); setStatus('No se pudo cargar el acceso con Google.'); } });
        };
        const failed = () => { if (!cancelled) { setUnavailable(true); setStatus('No se pudo conectar con Google. Revisa tu conexión.'); } };
        if ((window as any).google?.accounts?.id) renderButton();
        else {
            script = document.querySelector<HTMLScriptElement>('script[data-google-signin]');
            if (!script) {
                script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.dataset.googleSignin = 'true';
                document.head.appendChild(script);
            }
            script.addEventListener('load', renderButton);
            script.addEventListener('error', failed);
        }
        return () => { cancelled = true; script?.removeEventListener('load', renderButton); script?.removeEventListener('error', failed); };
    }, []);

    return <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', color: '#cbd5e1', fontSize: '0.85rem' }}><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />o continúa con<span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} /></div>
        <div ref={button} style={{ display: credential ? 'none' : 'flex', justifyContent: 'center', pointerEvents: busy ? 'none' : 'auto', opacity: busy ? 0.6 : 1 }} />
        {unavailable && <button disabled style={{ width: '100%', padding: '12px', borderRadius: '50px', background: 'white', color: '#64748b', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '0.95rem' }}><span aria-hidden="true" style={{ color: '#4285f4', fontWeight: 'bold', fontSize: '1.25rem' }}>G</span>Continuar con Google</button>}
        {credential && <form onSubmit={event => { event.preventDefault(); void authenticate(credential, password); }} style={{ display: 'grid', gap: '12px' }}>
            <label htmlFor="google-link-password" style={{ fontSize: '0.9rem' }}>Contraseña de tu cuenta DB-Shield</label>
            <input id="google-link-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} style={{ padding: '12px 16px', borderRadius: '24px', border: 'none' }} />
            <button disabled={busy} type="submit" style={{ padding: '12px', borderRadius: '24px', background: '#00d4ff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{busy ? 'Vinculando…' : 'Vincular cuenta de Google'}</button>
            <button type="button" disabled={busy} onClick={() => { setCredential(''); setPassword(''); setStatus(''); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Cancelar</button>
        </form>}
        {status && <p role="status" style={{ margin: '12px 0 0', color: '#e2e8f0', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.5 }}>{status}</p>}
    </div>;
}
