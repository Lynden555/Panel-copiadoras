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
// Servidor de signaling (AWS Lightsail) – por ahora WS sin TLS
const SIGNALING_URL = "ws://34.222.248.174:3001";

// Configuración WebRTC (luego agregamos TURN)
const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function RemoteSupport() {
  const [role, setRole] = useState("cliente"); // "cliente" | "tecnico"
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | pending | connected | closed
  const [message, setMessage] = useState("");

  // Refs para evitar problemas de sincronía
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const codeRef = useRef("");

  useEffect(() => {
    codeRef.current = sessionCode;
  }, [sessionCode]);

  // ---------- Helpers ----------
  const log = (txt) => setMessage(txt);

  const initPeerConnection = () => {
    // Cierra anterior si existe
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
    }
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "candidate",
            candidate: e.candidate,
            code: codeRef.current,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      // El TÉCNICO verá aquí la pantalla remota
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const ensureWebSocket = (onOpen) => {
    // Cierra anterior si existe
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }
    const ws = new WebSocket(SIGNALING_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code: codeRef.current }));
      onOpen && onOpen();
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      // Mensajes del otro peer, ruteados por el signaling
      if (!pcRef.current) return;

      if (data.type === "offer" && role === "cliente") {
        // El técnico envió una offer → el cliente responde
        await pcRef.current.setRemoteDescription(data.offer);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", answer, code: codeRef.current }));
        log("📨 Respondí la offer con mi answer.");
      }

      if (data.type === "answer" && role === "tecnico") {
        await pcRef.current.setRemoteDescription(data.answer);
        log("✅ Conexión WebRTC establecida.");
      }

      if (data.type === "candidate") {
        try {
          await pcRef.current.addIceCandidate(data.candidate);
        } catch (err) {
          console.warn("Error al añadir ICE", err);
        }
      }
    };

    ws.onclose = () => {
      // No hacemos nada crítico; PM2 mantiene el server vivo.
    };

    wsRef.current = ws;
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  };

  const cleanupConnections = () => {
    try { wsRef.current && wsRef.current.close(); } catch {}
    try { pcRef.current && pcRef.current.close(); } catch {}
    stopLocalStream();
  };

  // ---------- Backend SaaS ----------
  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE}/remote/create`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) return log(`❌ Error: ${data.error}`);

      setSessionCode(data.code);
      setStatus("pending");
      log("Código generado, compártelo con el técnico.");

      // El CLIENTE se prepara: PC + captura de pantalla + WS
      initPeerConnection();

      // Capturar pantalla (requerirá gesto de usuario)
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((tr) => pcRef.current.addTrack(tr, stream));
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      ensureWebSocket(); // join y quedar escuchando offers
    } catch (err) {
      log(`⚠️ Error de red: ${err.message}`);
    }
  };

  const handleConnect = async () => {
    if (!sessionCode.trim()) return;

    try {
      // Primero valida con SaaS
      const res = await fetch(`${API_BASE}/remote/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });
      const data = await res.json();
      if (!data.ok) return log(`❌ Error: ${data.error}`);

      setStatus("connected");
      log(`✅ Conectado a la sesión ${sessionCode}`);

      // El TÉCNICO inicia: PC + WS + crea offer
      initPeerConnection();

      ensureWebSocket(async () => {
        // Creamos y enviamos la offer
        const offer = await pcRef.current.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: true,
        });
        await pcRef.current.setLocalDescription(offer);
        wsRef.current.send(JSON.stringify({ type: "offer", offer, code: codeRef.current }));
        log("📨 Envié la offer, esperando answer del cliente…");
      });
    } catch (err) {
      log(`⚠️ Error de red: ${err.message}`);
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
    } catch {}
    cleanupConnections();
    setStatus("closed");
    log(`❌ Sesión ${sessionCode} cerrada`);
  };

  // Limpieza al desmontar
  useEffect(() => () => cleanupConnections(), []);

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
            Asistencia Remota
          </Typography>

          {/* Selector de rol */}
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

          {/* Cliente: generar código y compartir pantalla */}
          {role === "cliente" && status === "idle" && (
            <>
              <Typography sx={{ color: "#9fd8ff", textAlign: "center" }}>
                Genera un código y compártelo con el técnico.
              </Typography>
              <Button
                variant="contained"
                onClick={handleCreate}
                sx={{
                  bgcolor: "#4fc3f7",
                  color: "#0b132b",
                  fontWeight: 800,
                  borderRadius: "12px",
                  px: 3,
                  "&:hover": { bgcolor: "#29b6f6" },
                }}
              >
                Generar código y compartir pantalla
              </Button>
            </>
          )}

          {role === "cliente" && status === "pending" && (
            <>
              <Typography sx={{ color: "#9de6a2", fontWeight: 700 }}>
                Código generado:
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 3,
                  color: "#fff",
                  bgcolor: "rgba(12,22,48,0.85)",
                  p: 2,
                  borderRadius: "12px",
                }}
              >
                {sessionCode}
              </Typography>
              <Typography sx={{ color: "#9fd8ff", textAlign: "center" }}>
                Esperando a que el técnico se conecte…
              </Typography>
            </>
          )}

          {/* Técnico: ingresar código y ver pantalla remota */}
          {role === "tecnico" && status !== "connected" && status !== "closed" && (
            <>
              <Typography sx={{ color: "#9fd8ff" }}>
                Ingresa el código que te pasó el cliente:
              </Typography>
              <TextField
                label="Código de sesión"
                variant="outlined"
                fullWidth
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    bgcolor: "rgba(12,22,48,0.55)",
                    backdropFilter: "blur(6px)",
                    "& fieldset": { borderColor: "#27496b" },
                    "&:hover fieldset": { borderColor: "#4fc3f7" },
                    "&.Mui-focused fieldset": { borderColor: "#4fc3f7" },
                  },
                  "& .MuiInputLabel-root": { color: "#89cff0" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#4fc3f7" },
                }}
              />
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
                Conectar y ver pantalla
              </Button>
            </>
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

          {/* Videos (para pruebas) */}
          <video
            id="localVideo"
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", borderRadius: 8, display: role === "cliente" ? "block" : "none" }}
          />
          <video
            id="remoteVideo"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", borderRadius: 8, display: role === "tecnico" ? "block" : "none" }}
          />

          {/* Mensajes */}
          {message && (
            <Typography sx={{ mt: 1, color: "#b3e5fc", fontSize: 14, textAlign: "center" }}>
              {message}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}