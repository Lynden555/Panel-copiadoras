import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Button,
  Typography,
  TextField,
  Stack,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PersonIcon from "@mui/icons-material/Person";
import MouseIcon from "@mui/icons-material/Mouse";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

const API_BASE = "https://copias-backend-production.up.railway.app";
const SIGNALING_URL = "wss://grapeassist.org";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ],
};

// Componente para input de código con recuadros
const CodeInput = ({ value, onChange, length = 6, disabled }) => {
  const digits = value.split('');
  
  const handleChange = (digit, index) => {
    if (!/^[a-zA-Z0-9]*$/.test(digit)) return;
    
    const newDigits = [...digits];
    newDigits[index] = digit.toUpperCase();
    const newValue = newDigits.join('');
    
    onChange(newValue);
    
    // Auto-focus siguiente input
    if (digit && index < length - 1) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, length).toUpperCase();
    if (/^[a-zA-Z0-9]*$/.test(pasteData)) {
      onChange(pasteData);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 2 }}>
      {Array.from({ length }, (_, index) => (
        <TextField
          key={index}
          id={`code-input-${index}`}
          value={digits[index] || ''}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          inputProps={{
            maxLength: 1,
            style: { 
              textAlign: 'center', 
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#ffffff',
              padding: '10px'
            }
          }}
          sx={{
            width: 60,
            height: 60,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& fieldset': {
                borderColor: '#4fc3f7',
                borderWidth: 2,
              },
              '&:hover fieldset': {
                borderColor: '#ffffff',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#4fc3f7',
                borderWidth: 3,
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '& fieldset': {
                  borderColor: '#666666',
                }
              }
            }
          }}
        />
      ))}
    </Box>
  );
};

export default function RemoteSupport() {
  const [role, setRole] = useState("tecnico");
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [controlEnabled, setControlEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const codeRef = useRef("");
  const mousePressedRef = useRef(false);

  useEffect(() => {
    codeRef.current = sessionCode;
  }, [sessionCode]);

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
    if (!controlEnabled || !remoteVideoRef.current) return;

    const video = remoteVideoRef.current;
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
  }, [controlEnabled, sendCommand]);

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

  // ---------- WEBRTC ----------
  const initPeerConnection = useCallback(() => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
    }
    
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ontrack = (event) => {
      console.log("🎥 Track recibido:", event.track.kind, event.streams);
      if (event.streams && event.streams[0]) {
        log("✅ Stream de pantalla recibido");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus("connected");
          
          // Auto pantalla completa cuando se recibe el stream
          setTimeout(() => {
            setFullscreen(true);
            log("🖥️ Modo pantalla completa activado automáticamente");
          }, 1000);
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

  // ---------- WebSocket ----------
  const ensureWebSocket = useCallback(() => {
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
        role: "technician"
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
      setControlEnabled(false);
      setFullscreen(false);
    };

    wsRef.current = ws;
  }, []);

  const handleSignalingMessage = async (data) => {
    switch (data.type) {
      case "joined":
        log("✅ Unido a la sesión - Esperando pantalla del agente...");
        setStatus("pending");
        break;

      case "peer-joined":
        log("👤 Agente conectado - Esperando oferta...");
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

  const handleOffer = async (offer) => {
    if (!pcRef.current) {
      log("❌ Conexión WebRTC no inicializada");
      return;
    }

    try {
      log("📥 Estableciendo oferta remota...");
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      log("✅ Oferta establecida - Creando respuesta...");

      const dataChannel = pcRef.current.createDataChannel('remoteControl', {
        ordered: true,
        maxPacketLifeTime: 3000
      });

      dataChannelRef.current = dataChannel;
      
      dataChannel.onopen = () => {
        log('✅ Canal de control remoto (iniciado) listo');
        setControlEnabled(true);
      };

      dataChannel.onclose = () => {
        log('🔌 Canal de control remoto cerrado');
        setControlEnabled(false);
      };

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

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

  const handleConnect = async () => {
    if (!sessionCode.trim() || sessionCode.length !== 6) {
      log("❌ El código debe tener 6 caracteres");
      return;
    }

    try {
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

    try { wsRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    try { dataChannelRef.current?.close(); } catch {}
    
    setStatus("idle");
    setControlEnabled(false);
    setFullscreen(false);
    log(`🔌 Sesión cerrada`);
  };

  const toggleControl = () => {
    setControlEnabled(!controlEnabled);
    log(controlEnabled ? '🔒 Control remoto deshabilitado' : '✅ Control remoto habilitado');
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // Event listeners para el video
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;

    const events = {
      mousemove: handleMouseMove,
      mousedown: handleMouseDown,
      mouseup: handleMouseUp,
      dblclick: handleDoubleClick,
      wheel: handleWheel,
      contextmenu: (e) => e.preventDefault()
    };

    Object.entries(events).forEach(([event, handler]) => {
      video.addEventListener(event, handler);
    });

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        video.removeEventListener(event, handler);
      });
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleDoubleClick, handleWheel]);

  // Event listeners para teclado
  useEffect(() => {
    if (!controlEnabled) return;

    const handleKeyEvents = (event) => {
      if (event.type === 'keydown') handleKeyDown(event);
      else if (event.type === 'keyup') handleKeyUp(event);
    };

    window.addEventListener('keydown', handleKeyEvents);
    window.addEventListener('keyup', handleKeyEvents);

    return () => {
      window.removeEventListener('keydown', handleKeyEvents);
      window.removeEventListener('keyup', handleKeyEvents);
    };
  }, [controlEnabled, handleKeyDown, handleKeyUp]);

  useEffect(() => {
    return () => {
      try { wsRef.current?.close(); } catch {}
      try { pcRef.current?.close(); } catch {}
      try { dataChannelRef.current?.close(); } catch {}
    };
  }, []);

  return (
    <>
      <Card sx={{ 
        bgcolor: "#101b3a", 
        color: "white", 
        border: "2px solid #143a66", 
        borderRadius: "16px", 
        maxWidth: 900, 
        mx: "auto", 
        mt: 4,
        display: fullscreen ? 'none' : 'block'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3} alignItems="center">
            <SupportAgentIcon sx={{ fontSize: 52, color: "#4fc3f7" }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#4fc3f7" }}>
              Técnico - Asistencia Remota
            </Typography>

            <ToggleButtonGroup value={role} exclusive onChange={(e, newRole) => newRole && setRole(newRole)}>
              <ToggleButton value="cliente"><PersonIcon sx={{ mr: 1 }} /> Cliente</ToggleButton>
              <ToggleButton value="tecnico"><SupportAgentIcon sx={{ mr: 1 }} /> Técnico</ToggleButton>
            </ToggleButtonGroup>

            {role === "tecnico" && (
              <>
                <Typography sx={{ color: "#9fd8ff", textAlign: "center" }}>
                  Ingresa el código de 6 dígitos que te proporcionó el cliente
                </Typography>
                
                <CodeInput 
                  value={sessionCode} 
                  onChange={setSessionCode}
                  length={6}
                  disabled={status === "pending" || status === "connected"}
                />

                {status === "idle" && (
                  <Button 
                    variant="contained" 
                    onClick={handleConnect} 
                    disabled={!sessionCode.trim() || sessionCode.length !== 6}
                    size="large"
                  >
                    Conectar a sesión
                  </Button>
                )}

                {(status === "pending" || status === "connected") && (
                  <>
                    <Typography sx={{ color: "#9de6a2", fontWeight: 700, textAlign: 'center' }}>
                      {status === "pending" ? "Conectado - Esperando pantalla..." : "✅ Conexión establecida - Pantalla compartida"}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Button
                        variant={controlEnabled ? "contained" : "outlined"}
                        onClick={toggleControl}
                        startIcon={<MouseIcon />}
                        color={controlEnabled ? "success" : "primary"}
                        size="large"
                      >
                        {controlEnabled ? 'Control Activo' : 'Activar Control'}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        onClick={toggleFullscreen}
                        startIcon={<FullscreenIcon />}
                        color="secondary"
                        size="large"
                      >
                        Pantalla Completa
                      </Button>
                      
                      <Typography variant="h4" sx={{ 
                        fontWeight: 900, 
                        letterSpacing: 4,
                        color: '#4fc3f7',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        px: 3,
                        py: 1,
                        borderRadius: 2
                      }}>
                        {sessionCode}
                      </Typography>
                    </Box>
                  </>
                )}
              </>
            )}

            {(status === "connected" || status === "pending") && (
              <Button variant="outlined" onClick={handleClose} size="large">
                Cerrar sesión
              </Button>
            )}

            {/* Video placeholder */}
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              minHeight: 300,
              bgcolor: '#000',
              borderRadius: 2,
              border: '2px solid #143a66',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              {status === "connected" ? (
                <Typography>La pantalla se muestra en modo pantalla completa</Typography>
              ) : (
                <Typography>La pantalla compartida aparecerá aquí</Typography>
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

      {/* Pantalla completa REAL */}
      <Dialog
        fullScreen
        open={fullscreen}
        onClose={toggleFullscreen}
        sx={{ 
          '& .MuiDialog-paper': { 
            backgroundColor: '#000',
            overflow: 'hidden'
          } 
        }}
      >
        <AppBar sx={{ position: 'relative', bgcolor: 'rgba(16, 27, 58, 0.95)' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={toggleFullscreen}
              aria-label="close"
              size="large"
            >
              <FullscreenExitIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Sesión: <strong style={{color: '#4fc3f7'}}>{sessionCode}</strong> - 
              <span style={{color: controlEnabled ? '#4caf50' : '#f44336', marginLeft: 10}}>
                {controlEnabled ? '🟢 CONTROL ACTIVO' : '🔴 CONTROL INACTIVO'}
              </span>
            </Typography>
            <Button 
              variant={controlEnabled ? "contained" : "outlined"} 
              onClick={toggleControl}
              startIcon={<MouseIcon />}
              color={controlEnabled ? "success" : "inherit"}
              sx={{ mr: 2 }}
              size="large"
            >
              {controlEnabled ? 'Desactivar Control' : 'Activar Control'}
            </Button>
            <Button autoFocus color="error" variant="contained" onClick={handleClose} size="large">
              Cerrar Sesión
            </Button>
          </Toolbar>
        </AppBar>
        
        {/* Video en pantalla completa REAL */}
        <Box sx={{ 
          width: '100vw',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: controlEnabled ? 'crosshair' : 'default'
            }}
          />
          
          {/* Overlay de información */}
          <Box sx={{ 
            position: 'absolute', 
            top: 20,
            left: 20,
            bgcolor: 'rgba(0,0,0,0.8)', 
            color: controlEnabled ? '#4caf50' : '#f44336',
            px: 3, 
            py: 2, 
            borderRadius: 2,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: `2px solid ${controlEnabled ? '#4caf50' : '#f44336'}`
          }}>
            {controlEnabled ? '🟢 CONTROL REMOTO ACTIVO' : '🔴 CONTROL REMOTO INACTIVO'}
          </Box>

          {/* Instrucciones */}
          {controlEnabled && (
            <Box sx={{ 
              position: 'absolute', 
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.8)', 
              color: '#4fc3f7',
              px: 3, 
              py: 2, 
              borderRadius: 2,
              textAlign: 'center',
              border: '2px solid #4fc3f7'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                🖱️ Puede usar el mouse y teclado para controlar la pantalla remota
              </Typography>
              <Typography sx={{ mt: 1, fontSize: '0.9rem' }}>
                Click izquierdo, click derecho, scroll y teclado están habilitados
              </Typography>
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
}