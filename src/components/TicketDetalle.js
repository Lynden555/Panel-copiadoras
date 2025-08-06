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
        const res = await fetch(`https://copias-backend-production.up.railway.app/tecnico-cercano/${ticket.latitud}/${ticket.longitud}?distancia=20`);
        if (res.ok) {
          const data = await res.json();
          setTecnicoCercano(data);
        }
      } catch (err) {
        console.error('Error técnico cercano:', err);
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

  const cerrarGaleria = () => setImagenSeleccionada(null);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '40px',
      padding: '40px',
      margin: 'auto',
      fontFamily: 'Segoe UI, Inter, sans-serif',
      fontSize: '16px',
      color: '#333',
      lineHeight: '1.7',
      maxWidth: '1200px'
    }}>
      {/* IZQUIERDA */}
      <div style={{ flex: 1, paddingRight: '30px' }}>
        <h2 style={{ fontSize: '24px', color: '#7c3aed', marginBottom: '15px' }}>
          {ticket.tipo === 'toner' ? '📦 Detalle del Pedido de Tóner' : '🛠 Detalle del Ticket'}
        </h2>

        <p><strong>👤 Cliente:</strong> {ticket.clienteNombre}</p>
        <p><strong>🏢 Empresa:</strong> {ticket.empresa}</p>
        <p><strong>📍 Área:</strong> {ticket.area}</p>
        {ticket.telefono && <p><strong>📞 Teléfono:</strong> {ticket.telefono}</p>}

        {ticket.tipo === 'toner'
          ? <p><strong>🖨 Impresora:</strong> {ticket.impresora}</p>
          : <p><strong>⚠️ Descripción:</strong> {ticket.descripcionFalla}</p>}

        <p><strong>📌 Estado:</strong> {ticket.estado}</p>

        {ticket.tipo !== 'toner' && (
          <p>
            <strong>{ticket.tecnicoAsignado ? '👨‍🔧 Técnico asignado:' : '📍 Técnico más cercano:'}</strong>{' '}
            {ticket.tecnicoAsignado
              ? <span style={{ color: '#4f46e5' }}>{ticket.tecnicoAsignado}</span>
              : tecnicoCercano
                ? <>
                    <span style={{ color: '#16a34a' }}>{tecnicoCercano.nombre}</span>{' '}
                    <span style={{ fontSize: '13px', color: '#666' }}>({tecnicoCercano.distancia.toFixed(1)} km)</span>
                  </>
                : <span style={{ color: '#dc2626' }}>No se encontró técnico cercano</span>}
          </p>
        )}

        {!ticket.tecnicoAsignado && tecnicoCercano && (
          <button
            onClick={async () => {
              try {
                const res = await fetch(`https://copias-backend-production.up.railway.app/tickets/${ticket._id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tecnicoAsignado: tecnicoCercano.nombre,
                    estado: 'Asignado',
                  }),
                });

                if (res.ok) {
                  alert('✅ Técnico asignado correctamente');
                  window.location.reload();
                } else {
                  alert('❌ No se pudo asignar el técnico');
                }
              } catch (error) {
                alert('⚠️ Error al asignar técnico');
              }
            }}
            style={{
              marginTop: '20px',
              padding: '12px 20px',
              backgroundColor: '#4ade80',
              color: '#000',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#22c55e'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4ade80'}
          >
            📍 Asignar técnico más cercano
          </button>
        )}

        {ticket.latitud && ticket.longitud && (
          <p style={{ marginTop: '15px' }}>
            <strong>🌍 Ubicación:</strong>{' '}
            <a
              href={`https://www.google.com/maps?q=${ticket.latitud},${ticket.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'underline' }}
            >
              Ver en Google Maps
            </a>
          </p>
        )}

        {fotosCliente.length > 0 && (
          <div style={{ marginTop: '25px' }}>
            <p><strong>📷 Fotos del Cliente:</strong></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {fotosCliente.map((foto, index) => (
                <img
                  key={index}
                  src={foto}
                  alt={`Foto ${index + 1}`}
                  onClick={() => abrirGaleria(todasLasFotos.indexOf(foto))}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: '2px solid #e0e0e0'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DERECHA */}
      {ticket.estado === 'Terminado' && (
        <div style={{
          flex: 1,
          maxWidth: '400px',
          backgroundColor: '#f5f3ff',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {ticket.comentarioTecnico && (
            <>
              <p style={{ fontWeight: 'bold', color: '#7c3aed' }}>💬 Comentario del Técnico:</p>
              <div style={{
                background: '#fff',
                padding: '15px',
                borderRadius: '10px',
                fontStyle: 'italic',
                borderLeft: '5px solid #7c3aed',
                color: '#444'
              }}>
                {ticket.comentarioTecnico}
              </div>
            </>
          )}

          {fotosTecnico.length > 0 && (
            <>
              <p style={{ fontWeight: 'bold', color: '#7c3aed' }}>🛠 Fotos del Técnico:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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
                      borderRadius: '8px',
                      border: '2px solid #7c3aed',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL */}
      {imagenSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999
        }}>
          <button onClick={cerrarGaleria} style={{
            position: 'absolute', top: 30, right: 30,
            backgroundColor: '#fff', color: '#000',
            fontSize: 22, padding: '6px 12px',
            border: 'none', borderRadius: '50%',
            cursor: 'pointer'
          }}>
            ✖
          </button>

          <img src={imagenSeleccionada} alt="Grande"
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px' }}
          />
        </div>
      )}
    </div>
  );
}

export default TicketDetalle;