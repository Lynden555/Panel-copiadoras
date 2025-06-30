import React from 'react';
import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const usuario = localStorage.getItem('usuario');
  if (!usuario) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default RequireAuth;
