
import React from 'react';
import './AppCliente.css'; // ✅ Reutilizamos el mismo estilo

const AppTecnico = () => {
  return (
    <div className="descarga-container">
      <h1 className="titulo">🛠️ App Técnico - Grape Copiadoras</h1>
      <p className="descripcion">
        Recibe tickets, pedidos de tóner, ubicación del cliente, y mucho más desde tu celular. 
        Todo en tiempo real con notificaciones push. ¡Optimiza tu trabajo!
      </p>

      {/* Aquí puedes agregar capturas en el futuro si lo deseas */}
      <div className="galeria-capturas">
        {/* <img src="/tecnico1.jpg" alt="Captura Técnico 1" />
        <img src="/tecnico2.jpg" alt="Captura Técnico 2" /> */}
      </div>

      <a 
        href="/Grape-Tecnico.apk" // 👈 Reemplaza con tu ruta final tipo "/GrapeTecnico.apk"
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

export default AppTecnico;