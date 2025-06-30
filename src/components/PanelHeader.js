// src/components/PanelHeader.js
import React from 'react';
import { Tabs, Tab, InputBase, Box, Avatar, Tooltip, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

function PanelHeader({ estadoFiltro, setEstadoFiltro, busquedaTicket, setBusquedaTicket, onLogout }) {
  return (
    <Box
      sx={{
        backgroundColor: '#f8f9fa',
        padding: '8px 20px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        position: 'sticky',
        top: 0,
        zIndex: 998,
      }}
    >
      {/* Tabs */}
      <Tabs
        value={estadoFiltro}
        onChange={(e, newValue) => setEstadoFiltro(newValue)}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="PENDIENTES" value="Pendiente" />
        <Tab label="TERMINADOS" value="Terminado" />
        <Tab label="CANCELADOS" value="Cancelado" />
      </Tabs>

      {/* Search + Usuario */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 1,
            padding: '2px 8px',
            border: '1px solid #ccc',
          }}
        >
          <SearchIcon />
          <InputBase
            placeholder="Buscar ticket..."
            value={busquedaTicket}
            onChange={(e) => setBusquedaTicket(e.target.value)}
            sx={{ ml: 1, flex: 1 }}
          />
        </Box>

        <Tooltip title="Cerrar sesión">
          <IconButton onClick={onLogout}>
            <Avatar>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default PanelHeader;
