import React, { useState, useEffect } from 'react';

function TicketDetalle({ ticket }) {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [tecnicoCercano, setTecnicoCercano] = useState(null);

  useEffect(() => {
    const obtenerTecnicoCercano = async () => {
      if (ticket.tipo === 'toner') return;
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


if (!ticket) return null;

const fotosCliente = ticket.fotos || [];
const fotosTecnico = ticket.fotosTecnico || [];
const todasLasFotos = fotosCliente.concat(fotosTecnico);

const abrirGaleria = (index) => {
  setIndiceImagen(index);
  setImagenSeleccionada(todasLasFotos[index]);
};

const imagenAnterior = () => {
  const nuevoIndice = (indiceImagen - 1 + todasLasFotos.length) % todasLasFotos.length;
  setIndiceImagen(nuevoIndice);
  setImagenSeleccionada(todasLasFotos[nuevoIndice]);
};

const imagenSiguiente = () => {
  const nuevoIndice = (indiceImagen + 1) % todasLasFotos.length;
  setIndiceImagen(nuevoIndice);
  setImagenSeleccionada(todasLasFotos[nuevoIndice]);
};

  const cerrarGaleria = () => {
    setImagenSeleccionada(null);
  };


  return (
<div style={{
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: '40px',
  borderTop: '2px solid #ddd',
  padding: '30px 40px',
  marginTop: '10px',
  marginLeft: '60px',
  fontFamily: 'Inter, sans-serif',
  fontSize: '15px',
  color: '#333',
  lineHeight: '1.6',
}}>
      
      {/* IZQUIERDA: Info principal del ticket */}
      <div style={{ flex: 1, paddingRight: '40px', fontSize: '15px', color: '#333', lineHeight: '1.6' }}>
        <h2>Detalle del {ticket.tipo === 'toner' ? 'Pedido de Tóner' : 'Ticket'}</h2>
        <p><strong>Cliente:</strong> {ticket.clienteNombre}</p>
        <p><strong>Empresa:</strong> {ticket.empresa}</p>
        <p><strong>Área:</strong> {ticket.area}</p>
        {ticket.telefono && <p><strong>Teléfono:</strong> {ticket.telefono}</p>}

        {ticket.tipo === 'toner' ? (
          <p><strong>Impresora:</strong> {ticket.impresora}</p>
        ) : (
          <p><strong>Descripción de la falla:</strong> {ticket.descripcionFalla}</p>
        )}

        <p><strong>Estado:</strong> {ticket.estado}</p>

        {ticket.tipo !== 'toner' && (
          <p>
            <strong>
              {ticket.tecnicoAsignado ? 'Técnico asignado:' : 'Técnico más cercano:'}
            </strong>{' '}
            {ticket.tecnicoAsignado ? (
              <span style={{ color: '#007bff' }}>{ticket.tecnicoAsignado}</span>
            ) : tecnicoCercano ? (
              <>
                <span style={{ color: '#28a745' }}>{tecnicoCercano.nombre}</span>{' '}
                <span style={{ fontSize: '12px', color: '#777' }}>
                  ({tecnicoCercano.distancia.toFixed(1)} km)
                </span>
              </>
            ) : (
              <span style={{ color: '#dc3545' }}>No se encontró técnico cercano</span>
            )}
          </p>
        )}

        {!ticket.tecnicoAsignado && tecnicoCercano && (
          <button
            onClick={async () => {
              try {
                const respuesta = await fetch(`https://copias-backend-production.up.railway.app/tickets/${ticket._id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tecnicoAsignado: tecnicoCercano.nombre,
                    estado: 'Asignado',
                  })
                });

                if (respuesta.ok) {
                  alert('✅ Técnico asignado correctamente');
                  window.location.reload();
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

        {fotosCliente.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <p><strong>📷 Fotos del Cliente:</strong></p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {fotosCliente.map((foto, index) => (
                <img
                  key={index}
                  src={foto}
                  alt={`Foto ${index + 1}`}
                  onClick={() => abrirGaleria(todasLasFotos.indexOf(foto))}
                  style={{
                    width: '100px', height: '100px',
                    objectFit: 'cover', cursor: 'pointer', borderRadius: '5px'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DERECHA: Comentario y fotos del técnico */}
      {ticket.estado === 'Terminado' && (
        <div style={{
          flex: '1',
          minWidth: '300px',
          maxWidth: '400px',
          backgroundColor: '#F3E8FF',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {ticket.comentarioTecnico && (
            <div>
              <p style={{ fontWeight: 'bold', color: '#4B0082' }}>💬 Comentario del Técnico:</p>
              <div style={{
                background: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontStyle: 'italic',
                color: '#444',
                borderLeft: '4px solid #4B0082'
              }}>
                {ticket.comentarioTecnico}
              </div>
            </div>
          )}

          {fotosTecnico.length > 0 && (
            <div>
              <p style={{ fontWeight: 'bold', color: '#4B0082' }}>🛠 Fotos del Técnico:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {fotosTecnico.map((foto, index) => (
                  <img
                    key={index}
                    src={foto}
                    alt={`Técnico ${index + 1}`}
                    onClick={() => abrirGaleria(todasLasFotos.indexOf(foto))}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: '2px solid #4B0082'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE IMAGEN GRANDE */}
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
            zIndex: 3000
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
