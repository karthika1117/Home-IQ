import React, { useState, useEffect } from 'react';
import { Bell, Check, BellRing } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
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
    load();
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
    <PageContainer>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-title">Notifications</h1>
      </div>

      {loading ? <LoadingState message="Loading notifications..." fullHeight={true} /> : notifications.length === 0 ? (
        <EmptyState 
          icon={Bell}
          title="No notifications"
          description="You're all caught up! We'll notify you when there's an update."
        />
      ) : (
        <div className="flex-col gap-4">
          {notifications.map(n => (
            <Card key={n.notification_id} padding="md" style={{ backgroundColor: n.read ? 'var(--color-surface)' : 'var(--color-primary-bg)', border: n.read ? undefined : '1px solid var(--color-primary-light)' }}>
              <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
                <div className="flex gap-4">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: n.read ? 'var(--color-surface-hover)' : 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BellRing size={20} color={n.read ? 'var(--color-text-muted)' : 'var(--color-primary)'} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--color-navy)', fontWeight: n.read ? 500 : 600 }}>{n.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.9375rem', color: n.read ? 'var(--color-text-secondary)' : 'var(--color-navy)' }}>{n.message}</p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.notification_id)}>
                    <Check size={16} /> Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
