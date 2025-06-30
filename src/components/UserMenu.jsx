// src/components/UserMenu.js

import React, { useState } from 'react';
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';

function UserMenu({ onLogout }) {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('isLoggedIn');
    if (onLogout) onLogout();
    navigate('/login');
    window.location.reload(); // 👈 fuerza recarga para aplicar protección de rutas
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  return (
<div style={{ position: 'absolute', top: -5, right: 8, zIndex: 1001 }}>
  <Tooltip title={usuario?.email || 'Usuario'}>
    <IconButton onClick={handleOpenMenu} size="large">
      <Avatar>
        <AccountCircleIcon />
      </Avatar>
    </IconButton>
  </Tooltip>

  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={handleCloseMenu}
  >
    <MenuItem onClick={() => { alert('Editar perfil (por implementar)'); handleCloseMenu(); }}>
      Editar Perfil
    </MenuItem>
    <MenuItem onClick={handleLogout}>
      Cerrar Sesión
    </MenuItem>
  </Menu>
</div>
  );
}

export default UserMenu;
