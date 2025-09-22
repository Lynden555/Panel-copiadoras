import React, { useEffect, useRef, useState } from "react";
import styles from "./RemoteSupport.module.css";

/**
 * RemoteSupport
 * - Modo 'technician' (panel): ingresar session ID, conectar, ver video, enviar comandos.
 * - Modo 'agent' (cliente): muestra session ID, botón para "Solicitar soporte" (simula).
 *
 * ENV (para futura conexión):
 * - NEXT_PUBLIC_SIGNALING_WS  -> wss://signaling.tudominio.com
 * - NEXT_PUBLIC_TURN_URL      -> turn:turn.tudominio.com:3478
 *
 * Modo demo si NEXT_PUBLIC_ENABLE_DEMO="true" (permite probar UI sin backend).
 */

type Role = "technician" | "agent";

export default function RemoteSupport({ defaultRole = "technician" as Role }) {
  const [role, setRole] = useState<Role>(defaultRole);
  const [sessionId, setSessionId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [dcOpen, setDcOpen] = useState(false);
  const [demoMode] = useState(() => (process.env.NEXT_PUBLIC_ENABLE_DEMO === "true"));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      closeConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function log(...args: any[]) {
    const txt = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    setLogs(l => [new Date().toLocaleTimeString() + " — " + txt, ...l].slice(0, 200));
  }

  function generateSessionId() {
    // Human-friendly 9-digit grouped (e.g. 785-234-991)
    const n = Math.floor(Math.random() * 900000000) + 100000000;
    const s = n.toString();
    return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,9)}`;
  }

  async function startDemoAgent() {
    // Demo flow: agent creates session and waits for "connect"
    const id = generateSessionId();
    setSessionId(id);
    log("Modo demo: Agent creado con ID", id);
  }

  async function startDemoTechnicianJoin() {
    if (!sessionId) {
      log("Ingresa un ID para unirte (demo).");
      return;
    }
    // In demo we'll create a loopback between two RTCPeerConnections inside same page.
    log("Modo demo: iniciando conexión local para session", sessionId);
    // create fake local connection by creating two RTCPeerConnections
    const pcLocal = new RTCPeerConnection();
    const pcRemote = new RTCPeerConnection();

    // datachannel from technician -> agent
    const dcLocal = pcLocal.createDataChannel("control");
    dcLocal.onopen = () => { setDcOpen(true); log("DataChannel (tech) abierto (demo)"); };
    dcLocal.onmessage = e => log("DataChannel <-", e.data);

    pcRemote.ondatachannel = (ev) => {
      const ch = ev.channel;
      ch.onopen = () => log("DataChannel (agent) abierto (demo)");
      ch.onmessage = (e) => {
        log("Agente recibió comando demo:", e.data);
        // for demo: show a quick flash in UI (not implemented) or log only
      };
    };

    // screen capture simulation: we'll simulate by using getUserMedia video (camera) if available,
    // else we won't attach a track (still ok for UI)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia ? await (navigator.mediaDevices as any).getDisplayMedia({video:true}) : null;
      if (stream && stream.getTracks().length) {
        stream.getTracks().forEach(t => pcRemote.addTrack(t, stream));
      }
      pcLocal.ontrack = (e) => {
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0];
        }
      };
    } catch (err) {
      log("Demo: no se pudo obtener pantalla (browser may block).");
    }

    // ICE candidate exchange
    pcLocal.onicecandidate = ev => {
      if (ev.candidate) pcRemote.addIceCandidate(ev.candidate).catch(()=>{});
    };
    pcRemote.onicecandidate = ev => {
      if (ev.candidate) pcLocal.addIceCandidate(ev.candidate).catch(()=>{});
    };

    // offer/answer
    const offer = await pcLocal.createOffer();
    await pcLocal.setLocalDescription(offer);
    await pcRemote.setRemoteDescription(offer);
    const answer = await pcRemote.createAnswer();
    await pcRemote.setLocalDescription(answer);
    await pcLocal.setRemoteDescription(answer);

    pcRef.current = pcLocal;
    dataChannelRef.current = dcLocal;
    setConnected(true);
    log("Conexión demo establecida.");
  }

  function closeConnection() {
    setConnected(false);
    setDcOpen(false);
    try {
      dataChannelRef.current?.close();
    } catch {}
    try {
      pcRef.current?.close();
    } catch {}
    try {
      wsRef.current?.close();
    } catch {}
    pcRef.current = null;
    dataChannelRef.current = null;
    wsRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    log("Conexión cerrada");
  }

  // --- Placeholder functions to integrate with real signaling later ---
  async function connectToSession_real(signalingUrl: string, room: string) {
    // TODO: Implement actual signaling flow:
    // 1) Open WSS to signalingUrl
    // 2) join room
    // 3) exchange SDP/ICE
    // 4) create RTCPeerConnection with iceServers including TURN
    // 5) attach remote tracks to videoRef
    log("TODO: connectToSession_real -> implement signaling. URL:", signalingUrl, "room:", room);
  }

  // UI handlers
  async function handleCreateAgent() {
    if (demoMode) {
      await startDemoAgent();
      setRole("agent");
      return;
    }
    // in production, agent would call backend to register and receive sessionId
    const newId = generateSessionId();
    setSessionId(newId);
    log("Agent creado (awaiting connections). ID:", newId);
  }

  async function handleTechnicianConnect() {
    if (!sessionId) { log("Debes ingresar el ID del cliente."); return; }
    if (demoMode) {
      await startDemoTechnicianJoin();
      return;
    }
    // real: use connectToSession_real with NEXT_PUBLIC_SIGNALING_WS
    const url = process.env.NEXT_PUBLIC_SIGNALING_WS || "";
    await connectToSession_real(url, sessionId);
  }

  function handleSendCommand(cmd: string) {
    if (!cmd) return;
    if (demoMode) {
      if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
        dataChannelRef.current.send(cmd);
        log("cmd ->", cmd);
      } else {
        log("DataChannel no abierto (demo).");
      }
      return;
    }
    // real: send through datachannelRef to agent
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(cmd);
      log("cmd ->", cmd);
    } else {
      log("DataChannel no listo.");
    }
  }

  // small subcomponents
  const SessionCard = () => (
    <div className={styles.sessionCard}>
      <div><strong>Session ID</strong></div>
      <div className={styles.sessionId}>{sessionId || "—"}</div>
      <div className={styles.sessionActions}>
        <button className="btn" onClick={() => navigator.clipboard?.writeText(sessionId)}>Copiar</button>
        <button className="btn ghost" onClick={() => setSessionId(generateSessionId())}>Regenerar</button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Soporte Remoto · SoporteYa</h2>
        <div className={styles.roleSwitch}>
          <label className={role === "technician" ? styles.active : ""} onClick={() => setRole("technician")}>Técnico</label>
          <label className={role === "agent" ? styles.active : ""} onClick={() => setRole("agent")}>Cliente (Agent)</label>
        </div>
      </header>

      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <h4>Sesiones</h4>
            <SessionCard />
            <div style={{marginTop:12}}>
              <label>ID (o pega aquí):</label>
              <input value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="785-234-991" />
            </div>

            <div className={styles.controls}>
              {role === "technician" ? (
                <>
                  <button className="btn primary" onClick={handleTechnicianConnect} disabled={connected}>Conectar</button>
                  <button className="btn" onClick={() => { setLogs([]); }}>Limpiar logs</button>
                  <button className="btn ghost" onClick={() => { setSessionId(generateSessionId()); }}>Generar ID</button>
                </>
              ) : (
                <>
                  <button className="btn primary" onClick={handleCreateAgent}>Generar ID (Agent)</button>
                  <div style={{marginTop:8,fontSize:13,color:"#666"}}>El cliente abre esto y te da el ID para que lo pegues en el panel.</div>
                </>
              )}
            </div>

            <div style={{marginTop:14}}>
              <h5>Estado</h5>
              <div className={styles.statusRow}>
                <div>Conexión:</div>
                <div className={connected ? styles.badgeOk : styles.badgeWarn}>{connected ? "Conectado" : "Desconectado"}</div>
              </div>
              <div className={styles.statusRow}>
                <div>DataChannel:</div>
                <div className={dcOpen ? styles.badgeOk : styles.badgeWarn}>{dcOpen ? "Abierto" : "Cerrado"}</div>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <h5>Demo mode</h5>
              <div style={{fontSize:13,color:"#666"}}>
                {demoMode ? "Demo habilitado — flujo local sin backend." : "Demo deshabilitado — listo para conectar a signaling & TURN."}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h4>Enviar comando</h4>
            <CommandForm onSend={(c)=>handleSendCommand(c)} />
          </div>

          <div className={styles.card}>
            <h4>Logs</h4>
            <div className={styles.logBox}>
              {logs.length === 0 ? <div className={styles.empty}>Sin actividad</div> : (
                logs.map((l,i)=> <div key={i} className={styles.logLine}>{l}</div>)
              )}
            </div>
          </div>
        </aside>

        <section className={styles.viewer}>
          <div className={styles.viewerHeader}>
            <div><strong>Visor Remoto</strong></div>
            <div className={styles.viewerActions}>
              <button className="btn ghost" onClick={closeConnection}>Desconectar</button>
            </div>
          </div>

          <div className={styles.videoWrap}>
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
            {!connected && <div className={styles.placeholder}>Aquí se verá la pantalla del cliente al conectarse</div>}
          </div>

          <div className={styles.bottomBar}>
            <div className={styles.quickButtons}>
              <button className="btn" onClick={()=>{ setSessionId(generateSessionId()); }}>Nuevo ID</button>
              <button className="btn" onClick={()=>log("Snapshot (visual) not implemented in demo.")}>Tomar snapshot</button>
              <button className="btn" onClick={()=>log("Registro de sesión (grab) no implementado en demo.")}>Grabar</button>
            </div>
            <div style={{fontSize:13,color:"#666"}}>Tips: el cliente debe aceptar la conexión desde su agente. En producción usa WSS + TURN.</div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* CommandForm subcomponent */
function CommandForm({ onSend }: { onSend: (cmd: string) => void }) {
  const [cmd, setCmd] = useState("");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <input placeholder="Ej: mouse:100,200  | key:Enter | open:url" value={cmd} onChange={e=>setCmd(e.target.value)} />
      <div style={{display:"flex",gap:8}}>
        <button className="btn primary" onClick={()=>{ onSend(cmd); setCmd(""); }}>Enviar</button>
        <button className="btn ghost" onClick={()=>onSend(JSON.stringify({action:"ping"}))}>Ping</button>
      </div>
      <div style={{fontSize:12,color:"#666"}}>Formato sugerido (nuestra convención): <code>mouse:x,y</code>, <code>key:Enter</code>, <code>open:https://...</code></div>
    </div>
  );
}