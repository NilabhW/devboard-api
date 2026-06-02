import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="glass-panel" style={{ 
      margin: '1rem auto', 
      maxWidth: '1200px', 
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: '1rem',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <LayoutDashboard color="var(--primary)" />
        <Link to="/" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
          DevBoard
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {user ? (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>
              Hello, <strong style={{ color: '#fff' }}>{user.name}</strong>
            </span>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Login</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
