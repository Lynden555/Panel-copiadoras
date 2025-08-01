
import React from 'react';
import './AppCliente.css';

const AppCliente = () => {
  return (
    <div className="descarga-container">
      <h1 className="titulo">📲 App Cliente - Grape Copiadoras</h1>
      <p className="descripcion">
        Reporta fallas, solicita tóner y sigue el estado de tu solicitud fácilmente desde tu celular. 
        ¡Sin llamadas ni formularios complicados!
      </p>

      <div className="galeria-capturas">
        <img src="/screenshot1.jpg" alt="Captura 1" />
        <img src="/screenshot2.jpg" alt="Captura 2" />
        <img src="/screenshot3.jpg" alt="Captura 3" />
        <img src="/screenshot4.jpg" alt="Captura 4" />
      </div>

      <a 
        href="/Grape-Clientes.apk" 
        download 
        className="boton-descarga"
      >
        Descargar App 📥
      </a>

      <div className="instrucciones">
        <p>🔐 <strong>Importante:</strong> Activa la instalación de apps externas en tu Android.</p>
        <p>Ve a: <em>Configuración → Seguridad → Orígenes desconocidos</em></p>
      </div>
    </div>
  );
};

export default AppCliente;