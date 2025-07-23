import React, { useState } from 'react';

function AgregarTecnico() {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [fotoFile, setFotoFile] = useState(null);

  const empresaId = localStorage.getItem('empresaId');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFotoFile(file);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) setPin(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fotoFile) {
      alert('Debes seleccionar una foto');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('tecnicoId', pin);
    formData.append('ciudad', ciudad);
    formData.append('empresaId', empresaId);
    formData.append('foto', fotoFile);

    try {
      const response = await fetch('https://copias-backend-production.up.railway.app/tecnicos', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert('Técnico agregado correctamente');
        setNombre('');
        setPin('');
        setCiudad('');
        setFotoFile(null);
      } else {
        alert(data.error || 'Error al agregar técnico');
      }
    } catch (error) {
      console.error('Error al agregar técnico:', error);
      alert('Error al agregar técnico');
    }
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      backgroundColor: '#fafafa'
    }}>
      <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>Agregar Técnico</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nombre:</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>PIN (4 dígitos):</label>
          <input
            type="text"
            value={pin}
            onChange={handlePinChange}
            placeholder="Ej: 1234"
            required
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Ciudad:</label>
          <select
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          >
            <option value="">Selecciona una ciudad</option>
            <option value="Mexicali">Mexicali</option>
            <option value="Tijuana">Tijuana</option>
            <option value="Ensenada">Ensenada</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Foto (desde PC):</label>
          <input type="file" accept="image/*" onChange={handleFileChange} required />
          {fotoFile && (
            <div style={{ marginTop: '10px' }}>
              <img src={URL.createObjectURL(fotoFile)} alt="Preview" style={{ width: '100px', borderRadius: '8px' }} />
            </div>
          )}
        </div>

        <button type="submit" style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#28a745',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Agregar Técnico
        </button>
      </form>
    </div>
  );
}

export default AgregarTecnico;