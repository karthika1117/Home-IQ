import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // info, error
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  // If already authenticated and profile loaded, redirect automatically
  useEffect(() => {
    if (user && profile) {
      const destination = profile.role === 'technician' ? '/technician/dashboard' : '/customer/dashboard';
      navigate(location.state?.from?.pathname || destination, { replace: true });
    }
  }, [user, profile, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessageType('error');
      setMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setMessageType('info');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessageType('error');
        if (error.message.includes('Invalid login credentials')) {
          setMessage('Invalid email or password.');
        } else if (error.message.includes('Email not confirmed')) {
          setMessage('Please verify your email address before signing in.');
        } else {
          setMessage(error.message);
        }
      } else {
        // Success: the AuthContext listener will detect the session, 
        // fetch the profile, and trigger the useEffect above to redirect.
      }
    } catch {
      setMessageType('error');
      setMessage('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Home size={28} color="var(--color-primary)" />
          <span className="auth-brand__name">HomeIQ</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your HomeIQ account</p>

        {/* Message area */}
        {message && (
          <div className={`auth-message auth-message--${messageType}`} role="alert">
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email address"
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isSubmitting || (user && profile)}
          />

          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isSubmitting || (user && profile)}
          />

          <Button type="submit" fullWidth size="lg" loading={isSubmitting} disabled={user && profile}>
            Sign in
          </Button>
        </form>

        <p className="auth-footer-text">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
