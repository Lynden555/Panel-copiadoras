// index.js - Servidor de signaling MEJORADO
const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false,
  clientTracking: true
});

let sessions = {};

app.use(express.json());
app.use((req, res, next) => {
  console.log("[" + new Date().toISOString() + "] " + req.method + " " + req.path);
  next();
});

wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log("Nueva conexion desde: " + clientIp);
  
  ws.isAlive = true;
  ws.on("pong", () => { 
    ws.isAlive = true; 
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("Mensaje recibido de " + clientIp + ":", data.type);

      if (!data.type) {
        ws.send(JSON.stringify({ type: "error", message: "Tipo de mensaje requerido" }));
        return;
      }

      if (data.type === "join") {
        handleJoin(ws, data, clientIp);
        return;
      }

      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        return;
      }

      if (ws.sessionCode && sessions[ws.sessionCode]) {
        handleWebRTCMessage(ws, data);
      } else {
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "No estas unido a ninguna sesion" 
        }));
      }

    } catch (err) {
      console.error("Error parseando mensaje:", err);
      try {
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Error parseando JSON" 
        }));
      } catch (sendErr) {
        console.error("Error enviando mensaje de error:", sendErr);
      }
    }
  });

  ws.on("close", (code, reason) => {
    console.log("Cliente desconectado: " + clientIp + " (" + code + ")");
    cleanupSession(ws);
  });

  ws.on("error", (error) => {
    console.error("Error en WebSocket " + clientIp + ":", error);
    cleanupSession(ws);
  });

  ws.send(JSON.stringify({ 
    type: "welcome",
    message: "Conectado al servidor de signaling",
    timestamp: Date.now()
  }));
});

function handleJoin(ws, data, clientIp) {
  const { code, role } = data;
  
  if (!code || !role) {
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "Codigo y rol requeridos" 
    }));
    return;
  }

  if (!["agent", "technician"].includes(role)) {
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "Rol debe ser agent o technician" 
    }));
    return;
  }

  cleanupSession(ws);

  if (!sessions[code]) {
    sessions[code] = { 
      createdAt: new Date(),
      agent: null,
      technician: null
    };
    console.log("Nueva sesion creada: " + code);
  }

  sessions[code][role] = ws;
  ws.sessionCode = code;
  ws.role = role;

  console.log(role + " unido a sesion " + code + " (IP: " + clientIp + ")");

  ws.send(JSON.stringify({ 
    type: "joined",
    code: code,
    role: role,
    success: true,
    sessionCreated: !!sessions[code].createdAt
  }));

  const otherRole = role === "agent" ? "technician" : "agent";
  if (sessions[code][otherRole]) {
    sessions[code][otherRole].send(JSON.stringify({
      type: "peer-joined",
      role: role
    }));
    console.log("Notificado " + otherRole + " sobre nuevo " + role);
  }
}

function handleWebRTCMessage(ws, data) {
  const session = sessions[ws.sessionCode];
  if (!session) return;

  const otherRole = ws.role === "agent" ? "technician" : "agent";
  const otherClient = session[otherRole];

  if (otherClient && otherClient.readyState === otherClient.OPEN) {
    try {
      const messageToForward = {
        ...data,
        from: ws.role,
        timestamp: Date.now()
      };
      
      otherClient.send(JSON.stringify(messageToForward));
      console.log("Mensaje " + data.type + " de " + ws.role + " -> " + otherRole);
      
    } catch (error) {
      console.error("Error reenviando mensaje a " + otherRole + ":", error);
    }
  } else {
    console.log(otherRole + " no disponible para reenviar mensaje " + data.type);
    ws.send(JSON.stringify({
      type: "error",
      message: otherRole + " no conectado"
    }));
  }
}

function cleanupSession(ws) {
  if (ws.sessionCode && sessions[ws.sessionCode]) {
    const session = sessions[ws.sessionCode];
    
    if (ws.role && session[ws.role] === ws) {
      session[ws.role] = null;
      console.log(ws.role + " removido de sesion " + ws.sessionCode);
    }

    if (!session.agent && !session.technician) {
      delete sessions[ws.sessionCode];
      console.log("Sesion " + ws.sessionCode + " eliminada (sin participantes)");
    } else {
      const otherRole = ws.role === "agent" ? "technician" : "agent";
      if (session[otherRole] && session[otherRole].readyState === session[otherRole].OPEN) {
        session[otherRole].send(JSON.stringify({
          type: "peer-disconnected",
          role: ws.role
        }));
      }
    }
  }
}

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    activeSessions: Object.keys(sessions).length,
    totalConnections: wss.clients.size,
    timestamp: new Date().toISOString()
  });
});

app.get("/sessions", (req, res) => {
  const sessionInfo = {};
  Object.keys(sessions).forEach(code => {
    sessionInfo[code] = {
      createdAt: sessions[code].createdAt,
      agent: !!sessions[code].agent,
      technician: !!sessions[code].technician
    };
  });
  
  res.json(sessionInfo);
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log("Conexion inactiva, terminando: " + ws.sessionCode);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (error) {
      console.error("Error enviando ping:", error);
    }
  });
}, 30000);

setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  Object.keys(sessions).forEach(code => {
    const session = sessions[code];
    const sessionAge = now - new Date(session.createdAt);
    
    if (sessionAge > 3600000) {
      ["agent", "technician"].forEach(role => {
        if (session[role] && session[role].readyState === session[role].OPEN) {
          session[role].send(JSON.stringify({
            type: "session-expired",
            message: "Sesion expirada por inactividad"
          }));
        }
      });
      
      delete sessions[code];
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log("Limpiadas " + cleaned + " sesiones expiradas");
  }
}, 60000);

app.get("/", (req, res) => res.json({ 
  message: "Signaling server activo",
  version: "2.0.0",
  endpoints: ["/health", "/sessions"]
}));

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Signaling server mejorado corriendo en puerto " + PORT);
  console.log("Modo: " + (process.env.NODE_ENV || "development"));
});

process.on("SIGTERM", () => {
  console.log("Recibido SIGTERM, cerrando gracefully...");
  wss.clients.forEach(ws => ws.close(1000, "Server shutdown"));
  server.close(() => {
    console.log("Servidor cerrado");
    process.exit(0);
  });
});