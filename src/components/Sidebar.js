import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';

import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import EditIcon from '@mui/icons-material/Edit';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';

function Sidebar({ children }) {
  const [tecnicosOpen, setTecnicosOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => navigate(path);
  const isActive = (path) => location.pathname === path;
  const toggleTecnicos = () => setTecnicosOpen(!tecnicosOpen);

  // ---- estilos base gamer ----
  const neonBtn = (active=false) => ({
    width: 46, height: 46,
    borderRadius: '14px',
    justifyContent: 'center',
    minWidth: 0,
    background: active
      ? 'linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.10))'
      : 'rgba(255,255,255,.08)',
    border: active
      ? '1px solid rgba(255,255,255,.35)'
      : '1px solid rgba(255,255,255,.18)',
    boxShadow: active
      ? '0 0 14px rgba(174,93,241,.55), inset 0 0 10px rgba(255,255,255,.08)'
      : '0 8px 22px rgba(0,0,0,.24)',
    backdropFilter: 'blur(2px)',
    transition: 'all .18s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      background: 'rgba(255,255,255,.16)',
      boxShadow: '0 0 16px rgba(174,93,241,.65), 0 12px 26px rgba(0,0,0,.28)',
    }
  });

  const iconGlow = (active=false) => ({
    fontSize: 28,
    color: '#FFFFFF',
    filter: active ? 'drop-shadow(0 0 8px rgba(174,93,241,.85))' : 'drop-shadow(0 0 0 rgba(0,0,0,0))'
  });

  return (
    <div style={{ display: 'flex' }}>
      {/* keyframes para shimmer */}
      <style>{`
        @keyframes shimmerMove {
          0%,100% { transform: translateY(-20px); opacity:.65; }
          50%     { transform: translateY(20px);  opacity:.25; }
        }
      `}</style>

      <Drawer
        variant="permanent"
        PaperProps={{
          sx: {
            width: 55,
            overflow: 'visible',
            background: 'linear-gradient(180deg, #7C1BEA 0%, #6B16CE 60%, #5A12B2 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 0,
            // ribete/luz lateral
            position: 'relative',
            borderRight: '1px solid rgba(255,255,255,.14)',
            boxShadow: '0 10px 30px rgba(67,0,152,.35), inset 0 0 22px rgba(255,255,255,.06)',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0, top: 0,
              width: '3px',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(174,93,241,.95), rgba(174,93,241,0))',
              boxShadow: '0 0 16px rgba(174,93,241,.55)'
            },
            '& .MuiList-root': { width: '100%' }
          },
        }}
      >
        {/* shimmer superior sutil */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0))',
          mixBlendMode: 'screen', pointerEvents: 'none', animation: 'shimmerMove 4s ease-in-out infinite'
        }} />

        <List sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {/* HOME */}
          <Tooltip title="Panel de Tickets" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
            <ListItem disablePadding sx={{ justifyContent: 'center' }}>
              <ListItemButton
                onClick={() => handleNavigation('/panel')}
                sx={neonBtn(isActive('/panel'))}
              >
                {/* espacio para icono Home */}
                <ListItemIcon sx={{ minWidth: 0 }}>
                  <img
                    src="/home.png"
                    alt="Home"
                    style={{
                      width: 26,
                      height: 26,
                      filter: isActive('/panel') ? 'drop-shadow(0 0 6px #AE5DF1)' : 'drop-shadow(0 0 0 transparent)',
                    }}
                  />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          </Tooltip>

          {/* MONITOREO */}
          <Tooltip title="Monitoreo" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
            <ListItem disablePadding sx={{ justifyContent: 'center' }}>
              <ListItemButton
                onClick={() => handleNavigation('/monitoreo')}
                sx={neonBtn(isActive('/monitoreo'))}
              >
                {/* espacio para icono Monitoreo */}
                <ListItemIcon sx={{ minWidth: 0 }}>
                  <img
                    src="/monitoreo.png"
                    alt="Monitoreo"
                    style={{
                      width: 26,
                      height: 26,
                      filter: isActive('/monitoreo') ? 'drop-shadow(0 0 6px #AE5DF1)' : 'drop-shadow(0 0 0 transparent)',
                    }}
                  />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          </Tooltip>

          {/* DIVISOR */}
          <div style={{
            width: 28, height: 1, margin: '8px 0',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)'
          }} />

          {/* TÉCNICOS (colapsable) */}
          <Tooltip title="Técnicos" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
            <ListItem disablePadding sx={{ justifyContent: 'center' }}>
              <ListItemButton onClick={toggleTecnicos} sx={neonBtn(tecnicosOpen)}>
                <ListItemIcon sx={{ minWidth: 0 }}>
                  <PeopleIcon sx={iconGlow(tecnicosOpen)} />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          </Tooltip>

          <Collapse in={tecnicosOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1 }}>
              {/* Agregar Técnico */}
              <Tooltip title="Agregar Técnico" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                <ListItem disablePadding sx={{ justifyContent: 'center' }}>
                  <ListItemButton
                    onClick={() => handleNavigation('/agregar-tecnico')}
                    sx={neonBtn(isActive('/agregar-tecnico'))}
                  >
                    {/* espacio para icono Agregar Técnico */}
                    <ListItemIcon sx={{ minWidth: 0 }}>
                      <img
                        src="/tecnico.png"
                        alt="Agregar Técnico"
                        style={{
                          width: 26,
                          height: 26,
                          filter: isActive('/agregar-tecnico') ? 'drop-shadow(0 0 6px #AE5DF1)' : 'drop-shadow(0 0 0 transparent)',
                        }}
                      />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>

              {/* Eliminar Técnico */}
              <Tooltip title="Eliminar Técnico" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                <ListItem disablePadding sx={{ justifyContent: 'center' }}>
                  <ListItemButton
                    onClick={() => handleNavigation('/eliminar-tecnico')}
                    sx={neonBtn(isActive('/eliminar-tecnico'))}
                  >
                    <ListItemIcon sx={{ minWidth: 0 }}>
                      <PersonRemoveIcon sx={iconGlow(isActive('/eliminar-tecnico'))} />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>

              {/* Editar Técnico */}
              <Tooltip title="Editar Técnico" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                <ListItem disablePadding sx={{ justifyContent: 'center' }}>
                  <ListItemButton
                    onClick={() => handleNavigation('/editar-tecnico')}
                    sx={neonBtn(isActive('/editar-tecnico'))}
                  >
                    <ListItemIcon sx={{ minWidth: 0 }}>
                      <EditIcon sx={iconGlow(isActive('/editar-tecnico'))} />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            </List>
          </Collapse>
        </List>
      </Drawer>

      <main style={{ flexGrow: 1, padding: '20px', marginLeft: '70px' }}>
        {children}
      </main>
    </div>
  );
}

export default Sidebar;