// src/components/Login.js

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  TextField,
  Button,
  Typography,
  InputAdornment,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom'; // 🚀 Importamos navigate

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // 🚀 Hook para navegar

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        onLogin();
        navigate('/panel'); // 🚀 Redirigir al panel principal
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error en login');
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        background: 'linear-gradient(to right, #667eea, #764ba2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card sx={{ p: 4, maxWidth: 400, width: '100%', textAlign: 'center' }} elevation={10}>
        <CardContent>
          <Avatar
            src="/avatar-default.png"
            sx={{ width: 100, height: 100, margin: '0 auto 20px' }}
          />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Iniciar Sesión
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, py: 1.5, fontWeight: 'bold' }}
            >
              Entrar al Sistema
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
