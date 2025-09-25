import React, { useRef, useState, useEffect } from "react";
import {
  Button,
  Typography,
  TextField,
  Stack,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PersonIcon from "@mui/icons-material/Person";

// Backend SaaS (Railway)
const API_BASE = "https://copias-backend-production.up.railway.app";
// Servidor de signaling (AWS Lightsail)
const SIGNALING_URL = "wss://grapeassist.org";

// Configuración WebRTC
const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function RemoteSupport() {
  const [role, setRole] = useState("tecnico"); // "cliente" | "tecnico"
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | pending | connected | closed
  const [message, setMessage] = useState("");

  // Refs para evitar problemas de sincronía
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const codeRef = useRef("");

  useEffect(() => {
    codeRef.current = sessionCode;
  }, [sessionCode]);

  // ---------- Helpers ----------
  const log = (txt) => {
    console.log(txt);
    setMessage(txt);
  };

  // ---------- WebRTC ----------
  const initPeerConnection = () => {
    // Cierra anterior si existe
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
    }
    
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Manejar candidatos ICE (CORREGIDO: tipo 'ice-candidate')
    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate", // CORREGIDO: era "candidate"
            candidate: e.candidate,
            code: codeRef.current,
          })
        );
      }
    };

    // Manejar stream remoto (pantalla del agente)
    pc.ontrack = (event) => {
      log("🎥 Recibiendo stream de pantalla remota...");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        log("✅ Pantalla remota activa");
      }
    };

    // Manejar cambios de estado de conexión
    pc.onconnectionstatechange = () => {
      log(`🔗 Estado WebRTC: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        log("✅ Conexión WebRTC establecida");
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // ---------- Signaling WebSocket (COMPLETAMENTE ACTUALIZADO) ----------
  const ensureWebSocket = (onOpen) => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }

    log("📡 Conectando al servidor de signaling...");
    const ws = new WebSocket(SIGNALING_URL);

    ws.onopen = () => {
      log("✅ Conectado al servidor de signaling");
      
      // Enviar mensaje de unión (CORREGIDO: rol 'technician' en inglés)
      const joinMsg = { 
        type: "join", 
        code: codeRef.current, 
        role: "technician" // CORREGIDO: era "tecnico"
      };
      ws.send(JSON.stringify(joinMsg));
      log(`🔗 Uniéndose a sesión: ${codeRef.current}`);
      
      onOpen && onOpen();
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        log(`📨 Mensaje recibido: ${data.type}`);
        
        await handleSignalingMessage(data);
      } catch (error) {
        log(`❌ Error procesando mensaje: ${error.message}`);
      }
    };

    ws.onerror = (error) => {
      log(`❌ Error de WebSocket: ${error.message}`);
    };

    ws.onclose = () => {
      log("🔌 Desconectado del servidor de signaling");
      setStatus("closed");
    };

    wsRef.current = ws;
  };

  // ---------- Manejo de mensajes de signaling (ACTUALIZADO) ----------
  const handleSignalingMessage = async (data) => {
    switch (data.type) {
      case "welcome":
        log("👋 Bienvenido al servidor de signaling");
        break;

      case "joined":
        log("✅ Unido correctamente a la sesión");
        setStatus("pending");
        break;

      case "peer-joined":
        log("👤 Agente detectado en la sesión");
        // Cuando el agente se conecta, el técnico crea la oferta
        if (pcRef.current && pcRef.current.connectionState === "new") {
          await createAndSendOffer();
        }
        break;

      case "peer-disconnected":
        log("👤 Agente desconectado");
        break;

      case "answer":
        log("📥 Respuesta recibida del agente");
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(data.answer);
          log("✅ Answer configurada - Conexión establecida");
          setStatus("connected");
        }
        break;

      case "ice-candidate": // CORREGIDO: era "candidate"
        if (data.candidate && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(data.candidate);
            log("🧊 Candidato ICE añadido");
          } catch (err) {
            console.warn("Error añadiendo ICE candidate:", err);
          }
        }
        break;

      case "error":
        log(`❌ Error del servidor: ${data.message}`);
        break;

      default:
        log(`⚠️ Mensaje no manejado: ${data.type}`);
    }
  };

  // ---------- Crear y enviar oferta WebRTC ----------
  const createAndSendOffer = async () => {
    if (!pcRef.current || !wsRef.current) return;

    try {
      log("📤 Creando oferta WebRTC...");
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      wsRef.current.send(JSON.stringify({
        type: "offer",
        offer: offer,
        code: codeRef.current
      }));
      log("✅ Oferta enviada al agente");
    } catch (error) {
      log(`❌ Error creando oferta: ${error.message}`);
    }
  };

  // ---------- Backend SaaS ----------
  const handleCreate = async () => {
    // Esta función es para el CLIENTE (agente)
    // Pero en este componente estamos enfocados en el TÉCNICO
    log("⚠️ Esta función es para el cliente. Cambia a modo técnico.");
  };

  const handleConnect = async () => {
    if (!sessionCode.trim()) {
      log("❌ Ingresa un código de sesión");
      return;
    }

    try {
      // Validar sesión con el backend
      const res = await fetch(`${API_BASE}/remote/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });
      
      const data = await res.json();
      if (!data.ok) {
        log(`❌ Error del backend: ${data.error}`);
        return;
      }

      log(`✅ Sesión ${sessionCode} validada`);

      // Inicializar WebRTC y WebSocket
      initPeerConnection();
      ensureWebSocket();

    } catch (err) {
      log(`❌ Error de red: ${err.message}`);
    }
  };

  const handleClose = async () => {
    if (!sessionCode) return;
    
    try {
      await fetch(`${API_BASE}/remote/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });
    } catch (err) {
      console.warn("Error cerrando sesión en backend:", err);
    }

    // Limpiar conexiones
    try { wsRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    
    setStatus("closed");
    log(`🔌 Sesión ${sessionCode} cerrada`);
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      try { wsRef.current?.close(); } catch {}
      try { pcRef.current?.close(); } catch {}
    };
  }, []);

  return (
    <Card
      sx={{
        bgcolor: "#101b3a",
        color: "white",
        border: "2px solid #143a66",
        borderRadius: "16px",
        boxShadow:
          "0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.45), inset 0 0 40px rgba(79,195,247,0.08)",
        overflow: "hidden",
        maxWidth: 520,
        mx: "auto",
        mt: 4,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3} alignItems="center">
          <SupportAgentIcon sx={{ fontSize: 52, color: "#4fc3f7" }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#4fc3f7" }}>
            Técnico - Asistencia Remota
          </Typography>

          {/* Solo mostramos el selector de rol para debug */}
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(e, newRole) => newRole && setRole(newRole)}
            sx={{ bgcolor: "rgba(12,22,48,0.55)", borderRadius: "12px" }}
          >
            <ToggleButton value="cliente" sx={{ color: "white" }}>
              <PersonIcon sx={{ mr: 1 }} /> Cliente
            </ToggleButton>
            <ToggleButton value="tecnico" sx={{ color: "white" }}>
              <SupportAgentIcon sx={{ mr: 1 }} /> Técnico
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Técnico: ingresar código y ver pantalla remota */}
          {role === "tecnico" && (
            <>
              <Typography sx={{ color: "#9fd8ff", textAlign: "center" }}>
                Ingresa el código que te proporcionó el cliente
              </Typography>
              
              <TextField
                label="Código de sesión"
                variant="outlined"
                fullWidth
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                disabled={status === "pending" || status === "connected"}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    bgcolor: "rgba(12,22,48,0.55)",
                    "& fieldset": { borderColor: "#27496b" },
                    "&:hover fieldset": { borderColor: "#4fc3f7" },
                    "&.Mui-focused fieldset": { borderColor: "#4fc3f7" },
                  },
                  "& .MuiInputLabel-root": { color: "#89cff0" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#4fc3f7" },
                }}
              />

              {status === "idle" && (
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={!sessionCode.trim()}
                  sx={{
                    bgcolor: "#4fc3f7",
                    color: "#0b132b",
                    fontWeight: 800,
                    borderRadius: "12px",
                    px: 3,
                    "&:hover": { bgcolor: "#29b6f6" },
                  }}
                >
                  Conectar a sesión
                </Button>
              )}

              {(status === "pending" || status === "connected") && (
                <>
                  <Typography sx={{ color: "#9de6a2", fontWeight: 700 }}>
                    Conectado a sesión:
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: 2,
                      color: "#fff",
                      bgcolor: "rgba(12,22,48,0.85)",
                      p: 2,
                      borderRadius: "12px",
                    }}
                  >
                    {sessionCode}
                  </Typography>
                  
                  {status === "pending" && (
                    <Typography sx={{ color: "#ffd54f", textAlign: "center" }}>
                      Esperando que el agente comparta pantalla...
                    </Typography>
                  )}
                  
                  {status === "connected" && (
                    <Typography sx={{ color: "#9de6a2", textAlign: "center" }}>
                      ✅ Viendo pantalla remota
                    </Typography>
                  )}
                </>
              )}
            </>
          )}

          {/* Cliente: mensaje informativo */}
          {role === "cliente" && (
            <Typography sx={{ color: "#ffd54f", textAlign: "center" }}>
              Modo técnico activado. Cambia a "Cliente" en la aplicación Electron para compartir pantalla.
            </Typography>
          )}

          {/* Botón Cerrar */}
          {(status === "connected" || status === "pending") && (
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{
                color: "#f28b82",
                borderColor: "#f28b82",
                fontWeight: 700,
                borderRadius: "12px",
                "&:hover": { borderColor: "#ef5350", color: "#ef5350" },
              }}
            >
              Cerrar sesión
            </Button>
          )}

          {/* Video de pantalla remota */}
          <video
            id="remoteVideo"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ 
              width: "100%", 
              maxWidth: "800px",
              borderRadius: 8, 
              border: "2px solid #143a66",
              display: status === "connected" ? "block" : "none" 
            }}
          />

          {/* Mensajes de estado */}
          {message && (
            <Typography sx={{ 
              mt: 1, 
              color: "#b3e5fc", 
              fontSize: 14, 
              textAlign: "center",
              bgcolor: "rgba(0,0,0,0.3)",
              p: 1,
              borderRadius: 1,
              width: "100%"
            }}>
              {message}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}