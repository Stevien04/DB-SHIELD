import api from './api';
export async function loadDatabaseConnections() {
    const { data } = await api.get('/databases');
    return { databases: data as any[] };
}
