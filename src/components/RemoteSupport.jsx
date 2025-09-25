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

// Configuración WebRTC MEJORADA
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ],
};

export default function RemoteSupport() {
  const [role, setRole] = useState("tecnico");
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // Refs
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const codeRef = useRef("");

  useEffect(() => {
    codeRef.current = sessionCode;
  }, [sessionCode]);

  const log = (txt) => {
    console.log(txt);
    setMessage(txt);
  };

  // ---------- WebRTC MEJORADO ----------
  const initPeerConnection = () => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
    }
    
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Configurar recepción de video/pantalla
    pc.ontrack = (event) => {
      console.log("🎥 Track recibido:", event.track.kind, event.streams);
      if (event.streams && event.streams[0]) {
        log("✅ Stream de pantalla recibido");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus("connected");
        }
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          candidate: e.candidate,
          code: codeRef.current,
          role: "technician"
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      log(`🔗 Estado WebRTC: ${pc.connectionState}`);
    };

    pcRef.current = pc;
    return pc;
  };

  // ---------- WebSocket MEJORADO ----------
  const ensureWebSocket = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }

    log("📡 Conectando al servidor...");
    const ws = new WebSocket(SIGNALING_URL);

    ws.onopen = () => {
      log("✅ Conectado al servidor");
      
      const joinMsg = { 
        type: "join", 
        code: codeRef.current, 
        role: "technician"  // Técnico que RECIBE la pantalla
      };
      ws.send(JSON.stringify(joinMsg));
      log(`🔗 Uniéndose como técnico: ${codeRef.current}`);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Mensaje recibido:", data.type, data);
        
        await handleSignalingMessage(data);
      } catch (error) {
        log(`❌ Error procesando mensaje: ${error.message}`);
      }
    };

    ws.onerror = (error) => {
      log(`❌ Error WebSocket: ${error}`);
    };

    ws.onclose = () => {
      log("🔌 Desconectado del servidor");
      setStatus("closed");
    };

    wsRef.current = ws;
  };

  // ---------- Manejo de mensajes CORREGIDO ----------
  const handleSignalingMessage = async (data) => {
    switch (data.type) {
      case "joined":
        log("✅ Unido a la sesión - Esperando pantalla del agente...");
        setStatus("pending");
        break;

      case "peer-joined":
        log("👤 Agente conectado - Esperando oferta...");
        // NO crear oferta aquí - el AGENTE debe crear la oferta
        break;

      case "offer":
        log("📥 Oferta recibida del agente - Procesando...");
        await handleOffer(data.offer);
        break;

      case "ice-candidate":
        if (data.candidate && pcRef.current && data.role === "agent") {
          try {
            await pcRef.current.addIceCandidate(data.candidate);
            log("🧊 Candidato ICE del agente añadido");
          } catch (err) {
            console.warn("Error añadiendo ICE candidate:", err);
          }
        }
        break;

      case "error":
        log(`❌ Error: ${data.message}`);
        break;

      default:
        console.log("⚠️ Mensaje no manejado:", data.type);
    }
  };

  // ---------- Manejar oferta del agente ----------
  const handleOffer = async (offer) => {
    if (!pcRef.current) {
      log("❌ Conexión WebRTC no inicializada");
      return;
    }

    try {
      log("📥 Estableciendo oferta remota...");
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      log("✅ Oferta establecida - Creando respuesta...");

      // Crear respuesta
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      // Enviar respuesta al agente
      wsRef.current.send(JSON.stringify({
        type: "answer",
        answer: answer,
        code: codeRef.current,
        role: "technician"
      }));
      
      log("✅ Respuesta enviada al agente");
      setStatus("connected");

    } catch (error) {
      log(`❌ Error procesando oferta: ${error.message}`);
    }
  };

  // ---------- Conexión ----------
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

      // Inicializar conexiones
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
      console.warn("Error cerrando sesión:", err);
    }

    // Limpiar
    try { wsRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    
    setStatus("idle");
    log(`🔌 Sesión cerrada`);
  };

  // Limpieza
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
                    {status === "pending" ? "Conectado - Esperando pantalla..." : "✅ Viendo pantalla remota"}
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
                </>
              )}
            </>
          )}

          {role === "cliente" && (
            <Typography sx={{ color: "#ffd54f", textAlign: "center" }}>
              Modo técnico activado. Cambia a "Cliente" en la aplicación Electron para compartir pantalla.
            </Typography>
          )}

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

          {/* Video - Siempre visible pero oculto cuando no hay conexión */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: "100%", 
              maxWidth: "800px",
              borderRadius: 8, 
              border: "2px solid #143a66",
              display: status === "connected" ? "block" : "none",
              backgroundColor: "#000"
            }}
          />

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