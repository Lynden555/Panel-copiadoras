import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import UserMenu from './UserMenu'; 


function TicketsDragAndDrop({
  estadoFiltro,
  handleChangeTab,
  ticketSeleccionado,
  setTicketSeleccionado,
  busquedaTicket,
  setBusquedaTicket,
}) {

const [bloquearRefresco, setBloquearRefresco] = useState(false);  
const [tickets, setTickets] = useState([]);
const [toners, setToners] = useState([]);
const [tecnicos, setTecnicos] = useState([]);

const cargarDatos = () => {
  Promise.all([
    fetch('https://copias-backend-production.up.railway.app/tickets').then(res => res.json()),
    fetch('https://copias-backend-production.up.railway.apptoners').then(res => res.json()),
    fetch('https://copias-backend-production.up.railway.app/tecnicos').then(res => res.json())
  ])
    .then(([ticketsData, tonersData, tecnicosData]) => {
      const ticketsOrdenados = ticketsData.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
      const tonersOrdenados = tonersData.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

      const tonersNormalizados = tonersOrdenados.map(t => ({
        ...t,
        tipo: 'toner',
        descripcionFalla: 'Solicitud de tóner', // 👈 agregamos esto
        fechaCreacion: t.fechaCreacion || new Date().toISOString(), // por si acaso
      }));

const combinadosOrdenados = [
  ...ticketsOrdenados.map(t => ({ ...t, tipo: 'ticket' })),
  ...tonersNormalizados
].sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

setTickets(combinadosOrdenados);

      setToners(tonersOrdenados);
      setTecnicos(tecnicosData);
    })
    .catch(error => console.error('Error al cargar datos:', error));
};

useEffect(() => {
  const cargarSiNoBloqueado = () => {
    if (!bloquearRefresco) {
      cargarDatos();
    }
  };

  cargarSiNoBloqueado(); // primera vez
  const intervalo = setInterval(() => {
    cargarSiNoBloqueado(); // refresco regular
  }, 3000);

  return () => clearInterval(intervalo);
}, [bloquearRefresco]);

const handleCancelar = (ticketId, tipo) => {
  const confirmado = window.confirm('¿Estás seguro de CANCELAR este elemento?');
  if (!confirmado) return;
  fetch(`https://copias-backend-production.up.railway.app/${tipo === 'toner' ? 'toners' : 'tickets'}/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'Cancelado', tecnicoAsignado: null }),
  }).then(() => cargarDatos())
    .catch(error => console.error('Error al cancelar elemento:', error));
};

const handleTerminar = (ticketId, tipo) => {
  const confirmado = window.confirm('¿Estás seguro de marcar este elemento como TERMINADO?');
  if (!confirmado) return;
  fetch(`https://copias-backend-production.up.railway.app/${tipo === 'toner' ? 'toners' : 'tickets'}/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'Terminado' }),
  }).then(() => cargarDatos())
    .catch(error => console.error('Error al terminar elemento:', error));
};

const handleRevertir = (ticketId, tipo) => {
  const confirmado = window.confirm('¿Estás seguro de REVERTIR este elemento a Pendiente?');
  if (!confirmado) return;
  fetch(`https://copias-backend-production.up.railway.app/${tipo === 'toner' ? 'toners' : 'tickets'}/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'Pendiente', tecnicoAsignado: null }),
  }).then(() => cargarDatos())
    .catch(error => console.error('Error al revertir elemento:', error));
};

 const handleEliminarDefinitivo = (ticketId, tipo) => {
  const confirmado = window.confirm('¿Estás seguro de ELIMINAR DEFINITIVAMENTE este elemento?');
  if (!confirmado) return;
  fetch(`https://copias-backend-production.up.railway.app/${tipo === 'toner' ? 'toners' : 'tickets'}/${ticketId}`, {
    method: 'DELETE',
  }).then(() => cargarDatos())
    .catch(error => console.error('Error al eliminar elemento:', error));
};

const onDragEnd = (result) => {
  const { destination, source, draggableId } = result;
  if (!destination || destination.droppableId === source.droppableId) return;

  const item = tickets.find(t => t._id === draggableId);
  if (!item) return;

  const endpoint = item.tipo === 'toner' ? 'toners' : 'tickets';

  // 🔄 Optimizar: Actualizar localmente primero
  const nuevoEstado = destination.droppableId === 'tickets' ? 'Pendiente' : 'Asignado';
  const nuevoTecnico = destination.droppableId === 'tickets' ? null : (tecnicos.find(t => t._id === destination.droppableId)?.nombre || null);

  const actualizados = tickets.map(t =>
    t._id === draggableId ? { ...t, estado: nuevoEstado, tecnicoAsignado: nuevoTecnico } : t
  );
  setTickets(actualizados); // 👈 se ve reflejado al instante
  setBloquearRefresco(true);

  // Ahora guardar en backend
  fetch(`https://copias-backend-production.up.railway.app/${endpoint}/${draggableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: nuevoEstado, tecnicoAsignado: nuevoTecnico }),
  })
    .then(() => {
      setTimeout(() => setBloquearRefresco(false), 1000); // 🔓 Liberamos refresco suave
    })
    .catch((error) => {
      console.error('❌ Error en drag:', error);
      alert('Error al guardar el cambio. Intenta de nuevo.');
      cargarDatos(); // 🔁 Rollback
      setBloquearRefresco(false);
    });
};

const ticketsFiltrados = tickets
  .filter(t => t.estado === estadoFiltro)
  .filter(t =>
    (t.clienteNombre || '').toLowerCase().includes(busquedaTicket.toLowerCase()) ||
    (t.empresa || '').toLowerCase().includes(busquedaTicket.toLowerCase()) ||
    (t.area || '').toLowerCase().includes(busquedaTicket.toLowerCase()) ||
    (t.descripcionFalla || '').toLowerCase().includes(busquedaTicket.toLowerCase()) ||
    (t.impresora || '').toLowerCase().includes(busquedaTicket.toLowerCase())
  );


  const ticketsPorTecnico = (tecnicoNombre) =>
    tickets.filter(t => t.estado === 'Asignado' && t.tecnicoAsignado === tecnicoNombre);

const getCardColor = (tipo, estado) => {
  if (tipo === 'toner') return '#f3e5f5';              
  if (estado === 'Terminado') return '#e8f5e9';        
  if (estado === 'Cancelado') return '#fff3e0';        
  return '#e3f2fd';                                     
};
///////////////////////////
  return (
<div style={{ margin: 0, padding: 0 }}>
  {/* 🚀 Cabecera visual */}
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 55, // para que no tape el sidebar
      right: 0,
      height: '55px',
      background: 'linear-gradient(to right,#eeeeee,#eeeeee',
      color: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 80px',
      zIndex: 1000,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}
  >
    <div style={{ display: 'flex', gap: '20px' }}>
      <button
        onClick={() => handleChangeTab(null, 'Pendiente')}
        style={{
          background: estadoFiltro === 'Pendiente' ? '#ffffff' : 'transparent',
          color: estadoFiltro === 'Pendiente' ? '#4e4e4e' : '#292929',
  border: 'none',
  borderRadius: '20px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontWeight: 500, // más delgado
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.3px'


        }}
      >
        Pendientes
      </button>
      <button
        onClick={() => handleChangeTab(null, 'Terminado')}
        style={{
          background: estadoFiltro === 'Terminado' ? '#ffffff' : 'transparent',
          color: estadoFiltro === 'Terminado' ? '#4e4e4e' : '#292929',
  border: 'none',
  borderRadius: '20px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontWeight: 500, // más delgado
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.3px'
        }}
      >
        Terminados
      </button>
      <button
        onClick={() => handleChangeTab(null, 'Cancelado')}
        style={{
          background: estadoFiltro === 'Cancelado' ? '#ffffff' : 'transparent',
          color: estadoFiltro === 'Cancelado' ? '#4e4e4e' : '#292929',
  border: 'none',
  borderRadius: '20px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontWeight: 500, // más delgado
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.3px'
        }}
      >
        Cancelados
      </button>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <input
        type="text"
        placeholder="🔍 Buscar ticket..."
        value={busquedaTicket}
        onChange={(e) => setTicketSeleccionado(null) || setBusquedaTicket(e.target.value)}
        style={{
          padding: '8px 14px',
          borderRadius: '20px',
          border: 'none',
          fontSize: '14px',
          outline: 'none',
          width: '240px',
        }}
      />

          <div style={{ marginLeft: 'auto'}}>
             <UserMenu/>
            </div>
            

    </div>
  </div>


    

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '20px', marginTop: '70px' }}>
          <Droppable droppableId="tickets">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  border: '2px solid #007bff',
                  borderRadius: '5px',
                  padding: '10px',
                  boxSizing: 'border-box',
                  width: '400px',
                  height: '600px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#f0f8ff',
                }}
              >
                
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '8px',
                  }}
                >
                  {ticketsFiltrados.map((ticket, index) => (
                    <Draggable key={ticket._id} draggableId={ticket._id} index={index}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          
                          sx={{
                            mb: 2,
                            cursor: 'pointer',
                            backgroundColor: getCardColor(ticket.tipo, ticket.estado),
                            boxShadow: ticketSeleccionado === ticket._id ? '0 0 10px rgba(0, 123, 255, 0.7)' : '0 2px 6px rgba(0,0,0,0.1)',
                            border: ticketSeleccionado === ticket._id ? '2px solid #007bff' : 'none',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                            },
                          }}
                        >

                          


<CardContent>
  <Typography variant="subtitle1" gutterBottom>
    Cliente: {ticket.clienteNombre}
  </Typography>
  <Typography variant="body2">
    Empresa: {ticket.empresa}
  </Typography>
  <Typography variant="body2">
    Área: {ticket.area}
  </Typography>
  <Typography variant="body2">
    Falla: {ticket.descripcionFalla}
  </Typography>
  <Typography variant="body2" color="textSecondary">
  Fecha: {new Date(ticket.fechaCreacion).toLocaleDateString()} - {new Date(ticket.fechaCreacion).toLocaleTimeString()}
</Typography>

</CardContent>


<CardActions disableSpacing>
  {estadoFiltro === 'Cancelado' && (
    <>
      <Tooltip title="Revertir">
        <IconButton onClick={(e) => { e.stopPropagation(); handleRevertir(ticket._id, ticket.tipo); }}>
          <UndoIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar definitivo">
        <IconButton onClick={(e) => { e.stopPropagation(); handleEliminarDefinitivo(ticket._id, ticket.tipo); }}>
          <RocketLaunchIcon />
        </IconButton>
      </Tooltip>
          <Tooltip title="Ver Detalle ⚡️">
      <IconButton onClick={(e) => { e.stopPropagation(); setTicketSeleccionado({ _id: ticket._id, tipo: ticket.tipo }); }}>
        <span style={{ fontSize: '20px' }}>⚡️</span>
      </IconButton>
    </Tooltip>
    </>
  )}
{estadoFiltro === 'Terminado' && (
  <>

      <Tooltip title="Revertir">
      <IconButton onClick={(e) => { e.stopPropagation(); handleRevertir(ticket._id, ticket.tipo); }}>
        <UndoIcon />
      </IconButton>
    </Tooltip>
    <Tooltip title="Ver Detalle ⚡️">
      <IconButton onClick={(e) => { e.stopPropagation();setTicketSeleccionado({ _id: ticket._id, tipo: ticket.tipo }); }}>
        <span style={{ fontSize: '20px' }}>⚡️</span>
      </IconButton>
    </Tooltip>
  </>
)}
  {estadoFiltro !== 'Terminado' && estadoFiltro !== 'Cancelado' && (
    <>
      <Tooltip title="Terminar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleTerminar(ticket._id, ticket.tipo); }}>
          <CheckIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Ver Detalle ⚡️">
        <IconButton onClick={(e) => { e.stopPropagation(); setTicketSeleccionado({ _id: ticket._id, tipo: ticket.tipo }); }}>
          <span style={{ fontSize: '20px' }}>⚡️</span>
        </IconButton>
      </Tooltip>

      <Tooltip title="Cancelar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleCancelar(ticket._id, ticket.tipo); }}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </>
  )}
</CardActions>

                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>

          {tecnicos.map(tecnico => (
            <Droppable key={tecnico._id} droppableId={tecnico._id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    border: '2px solid #28a745',
                    borderRadius: '5px',
                    padding: '10px',
                    boxSizing: 'border-box',
                    width: '250px',
                    height: '600px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#e6ffed',
                  }}
                >
                  <h3 style={{ flexShrink: 0 }}>{tecnico.nombre} ({ticketsPorTecnico(tecnico.nombre).length})</h3>
<img
  src={tecnico.fotoUrl && tecnico.fotoUrl.trim() !== ''
    ? tecnico.fotoUrl
    : '/images/default-avatar.png'}
  alt={tecnico.nombre}
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = '/images/default-avatar.png';
  }}
  style={{
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    marginBottom: '10px',
    flexShrink: 0,
    objectFit: 'cover',
  }}
/>


                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      paddingRight: '8px',
                    }}
                  >
{ticketsPorTecnico(tecnico.nombre).map((ticket, index) => (
  <Draggable key={ticket._id} draggableId={ticket._id} index={index}>
    {(provided) => (
      <Card
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        sx={{
          mb: 2,
          cursor: 'pointer',
          backgroundColor: ticket.tipo === 'toner' ? '#ffebee' : '#fff8e1',
          borderLeft: ticket.tipo === 'toner' ? '5px solid #e53935' : 'none',
          boxShadow: ticketSeleccionado === ticket._id ? '0 0 10px rgba(0, 123, 255, 0.7)' : '0 2px 6px rgba(0,0,0,0.1)',
          border: ticketSeleccionado === ticket._id ? '2px solid #007bff' : 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          },
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Cliente: {ticket.clienteNombre}
          </Typography>
          <Typography variant="body2">
            Empresa: {ticket.empresa}
          </Typography>
          <Typography variant="body2">
            Área: {ticket.area}
          </Typography>
          <Typography variant="body2">
            Falla: {ticket.descripcionFalla}
          </Typography>
          <Typography variant="body2" color="textSecondary">
  Fecha: {new Date(ticket.fechaCreacion).toLocaleDateString()} - {new Date(ticket.fechaCreacion).toLocaleTimeString()}
</Typography>

        </CardContent>

<CardActions disableSpacing>
  {estadoFiltro === 'Terminado' && (
    <Tooltip title="Revertir">
      <IconButton onClick={(e) => { e.stopPropagation(); handleRevertir(ticket._id, ticket.tipo); }}>
        <UndoIcon />
      </IconButton>
    </Tooltip>
  )}

  {estadoFiltro === 'Cancelado' && (
    <>
      <Tooltip title="Revertir">
        <IconButton onClick={(e) => { e.stopPropagation(); handleRevertir(ticket._id, ticket.tipo); }}>
          <UndoIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar definitivo">
        <IconButton onClick={(e) => { e.stopPropagation(); handleEliminarDefinitivo(ticket._id, ticket.tipo); }}>
          <RocketLaunchIcon />
        </IconButton>
      </Tooltip>
    </>
  )}

  {estadoFiltro !== 'Cancelado' && estadoFiltro !== 'Terminado' && (
    <>
      <Tooltip title="Terminar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleTerminar(ticket._id, ticket.tipo); }}>
          <CheckIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Cancelar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleCancelar(ticket._id, ticket.tipo); }}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </>
  )}

  <Tooltip title="Ver Detalle ⚡️">
    <IconButton onClick={(e) => { e.stopPropagation(); setTicketSeleccionado({ _id: ticket._id, tipo: ticket.tipo }); }}>
      <span style={{ fontSize: '20px' }}>⚡️</span>
    </IconButton>
  </Tooltip>
</CardActions>
      </Card>
    )}
  </Draggable>
))}

                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default TicketsDragAndDrop;