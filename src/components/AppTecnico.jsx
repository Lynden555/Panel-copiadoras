import React from 'react';
import './AppCliente.css'; // ✅ Reutilizamos el CSS existente

const AppTecnico = () => {
  return (
    <div className="playstore-container">
      {/* LOGO Y NOMBRE */}
      <div className="app-header">
        <img src="/GrapeLabs.png" alt="Logo Técnico" className="app-logo" />
        <div>
          <h1 className="app-title">Grape Técnico</h1>
          <p className="app-subtitle">Gestión de tickets y soporte móvil</p>
          <p className="app-empresa">Grape Copiadoras</p>
          <p className="app-info">Contiene anuncios · App gratuita</p>
        </div>
      </div>

      {/* ETIQUETAS */}
      <div className="app-tags">
        <span>🛠 Soporte Técnico</span>
        <span>✔️ Apto para todo público</span>
      </div>

      {/* BOTÓN DE DESCARGA */}
      <a href="/TecnicGrape.apk" download className="app-install-button">
        Instalar
      </a>

      {/* GALERÍA DE CAPTURAS */}
      <div className="screenshot-gallery">
      </div>

      {/* DESCRIPCIÓN */}
      <div className="app-description">
        <h2>Acerca de esta app</h2>
        <p>
          Recibe tickets y pedidos de tóner desde tu celular, con geolocalización, fotos del cliente y notificaciones en tiempo real. 
          Actualiza el estado, agrega comentarios y sube tus evidencias desde cualquier lugar.
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

export default AppTecnico;