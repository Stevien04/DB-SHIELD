import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quarantine from './pages/Quarantine';
import DamMonitor from './pages/DamMonitor';
import Databases from './pages/Databases';
import AdminPanel from './pages/AdminPanel';

function ProtectedRoute({ children, reqRole }: { children: JSX.Element, reqRole?: string }) {
    const { token, role } = useAuth();
    if (!token) return <Navigate to="/login" />;
    if (reqRole && role !== reqRole && role !== `ROLE_${reqRole}`) return <Navigate to="/" />;
    return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="databases" element={<Databases />} />
          <Route path="quarantine" element={<Quarantine />} />
          <Route path="dam" element={<DamMonitor />} />
          <Route path="admin" element={<ProtectedRoute reqRole="ADMIN_DBA"><AdminPanel /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}
export default App;
