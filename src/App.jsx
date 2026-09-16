import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';

/**
 * App — root component.
 * Wraps the entire application in BrowserRouter and AuthProvider.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
