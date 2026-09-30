import React, { createContext, useContext, useState, useEffect } from 'react';

export interface DamEvent {
    id: number;
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
    
    // Global DAM Monitor State
    isDamLive: boolean;
    setIsDamLive: (live: boolean) => void;
    damEvents: DamEvent[];
    setDamEvents: React.Dispatch<React.SetStateAction<DamEvent[]>>;
    damSelectedDb: string;
    setDamSelectedDb: (dbId: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
    
    // Estados Globales del Monitor DAM
    const [isDamLive, setIsDamLive] = useState(false);
    const [damEvents, setDamEvents] = useState<DamEvent[]>([]);
    const [damSelectedDb, setDamSelectedDb] = useState<string>('');

    const login = (newToken: string, newRole: string) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('role', newRole);
        setToken(newToken);
        setRole(newRole);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setToken(null);
        setRole(null);
        setIsDamLive(false);
        setDamEvents([]);
        setDamSelectedDb('');
    };

    // Simulador Global de DAM que persiste entre cambios de pestañas
    useEffect(() => {
        let interval: any;
        if (isDamLive && damSelectedDb) {
            const generateMockQuery = () => {
                const tables = ['users', 'payments', 'sessions', 'audit_logs', 'orders'];
                const users = ['admin', 'webapp_usr', 'reporting_role', 'etl_job'];
                const ips = ['192.168.1.100', '10.0.0.15', '172.16.0.4', '192.168.1.200'];
                
                const table = tables[Math.floor(Math.random() * tables.length)];
                const user = users[Math.floor(Math.random() * users.length)];
                const ip = ips[Math.floor(Math.random() * ips.length)];
                
                const queries = [
                    `SELECT * FROM ${table} WHERE status = 'ACTIVE' LIMIT 100;`,
                    `UPDATE ${table} SET last_login = NOW() WHERE id = ${Math.floor(Math.random() * 1000)};`,
                    `INSERT INTO ${table} (created_at, type) VALUES (NOW(), 'SYSTEM');`,
                    `SELECT COUNT(1) FROM ${table};`,
                    `BEGIN; UPDATE ${table} SET balance = balance - 100; COMMIT;`
                ];
                
                return {
                    id: Date.now() + Math.random(),
                    username: user,
                    clientAddress: ip,
                    state: 'active',
                    query: queries[Math.floor(Math.random() * queries.length)],
                    durationSeconds: Math.random() * 0.5 + 0.01
                };
            };

            interval = setInterval(() => {
                const newQueriesCount = Math.floor(Math.random() * 2) + 1;
                const newEvents = Array.from({ length: newQueriesCount }).map(generateMockQuery);
                
                setDamEvents(prev => [...prev, ...newEvents].slice(-50)); // Mantener los últimos 50
            }, 1500); // Cada 1.5 segundos
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isDamLive, damSelectedDb]);

    return (
        <AuthContext.Provider value={{ 
            token, role, login, logout,
            isDamLive, setIsDamLive,
            damEvents, setDamEvents,
            damSelectedDb, setDamSelectedDb
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
