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
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PersonIcon from "@mui/icons-material/Person";
import MouseIcon from "@mui/icons-material/Mouse";
import KeyboardIcon from "@mui/icons-material/Keyboard";

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
  const formatValue = (val) => {
    // Asegurar que siempre tenga 9 caracteres para mostrar
    const cleanVal = val.replace(/-/g, '');
    let formatted = cleanVal.slice(0, 9);
    
    // Agregar guiones en las posiciones correctas
    if (formatted.length > 6) {
      formatted = `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}-${formatted.slice(6, 9)}`;
    } else if (formatted.length > 3) {
      formatted = `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}`;
    }
    
    return formatted;
  };

  const formattedValue = formatValue(value);
  const digits = formattedValue.split('');
  
  const handleChange = (digit, index) => {
    if (!/^[a-zA-Z0-9]*$/.test(digit)) return;
    
    // Convertir índice visual a índice real (ignorando guiones)
    const realIndex = index <= 3 ? index : (index <= 7 ? index - 1 : index - 2);
    
    const cleanValue = value.replace(/-/g, '');
    const newDigits = cleanValue.split('');
    
    if (realIndex < 9) {
      newDigits[realIndex] = digit.toUpperCase();
      const newValue = newDigits.join('');
      onChange(newValue.slice(0, 9)); // Limitar a 9 caracteres
      
      // Auto-focus siguiente input
      if (digit && realIndex < 8) {
        const nextVisualIndex = realIndex < 2 ? realIndex + 1 : 
                              realIndex === 2 ? 4 : 
                              realIndex < 5 ? realIndex + 1 : 
                              realIndex === 5 ? 7 : realIndex + 1;
        const nextInput = document.getElementById(`code-input-${nextVisualIndex}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const realIndex = index <= 3 ? index : (index <= 7 ? index - 1 : index - 2);
      const cleanValue = value.replace(/-/g, '');
      
      if (!cleanValue[realIndex] && realIndex > 0) {
        // Mover al input anterior
        const prevVisualIndex = realIndex <= 3 ? realIndex - 1 : 
                               realIndex === 4 ? 2 : 
                               realIndex <= 7 ? realIndex - 1 : 
                               realIndex === 8 ? 6 : realIndex - 1;
        const prevInput = document.getElementById(`code-input-${prevVisualIndex}`);
        if (prevInput) prevInput.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/-/g, '').slice(0, 9).toUpperCase();
    if (/^[a-zA-Z0-9]*$/.test(pasteData)) {
      onChange(pasteData);
    }
  };

  // Renderizar los inputs individuales
  const renderInputs = () => {
    const inputs = [];
    let inputIndex = 0;
    
    for (let i = 0; i < 11; i++) {
      if (i === 3 || i === 7) {
        // Renderizar guión
        inputs.push(
          <Typography 
            key={`dash-${i}`}
            sx={{ 
              color: '#4fc3f7', 
              fontWeight: 'bold', 
              fontSize: '2rem',
              mx: 1
            }}
          >
            -
          </Typography>
        );
      } else {
        // Renderizar input
        const digit = digits[i] || '';
        inputs.push(
          <TextField
            key={`input-${i}`}
            id={`code-input-${i}`}
            value={digit}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            disabled={disabled}
            inputProps={{
              maxLength: 1,
              style: { 
                textAlign: 'center', 
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#ffffff',
                padding: '8px'
              }
            }}
            sx={{
              width: 50,
              height: 50,
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
        inputIndex++;
      }
    }
    
    return inputs;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
      {renderInputs()}
    </Box>
  );
};

export default function RemoteSupport() {
  const [role, setRole] = useState("tecnico");
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [controlEnabled, setControlEnabled] = useState(false);

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
    
    // Calcular coordenadas relativas al video
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    
    // Normalizar coordenadas (0-1)
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;

    sendCommand({
      type: 'mouseMove',
      x: Math.round(normalizedX * 1920), // Asumiendo resolución 1920x1080
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
    
    // Prevenir comportamiento por defecto del navegador
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

    // Configurar DataChannel para control remoto
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

  // ---------- WebSocket MEJORADO ----------
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
    };

    wsRef.current = ws;
  }, []);

  // ---------- Manejo de mensajes ----------
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

      // Crear DataChannel para control remoto
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
    // Formatear el código con guiones antes de enviarlo
    const formattedCode = formatCodeWithDashes(sessionCode);
    
    if (!formattedCode.trim()) {
      log("❌ Ingresa un código de sesión");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/remote/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formattedCode }),
      });
      
      const data = await res.json();
      if (!data.ok) {
        log(`❌ Error del backend: ${data.error}`);
        return;
      }

      log(`✅ Sesión ${formattedCode} validada`);
      initPeerConnection();
      ensureWebSocket();

    } catch (err) {
      log(`❌ Error de red: ${err.message}`);
    }
  };

  const handleClose = async () => {
    if (!sessionCode) return;
    
    // Formatear el código con guiones para el cierre también
    const formattedCode = formatCodeWithDashes(sessionCode);
    
    try {
      await fetch(`${API_BASE}/remote/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formattedCode }),
      });
    } catch (err) {
      console.warn("Error cerrando sesión:", err);
    }

    try { wsRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    try { dataChannelRef.current?.close(); } catch {}
    
    setStatus("idle");
    setControlEnabled(false);
    log(`🔌 Sesión cerrada`);
  };

  // Función para formatear el código con guiones
  const formatCodeWithDashes = (code) => {
    const cleanCode = code.replace(/-/g, '');
    if (cleanCode.length <= 3) return cleanCode;
    if (cleanCode.length <= 6) return `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}`;
    return `${cleanCode.slice(0, 3)}-${cleanCode.slice(3, 6)}-${cleanCode.slice(6, 9)}`;
  };

  // Función para mostrar el código formateado
  const displayFormattedCode = (code) => {
    return formatCodeWithDashes(code);
  };

  const toggleControl = () => {
    setControlEnabled(!controlEnabled);
    log(controlEnabled ? '🔒 Control remoto deshabilitado' : '✅ Control remoto habilitado');
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

  // Limpieza
  useEffect(() => {
    return () => {
      try { wsRef.current?.close(); } catch {}
      try { pcRef.current?.close(); } catch {}
      try { dataChannelRef.current?.close(); } catch {}
    };
  }, []);

  return (
    <Card sx={{ bgcolor: "#101b3a", color: "white", border: "2px solid #143a66", borderRadius: "16px", maxWidth: 900, mx: "auto", mt: 4 }}>
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
                Ingresa el código de 9 dígitos que te proporcionó el cliente
              </Typography>
              
              <CodeInput
                value={sessionCode}
                onChange={setSessionCode}
                disabled={status === "pending" || status === "connected"}
              />

              {status === "idle" && (
                <Button variant="contained" onClick={handleConnect} disabled={!sessionCode.trim() || sessionCode.replace(/-/g, '').length !== 9}>
                  Conectar a sesión
                </Button>
              )}

              {(status === "pending" || status === "connected") && (
                <>
                  <Typography sx={{ color: "#9de6a2", fontWeight: 700 }}>
                    {status === "pending" ? "Conectado - Esperando pantalla..." : "✅ Viendo pantalla remota"}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                      variant={controlEnabled ? "contained" : "outlined"}
                      onClick={toggleControl}
                      startIcon={<MouseIcon />}
                      color={controlEnabled ? "success" : "primary"}
                    >
                      {controlEnabled ? 'Control Activo' : 'Activar Control'}
                    </Button>
                    
                    <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 2 }}>
                      {displayFormattedCode(sessionCode)}
                    </Typography>
                  </Box>
                </>
              )}
            </>
          )}

          {(status === "connected" || status === "pending") && (
            <Button variant="outlined" onClick={handleClose}>
              Cerrar sesión
            </Button>
          )}

          {/* Video con eventos de control */}
          <Box sx={{ position: 'relative', width: '100%' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: "100%", 
                borderRadius: 8, 
                border: "2px solid #143a66",
                display: status === "connected" ? "block" : "none",
                backgroundColor: "#000",
                cursor: controlEnabled ? 'crosshair' : 'default'
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
  );
}