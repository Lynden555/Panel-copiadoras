import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Collapse from '@mui/material/Collapse';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import Tooltip from '@mui/material/Tooltip';

function Sidebar({ children }) {
  const [tecnicosOpen, setTecnicosOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  const toggleTecnicos = () => {
    setTecnicosOpen(!tecnicosOpen);
  };

  return (
    <div style={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        PaperProps={{
          sx: {
            width: 55,
            background: 'linear-gradient(to bottom, #6a11cb,rgb(94, 12, 182))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        <List sx={{ mt: 3 }}>
          {/* Panel */}
          <Tooltip title="Panel de Tickets" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 16 } } }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation('/panel')}
                sx={{
                  backgroundColor: isActive('/panel') ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
                  justifyContent: 'center',
                }}
              >
                <ListItemIcon sx={{ justifyContent: 'center', color: '#fff' }}>
                  <HomeIcon sx={{ fontSize: 30, color: '#fff' }} />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          </Tooltip>

          {/* Técnicos */}
          <Tooltip title="Técnicos" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 16 } } }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={toggleTecnicos}
                sx={{
                  justifyContent: 'center',
                }}
              >
                <ListItemIcon sx={{ justifyContent: 'center', color: '#fff' }}>
                  <PeopleIcon sx={{ fontSize: 30, color: '#fff' }} />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          </Tooltip>

          <Collapse in={tecnicosOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>

              <Tooltip title="Agregar Técnico" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 16 } } }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation('/agregar-tecnico')}
                    sx={{
                      backgroundColor: isActive('/agregar-tecnico') ? 'rgba(255,255,255,0.2)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                      },
                      justifyContent: 'center',
                    }}
                  >
                    <ListItemIcon sx={{ justifyContent: 'center', color: '#fff' }}>
                      <PersonAddIcon />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>

              <Tooltip title="Eliminar Técnico" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 16 } } }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation('/eliminar-tecnico')}
                    sx={{
                      backgroundColor: isActive('/eliminar-tecnico') ? 'rgba(255,255,255,0.2)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                      },
                      justifyContent: 'center',
                    }}
                  >
                    <ListItemIcon sx={{ justifyContent: 'center', color: '#fff' }}>
                      <PersonRemoveIcon />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              </Tooltip>

              <Tooltip title="Editar Técnico" placement="right" arrow componentsProps={{ tooltip: { sx: { fontSize: 16 } } }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation('/editar-tecnico')}
                    sx={{
                      backgroundColor: isActive('/editar-tecnico') ? 'rgba(255,255,255,0.2)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                      },
                      justifyContent: 'center',
                    }}
                  >
                    <ListItemIcon sx={{ justifyContent: 'center', color: '#fff' }}>
                      <EditIcon />
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