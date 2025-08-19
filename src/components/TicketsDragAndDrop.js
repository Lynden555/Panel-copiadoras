import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloseIcon from '@mui/icons-material/Close';


import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import UserMenu from './UserMenu'; 
import { Howl } from 'howler';


// 🗓️ Rango día / semana (Lun–Sáb con corte sáb 14:00) / mes
function getRangesMX(now = new Date()) {
  const tz = now; // asumimos ya en hora local MX
  // Día actual
  const dayStart = new Date(tz); dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(tz);

  // Semana: Lunes 00:00 -> Sábado 14:00
  const weekStart = new Date(tz);
  const day = weekStart.getDay(); // 0:Dom,1:Lun,…6:Sab
  const diffToMonday = (day === 0 ? -6 : 1 - day); // mover a Lunes
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0,0,0,0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // Sábado
  weekEnd.setHours(14,0,0,0); // corte 14:00

  // Mes calendario
  const monthStart = new Date(tz.getFullYear(), tz.getMonth(), 1, 0,0,0,0);
  const monthEnd   = new Date(tz.getFullYear(), tz.getMonth()+1, 0, 23,59,59,999);

  return { dayStart, dayEnd, weekStart, weekEnd, monthStart, monthEnd };
}

// 📊 Cuenta por estado dentro de un rango
function countByStatus(tickets, tecnicoIdOrNombre, start, end) {
  const inRange = (d) => {
    if (!d) return false;
    const t = (d instanceof Date) ? d : new Date(d);
    return t >= start && t <= end;
  };

  // 🟦 ASIGNADOS: contar por snapshot (fechaPrimerAsignado + técnico de primer asignado)
  const asignados = tickets.filter(t =>
    inRange(t.fechaPrimerAsignado) &&
    (
      t.tecnicoPrimerAsignadoId === tecnicoIdOrNombre ||
      t.tecnicoPrimerAsignadoNombre === tecnicoIdOrNombre ||
      // fallback por si hay docs viejos sin snapshot
      t.tecnicoId === tecnicoIdOrNombre ||
      t.tecnicoAsignado === tecnicoIdOrNombre ||
      t.tecnicoNombre === tecnicoIdOrNombre
    )
  );

  // 🟩 TERMINADOS:
  const finalizados = tickets.filter(t =>
    inRange(t.fechaFinalizacion) &&
    (
      t.tecnicoId === tecnicoIdOrNombre ||
      t.tecnicoAsignado === tecnicoIdOrNombre ||
      t.tecnicoNombre === tecnicoIdOrNombre
    )
  );

  // 🟨 REAGENDADOS:
  const reagendados = tickets.filter(t =>
    inRange(t.fechaReagendo) &&
    (
      t.tecnicoReagendoId === tecnicoIdOrNombre ||
      t.tecnicoReagendoNombre === tecnicoIdOrNombre ||
      // fallback
      t.tecnicoId === tecnicoIdOrNombre ||
      t.tecnicoAsignado === tecnicoIdOrNombre ||
      t.tecnicoNombre === tecnicoIdOrNombre
    )
  );

  // 🟥 CANCELADOS:
  const cancelados = tickets.filter(t =>
    inRange(t.fechaCancelacion) &&
    (
      t.tecnicoId === tecnicoIdOrNombre ||
      t.tecnicoAsignado === tecnicoIdOrNombre ||
      t.tecnicoNombre === tecnicoIdOrNombre
    )
  );

  return {
    asignados: asignados.length,
    finalizados: finalizados.length,
    reagendados: reagendados.length,
    cancelados: cancelados.length,
  };
}

// 🏁 Eficiencia: (1.0*F + 0.5*R) / Asignados
function eficiencia({asignados, finalizados, reagendados}) {
  if (!asignados) return 0;
  return ((finalizados + 0.5 * reagendados) / asignados) * 100;
}

// 🎮 Color gamer según % (verde/amarillo/rojo)
function colorEficiencia(pct) {
  if (pct >= 80) return 'linear-gradient(to right, #00c853, #64dd17)';  // verde
  if (pct >= 50) return 'linear-gradient(to right, #ffd600, #ffab00)';  // amarillo
  return 'linear-gradient(to right, #ff1744, #d50000)';                  // rojo
}


function TicketsDragAndDrop({
  estadoFiltro,
  handleChangeTab,
  ticketSeleccionado,
  setTicketSeleccionado,
  busquedaTicket,
  setBusquedaTicket,
}) {

const ciudadActual = localStorage.getItem('ciudad'); // 👈 Ciudad seleccionada en login
const empresaId = localStorage.getItem('empresaId');
const [bloquearRefresco, setBloquearRefresco] = useState(false);  
const [tickets, setTickets] = useState([]);
const [toners, setToners] = useState([]);
const [tecnicos, setTecnicos] = useState([]);
const [prevTickets, setPrevTickets] = useState([]);
const [prevToners, setPrevToners] = useState([]);
const [openDay, setOpenDay] = useState(true);
const [openWeek, setOpenWeek] = useState(false);
const [openMonth, setOpenMonth] = useState(false);

const [tecnicoStats, setTecnicoStats] = useState(null);
const [tecnicoModalOpen, setTecnicoModalOpen] = useState(false);
const [tab, setTab] = useState('stats'); // 'stats' | 'calificaciones'

const reproducirSonido = () => {
  const sonido = new Howl({
    src: ['/notificacion.mp3'],
    volume: 1.0,
    html5: true,
  });

  sonido.play();
};

const cargarDatos = async () => {
  try {
    const [ticketsData, tonersData, tecnicosData] = await Promise.all([
      fetch('https://copias-backend-production.up.railway.app/tickets').then(res => res.json()),
      fetch('https://copias-backend-production.up.railway.app/toners').then(res => res.json()),
      fetch('https://copias-backend-production.up.railway.app/tecnicos').then(res => res.json())
    ]);

    const ticketsFiltrados = ticketsData.filter(
      t => t.ciudad === ciudadActual && t.empresaId === empresaId
    );

    const tonersFiltrados = tonersData.filter(
      t => t.ciudad === ciudadActual && t.empresaId === empresaId
    );

    const tecnicosFiltrados = tecnicosData.filter(
      t =>
        t.ciudad?.trim().toLowerCase() === ciudadActual?.trim().toLowerCase() &&
        t.empresaId === empresaId
    );

    const ticketsOrdenados = ticketsFiltrados.sort(
      (a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
    );

    const tonersOrdenados = tonersFiltrados.sort(
      (a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
    );

    const tonersNormalizados = tonersOrdenados.map(t => ({
      ...t,
      tipo: 'toner',
      descripcionFalla: 'Solicitud de tóner',
      fechaCreacion: t.fechaCreacion || new Date().toISOString(),
    }));

    const combinadosOrdenados = [
      ...ticketsOrdenados.map(t => ({ ...t, tipo: 'ticket' })),
      ...tonersNormalizados
    ].sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

    // Actualiza los estados globales
    setPrevTickets(ticketsOrdenados);
    setPrevToners(tonersOrdenados);
    setTickets(combinadosOrdenados);
    setToners(tonersOrdenados);
    setTecnicos(tecnicosFiltrados);

    // 🚀 Devuelve los datos para que el useEffect compare
    return {
      nuevosTickets: ticketsOrdenados,
      nuevosToners: tonersOrdenados,
    };
  } catch (error) {
    console.error('Error al cargar datos:', error);
    return {
      nuevosTickets: [],
      nuevosToners: [],
    };
  }
};


useEffect(() => {
  let ticketsPrevios = [];
  let tonersPrevios = [];

  // 🔓 Desbloquear audio al primer clic del usuario
  const habilitarSonido = () => {
    const sonido = new Howl({
      src: ['/notificacion.mp3'],
      volume: 0,
      html5: true,
    });

    sonido.once('play', () => {
      sonido.stop();
    });
    sonido.play();

    console.log('🎧 Sonido desbloqueado');
    window.removeEventListener('click', habilitarSonido);
  };

  window.addEventListener('click', habilitarSonido);

  // 🔄 Lógica para cargar y comparar datos
  const cargarSiNoBloqueado = async () => {
    if (!bloquearRefresco) {
      const { nuevosTickets, nuevosToners } = await cargarDatos();

      if (ticketsPrevios.length && nuevosTickets.length > ticketsPrevios.length) {
        reproducirSonido();
      }

      if (tonersPrevios.length && nuevosToners.length > tonersPrevios.length) {
        reproducirSonido();
      }

      ticketsPrevios = nuevosTickets;
      tonersPrevios = nuevosToners;
    }
  };

  cargarSiNoBloqueado(); // Primera carga
  const intervalo = setInterval(() => {
    cargarSiNoBloqueado();
  }, 3000);

  return () => {
    clearInterval(intervalo);
    window.removeEventListener('click', habilitarSonido);
  };
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

const handleReagendar = (ticketId, tipo) => {
  const confirmado = window.confirm('¿Estás seguro de Reagendar?');
  if (!confirmado) return;
  fetch(`https://copias-backend-production.up.railway.app/${tipo === 'toner' ? 'toners' : 'tickets'}/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'Reagendado' }),
  }).then(() => cargarDatos())
    .catch(error => console.error('Error al terminar elemento:', error));
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

// ✅ Calcula stats desde el array calificaciones[] del técnico (Mongo)
const handleOpenTecnicoStats = (tecnico) => {
  const califs = Array.isArray(tecnico?.calificaciones) ? tecnico.calificaciones : [];

  const cantidadCalificaciones = califs.length;
  const totalEstrellas = califs.reduce(
    (sum, c) => sum + (Number(c?.estrellas) || 0),
    0
  );
  const promedioEstrellas =
    cantidadCalificaciones > 0 ? totalEstrellas / cantidadCalificaciones : 0;

  // “Gamificación”: cada 10 estrellas = 1 nivel, progreso = % al siguiente nivel
  const nivel = Math.floor(totalEstrellas / 10) + 1;
  const progreso = Math.min((totalEstrellas % 10) * 10, 99);

  const ranges = getRangesMX(new Date());

  const idONombre = tecnico.tecnicoId || tecnico.nombre;
  const d = countByStatus(tickets, idONombre, ranges.dayStart, ranges.dayEnd);
  const w = countByStatus(tickets, idONombre, ranges.weekStart, ranges.weekEnd);
  const m = countByStatus(tickets, idONombre, ranges.monthStart, ranges.monthEnd);

  const dayEff   = Math.round(eficiencia(d));
  const weekEff  = Math.round(eficiencia(w));
  const monthEff = Math.round(eficiencia(m));

  // 🔽 integra junto a tus calificaciones/nivel/progreso existentes
  setTecnicoStats(prev => ({
    ...tecnico,
    ...prev,
    stats: {
      day:   { ...d,   eficiencia: dayEff },
      week:  { ...w,   eficiencia: weekEff },
      month: { ...m,   eficiencia: monthEff },
    },
  }));
  setTecnicoModalOpen(true);
  setTab('stats'); // abrir en Stats

setTecnicoStats({
    ...tecnico,
    calificaciones: {
      cantidadCalificaciones,
      totalEstrellas,
      promedioEstrellas,
      lista: califs, // por si luego quieres mostrar el historial
    },
    nivel,
    progreso,
  });
  setTecnicoModalOpen(true);
};

// ✅ Pinta estrellas sólidas según un número entero (tu modal ya manda Math.round)
const renderStars = (count, total = 5) => {
  const filled = Math.max(0, Math.min(total, Math.floor(Number(count) || 0)));
  const stars = [];

  for (let i = 1; i <= total; i++) {
    stars.push(
      i <= filled
        ? <StarIcon key={i} style={{ color: '#FFD700', fontSize: '2rem' }} />
        : <StarBorderIcon key={i} style={{ color: '#ccc', fontSize: '2rem' }} />
    );
  }
  return <div style={{ display: 'flex' }}>{stars}</div>;
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

  const ahoraISO = new Date().toISOString();
  const actualizados = tickets.map(t =>
    t._id === draggableId ? { ...t, estado: nuevoEstado, tecnicoAsignado: nuevoTecnico, fechaAsignacion: nuevoEstado === 'Asignado' ? ahoraISO : null } : t
  );
  setTickets(actualizados); // 👈 se ve reflejado al instante
  setBloquearRefresco(true);

  // Ahora guardar en backend
  fetch(`https://copias-backend-production.up.railway.app/${endpoint}/${draggableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: nuevoEstado, tecnicoAsignado: nuevoTecnico, fechaAsignacion: nuevoEstado === 'Asignado' ? ahoraISO : null }),
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
  if (estado === 'Reagendado') return '#f4b6e8ff';        
  if (estado === 'Cancelado') return '#fff3e0';        
  return '#e3f2fd';                                     
};
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '92vw',
  maxWidth: 520,
  bgcolor: '#1a1a2e',
  border: '3px solid #0f3460',
  borderRadius: '15px',
  boxShadow: '0 0 20px rgba(79, 195, 247, 0.5)',
  p: 4,
  color: 'white',
  textAlign: 'center',
  maxHeight: '90vh',     
  overflowY: 'auto'
};

useEffect(() => {
  if (!tecnicoModalOpen || tab !== 'stats' || !tecnicoStats) return;
  const ranges = getRangesMX(new Date());
  const idONombre = tecnicoStats.tecnicoId || tecnicoStats.nombre;

  const d = countByStatus(tickets, idONombre, ranges.dayStart, ranges.dayEnd);
  const w = countByStatus(tickets, idONombre, ranges.weekStart, ranges.weekEnd);
  const m = countByStatus(tickets, idONombre, ranges.monthStart, ranges.monthEnd);

  setTecnicoStats(s => ({
    ...s,
    stats: {
      day:   { ...d, eficiencia: Math.round(eficiencia(d)) },
      week:  { ...w, eficiencia: Math.round(eficiencia(w)) },
      month: { ...m, eficiencia: Math.round(eficiencia(m)) },
    }
  }));
}, [tickets, tecnicoModalOpen, tab]); // 👈 se actualiza cuando hay cambios

///////////////////////////
  
  
  return (
<div style={{ margin: 0, padding: 0 }}>
  {/* 🚀 Cabecera visual */}
{/* Modal para estadísticas del técnico */}
<Modal
  open={tecnicoModalOpen}
  onClose={() => setTecnicoModalOpen(false)}
  aria-labelledby="tecnico-stats-modal"
  aria-describedby="tecnico-statistics"
>
  <Box sx={modalStyle}>
    <IconButton
      onClick={() => setTecnicoModalOpen(false)}
      style={{ position: 'absolute', top: 10, right: 10, color: 'white' }}
    >
      <CloseIcon />
    </IconButton>

    {tecnicoStats && (
      <div>
        {/* HEADER con nombre y foto */}
        <div style={{ 
          background: 'linear-gradient(to right, #0f3460, #1a1a2e)', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginBottom: '10px', color: '#4fc3f7' }}>{tecnicoStats.nombre}</h2>
          
          <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle, rgba(79,195,247,0.5) 0%, rgba(79,195,247,0) 70%)',
              borderRadius: '50%',
              zIndex: 1
            }}></div>
            
            <img
              src={tecnicoStats.fotoUrl || '/images/default-avatar.png'}
              alt={tecnicoStats.nombre}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                position: 'relative',
                zIndex: 2,
                border: '3px solid #4fc3f7'
              }}
            />
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 10, margin: '0 0 20px 0' }}>
          <button
            onClick={() => setTab('stats')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #4fc3f7',
              background: tab === 'stats' ? 'linear-gradient(to right, #0f3460, #1a1a2e)' : 'transparent',
              color: '#4fc3f7',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Stats Técnico
          </button>

          <button
            onClick={() => setTab('calificaciones')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #4fc3f7',
              background: tab === 'calificaciones' ? 'linear-gradient(to right, #0f3460, #1a1a2e)' : 'transparent',
              color: '#4fc3f7',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Calificaciones
          </button>
        </div>

        {/* ======= TAB: CALIFICACIONES (tu contenido intacto) ======= */}
        {tab === 'calificaciones' && (
          <>
            <div style={{ 
              background: 'rgba(15, 52, 96, 0.7)', 
              padding: '20px', 
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#4fc3f7', marginBottom: '15px' }}>Estadísticas</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FFD700' }}>
                    {tecnicoStats.calificaciones?.cantidadCalificaciones || 0}
                  </div>
                  <div>Calificaciones</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FFD700' }}>
                    {tecnicoStats.calificaciones?.totalEstrellas || 0}
                  </div>
                  <div>Estrellas totales</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#4fc3f7', marginBottom: '10px' }}>Promedio</h4>
                {renderStars(
                  Math.round(tecnicoStats.calificaciones?.promedioEstrellas || 0), 
                  5
                )}
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '5px' }}>
                  {tecnicoStats.calificaciones?.promedioEstrellas?.toFixed(1) || '0.0'}
                </div>
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(15, 52, 96, 0.7)', 
              padding: '20px', 
              borderRadius: '10px'
            }}>
              <h3 style={{ color: '#4fc3f7', marginBottom: '15px' }}>Nivel {tecnicoStats.nivel}</h3>
              
              <div style={{ 
                height: '20px', 
                backgroundColor: '#0a1930', 
                borderRadius: '10px',
                marginBottom: '10px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${tecnicoStats.progreso}%`, 
                  background: 'linear-gradient(to right, #4fc3f7, #29b6f6)',
                  borderRadius: '10px'
                }}></div>
              </div>
              
              <div>
                Progreso: {tecnicoStats.progreso}% hacia el nivel {tecnicoStats.nivel + 1}
              </div>
            </div>
          </>
        )}

       {tab === 'stats' && (
  <div style={{ 
    background: 'rgba(15, 52, 96, 0.7)', 
    padding: '20px', 
    borderRadius: '10px',
    marginBottom: '20px',
    color: '#ddd'
  }}>
    <h3 style={{ color: '#4fc3f7', marginBottom: 15 }}>Actividad</h3>

    {/* === HOY (colapsable) === */}
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpenDay(v => !v)}
        style={{
          width: '100%',
          background: 'linear-gradient(to right, #0f3460, #1a1a2e)',
          color: '#4fc3f7',
          border: '1px solid #4fc3f7',
          borderRadius: 10,
          padding: '10px 12px',
          textAlign: 'left',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {openDay ? '▾' : '▸'} Actividad de Hoy
      </button>

      {openDay && (
        <div style={{ padding: '14px 6px 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 10 }}>
            {/* Asignados */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.day?.asignados ?? 0}
              </div>
              <div>Asignados</div>
            </div>
            {/* Finalizados */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.day?.finalizados ?? 0}
              </div>
              <div>Finalizados</div>
            </div>
            {/* Reagendados */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.day?.reagendados ?? 0}
              </div>
              <div>Reagendados</div>
            </div>
            {/* Cancelados */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.day?.cancelados ?? 0}
              </div>
              <div>Cancelados</div>
            </div>
          </div>

          {/* Barra gamer de eficiencia */}
          <div style={{ height: 16, background: '#0a1930', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${tecnicoStats?.stats?.day?.eficiencia ?? 0}%`,
              height: '100%',
              background: colorEficiencia(tecnicoStats?.stats?.day?.eficiencia ?? 0)
            }} />
          </div>
          <div style={{ marginTop: 6, color: '#ddd', textAlign: 'center' }}>
            Eficiencia: <b>{tecnicoStats?.stats?.day?.eficiencia ?? 0}%</b>
          </div>
        </div>
      )}
    </div>

    {/* === SEMANA (colapsable) === */}
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpenWeek(v => !v)}
        style={{
          width: '100%',
          background: 'linear-gradient(to right, #0f3460, #1a1a2e)',
          color: '#4fc3f7',
          border: '1px solid #4fc3f7',
          borderRadius: 10,
          padding: '10px 12px',
          textAlign: 'left',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {openWeek ? '▾' : '▸'} Actividad de la Semana (Lun–Sáb, corte 14:00)
      </button>

      {openWeek && (
        <div style={{ padding: '14px 6px 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.week?.asignados ?? 0}
              </div>
              <div>Asignados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.week?.finalizados ?? 0}
              </div>
              <div>Finalizados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.week?.reagendados ?? 0}
              </div>
              <div>Reagendados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.week?.cancelados ?? 0}
              </div>
              <div>Cancelados</div>
            </div>
          </div>

          <div style={{ height: 16, background: '#0a1930', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${tecnicoStats?.stats?.week?.eficiencia ?? 0}%`,
              height: '100%',
              background: colorEficiencia(tecnicoStats?.stats?.week?.eficiencia ?? 0)
            }} />
          </div>
          <div style={{ marginTop: 6, color: '#ddd', textAlign: 'center' }}>
            Eficiencia: <b>{tecnicoStats?.stats?.week?.eficiencia ?? 0}%</b>
          </div>
        </div>
      )}
    </div>

    {/* === MES (colapsable) === */}
    <div>
      <button
        onClick={() => setOpenMonth(v => !v)}
        style={{
          width: '100%',
          background: 'linear-gradient(to right, #0f3460, #1a1a2e)',
          color: '#4fc3f7',
          border: '1px solid #4fc3f7',
          borderRadius: 10,
          padding: '10px 12px',
          textAlign: 'left',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {openMonth ? '▾' : '▸'} Actividad del Mes
      </button>

      {openMonth && (
        <div style={{ padding: '14px 6px 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.month?.asignados ?? 0}
              </div>
              <div>Asignados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.month?.finalizados ?? 0}
              </div>
              <div>Finalizados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.month?.reagendados ?? 0}
              </div>
              <div>Reagendados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FFD700', lineHeight: 1 }}>
                {tecnicoStats?.stats?.month?.cancelados ?? 0}
              </div>
              <div>Cancelados</div>
            </div>
          </div>

          <div style={{ height: 16, background: '#0a1930', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${tecnicoStats?.stats?.month?.eficiencia ?? 0}%`,
              height: '100%',
              background: colorEficiencia(tecnicoStats?.stats?.month?.eficiencia ?? 0)
            }} />
          </div>
          <div style={{ marginTop: 6, color: '#ddd', textAlign: 'center' }}>
            Eficiencia: <b>{tecnicoStats?.stats?.month?.eficiencia ?? 0}%</b>
          </div>
        </div>
      )}
    </div>
  </div>
)}
      </div>
    )}
  </Box>
</Modal>


<div
style={{
  position: 'fixed',
  top: 0,
  left: 55,
  right: 0,
  height: '64px',
  background: 'rgba(255,255,255,.90)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderBottom: '1px solid rgba(15,52,96,.12)',
  color: '#0F3460',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 72px',
  zIndex: 1000,
  boxShadow: '0 8px 24px rgba(10,25,48,.08)'
}}
  >
    
    
    <div style={{ display: 'flex', gap: '20px' }}>
      <button
        onClick={() => handleChangeTab(null, 'Pendiente')}
        style={{
          background: estadoFiltro === 'Pendiente' ? '#ffffff' : 'transparent',
          color: estadoFiltro === 'Pendiente' ? '#0F3460' : '#292929',
          border: estadoFiltro === 'Pendiente' ? '1px solid rgba(15,52,96,.18)' : '1px solid transparent',
          borderRadius: '999px',
          padding: '10px 18px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '15px',
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '.3px',
          boxShadow: estadoFiltro === 'Pendiente' ? '0 8px 20px rgba(10,25,48,.08)' : 'none'
        }}
      >
        Pendientes
        </button>

    <button
    onClick={() => handleChangeTab(null, 'Reagendado')}
style={{
  background: estadoFiltro === 'Reagendado' ? '#ffffff' : 'transparent',
  color: estadoFiltro === 'Reagendado' ? '#0F3460' : '#292929',
  border: estadoFiltro === 'Reagendado' ? '1px solid rgba(15,52,96,.18)' : '1px solid transparent',
  borderRadius: '999px',
  padding: '10px 18px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '15px',
  fontFamily: 'Inter, system-ui, sans-serif',
  letterSpacing: '.3px',
  boxShadow: estadoFiltro === 'Reagendado' ? '0 8px 20px rgba(10,25,48,.08)' : 'none'
}}
  >
    Reagendados
  </button>
      
      <button
        onClick={() => handleChangeTab(null, 'Terminado')}
      style={{
        background: estadoFiltro === 'Terminado' ? '#ffffff' : 'transparent',
        color: estadoFiltro === 'Terminado' ? '#0F3460' : '#292929',
        border: estadoFiltro === 'Terminado' ? '1px solid rgba(15,52,96,.18)' : '1px solid transparent',
        borderRadius: '999px',
        padding: '10px 18px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '15px',
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '.3px',
        boxShadow: estadoFiltro === 'Terminado' ? '0 8px 20px rgba(10,25,48,.08)' : 'none'
      }}
      >
        Terminados
      </button>
      
      <button
        onClick={() => handleChangeTab(null, 'Cancelado')}
       style={{
        background: estadoFiltro === 'Cancelado' ? '#ffffff' : 'transparent',
        color: estadoFiltro === 'Cancelado' ? '#0F3460' : '#292929',
        border: estadoFiltro === 'Cancelado' ? '1px solid rgba(15,52,96,.18)' : '1px solid transparent',
        borderRadius: '999px',
        padding: '10px 18px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '15px',
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '.3px',
        boxShadow: estadoFiltro === 'Cancelado' ? '0 8px 20px rgba(10,25,48,.08)' : 'none'
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
          padding: '10px 16px',
          borderRadius: '999px',
          border: '1px solid rgba(15,52,96,.15)',
          fontSize: '14px',
          outline: 'none',
          width: '260px',
          background: '#fff',
          boxShadow: '0 2px 10px rgba(15,52,96,.06)'
        }}
      />
<span style={{ color: '#333', fontWeight: 'bold' }}>
  Ciudad actual: {ciudadActual}
</span>
      

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
                  border: '1px solid rgba(15,52,96,.12)',
                  borderRadius: '16px',
                  padding: '12px',
                  boxSizing: 'border-box',
                  width: '400px',
                  height: '600px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255,255,255,.75)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  boxShadow: '0 10px 30px rgba(10,25,48,.08)'
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
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15,52,96,.10)',
  borderLeft: ticket.tipo === 'toner' ? '5px solid #29B6F6' : '5px solid #FFD700',
  boxShadow: ticketSeleccionado === ticket._id
    ? '0 0 0 2px rgba(79,195,247,.45), 0 12px 28px rgba(10,25,48,.12)'
    : '0 8px 20px rgba(10,25,48,.08)',
  borderRadius: '16px',
  transition: 'transform .22s ease, box-shadow .22s ease',
  '&:hover': {
    transform: 'translateY(-3px) scale(1.01)',
    boxShadow: '0 14px 30px rgba(10,25,48,.14)',
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
  <Typography variant="caption" color="textSecondary">
    Ciudad: {ticket.ciudad}
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

{estadoFiltro === 'Reagendado' && (
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


  {estadoFiltro !== 'Terminado' && estadoFiltro !== 'Cancelado' && estadoFiltro !== 'Reagendado' && (
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

        <Tooltip title="Reagendar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleReagendar(ticket._id, ticket.tipo); }}>
          <EventRepeatIcon />
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
          border: '1px solid rgba(60, 255, 0, 0.12)',
          borderRadius: '16px',
          padding: '12px',
          boxSizing: 'border-box',
          width: '250px',
          height: '600px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(248, 255, 239, 0.78)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          boxShadow: '0 10px 30px rgba(79,195,247,.10)'
        }}
      >
              <h3
            style={{
              flexShrink: 0,
              textAlign: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              marginBottom: '10px',
              color: '#0F3460',
              letterSpacing: '.4px',
              textShadow: '0 0 18px rgba(79,195,247,.25)'
            }}
      >

        {tecnico.nombre} ({ticketsPorTecnico(tecnico.nombre).length})
      </h3>
        
        {/* Contenedor clickeable para la foto */}
        <div 
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '10px'
          }} 
          onClick={() => handleOpenTecnicoStats(tecnico)}
        >
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
              objectFit: 'cover',
              border: '2px solid #4FC3F7',
              boxShadow: '0 0 0 3px rgba(79,195,247,.15), 0 0 22px rgba(79,195,247,.28)',
              transition: 'transform 0.3s, box-shadow 0.3s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        </div>
        
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
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15,52,96,.10)',
  borderLeft: ticket.tipo === 'toner' ? '5px solid #29B6F6' : '5px solid #FFD700',
  boxShadow: ticketSeleccionado === ticket._id
    ? '0 0 0 2px rgba(79,195,247,.45), 0 12px 28px rgba(10,25,48,.12)'
    : '0 8px 20px rgba(10,25,48,.08)',
  borderRadius: '16px',
  transition: 'transform .22s ease, box-shadow .22s ease',
  '&:hover': {
    transform: 'translateY(-3px) scale(1.01)',
    boxShadow: '0 14px 30px rgba(10,25,48,.14)',
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

  {estadoFiltro !== 'Cancelado' && estadoFiltro !== 'Terminado' && estadoFiltro !== 'Reagendado' && (
    <>
      <Tooltip title="Terminar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleTerminar(ticket._id, ticket.tipo); }}>
          <CheckIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Reagendar">
        <IconButton onClick={(e) => { e.stopPropagation(); handleReagendar(ticket._id, ticket.tipo); }}>
          <EventRepeatIcon />
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