import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import UserMenu from './components/UserMenu';
import TicketsDragAndDrop from './components/TicketsDragAndDrop';
import AgregarTecnico from './components/AgregarTecnico';
import EliminarTecnico from './components/EliminarTecnico';
import EditarTecnico from './components/EditarTecnico';
import TicketDetalle from './components/TicketDetalle';
import Login from './components/Login';
import RequireAuth from './components/RequireAuth'; // ✅ nuevo
import AppCliente from './components/AppCliente';
import AppTecnico from './components/AppTecnico';
import EmpresaAdmin from './components/EmpresasAdmin';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'false';
  });

  const [estadoFiltro, setEstadoFiltro] = useState('Pendiente');
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [ticketDetalle, setTicketDetalle] = useState(null);
  const [busquedaTicket, setBusquedaTicket] = useState('');

useEffect(() => {
  if (ticketSeleccionado) {
    console.log("Ticket seleccionado:", ticketSeleccionado); // 👀 DEBUG

    const { _id, tipo } = ticketSeleccionado;
    const endpoint = tipo === 'toner' ? 'toners' : 'tickets';

    fetch(`https://copias-backend-production.up.railway.app/${endpoint}/${_id}`)
      .then((response) => response.json())
      .then((data) => setTicketDetalle(data))
      .catch((error) => console.error('Error al obtener detalle:', error));
  } else {
    setTicketDetalle(null);
  }
}, [ticketSeleccionado]);

  const handleChangeTab = (event, newValue) => {
    setEstadoFiltro(newValue);
    setTicketSeleccionado(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
  };

  return (
    <Router>
      <Routes>
        {/* Ruta LOGIN */}
        <Route
          path="/login"
          element={
            <Login
              onLogin={() => {
                setIsLoggedIn(true);
                localStorage.setItem('isLoggedIn', 'true');
              }}
            />
          }
        />

        {/* Ruta Panel (protegida) */}
        <Route
          path="/panel"
          element={
            <RequireAuth>
              <Sidebar>
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>

                  </Box>

<TicketsDragAndDrop
  estadoFiltro={estadoFiltro}
  handleChangeTab={handleChangeTab}
  busquedaTicket={busquedaTicket}
  setBusquedaTicket={setBusquedaTicket}
  ticketSeleccionado={ticketSeleccionado}
  setTicketSeleccionado={setTicketSeleccionado}
/>



                  {ticketDetalle && (
                    <Box
                      sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        backgroundColor: '#f9f9f9',
                        borderTop: '2px solid #007bff',
                        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
                        padding: '15px',
                        zIndex: 999,
                      }}
                    >
                      <TicketDetalle ticket={ticketDetalle} />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          paddingRight: '20px',
                          marginTop: '10px',
                        }}
                      >
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => setTicketSeleccionado(null)}
                        >
                          Cerrar Detalle
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Sidebar>
            </RequireAuth>
          }
        />

        {/* Técnicos (protegidas) */}
        <Route
          path="/agregar-tecnico"
          element={
            <RequireAuth>
              <Sidebar>
                <UserMenu onLogout={handleLogout} />
                <AgregarTecnico />
              </Sidebar>
            </RequireAuth>
          }
        />
        <Route
          path="/eliminar-tecnico"
          element={
            <RequireAuth>
              <Sidebar>
                <UserMenu onLogout={handleLogout} />
                <EliminarTecnico />
              </Sidebar>
            </RequireAuth>
          }
        />
        <Route
          path="/editar-tecnico"
          element={
            <RequireAuth>
              <Sidebar>
                <UserMenu onLogout={handleLogout} />
                <EditarTecnico />
              </Sidebar>
            </RequireAuth>
          }
        />

        <Route path="/app-cliente" element={<AppCliente />} />
        <Route path="/app-tecnico" element={<AppTecnico />} />
        <Route path="/monitoreo" element={<EmpresaAdmin />} />

        {/* Redireccionamiento general */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
