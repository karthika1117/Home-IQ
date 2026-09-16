import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setNotifications(data);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('notification_id', id);
      if (!error) {
        setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Notifications</h1>
      {loading ? <p>Loading notifications...</p> : notifications.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>You're all caught up.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(n => (
            <Card key={n.notification_id} padding="md" style={{ background: n.read ? 'var(--color-surface)' : '#f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.0625rem' }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{n.message}</p>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {n.type || 'General'} · {n.created_at ? new Date(n.created_at).toLocaleString() : 'Date unavailable'} · {n.read ? 'Read' : 'Unread'}
                  </p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.notification_id)}>Mark Read</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
