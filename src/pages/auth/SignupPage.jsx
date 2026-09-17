import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { createCustomer } from '../../lib/customerProvisioning';
import './Auth.css';

const ROLES = [
  { value: 'customer', label: 'Customer', desc: 'I need home services' },
  { value: 'technician', label: 'Technician', desc: 'I provide home services' },
];

const AVAILABLE_SERVICES = [
  'Plumbing', 'Electrical', 'HVAC', 'Cleaning', 'Handyman', 'Appliance Repair', 'Pest Control', 'Landscaping'
];

export default function SignupPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    // Customer fields
    address: '',
    city: '',
    // Technician fields
    service_categories: [],
    area: '',
    hourly_rate: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // info, error, success
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // If a user accidentally hits signup while fully logged in, bounce them
  useEffect(() => {
    if (user && profile && !isSubmitting) {
      navigate(profile.role === 'technician' ? '/technician/dashboard' : '/customer/dashboard', { replace: true });
    }
  }, [user, profile, navigate, isSubmitting]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleServiceChange = (service) => (e) => {
    setForm((prev) => {
      const current = new Set(prev.service_categories);
      if (e.target.checked) current.add(service);
      else current.delete(service);
      return { ...prev, service_categories: Array.from(current) };
    });
  };

  const validate = () => {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (!form.email.trim() || !form.email.includes('@')) return 'A valid email is required.';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters.';
    if (!form.phone.trim()) return 'Phone number is required.';

    if (form.role === 'customer') {
      if (!form.address.trim()) return 'Address is required for customers.';
      if (!form.city.trim()) return 'City is required for customers.';
    } else {
      if (form.service_categories.length === 0) return 'At least one service category is required.';
      if (!form.area.trim()) return 'Service area is required.';
      if (!form.hourly_rate || isNaN(parseFloat(form.hourly_rate)) || parseFloat(form.hourly_rate) < 0) {
        return 'Hourly rate must be a valid non-negative number.';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      setMessageType('error');
      setMessage(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setMessageType('info');
    setMessage('Creating your account...');

    try {
      // 1. Auth Signup with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            phone: form.phone,
            role: form.role,
            address: form.address,
            city: form.city,
            service_categories: form.service_categories,
            area: form.area,
            hourly_rate: form.hourly_rate,
          },
        },
      });

      if (authError) throw authError;

      // 2. Check if email confirmation is required
      if (!authData.session) {
        setMessageType('success');
        setMessage('Account created! Please check your email to confirm your account before logging in.');
        setIsSubmitting(false);
        return; // Halt here since we have no session to insert customer/technician rows securely
      }

      const userId = authData.user.id;
      setMessage('Account verified. Setting up your profile...');

      // 3. Wait for the profile trigger to complete (poll up to 5 times)
      let verifiedProfile = null;
      for (let i = 0; i < 5; i++) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userId)
          .single();
        if (pData) {
          verifiedProfile = pData;
          break;
        }
        await new Promise((res) => setTimeout(res, 800)); // sleep 800ms
      }

      if (!verifiedProfile) {
        // Safe partial state
        setMessageType('error');
        setMessage('Your account was created, but profile setup timed out. Please refresh or try logging in.');
        setIsSubmitting(false);
        return;
      }

      // Verify role matches
      if (verifiedProfile.role !== form.role) {
        console.warn(`Role mismatch. Requested: ${form.role}, got: ${verifiedProfile.role}`);
      }

      // 4. Insert into role-specific table to complete onboarding
      if (form.role === 'customer') {
        // Check duplicates first
        const { data: existing } = await supabase
          .from('customers')
          .select('customer_id')
          .eq('profile_id', userId)
          .single();

        if (!existing) {
          try {
            await createCustomer({
              profileId: userId,
              address: form.address,
              city: form.city,
            });
          } catch (insertErr) {
            throw new Error(`Customer row creation failed: ${insertErr.message}`);
          }
        }
      } else if (form.role === 'technician') {
        // Check duplicates first
        const { data: existing } = await supabase
          .from('technicians')
          .select('technician_id')
          .eq('profile_id', userId)
          .single();

        if (!existing) {
          const { error: insertErr } = await supabase.from('technicians').insert({
            profile_id: userId,
            name: form.full_name,
            phone: form.phone,
            email: form.email,
            service_categories: form.service_categories,
            area: form.area,
            hourly_rate: parseFloat(form.hourly_rate),
            rating: 0,
            availability: {},
            is_available: true,
          });
          if (insertErr) throw new Error(`Technician row creation failed: ${insertErr.message}`);
        }
      }

      // 5. Navigate to the proper dashboard
      setMessageType('success');
      setMessage('Signup complete! Redirecting...');
      setTimeout(() => {
        navigate(form.role === 'customer' ? '/customer/dashboard' : '/technician/dashboard', { replace: true });
      }, 500);

    } catch (err) {
      setMessageType('error');
      // Human-friendly mapping
      if (err.message.includes('already registered')) {
        setMessage('An account with this email already exists.');
      } else if (err.message.includes('Password should be')) {
        setMessage('Password is too weak. Please choose a stronger password.');
      } else {
        setMessage(`An error occurred: ${err.message}`);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide auth-card--signup">
        <div className="auth-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Home size={28} color="var(--color-primary)" />
          <span className="auth-brand__name">HomeIQ</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Get started with HomeIQ today</p>

        {message && (
          <div className={`auth-message auth-message--${messageType}`} role="alert">
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <fieldset className="role-fieldset">
            <legend className="role-fieldset__legend">I am a…</legend>
            <div className="role-options">
              {ROLES.map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`role-option ${form.role === value ? 'role-option--selected' : ''}`}
                  htmlFor={`role-${value}`}
                >
                  <input
                    type="radio"
                    id={`role-${value}`}
                    name="role"
                    value={value}
                    checked={form.role === value}
                    onChange={handleChange('role')}
                    className="role-option__radio"
                    disabled={isSubmitting}
                  />
                  <span className="role-option__label">{label}</span>
                  <span className="role-option__desc">{desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-divider">
            <span>{form.role === 'customer' ? 'Customer Account' : 'Technician Account'}</span>
          </div>

          <div className="form-row">
            <Input
              label="Full name"
              id="full_name"
              type="text"
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={handleChange('full_name')}
              required
              autoComplete="name"
              disabled={isSubmitting}
            />
            <Input
              label="Phone number"
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={handleChange('phone')}
              required
              autoComplete="tel"
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Email address"
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            required
            autoComplete="email"
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange('password')}
            required
            autoComplete="new-password"
            hint="Minimum 6 characters"
            disabled={isSubmitting}
          />

          {form.role === 'customer' && (
            <>
              <Input
                label="Street Address"
                id="address"
                type="text"
                placeholder="123 Main St"
                value={form.address}
                onChange={handleChange('address')}
                required
                disabled={isSubmitting}
              />
              <Input
                label="City"
                id="city"
                type="text"
                placeholder="New York"
                value={form.city}
                onChange={handleChange('city')}
                required
                disabled={isSubmitting}
              />
            </>
          )}

          {form.role === 'technician' && (
            <>
              <fieldset className="checkbox-fieldset">
                <legend className="checkbox-fieldset__legend">Service Categories *</legend>
                <div className="checkbox-grid">
                  {AVAILABLE_SERVICES.map(svc => (
                    <label key={svc} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.service_categories.includes(svc)}
                        onChange={handleServiceChange(svc)}
                        disabled={isSubmitting}
                      />
                      <span>{svc}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-row">
                <Input
                  label="Service Area"
                  id="area"
                  type="text"
                  placeholder="e.g. Manhattan, Brooklyn"
                  value={form.area}
                  onChange={handleChange('area')}
                  required
                  disabled={isSubmitting}
                />
                <Input
                  label="Hourly Rate ($)"
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  value={form.hourly_rate}
                  onChange={handleChange('hourly_rate')}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
