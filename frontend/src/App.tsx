import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quarantine from './pages/Quarantine';
import DamMonitor from './pages/DamMonitor';
import Databases from './pages/Databases';
import AdminUsers from './pages/AdminUsers';
import AdminDBs from './pages/AdminDBs';
import ProxyPanel from './pages/ProxyPanel';
import ApiIntegration from './pages/ApiIntegration';

function ProtectedRoute({ children, reqRole }: { children: JSX.Element, reqRole?: string }) {
    const { token, role } = useAuth();
    if (!token) return <Navigate to="/login" />;
    if (reqRole && role !== reqRole && role !== `ROLE_${reqRole}`) return <Navigate to="/" />;
    return children;
}

function DefaultRoute() {
    const { role } = useAuth();
    if (role === 'ADMIN_DBA' || role === 'ROLE_ADMIN_DBA') {
        return <Navigate to="/admin/users" />;
    }
    return <Navigate to="/databases" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DefaultRoute />} />
          <Route path="databases" element={<Databases />} />
          <Route path="quarantine" element={<Quarantine />} />
          <Route path="dam" element={<DamMonitor />} />
          <Route path="proxy" element={<ProxyPanel />} />
          <Route path="integration" element={<ApiIntegration />} />
          <Route path="admin/users" element={<ProtectedRoute reqRole="ADMIN_DBA"><AdminUsers /></ProtectedRoute>} />
          <Route path="admin/dbs" element={<ProtectedRoute reqRole="ADMIN_DBA"><AdminDBs /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute reqRole="ADMIN_DBA"><Dashboard /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}
export default App;
