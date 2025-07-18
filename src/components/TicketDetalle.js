import React, { useState } from 'react';
import { useEffect } from 'react';



function TicketDetalle({ ticket }) {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [tecnicoCercano, setTecnicoCercano] = useState(null);



  if (!ticket) return null;

  useEffect(() => {
  const obtenerTecnicoCercano = async () => {
    if (!ticket.latitud || !ticket.longitud) return;

    try {
      const respuesta = await fetch(
        `https://copias-backend-production.up.railway.app/tecnico-cercano/${ticket.latitud}/${ticket.longitud}?distancia=20`
      );
      if (respuesta.ok) {
        const data = await respuesta.json();
        setTecnicoCercano(data);
      }
    } catch (error) {
      console.error('Error al obtener técnico cercano:', error);
    }
  };

  obtenerTecnicoCercano();
}, [ticket.latitud, ticket.longitud]);

  if (ticket.tipo === 'toner') {
  //ticket.descripcionFalla = `Solicitud de tóner para ${ticket.impresora || 'impresora desconocida'}`;
  //ticket.fotos = [];
}

  const fotos = ticket.fotos || [];

  const abrirGaleria = (index) => {
    setIndiceImagen(index);
    setImagenSeleccionada(fotos[index]);
  };

  const cerrarGaleria = () => {
    setImagenSeleccionada(null);
  };

  const imagenAnterior = () => {
    const nuevoIndice = (indiceImagen - 1 + fotos.length) % fotos.length;
    setIndiceImagen(nuevoIndice);
    setImagenSeleccionada(fotos[nuevoIndice]);
  };

  const imagenSiguiente = () => {
    const nuevoIndice = (indiceImagen + 1) % fotos.length;
    setIndiceImagen(nuevoIndice);
    setImagenSeleccionada(fotos[nuevoIndice]);
  };

  return (
    <div style={{
  borderTop: '2px solid #ddd',
  padding: '30px 40px',
  marginTop: '10px',
  marginLeft: '60px',
  fontFamily: 'Inter, sans-serif',
  fontSize: '15px',
  color: '#333',
  lineHeight: '1.6',
}}>

<h2>Detalle del {ticket.tipo === 'toner' ? 'Pedido de Tóner' : 'Ticket'}</h2>
<p><strong>Cliente:</strong> {ticket.clienteNombre}</p>
<p><strong>Empresa:</strong> {ticket.empresa}</p>
<p><strong>Área:</strong> {ticket.area}</p>
{ticket.telefono && <p><strong>Teléfono:</strong> {ticket.telefono}</p>}
<p><strong>Impresora:</strong> {ticket.impresora}</p>

{ticket.tipo === 'toner' ? (
  <p><strong>Impresora:</strong> {ticket.impresora}</p>
) : (
  <p><strong>Descripción de la falla:</strong> {ticket.descripcionFalla}</p>
)}

<p><strong>Estado:</strong> {ticket.estado}</p>
{!ticket.tecnicoAsignado && tecnicoCercano && (
  <button
    onClick={async () => {
      try {
        const respuesta = await fetch(`https://copias-backend-production.up.railway.app/asignar-tecnico/${ticket._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tecnicoId: tecnicoCercano.tecnicoId })
        });

        if (respuesta.ok) {
          alert('✅ Técnico asignado correctamente');
          window.location.reload(); // 🔄 Recarga para mostrar el cambio
        } else {
          alert('❌ No se pudo asignar el técnico');
        }
      } catch (err) {
        console.error(err);
        alert('⚠️ Error al asignar técnico');
      }
    }}
    style={{
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 'bold',
      borderRadius: '8px',
      cursor: 'pointer',
      marginBottom: '15px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      transition: 'background 0.3s',
    }}
    onMouseOver={e => e.target.style.backgroundColor = '#218838'}
    onMouseOut={e => e.target.style.backgroundColor = '#28a745'}
  >
    📍 Asignar técnico más cercano
  </button>
)}
<p>
  <strong>Técnico asignado:</strong>{' '}
  {ticket.tecnicoAsignado || (tecnicoCercano ? (
    <>
      <span style={{ color: '#28a745' }}>{tecnicoCercano.nombre}</span>{' '}
      <span style={{ fontSize: '12px', color: '#777' }}>
        ({tecnicoCercano.distancia.toFixed(1)} km)
      </span>
    </>
  ) : 'Ninguno')}
</p>

{ticket.latitud && ticket.longitud && (
  <p>
    <strong>Ubicación:</strong>{' '}
    <a
      href={`https://www.google.com/maps?q=${ticket.latitud},${ticket.longitud}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#007bff', textDecoration: 'underline' }}
    >
      Ver en Google Maps
    </a>
  </p>
)}

{ticket.fotos?.length > 0 && (
  <div style={{ marginTop: '10px' }}>
    <p><strong>Fotos adjuntas:</strong></p>
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      {ticket.fotos.map((foto, index) => (
        <img
          key={index}
          src={foto}
          alt={`Foto ${index + 1}`}
          onClick={() => abrirGaleria(index)}
          style={{
            width: '100px', height: '100px',
            objectFit: 'cover', cursor: 'pointer', borderRadius: '5px'
          }}
        />
      ))}
    </div>
  </div>
)}

      {imagenSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 2000
        }}>
<button onClick={cerrarGaleria} style={{
  position: 'absolute',
  top: '80px',
  right: 20,
  backgroundColor: 'white',
  border: 'none',
  fontSize: 24,
  padding: '6px 12px',
  cursor: 'pointer',
  borderRadius: '50%',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  zIndex: 3000 // 💥 MÁS alto que el encabezado
}}>
  ✖
</button>

          <button onClick={imagenAnterior} style={{
            position: 'absolute', left: 70,
            fontSize: 30, color: 'white', background: 'none',
            border: 'none', cursor: 'pointer' 
          }}>⬅</button>

          <img src={imagenSeleccionada} alt="Vista previa"
            style={{ maxHeight: '80vh', maxWidth: '90vw', borderRadius: '10px' }}
          />

          <button onClick={imagenSiguiente} style={{
            position: 'absolute', right: 30,
            fontSize: 30, color: 'white', background: 'none',
            border: 'none', cursor: 'pointer'
          }}>➡</button>
        </div>
      )}
    </div>
  );
}

export default TicketDetalle;