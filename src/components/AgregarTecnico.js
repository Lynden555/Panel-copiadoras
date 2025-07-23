import React, { useState } from 'react';

function AgregarTecnico() {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoBase64, setFotoBase64] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFotoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) setPin(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    fetch('https://copias-backend-production.up.railway.app/tecnicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tecnicoId: pin, fotoUrl: fotoBase64, ciudad }),
    })
      .then((response) => response.json())
      .then(() => {
        alert('Técnico agregado correctamente');
        setNombre('');
        setPin('');
        setCiudad('');
        setFotoFile(null);
        setFotoBase64('');
      })
      .catch((error) => {
        console.error('Error al agregar técnico:', error);
      });
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
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nombre:</label>
          <input
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>PIN (4 dígitos):</label>
          <input
            type="text"
            value={pin}
            onChange={handlePinChange}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            placeholder="Ej: 1234"
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Ciudad:</label>
          <select
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          >
            <option value="">Selecciona una ciudad</option>
            <option value="Mexicali">Mexicali</option>
            <option value="Tijuana">Tijuana</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Foto (desde PC):</label>
          <input type="file" accept="image/*" onChange={handleFileChange} required />
          {fotoBase64 && (
            <div style={{ marginTop: '10px' }}>
              <img src={fotoBase64} alt="Preview" style={{ width: '100px', borderRadius: '8px' }} />
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