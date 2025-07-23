import React, { useEffect, useState } from 'react';

function TecnicosList({ onAsignarTecnico, ticketSeleccionado }) {
  const [tecnicos, setTecnicos] = useState([]);
  const ciudadActual = localStorage.getItem('ciudad'); // 👈 Obtenemos la ciudad actual del usuario logeado

  useEffect(() => {
    fetch('https://copias-backend-production.up.railway.app/tecnicos')
      .then(response => response.json())
      .then(data => {
        // 🔍 Filtramos por ciudad
        const filtrados = data.filter(t => t.ciudad === ciudadActual);
        setTecnicos(filtrados);
      })
      .catch(error => console.error('Error al obtener técnicos:', error));
  }, [ciudadActual]);

  const handleAsignar = (tecnico) => {
    if (!ticketSeleccionado) {
      alert('Primero selecciona un ticket.');
      return;
    }

    fetch(`https://copias-backend-production.up.railway.app/tickets/${ticketSeleccionado}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estado: 'Asignado',
        tecnicoAsignado: tecnico.nombre,
        tecnicoId: tecnico.tecnicoId, // opcional si lo usas
      }),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Ticket actualizado:', data);
        alert(`Ticket asignado a ${tecnico.nombre}`);
        onAsignarTecnico();
      })
      .catch(error => console.error('Error al asignar técnico:', error));
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px' }}>
      <h2>Técnicos Disponibles</h2>
      {tecnicos.length === 0 ? (
        <p>No hay técnicos en esta ciudad.</p>
      ) : (
        <ul>
          {tecnicos.map(tecnico => (
            <li
              key={tecnico._id}
              style={{
                marginBottom: '10px',
                cursor: 'pointer',
                color: 'green',
              }}
              onClick={() => handleAsignar(tecnico)}
            >
              <img
                src={tecnico.fotoUrl}
                alt={tecnico.nombre}
                style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '10px' }}
              />
              {tecnico.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TecnicosList;