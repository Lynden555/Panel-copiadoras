import React from 'react';
import './AppCliente.css';

const AppCliente = () => {
  return (
    <div className="playstore-container">
      {/* LOGO Y NOMBRE */}
      <div className="app-header">
        <img src="/GrapeLabs.png" alt="Logo App" className="app-logo" />
        <div>
          <h1 className="app-title">Grape Cliente</h1>
          <p className="app-subtitle">Soporte Técnico y Pedidos de Tóner</p>
          <p className="app-empresa">Grape Copiadoras</p>
          <p className="app-info">Contiene anuncios · App gratuita</p>
        </div>
      </div>

      {/* BOTONES Y ETIQUETAS */}
      <div className="app-tags">
        <span>📌 Herramientas</span>
        <span>✔️ Apto para todo público</span>
      </div>

      {/* BOTÓN DE DESCARGA */}
      <a href="/CliGrape.apk" download className="app-install-button">
        Instalar
      </a>

      {/* GALERÍA DE CAPTURAS */}
      <div className="screenshot-gallery">
        <img src="/screenshot1.jpg" alt="Captura 1" />
        <img src="/screenshot2.jpg" alt="Captura 2" />
        <img src="/screenshot3.jpg" alt="Captura 3" />
        <img src="/screenshot4.jpg" alt="Captura 4" />
      </div>

      {/* DESCRIPCIÓN */}
      <div className="app-description">
        <h2>Acerca de esta app</h2>
        <p>
          Reporta fallas, solicita tóner y sigue el estado de tus solicitudes desde tu celular. 
          Fácil, rápido y sin necesidad de llamar.
        </p>
      </div>

      {/* INSTRUCCIONES EXTRA */}
      <div className="instrucciones">
        <p>🔐 <strong>Importante:</strong> Activa la instalación de apps externas.</p>
        <p>Ve a: <em>Configuración → Seguridad → Orígenes desconocidos</em></p>
      </div>
    </div>
  );
};

export default AppCliente;