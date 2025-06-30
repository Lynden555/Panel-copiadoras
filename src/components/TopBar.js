// src/components/TopBar.js
import React from 'react';
import { Avatar, InputBase, Box, IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';

function TopBar({ onSearchChange }) {
  const usuario = JSON.parse(localStorage.getItem('usuario')) || {};

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/login';
  };

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      background: 'linear-gradient(to right, #6a11cb, #2575fc)',
      color: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 999
    }}>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <strong style={{ cursor: 'pointer' }}>Pendientes</strong>
        <strong style={{ cursor: 'pointer' }}>Terminados</strong>
        <strong style={{ cursor: 'pointer' }}>Cancelados</strong>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ background: 'white', borderRadius: '20px', px: 2 }}>
          <InputBase placeholder="Buscar ticket..." onChange={e => onSearchChange(e.target.value)} />
          <SearchIcon />
        </Box>
        <Tooltip title="Notificaciones">
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ajustes">
          <IconButton color="inherit">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Cerrar sesión">
          <IconButton onClick={handleLogout}>
            <Avatar alt={usuario?.email || 'Usuario'} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default TopBar;
