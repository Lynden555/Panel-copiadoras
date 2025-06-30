import React, { useEffect, useState } from 'react';

function TecnicosList({ onAsignarTecnico, ticketSeleccionado }) {
  const [tecnicos, setTecnicos] = useState([]);

  useEffect(() => {
    fetch('https://copias-backend-production.up.railway.app/tecnicos')
      .then(response => response.json())
      .then(data => setTecnicos(data))
      .catch(error => console.error('Error al obtener técnicos:', error));
  }, []);

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
      }),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Ticket actualizado:', data);
        alert(`Ticket asignado a ${tecnico.nombre}`);
        onAsignarTecnico(); // Notificar al componente padre que se asignó
      })
      .catch(error => console.error('Error al asignar técnico:', error));
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px' }}>
      <h2>Técnicos Disponibles</h2>
      {tecnicos.length === 0 ? (
        <p>No hay técnicos.</p>
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
