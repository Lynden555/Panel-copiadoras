import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function RequireAuth({ children }) {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      console.warn('Intento de acceso no autorizado:', location.pathname);
    }
  }, [isLoggedIn, location.pathname]);

  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default RequireAuth;
