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
  MenuItem,
  Select,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!empresaId || !ciudad) {
      setError('Debes ingresar la empresa y seleccionar una ciudad');
      return;
    }

    try {
      const response = await fetch('https://copias-backend-production.up.railway.app/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ciudad, empresaId }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('empresaId', empresaId); // ✅ guardamos empresa
        localStorage.setItem('ciudad', ciudad);    // ✅ guardamos ciudad
        onLogin();
        navigate('/panel');
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
          <Select
            fullWidth
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            displayEmpty
            sx={{ mt: 2 }}
          >
            <MenuItem value="" disabled>Selecciona la empresa</MenuItem>
            <MenuItem value="empresa123">Empresa A</MenuItem>
            <MenuItem value="empresa456">Empresa B</MenuItem>
            <MenuItem value="grapelabs">Grape Labs</MenuItem>
          </Select>

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

            <Select
              fullWidth
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              displayEmpty
              sx={{ mt: 2 }}
            >
              <MenuItem value="" disabled>Selecciona tu ciudad</MenuItem>
              <MenuItem value="Tijuana">Tijuana</MenuItem>
              <MenuItem value="Mexicali">Mexicali</MenuItem>
              <MenuItem value="Ensenada">Ensenada</MenuItem>
            </Select>

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