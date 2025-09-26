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

// Componente para input de código con formato XXX-XXX-XXX
const CodeInput = ({ value, onChange, disabled }) => {
  // Remover guiones para el valor real
  const cleanValue = value.replace(/-/g, '');
  const digits = cleanValue.split('');
  
  // Asegurar que siempre tengamos 9 dígitos para mostrar
  while (digits.length < 9) digits.push('');
  
  const handleChange = (digit, index) => {
    if (!/^[a-zA-Z0-9]*$/.test(digit)) return;
    
    const newDigits = [...digits];
    newDigits[index] = digit.toUpperCase();
    
    // Unir los dígitos y agregar guiones en las posiciones correctas
    let newValue = newDigits.join('');
    if (newValue.length > 3) newValue = newValue.slice(0, 3) + '-' + newValue.slice(3);
    if (newValue.length > 7) newValue = newValue.slice(0, 7) + '-' + newValue.slice(7);
    
    onChange(newValue.replace(/-/g, '')); // Guardar sin guiones
    
    // Auto-focus siguiente input
    if (digit && index < 8) {
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
    const pasteData = e.clipboardData.getData('text').replace(/-/g, '').slice(0, 9).toUpperCase();
    if (/^[a-zA-Z0-9]*$/.test(pasteData)) {
      onChange(pasteData);
    }
  };

  // Función para renderizar los grupos de inputs
  const renderInputGroup = (start, end) => {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {Array.from({ length: end - start + 1 }, (_, i) => {
          const index = start + i;
          return (
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
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', my: 2 }}>
      {renderInputGroup(0, 2)}
      <Typography variant="h4" sx={{ color: '#4fc3f7', fontWeight: 'bold' }}>-</Typography>
      {renderInputGroup(3, 5)}
      <Typography variant="h4" sx={{ color: '#4fc3f7', fontWeight: 'bold' }}>-</Typography>
      {renderInputGroup(6, 8)}
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
          }, 500);
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
    if (!sessionCode.trim() || sessionCode.length !== 9) {
      log("❌ El código debe tener 9 caracteres");
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

  // Formatear el código para mostrar con guiones
  const formatSessionCode = (code) => {
    if (code.length <= 3) return code;
    if (code.length <= 6) return `${code.slice(0, 3)}-${code.slice(3)}`;
    return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;
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
        maxWidth: 1000, 
        mx: "auto", 
        mt: 4,
        display: fullscreen ? 'none' : 'block'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            <SupportAgentIcon sx={{ fontSize: 52, color: "#4fc3f7" }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#4fc3f7", textAlign: 'center' }}>
              Técnico - Asistencia Remota
            </Typography>

            <ToggleButtonGroup value={role} exclusive onChange={(e, newRole) => newRole && setRole(newRole)}>
              <ToggleButton value="cliente"><PersonIcon sx={{ mr: 1 }} /> Cliente</ToggleButton>
              <ToggleButton value="tecnico"><SupportAgentIcon sx={{ mr: 1 }} /> Técnico</ToggleButton>
            </ToggleButtonGroup>

            {role === "tecnico" && (
              <>
                <Typography sx={{ color: "#9fd8ff", textAlign: "center", fontSize: '1.2rem' }}>
                  Ingresa el código de 9 dígitos que te proporcionó el cliente
                </Typography>
                
                <CodeInput 
                  value={sessionCode} 
                  onChange={setSessionCode}
                  disabled={status === "pending" || status === "connected"}
                />

                {status === "idle" && (
                  <Button 
                    variant="contained" 
                    onClick={handleConnect} 
                    disabled={!sessionCode.trim() || sessionCode.length !== 9}
                    size="large"
                    sx={{ fontSize: '1.1rem', px: 4, py: 1 }}
                  >
                    Conectar a sesión
                  </Button>
                )}

                {(status === "pending" || status === "connected") && (
                  <>
                    <Typography sx={{ color: "#9de6a2", fontWeight: 700, textAlign: 'center', fontSize: '1.2rem' }}>
                      {status === "pending" ? "Conectado - Esperando pantalla..." : "✅ Conexión establecida - Pantalla compartida"}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', mt: 2 }}>
                      <Button
                        variant={controlEnabled ? "contained" : "outlined"}
                        onClick={toggleControl}
                        startIcon={<MouseIcon />}
                        color={controlEnabled ? "success" : "primary"}
                        size="large"
                        sx={{ fontSize: '1rem', px: 3 }}
                      >
                        {controlEnabled ? 'Control Activo' : 'Activar Control'}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        onClick={toggleFullscreen}
                        startIcon={<FullscreenIcon />}
                        color="secondary"
                        size="large"
                        sx={{ fontSize: '1rem', px: 3 }}
                      >
                        Pantalla Completa
                      </Button>
                      
                      <Typography variant="h3" sx={{ 
                        fontWeight: 900, 
                        letterSpacing: 3,
                        color: '#4fc3f7',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        px: 4,
                        py: 2,
                        borderRadius: 3,
                        border: '2px solid #4fc3f7'
                      }}>
                        {formatSessionCode(sessionCode)}
                      </Typography>
                    </Box>
                  </>
                )}
              </>
            )}

            {(status === "connected" || status === "pending") && (
              <Button variant="outlined" onClick={handleClose} size="large" sx={{ mt: 2 }}>
                Cerrar sesión
              </Button>
            )}

            {/* Video placeholder - Más grande */}
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              minHeight: 400,
              bgcolor: '#000',
              borderRadius: 2,
              border: '3px solid #143a66',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              mt: 2,
              p: 3
            }}>
              {status === "connected" ? (
                <Typography variant="h6">La pantalla se muestra en modo pantalla completa para mejor visualización</Typography>
              ) : (
                <Typography variant="h6">La pantalla compartida aparecerá aquí en tamaño completo</Typography>
              )}
            </Box>

            {message && (
              <Typography sx={{ mt: 2, color: "#b3e5fc", fontSize: 16, textAlign: "center" }}>
                {message}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* PANTALLA COMPLETA MEJORADA */}
      <Dialog
        fullScreen
        open={fullscreen}
        onClose={toggleFullscreen}
        sx={{ 
          '& .MuiDialog-paper': { 
            backgroundColor: '#000000',
            overflow: 'hidden',
            margin: 0,
            padding: 0
          } 
        }}
        PaperProps={{
          style: {
            margin: 0,
            padding: 0,
            minWidth: '100%',
            minHeight: '100%'
          }
        }}
      >
        {/* Header minimalista */}
        <AppBar 
          sx={{ 
            position: 'fixed', 
            bgcolor: 'rgba(0, 0, 0, 0.8)', 
            backdropFilter: 'blur(10px)',
            transition: 'opacity 0.3s',
            '&:hover': {
              opacity: 1
            },
            opacity: 0.7
          }}
          className="controls-header"
        >
          <Toolbar sx={{ minHeight: '64px!important', py: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={toggleFullscreen}
              aria-label="close"
              size="large"
              sx={{ mr: 2 }}
            >
              <FullscreenExitIcon />
            </IconButton>
            
            <Typography sx={{ flex: 1, fontSize: '1.2rem' }}>
              Sesión: <strong style={{color: '#4fc3f7'}}>{formatSessionCode(sessionCode)}</strong>
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: controlEnabled ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                color: controlEnabled ? '#4caf50' : '#f44336',
                px: 2, 
                py: 1, 
                borderRadius: 1,
                border: `1px solid ${controlEnabled ? '#4caf50' : '#f44336'}`,
                fontWeight: 'bold'
              }}>
                {controlEnabled ? '🟢 CONTROL ACTIVO' : '🔴 CONTROL INACTIVO'}
              </Box>
              
              <Button 
                variant={controlEnabled ? "contained" : "outlined"} 
                onClick={toggleControl}
                startIcon={<MouseIcon />}
                color={controlEnabled ? "success" : "inherit"}
                size="medium"
              >
                {controlEnabled ? 'Desactivar' : 'Activar'}
              </Button>
              
              <Button 
                color="error" 
                variant="contained" 
                onClick={handleClose}
                size="medium"
              >
                Cerrar
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Video en pantalla completa REAL - 100% del viewport */}
        <Box sx={{ 
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: 0,
          overflow: 'hidden'
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
              cursor: controlEnabled ? 'crosshair' : 'default',
              margin: 0,
              padding: 0,
              display: 'block'
            }}
          />
          
          {/* Overlay de información que aparece al pasar el mouse */}
          <Box 
            className="control-info"
            sx={{ 
              position: 'absolute', 
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.9)', 
              color: '#4fc3f7',
              px: 4, 
              py: 3, 
              borderRadius: 3,
              textAlign: 'center',
              border: '2px solid #4fc3f7',
              transition: 'opacity 0.3s',
              opacity: 0,
              '&:hover, .controls-header:hover ~ &': {
                opacity: 1
              }
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              🖱️ Control Remoto {controlEnabled ? 'ACTIVADO' : 'DESACTIVADO'}
            </Typography>
            {controlEnabled && (
              <Typography sx={{ fontSize: '1rem' }}>
                Puede usar el mouse, teclado y scroll para controlar la pantalla remota
              </Typography>
            )}
          </Box>
        </Box>
      </Dialog>

      <style jsx global>{`
        .controls-header {
          transition: opacity 0.3s ease-in-out;
        }
        
        .controls-header:hover {
          opacity: 1 !important;
        }
        
        .controls-header:hover ~ .control-info {
          opacity: 1 !important;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}