import React, { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

function EliminarTecnico() {
  const [tecnicos, setTecnicos] = useState([]);

  const cargarTecnicos = () => {
    fetch('https://copias-backend-production.up.railway.app/tecnicos')
      .then(response => response.json())
      .then(data => setTecnicos(data))
      .catch(error => console.error('Error al obtener técnicos:', error));
  };

  useEffect(() => {
    cargarTecnicos();
  }, []);

  const handleEliminar = (tecnicoId) => {
    const confirmado = window.confirm('¿Estás seguro de ELIMINAR este técnico? Esta acción NO se puede deshacer.');
    if (!confirmado) return;

    fetch(`https://copias-backend-production.up.railway.app/tecnicos/${tecnicoId}`, {
      method: 'DELETE',
    })
      .then(() => cargarTecnicos())
      .catch(error => console.error('Error al eliminar técnico:', error));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Eliminar Técnico</h2>
      {tecnicos.map(tecnico => (
        <Card key={tecnico._id} sx={{ mb: 2, display: 'flex', alignItems: 'center', padding: '10px' }}>
          <img
            src={tecnico.fotoUrl}
            alt={tecnico.nombre}
            style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '15px' }}
          />
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">{tecnico.nombre}</Typography>
          </CardContent>
          <Tooltip title="Eliminar Técnico">
            <IconButton onClick={() => handleEliminar(tecnico._id)}>
              <DeleteIcon color="error" />
            </IconButton>
          </Tooltip>
        </Card>
      ))}
    </div>
  );
}

export default EliminarTecnico;
