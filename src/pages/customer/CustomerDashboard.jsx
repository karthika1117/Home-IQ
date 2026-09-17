import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WashingMachine, CalendarCheck, ClipboardList, Zap, ArrowRight, Clock } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import './Dashboard.css';

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { customer } = useCustomer();
  const navigate = useNavigate();

  const [data, setData] = useState({
    stats: { appliances: 0, activeRequests: 0, bookings: 0, completed: 0 },
    nextBooking: null,
    appliances: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;

    async function loadDashboard() {
      const code = customer.customer_code;
      try {
        const [appCount, reqCount, bookCount, histCount, upcomingBookings, latestApps] = await Promise.all([
          supabase.from('appliances').select('appliance_id', { count: 'exact', head: true }).eq('customer_id', code),
          supabase.from('service_requests').select('request_id', { count: 'exact', head: true }).eq('customer_id', code).eq('status', 'Open'),
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('customer_id', code).in('status', ['Confirmed', 'Pending']),
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('customer_id', code).eq('status', 'Completed'),
          supabase.from('bookings')
            .select('*, technicians(profile_id, rating), service_requests(service_category)')
            .eq('customer_id', code)
            .in('status', ['Confirmed', 'Pending'])
            .order('service_date', { ascending: true })
            .limit(1),
          supabase.from('appliances')
            .select('*')
            .eq('customer_id', code)
            .order('created_at', { ascending: false })
            .limit(3)
        ]);

        setData({
          stats: {
            appliances: appCount.count || 0,
            activeRequests: reqCount.count || 0,
            bookings: bookCount.count || 0,
            completed: histCount.count || 0
          },
          nextBooking: upcomingBookings.data?.[0] || null,
          appliances: latestApps.data || []
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [customer]);

  return (
    <div className="page-container">
      <section className="dashboard-header">
        <div className="dashboard-header__text">
          <h1 className="text-title">Good morning, {profile?.full_name?.split(' ')[0] || 'Customer'}</h1>
          <p className="text-subtitle">Here's what's happening with your home services.</p>
        </div>
        <Button size="lg" onClick={() => navigate('/customer/requests/new')}>+ Request Service</Button>
      </section>

      <section className="grid-stats">
        <StatCard icon={CalendarCheck} label="Upcoming Bookings" value={loading ? '-' : data.stats.bookings} />
        <StatCard icon={ClipboardList} label="Active Requests" value={loading ? '-' : data.stats.activeRequests} />
        <StatCard icon={WashingMachine} label="My Appliances" value={loading ? '-' : data.stats.appliances} />
        <StatCard icon={Zap} label="Completed Services" value={loading ? '-' : data.stats.completed} />
      </section>

      <div className="dashboard-content-grid">
        <div className="dashboard-main-col">
          <h2 className="dashboard-section-title">Next Appointment</h2>
          {loading ? (
            <Card padding="md"><Skeleton height="120px" /></Card>
          ) : data.nextBooking ? (
            <Card className="appointment-card">
              <div className="appointment-card__header">
                <div>
                  <h3 className="appointment-card__title">{data.nextBooking.service_category || 'Service Appointment'}</h3>
                  <p className="appointment-card__subtitle">{data.nextBooking.appliance_id ? `Appliance ID: ${data.nextBooking.appliance_id}` : 'General Service'}</p>
                </div>
                <Badge variant={data.nextBooking.status === 'Confirmed' ? 'success' : 'warning'}>{data.nextBooking.status}</Badge>
              </div>
              <div className="appointment-card__details">
                <div className="appointment-detail">
                  <Clock size={16} />
                  <span>{new Date(data.nextBooking.service_date).toLocaleDateString()} at {data.nextBooking.service_time_slot}</span>
                </div>
              </div>
              <div className="appointment-card__footer">
                <Button variant="secondary" size="sm" onClick={() => navigate('/customer/bookings')}>View Details</Button>
              </div>
            </Card>
          ) : (
            <EmptyState 
              icon={CalendarCheck} 
              title="No upcoming appointments" 
              description="You're all caught up. Request a service when you need help."
            />
          )}

          <h2 className="dashboard-section-title mt-6">My Appliances</h2>
          {loading ? (
            <div className="grid-cards"><Skeleton height="150px" /><Skeleton height="150px" /></div>
          ) : data.appliances.length > 0 ? (
            <div className="grid-cards">
              {data.appliances.map(app => (
                <Card key={app.appliance_id} className="appliance-mini-card">
                  <div className="appliance-mini-card__header">
                    <div className="appliance-icon"><WashingMachine size={24} /></div>
                    <Badge variant="neutral">{app.category}</Badge>
                  </div>
                  <h3 className="appliance-mini-card__title">{app.brand} {app.model}</h3>
                  <Button variant="ghost" fullWidth onClick={() => navigate(`/customer/requests/new?appliance=${app.appliance_id}`)}>
                    Request Service <ArrowRight size={16} />
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={WashingMachine} 
              title="No appliances added" 
              description="Add your home appliances to easily manage their service history."
              action={<Button variant="secondary" onClick={() => navigate('/customer/appliances/new')}>Add Appliance</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card padding="md" className="stat-card">
      <div className="stat-card__icon-wrapper">
        <Icon size={24} className="stat-card__icon" />
      </div>
      <div className="stat-card__content">
        <p className="stat-card__value">{value}</p>
        <p className="stat-card__label">{label}</p>
      </div>
    </Card>
  );
}
