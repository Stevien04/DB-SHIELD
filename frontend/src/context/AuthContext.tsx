import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface DamEvent {
    id: number | string;
    databaseId?: number;
    source?: 'live' | 'manual';
    username: string;
    clientAddress: string;
    state: string;
    query: string;
    durationSeconds: number;
}
interface AuthContextType {
    token: string | null;
    role: string | null;
    login: (token: string, role: string) => void;
    logout: () => void;
    isDamLive: boolean;
    setIsDamLive: (live: boolean) => void;
    damEvents: DamEvent[];
    setDamEvents: React.Dispatch<React.SetStateAction<DamEvent[]>>;
    damSelectedDb: string;
    setDamSelectedDb: (dbId: string) => void;
    damError: string;
    damLastUpdated: string;
}
const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
    const [isDamLive, setIsDamLive] = useState(false);
    const [damEvents, setDamEvents] = useState<DamEvent[]>([]);
    const [damSelectedDb, setDamSelectedDb] = useState('');
    const [damError, setDamError] = useState('');
    const [damLastUpdated, setDamLastUpdated] = useState('');
    const login = (newToken: string, newRole: string) => {
        localStorage.setItem('token', newToken); localStorage.setItem('role', newRole);
        setToken(newToken); setRole(newRole);
    };
    const logout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('role');
        setToken(null); setRole(null); setIsDamLive(false);
        setDamEvents([]); setDamSelectedDb(''); setDamError(''); setDamLastUpdated('');
    };
    useEffect(() => {
        setDamEvents(prev => prev.filter(event => String(event.databaseId) === damSelectedDb && event.source !== 'live'));
        setDamError(''); setDamLastUpdated('');
    }, [damSelectedDb]);
    // Instantáneas reales; no se inventan consultas ni se conservan sesiones que ya terminaron.
    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const controller = new AbortController();
        if (!isDamLive || !damSelectedDb || !token) {
            setDamEvents(prev => prev.filter(event => event.source !== 'live'));
            return;
        }
        setDamError(''); setDamLastUpdated('');
        const poll = async () => {
            try {
                const { data } = await api.get('/dam/events', { params: { databaseId: damSelectedDb }, signal: controller.signal });
                if (cancelled) return;
                const live: DamEvent[] = data.map((event: any) => ({
                    id: event.databaseId + ':' + event.sessionId + ':' + (event.queryStartedAt || ''),
                    databaseId: event.databaseId, source: 'live',
                    username: event.username || '(sin usuario)', clientAddress: event.clientAddress || '(local)',
                    state: event.state, query: event.query || '(consulta no visible con estos permisos)',
                    durationSeconds: Number(event.durationSeconds)
                }));
                setDamEvents(prev => [...prev.filter(event => event.source !== 'live' && String(event.databaseId) === damSelectedDb).slice(-50), ...live]);
                setDamLastUpdated(new Date().toLocaleTimeString());
                timer = setTimeout(poll, 2000);
            } catch (error: any) {
                if (cancelled) return;
                setDamError(error.response?.data?.message || 'No se pudo consultar la base seleccionada. Revisa conexión y permisos.');
                setIsDamLive(false);
                setDamEvents(prev => prev.filter(event => event.source !== 'live'));
            }
        };
        void poll();
        return () => { cancelled = true; controller.abort(); if (timer) clearTimeout(timer); };
    }, [isDamLive, damSelectedDb, token]);
    return <AuthContext.Provider value={{ token, role, login, logout, isDamLive, setIsDamLive, damEvents, setDamEvents, damSelectedDb, setDamSelectedDb, damError, damLastUpdated }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
