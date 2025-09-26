import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Button,
  Typography,
  TextField,
  Stack,
  Card,
  CardContent,
  Box,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import MouseIcon from "@mui/icons-material/Mouse";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import CloseIcon from "@mui/icons-material/Close";
import FitScreenIcon from "@mui/icons-material/FitScreen";

const API_BASE = "https://copias-backend-production.up.railway.app";
const SIGNALING_URL = "wss://grapeassist.org";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.twilio.com:3478" }
  ],
};

// ... (PinCodeInput component remains the same)

export default function RemoteSupport() {
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [controlEnabled, setControlEnabled] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [stream, setStream] = useState(null);
  const [videoFit, setVideoFit] = useState('contain'); // 'contain' or 'cover'

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const fullViewVideoRef = useRef(null);
  const codeRef = useRef("");
  const mousePressedRef = useRef(false);

  useEffect(() => {
    codeRef.current = sessionCode;
  }, [sessionCode]);

  // Sincronizar el stream entre ambos videos
  useEffect(() => {
    if (stream && fullViewVideoRef.current) {
      fullViewVideoRef.current.srcObject = stream;
    }
  }, [stream, isFullView]);

  const enterFullView = useCallback(() => {
    setIsFullView(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const exitFullView = useCallback(() => {
    setIsFullView(false);
    document.body.style.overflow = 'auto';
  }, []);

  const toggleVideoFit = useCallback(() => {
    setVideoFit(prev => prev === 'contain' ? 'cover' : 'contain');
  }, []);

  // Efecto para entrar en vista completa cuando se conecta
  useEffect(() => {
    if (status === "connected" && !isFullView) {
      const timer = setTimeout(() => {
        enterFullView();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [status, isFullView, enterFullView]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const log = (txt) => {
    console.log(txt);
    setMessage(txt);
  };

  // ---------- CONTROL REMOTO ----------
  const sendCommand = useCallback((command) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify(command));
      } catch (error) {
        console.error('Error enviando comando:', error);
      }
    }
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!controlEnabled) return;

    const video = isFullView ? fullViewVideoRef.current : remoteVideoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;

    sendCommand({
      type: 'mouseMove',
      x: Math.round(normalizedX * 1920),
      y: Math.round(normalizedY * 1080)
    });
  }, [controlEnabled, sendCommand, isFullView]);

  const handleMouseDown = useCallback((event) => {
    if (!controlEnabled) return;
    
    mousePressedRef.current = true;
    const button = event.button === 2 ? 'right' : 'left';
    
    sendCommand({
      type: 'mouseClick',
      button: button,
      double: false,
      down: true
    });
  }, [controlEnabled, sendCommand]);

  const handleMouseUp = useCallback((event) => {
    if (!controlEnabled) return;
    
    mousePressedRef.current = false;
    const button = event.button === 2 ? 'right' : 'left';
    
    sendCommand({
      type: 'mouseClick',
      button: button,
      double: false,
      down: false
    });
  }, [controlEnabled, sendCommand]);

  const handleDoubleClick = useCallback((event) => {
    if (!controlEnabled) return;
    
    const button = event.button === 2 ? 'right' : 'left';
    sendCommand({
      type: 'mouseClick',
      button: button,
      double: true
    });
  }, [controlEnabled, sendCommand]);

  const handleWheel = useCallback((event) => {
    if (!controlEnabled) return;
    
    sendCommand({
      type: 'scroll',
      dx: event.deltaX,
      dy: event.deltaY
    });
  }, [controlEnabled, sendCommand]);

  const handleKeyDown = useCallback((event) => {
    if (!controlEnabled) return;
    
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      event.preventDefault();
    }

    sendCommand({
      type: 'keyToggle',
      key: event.key.toLowerCase(),
      down: true,
      modifiers: getModifiers(event)
    });
  }, [controlEnabled, sendCommand]);

  const handleKeyUp = useCallback((event) => {
    if (!controlEnabled) return;
    
    event.preventDefault();
    sendCommand({
      type: 'keyToggle',
      key: event.key.toLowerCase(),
      down: false,
      modifiers: getModifiers(event)
    });
  }, [controlEnabled, sendCommand]);

  const getModifiers = (event) => {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('control');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('command');
    return modifiers;
  };

  // ---------- WEBRTC MEJORADO ----------
  const initPeerConnection = useCallback(() => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
    }
    
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ontrack = (event) => {
      console.log("🎥 Track recibido:", event.track.kind, event.streams);
      if (event.streams && event.streams[0]) {
        log("✅ Stream de pantalla recibido");
        const newStream = event.streams[0];
        setStream(newStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = newStream;
        }
        if (fullViewVideoRef.current) {
          fullViewVideoRef.current.srcObject = newStream;
        }
        
        setStatus("connected");
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

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === 'remoteControl') {
        dataChannelRef.current = channel;
        
        channel.onopen = () => {
          log('✅ Canal de control remoto listo');
          setControlEnabled(true);
        };

        channel.onclose = () => {
          log('🔌 Canal de control remoto cerrado');
          setControlEnabled(false);
        };

        channel.onerror = (error) => {
          log(`❌ Error en canal de control: ${error}`);
          setControlEnabled(false);
        };
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  // ... (rest of the WebSocket and connection functions remain the same)

  return (
    <>
      {/* Vista normal */}
      {!isFullView && (
        <Card sx={{ 
          bgcolor: "#101b3a", 
          color: "white", 
          border: "2px solid #143a66", 
          borderRadius: "16px", 
          maxWidth: 900, 
          mx: "auto", 
          mt: 4 
        }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3} alignItems="center">
              <SupportAgentIcon sx={{ fontSize: 52, color: "#4fc3f7" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#4fc3f7" }}>
                Técnico - Asistencia Remota
              </Typography>

              <>
                <Typography sx={{ color: "#9fd8ff", textAlign: "center" }}>
                  Ingresa el código que te proporcionó el cliente
                </Typography>
                
                <PinCodeInput
                  value={sessionCode}
                  onChange={setSessionCode}
                  disabled={status === "pending" || status === "connected"}
                />

                {status === "idle" && (
                  <Button 
                    variant="contained" 
                    onClick={handleConnect} 
                    disabled={!sessionCode.trim() || sessionCode.replace(/-/g, '').length !== 9}
                    sx={{ mt: 2 }}
                  >
                    Conectar a sesión
                  </Button>
                )}

                {(status === "pending" || status === "connected") && (
                  <>
                    <Typography sx={{ color: "#9de6a2", fontWeight: 700 }}>
                      {status === "pending" ? "Conectado - Esperando pantalla..." : "✅ Viendo pantalla remota"}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                      <Button
                        variant={controlEnabled ? "contained" : "outlined"}
                        onClick={toggleControl}
                        startIcon={<MouseIcon />}
                        color={controlEnabled ? "success" : "primary"}
                      >
                        {controlEnabled ? 'Control Activo' : 'Activar Control'}
                      </Button>
                      
                      <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 2 }}>
                        {sessionCode}
                      </Typography>
                    </Box>
                  </>
                )}
              </>

              {(status === "connected" || status === "pending") && (
                <Button variant="outlined" onClick={handleClose} sx={{ mt: 2 }}>
                  Cerrar sesión
                </Button>
              )}

              {/* Video preview */}
              <Box sx={{ position: 'relative', width: '100%', mt: 2 }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    width: "100%", 
                    height: "300px",
                    borderRadius: 8, 
                    border: "2px solid #143a66",
                    display: status === "connected" ? "block" : "none",
                    backgroundColor: "#000",
                    cursor: controlEnabled ? 'crosshair' : 'default',
                    objectFit: 'contain'
                  }}
                />
                
                {status === "connected" && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    bgcolor: 'rgba(0,0,0,0.7)', 
                    color: controlEnabled ? '#4caf50' : '#f44336',
                    px: 2, 
                    py: 1, 
                    borderRadius: 2,
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {controlEnabled ? '🟢 CONTROL ACTIVO' : '🔴 CONTROL INACTIVO'}
                  </Box>
                )}
              </Box>

              {message && (
                <Typography sx={{ mt: 1, color: "#b3e5fc", fontSize: 14, textAlign: "center" }}>
                  {message}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Vista completa */}
      {isFullView && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'black',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Barra de controles superior */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10000,
            borderBottom: '1px solid #333'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SupportAgentIcon sx={{ color: '#4fc3f7' }} />
              <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                Sesión: {sessionCode}
              </Typography>
              <Box sx={{ 
                bgcolor: controlEnabled ? '#4caf50' : '#f44336',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                {controlEnabled ? '🟢 CONTROL ACTIVO' : '🔴 CONTROL INACTIVO'}
              </Box>
              <Box sx={{ 
                bgcolor: '#2196f3',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                Modo: {videoFit === 'cover' ? 'AJUSTAR' : 'COMPLETO'}
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant={controlEnabled ? "contained" : "outlined"}
                onClick={toggleControl}
                startIcon={<MouseIcon />}
                color={controlEnabled ? "success" : "primary"}
                size="small"
                sx={{ 
                  color: 'white',
                  borderColor: controlEnabled ? '#4caf50' : '#4fc3f7'
                }}
              >
                {controlEnabled ? 'Desactivar Control' : 'Activar Control'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={toggleVideoFit}
                startIcon={<FitScreenIcon />}
                color="info"
                size="small"
                sx={{ color: 'white', borderColor: '#2196f3' }}
              >
                {videoFit === 'cover' ? 'Modo Completo' : 'Modo Ajustar'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={exitFullView}
                startIcon={<CloseIcon />}
                color="secondary"
                size="small"
                sx={{ color: 'white', borderColor: '#ff9800' }}
              >
                Salir Vista Completa
              </Button>
              
              <Button
                variant="contained"
                onClick={handleClose}
                color="error"
                size="small"
                sx={{ ml: 1 }}
              >
                Cerrar Sesión
              </Button>
            </Box>
          </Box>

          {/* Video en pantalla completa - AHORA CON objectFit: 'cover' */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '70px',
            paddingBottom: '30px',
            overflow: 'hidden'
          }}>
            <video
              ref={fullViewVideoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: videoFit, // 'cover' para ver toda la pantalla
                cursor: controlEnabled ? 'crosshair' : 'default'
              }}
            />
          </Box>

          {/* Información sobre el modo de visualización */}
          <Box sx={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: 1,
            borderRadius: 1,
            fontSize: '0.8rem'
          }}>
            {videoFit === 'cover' 
              ? 'Modo AJUSTAR: Se ve toda la pantalla remota (puede cortar bordes)' 
              : 'Modo COMPLETO: Se ve toda la imagen (puede haber bordes negros)'}
          </Box>

          {/* Mensaje de estado */}
          {message && (
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 1,
              textAlign: 'center',
              borderTop: '1px solid #333'
            }}>
              <Typography sx={{ color: "#b3e5fc", fontSize: 14 }}>
                {message}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </>
  );
}