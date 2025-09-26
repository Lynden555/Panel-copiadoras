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

const API_BASE = "https://copias-backend-production.up.railway.app";
const SIGNALING_URL = "wss://grapeassist.org";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.twilio.com:3478" }
  ],
};

// Componente para input de código estilo PIN con cuadritos solo para dígitos
const PinCodeInput = ({ value, onChange, disabled }) => {
  const formatDisplay = (code) => {
    if (!code) return '';
    const clean = code.replace(/-/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
  };

  const handleChange = (e) => {
    let input = e.target.value;
    input = input.replace(/[^a-zA-Z0-9-]/g, '');
    
    if (input.length < value.length) {
      onChange(input);
      return;
    }
    
    const clean = input.replace(/-/g, '');
    if (clean.length > 9) return;
    
    let formatted = clean;
    if (clean.length > 6) {
      formatted = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
    } else if (clean.length > 3) {
      formatted = `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
    }
    
    onChange(formatted);
  };

  const cleanValue = value.replace(/-/g, '');
  const digits = cleanValue.split('');
  
  while (digits.length < 9) {
    digits.push('');
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <TextField
        value={formatDisplay(value)}
        onChange={handleChange}
        disabled={disabled}
        inputProps={{
          style: { 
            opacity: 0, 
            position: 'absolute', 
            pointerEvents: 'none' 
          },
          maxLength: 11
        }}
        sx={{ position: 'absolute' }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 2 }}>
        {digits.slice(0, 3).map((digit, index) => (
          <Box
            key={index}
            sx={{
              width: 40,
              height: 40,
              border: '2px solid #4fc3f7',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: digit ? 'rgba(79, 195, 247, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.2s',
              '&:hover': disabled ? {} : {
                borderColor: '#ffffff',
                backgroundColor: 'rgba(79, 195, 247, 0.3)'
              }
            }}
            onClick={() => {
              if (!disabled) {
                const hiddenInput = document.querySelector('input[type="text"]');
                if (hiddenInput) hiddenInput.focus();
              }
            }}
          >
            {digit}
          </Box>
        ))}
        
        <Typography sx={{ color: '#4fc3f7', fontSize: '1.5rem', fontWeight: 'bold', mx: 1 }}>
          -
        </Typography>
        
        {digits.slice(3, 6).map((digit, index) => (
          <Box
            key={index + 3}
            sx={{
              width: 40,
              height: 40,
              border: '2px solid #4fc3f7',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: digit ? 'rgba(79, 195, 247, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.2s',
              '&:hover': disabled ? {} : {
                borderColor: '#ffffff',
                backgroundColor: 'rgba(79, 195, 247, 0.3)'
              }
            }}
            onClick={() => {
              if (!disabled) {
                const hiddenInput = document.querySelector('input[type="text"]');
                if (hiddenInput) hiddenInput.focus();
              }
            }}
          >
            {digit}
          </Box>
        ))}
        
        <Typography sx={{ color: '#4fc3f7', fontSize: '1.5rem', fontWeight: 'bold', mx: 1 }}>
          -
        </Typography>
        
        {digits.slice(6, 9).map((digit, index) => (
          <Box
            key={index + 6}
            sx={{
              width: 40,
              height: 40,
              border: '2px solid #4fc3f7',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: digit ? 'rgba(79, 195, 247, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.2s',
              '&:hover': disabled ? {} : {
                borderColor: '#ffffff',
                backgroundColor: 'rgba(79, 195, 247, 0.3)'
              }
            }}
            onClick={() => {
              if (!disabled) {
                const hiddenInput = document.querySelector('input[type="text"]');
                if (hiddenInput) hiddenInput.focus();
              }
            }}
          >
            {digit}
          </Box>
        ))}
      </Box>
      
      <Typography variant="body2" sx={{ color: '#9fd8ff', mt: 1 }}>
        Ingresa el código de 9 dígitos
      </Typography>
    </Box>
  );
};

// Componente para el video con overlay de debug
const VideoWithOverlay = ({ videoRef, isFullView, status, controlEnabled, screenResolution, videoDimensions }) => {
  const [showDebug, setShowDebug] = useState(false);
  
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ 
          width: '100%',
          height: isFullView ? '95%' : 'auto',
          borderRadius: 8, 
          border: "2px solid #143a66",
          display: status === "connected" ? "block" : "none",
          backgroundColor: "#000",
          cursor: controlEnabled ? 'crosshair' : 'default',
          objectFit: 'contain'
        }}
        onDoubleClick={() => setShowDebug(!showDebug)}
      />
      
      {showDebug && controlEnabled && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: 1,
          borderRadius: 1,
          fontSize: '0.7rem',
          zIndex: 10
        }}>
          Resolución: {screenResolution.width}x{screenResolution.height}<br/>
          Área visible: {Math.round(videoDimensions.width)}x{Math.round(videoDimensions.height)}<br/>
          Offset: {Math.round(videoDimensions.offsetX)}, {Math.round(videoDimensions.offsetY)}
        </Box>
      )}
      
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
  );
};

export default function RemoteSupport() {
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [controlEnabled, setControlEnabled] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [stream, setStream] = useState(null);
  const [screenResolution, setScreenResolution] = useState({ width: 1920, height: 1080 });

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const fullViewVideoRef = useRef(null);
  const codeRef = useRef("");
  const mousePressedRef = useRef(false);
  const videoDimensionsRef = useRef({ width: 0, height: 0, offsetX: 0, offsetY: 0, videoWidth: 0, videoHeight: 0 });

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

  // NUEVA FUNCIÓN: Calcular dimensiones reales del video
  const calculateVideoDimensions = useCallback((videoElement) => {
    if (!videoElement) return;
    
    const rect = videoElement.getBoundingClientRect();
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    if (!videoWidth || !videoHeight) return;
    
    // Calcular el escalado real considerando object-fit: contain
    const containerRatio = rect.width / rect.height;
    const videoRatio = videoWidth / videoHeight;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (videoRatio > containerRatio) {
      // El video se escala al ancho del contenedor
      displayWidth = rect.width;
      displayHeight = rect.width / videoRatio;
      offsetX = 0;
      offsetY = (rect.height - displayHeight) / 2;
    } else {
      // El video se escala al alto del contenedor
      displayHeight = rect.height;
      displayWidth = rect.height * videoRatio;
      offsetX = (rect.width - displayWidth) / 2;
      offsetY = 0;
    }
    
    videoDimensionsRef.current = {
      width: displayWidth,
      height: displayHeight,
      offsetX: offsetX,
      offsetY: offsetY,
      videoWidth: videoWidth,
      videoHeight: videoHeight
    };
    
    // Actualizar resolución real del screen sharing
    setScreenResolution({ width: videoWidth, height: videoHeight });
  }, []);

  // EFECTO para recalcular dimensiones cuando cambia el tamaño o el stream
  useEffect(() => {
    const video = isFullView ? fullViewVideoRef.current : remoteVideoRef.current;
    if (!video) return;
    
    const handleResize = () => {
      calculateVideoDimensions(video);
    };
    
    const handleLoadedMetadata = () => {
      calculateVideoDimensions(video);
    };
    
    window.addEventListener('resize', handleResize);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('resize', handleResize);
    
    // Calcular inicialmente
    const interval = setInterval(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        calculateVideoDimensions(video);
        clearInterval(interval);
      }
    }, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [isFullView, stream, calculateVideoDimensions]);

  // ---------- CONTROL REMOTO MEJORADO ----------
  const sendCommand = useCallback((command) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify(command));
      } catch (error) {
        console.error('Error enviando comando:', error);
      }
    }
  }, []);

  // MEJORADA: Función para manejar movimiento del mouse
  const handleMouseMove = useCallback((event) => {
    if (!controlEnabled) return;

    const video = isFullView ? fullViewVideoRef.current : remoteVideoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    const dimensions = videoDimensionsRef.current;
    
    // Si no tenemos dimensiones calculadas, usar método simple
    if (!dimensions.width || !dimensions.videoWidth) {
      const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
      
      const normalizedX = x / rect.width;
      const normalizedY = y / rect.height;

      sendCommand({
        type: 'mouseMove',
        x: Math.round(normalizedX * (screenResolution.width || 1920)),
        y: Math.round(normalizedY * (screenResolution.height || 1080))
      });
      return;
    }
    
    // Calcular coordenadas relativas al área real del video (considerando object-fit)
    const relativeX = event.clientX - rect.left - dimensions.offsetX;
    const relativeY = event.clientY - rect.top - dimensions.offsetY;
    
    // Verificar que el click esté dentro del área visible del video
    if (relativeX < 0 || relativeY < 0 || 
        relativeX > dimensions.width || relativeY > dimensions.height) {
      return; // Fuera del área del video
    }
    
    // Normalizar coordenadas respecto a la resolución real del video
    const normalizedX = relativeX / dimensions.width;
    const normalizedY = relativeY / dimensions.height;
    
    // Convertir a coordenadas de la pantalla remota
    const remoteX = Math.round(normalizedX * dimensions.videoWidth);
    const remoteY = Math.round(normalizedY * dimensions.videoHeight);

    sendCommand({
      type: 'mouseMove',
      x: remoteX,
      y: remoteY
    });
  }, [controlEnabled, sendCommand, isFullView, screenResolution]);

  // MEJORADA: Función para manejar clicks del mouse
  const handleMouseDown = useCallback((event) => {
    if (!controlEnabled) return;
    
    const video = isFullView ? fullViewVideoRef.current : remoteVideoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    const dimensions = videoDimensionsRef.current;
    
    // Verificar que el click esté dentro del área del video
    const relativeX = event.clientX - rect.left - dimensions.offsetX;
    const relativeY = event.clientY - rect.top - dimensions.offsetY;
    
    if (relativeX < 0 || relativeY < 0 || 
        relativeX > dimensions.width || relativeY > dimensions.height) {
      return; // Ignorar clicks fuera del área del video
    }
    
    mousePressedRef.current = true;
    const button = event.button === 2 ? 'right' : 'left';
    
    sendCommand({
      type: 'mouseClick',
      button: button,
      double: false,
      down: true
    });
  }, [controlEnabled, sendCommand, isFullView]);

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
    
    const video = isFullView ? fullViewVideoRef.current : remoteVideoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    const dimensions = videoDimensionsRef.current;
    
    // Verificar que el click esté dentro del área del video
    const relativeX = event.clientX - rect.left - dimensions.offsetX;
    const relativeY = event.clientY - rect.top - dimensions.offsetY;
    
    if (relativeX < 0 || relativeY < 0 || 
        relativeX > dimensions.width || relativeY > dimensions.height) {
      return; // Ignorar clicks fuera del área del video
    }
    
    const button = event.button === 2 ? 'right' : 'left';
    sendCommand({
      type: 'mouseClick',
      button: button,
      double: true
    });
  }, [controlEnabled, sendCommand, isFullView]);

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
          
          // Solicitar información de resolución al conectar
          sendCommand({
            type: 'getResolution'
          });
        };

        channel.onclose = () => {
          log('🔌 Canal de control remoto cerrado');
          setControlEnabled(false);
        };

        channel.onerror = (error) => {
          log(`❌ Error en canal de control: ${error}`);
          setControlEnabled(false);
        };

        // Escuchar mensajes del agente (como la resolución)
        channel.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'resolution') {
              setScreenResolution({
                width: data.width,
                height: data.height
              });
              log(`📏 Resolución detectada: ${data.width}x${data.height}`);
            }
          } catch (error) {
            console.error('Error procesando mensaje del agente:', error);
          }
        };
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendCommand]);

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
      setStream(null);
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
        
        // Solicitar información de resolución al conectar
        setTimeout(() => {
          sendCommand({
            type: 'getResolution'
          });
        }, 1000);
      };

      dataChannel.onclose = () => {
        log('🔌 Canal de control remoto cerrado');
        setControlEnabled(false);
      };

      dataChannel.onerror = (error) => {
        log(`❌ Error en canal de control: ${error}`);
        setControlEnabled(false);
      };

      // Escuchar mensajes del agente (como la resolución)
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'resolution') {
            setScreenResolution({
              width: data.width,
              height: data.height
            });
            log(`📏 Resolución detectada: ${data.width}x${data.height}`);
          }
        } catch (error) {
          console.error('Error procesando mensaje del agente:', error);
        }
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
    if (!sessionCode.trim()) {
      log("❌ Ingresa un código de sesión");
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
    setStream(null);
    exitFullView();
    log(`🔌 Sesión cerrada`);
  };

  const toggleControl = () => {
    setControlEnabled(!controlEnabled);
    log(controlEnabled ? '🔒 Control remoto deshabilitado' : '✅ Control remoto habilitado');
  };

  // Event listeners para ambos videos
  useEffect(() => {
    const videos = [];
    if (remoteVideoRef.current) videos.push(remoteVideoRef.current);
    if (fullViewVideoRef.current) videos.push(fullViewVideoRef.current);

    const addEventListeners = (video) => {
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
    };

    const cleanups = videos.map(video => addEventListeners(video));

    return () => {
      cleanups.forEach(cleanup => cleanup && cleanup());
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleDoubleClick, handleWheel, isFullView]);

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
      document.body.style.overflow = 'auto';
    };
  }, []);

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
                  <Box sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '500px', // Aumenta la altura
                    mt: 2,
                    overflow: 'auto', // Scroll si es necesario
                    border: status === "connected" ? "2px solid #143a66" : "none",
                    borderRadius: 2
                  }}>
                <VideoWithOverlay 
                  videoRef={remoteVideoRef}
                  isFullView={false}
                  status={status}
                  controlEnabled={controlEnabled}
                  screenResolution={screenResolution}
                  videoDimensions={videoDimensionsRef.current}
                />
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                onClick={exitFullView}
                startIcon={<CloseIcon />}
                color="secondary"
                size="small"
                sx={{ color: 'white', borderColor: '#ff9800' }}
              >
                Salir de Vista Completa
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

          {/* Video en pantalla completa */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '70px',
            paddingBottom: '30px',
            overflow: 'auto'
          }}>
            <VideoWithOverlay 
              videoRef={fullViewVideoRef}
              isFullView={true}
              status={status}
              controlEnabled={controlEnabled}
              screenResolution={screenResolution}
              videoDimensions={videoDimensionsRef.current}
            />
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