import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Calendar, Activity } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back to DevBoard.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '4rem', 
              height: '4rem', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'white'
            }}>
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{user?.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              <span>Role: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{user?.role}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Calendar size={16} color="var(--secondary)" />
              <span>Joined: <strong style={{ color: 'var(--text-primary)' }}>{new Date(user?.createdAt).toLocaleDateString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Stats Card (Placeholder for future weeks) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <Activity size={48} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Projects & Tasks</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            This section will be populated in Week 2 when we build the Projects CRUD and Task assignment features.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
