import React, { useState } from 'react';

function TicketDetalle({ ticket }) {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [indiceImagen, setIndiceImagen] = useState(0);



  if (!ticket) return null;

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
<p><strong>Técnico asignado:</strong> {ticket.tecnicoAsignado || 'Ninguno'}</p>

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