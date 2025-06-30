// src/components/EditarTecnico.js

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
} from '@mui/material';

function EditarTecnico() {
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaFoto, setNuevaFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');

  useEffect(() => {
    fetch('https://copias-backend-production.up.railway.app/tecnicos')
      .then(response => response.json())
      .then(data => setTecnicos(data))
      .catch(error => console.error('Error al obtener técnicos:', error));
  }, []);

  useEffect(() => {
    if (tecnicoSeleccionado) {
      const tecnico = tecnicos.find(t => t._id === tecnicoSeleccionado);
      if (tecnico) {
        setNuevoNombre(tecnico.nombre);
        setFotoPreview(tecnico.fotoUrl || '/avatar-default.png'); // ruta por defecto
      }
    } else {
      setNuevoNombre('');
      setFotoPreview('');
    }
  }, [tecnicoSeleccionado, tecnicos]);

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    setNuevaFoto(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tecnicoSeleccionado) {
      alert('Selecciona un técnico primero.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nuevoNombre);
    if (nuevaFoto) {
      formData.append('foto', nuevaFoto);
    }

    try {
      const response = await fetch(`https://copias-backend-production.up.railway.app/tecnicos/${tecnicoSeleccionado}`, {
        method: 'PATCH',
        body: formData,
      });

      if (response.ok) {
        alert('✅ Técnico actualizado correctamente');
        window.location.reload();
      } else {
        alert('❌ Error al actualizar técnico');
      }
    } catch (error) {
      console.error('Error al actualizar técnico:', error);
      alert('❌ Error al actualizar técnico');
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Card elevation={6} sx={{ p: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            Editar Técnico
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="tecnico-select-label">Seleccionar Técnico</InputLabel>
            <Select
              labelId="tecnico-select-label"
              value={tecnicoSeleccionado}
              onChange={(e) => setTecnicoSeleccionado(e.target.value)}
              label="Seleccionar Técnico"
            >
              <MenuItem value="">
                <em>-- Selecciona --</em>
              </MenuItem>
              {tecnicos.map(tecnico => (
                <MenuItem key={tecnico._id} value={tecnico._id}>
                  {tecnico.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {tecnicoSeleccionado && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Avatar
                  src={fotoPreview || '/avatar-default.png'}
                  alt="Foto Técnico"
                  sx={{ width: 120, height: 120 }}
                />
              </Box>

              <TextField
                fullWidth
                label="Nombre del Técnico"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button variant="contained" component="label" fullWidth sx={{ mb: 2 }}>
                Subir Nueva Foto
                <input type="file" hidden accept="image/*" onChange={handleFotoChange} />
              </Button>
            </>
          )}
        </CardContent>

        {tecnicoSeleccionado && (
          <CardActions sx={{ justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSubmit}
              sx={{ px: 5 }}
            >
              Guardar Cambios
            </Button>
          </CardActions>
        )}
      </Card>
    </Box>
  );
}

export default EditarTecnico;
