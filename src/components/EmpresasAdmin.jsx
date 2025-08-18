import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider,
  List, ListItemButton, ListItemText, ListSubheader, LinearProgress, Chip, Tooltip
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CloseIcon from '@mui/icons-material/Close';
import DevicesIcon from '@mui/icons-material/Devices';
import PrintIcon from '@mui/icons-material/Print';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const API_BASE = 'https://copias-backend-production.up.railway.app';

export default function EmpresasPanel() {
  // ====== estado base (siempre al tope, sin condicionales) ======
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);

  // derecha: modo = 'list' | 'create' | 'empresa'
  const [mode, setMode] = useState('list');

  // form crear
  const [nombre, setNombre] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [empresaRecienCreada, setEmpresaRecienCreada] = useState(null); // {empresaId, apiKey, nombre}
  const canSubmit = useMemo(() => (nombre.trim().length >= 3), [nombre]);

  // impresoras
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [expandedPrinterId, setExpandedPrinterId] = useState(null);

  // confirm delete
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // auth listo (evita return tempranos)
  const [isAuthReady, setIsAuthReady] = useState(false);

  // ====== helpers ======
  const copy = async (txt) => {
    try { await navigator.clipboard.writeText(txt); setSuccessMsg('Copiado al portapapeles'); }
    catch { setErrorMsg('No se pudo copiar'); }
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEnv = () => {
    if (!empresaRecienCreada) return;
    const env = [
      `API_URL=${API_BASE}/api/metrics/impresoras`,
      `SITE_API_KEY=${empresaRecienCreada.apiKey}`,
      `EMPRESA_ID=${empresaRecienCreada.empresaId}`,
      `SNMP_COMMUNITY=public`,
      `INTERVAL_MS=300000`,
      `AGENT_VERSION=1.0.0`,
    ].join('\n');
    downloadFile(`${empresaRecienCreada.nombre.replace(/\s+/g,'_')}.env`, env + '\n');
  };

  const downloadConfig = () => {
    if (!empresaRecienCreada) return;
    const cfg = {
      apiUrl: `${API_BASE}/api/metrics/impresoras`,
      siteApiKey: empresaRecienCreada.apiKey,
      empresaId: empresaRecienCreada.empresaId,
      community: 'public',
      intervalMs: 300000,
      printers: []
    };
    downloadFile(`config_${empresaRecienCreada.nombre.replace(/\s+/g,'_')}.json`, JSON.stringify(cfg, null, 2));
  };

  // ====== utils de scope ======
  const getScope = () => ({
    empresaId: localStorage.getItem('empresaId') || '',
    ciudad:    localStorage.getItem('ciudad')    || '',
  });

  // ====== loaders ======
  const loadEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
    const { empresaId, ciudad } = getScope(); // usa lo que ya definiste arriba
    const qs = new URLSearchParams({ empresaId, ciudad }).toString();
    const res = await fetch(`${API_BASE}/api/empresas?${qs}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'No se pudieron cargar empresas');

      const lista = data.data || [];
      setEmpresas(lista);

      // restaurar selección previa si sigue existiendo
      const storedId = localStorage.getItem('selectedEmpresaId');
      let toSelect = storedId ? lista.find(e => String(e._id) === String(storedId)) || null : null;
      if (!toSelect && lista.length === 1) toSelect = lista[0];

      if (toSelect) {
        setSelectedEmpresa(toSelect);
        setMode('empresa');
        setExpandedPrinterId(null);
        await loadPrinters(toSelect._id);
      } else {
        setSelectedEmpresa(null);
        setMode('list');
        setPrinters([]);
      }
    } catch (e) {
      console.error(e);
      setEmpresas([]); setSelectedEmpresa(null); setPrinters([]);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const loadPrinters = async (empresaIdParam) => {
    setLoadingPrinters(true);
    try {
      const { ciudad } = getScope(); // ciudad “fresca”
      const q = ciudad ? `?ciudad=${encodeURIComponent(ciudad)}` : '';
      const res = await fetch(`${API_BASE}/api/empresas/${empresaIdParam}/impresoras${q}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'No se pudieron cargar impresoras');

      setPrinters(data.data || []);
    } catch (e) {
      console.error('Error al cargar impresoras:', e);
      setPrinters([]);
    } finally {
      setLoadingPrinters(false);
    }
  };

  // ====== auth guard sin returns tempranos ======
  useEffect(() => {
    const { empresaId } = getScope();
    if (!empresaId) {
      // redirige sin romper el orden de hooks
      window.location.replace('/login');
      return;
    }
    setIsAuthReady(true);
  }, []);

  // carga inicial cuando auth está listo
  useEffect(() => {
    if (!isAuthReady) return;
    loadEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady]);

  // detectar cambios de empresa/ciudad (logout o cambio de scope) vía focus/storage
  useEffect(() => {
    if (!isAuthReady) return;

    let prev = getScope();

    const enforceAuth = () => {
      const { empresaId } = getScope();
      if (!empresaId) {
        // limpiar y mandar a login
        setEmpresas([]); setSelectedEmpresa(null); setPrinters([]);
        localStorage.removeItem('selectedEmpresaId');
        window.location.replace('/login');
        return false;
      }
      return true;
    };

    const handleScopeChange = () => {
      if (!enforceAuth()) return;
      const cur = getScope();
      if (cur.empresaId !== prev.empresaId || cur.ciudad !== prev.ciudad) {
        prev = cur;
        // reset UI y recargar con nuevo scope
        localStorage.removeItem('selectedEmpresaId');
        setSelectedEmpresa(null);
        setPrinters([]);
        setMode('list');
        loadEmpresas();
      }
    };

    const onFocus   = () => handleScopeChange();
    const onStorage = (e) => {
      if (e.key === 'empresaId' || e.key === 'ciudad') handleScopeChange();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthReady]);

  // ====== acciones ======
  const handleSelectEmpresa = async (emp) => {
    setSelectedEmpresa(emp);
    localStorage.setItem('selectedEmpresaId', emp._id);
    setMode('empresa');
    setExpandedPrinterId(null);
    await loadPrinters(emp._id);
  };

  const handleCrearEmpresa = async () => {
    try {
      setErrorMsg(''); setSuccessMsg(''); setLoadingCreate(true);
      const res = await fetch(`${API_BASE}/api/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        nombre: nombre.trim(),
        empresaId: localStorage.getItem('empresaId'),
        ciudad: localStorage.getItem('ciudad') })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`);

      const nueva = { _id: data.empresaId, nombre: nombre.trim(), apiKey: data.apiKey };
      setEmpresaRecienCreada({ empresaId: data.empresaId, apiKey: data.apiKey, nombre: nombre.trim() });
      setModalOpen(true);
      setSuccessMsg(`Empresa creada: ${nombre.trim()}`);
      setNombre('');

      setEmpresas(prev => [{ _id: data.empresaId, nombre: nueva.nombre }, ...prev]);
      setSelectedEmpresa({ _id: data.empresaId, nombre: nueva.nombre });
      localStorage.setItem('selectedEmpresaId', data.empresaId);
      setMode('empresa');
      await loadPrinters(data.empresaId);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoadingCreate(false);
    }
  };

  const verApiKeyEmpresa = async () => {
    if (!selectedEmpresa?._id) return;
    try {
      setErrorMsg(''); setSuccessMsg(''); setLoadingCreate(true);
      const res = await fetch(`${API_BASE}/api/empresas/${selectedEmpresa._id}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`);

      setEmpresaRecienCreada({
        empresaId: data.data._id,
        apiKey:    data.data.apiKey,
        nombre:    data.data.nombre
      });
      setModalOpen(true);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoadingCreate(false);
    }
  };

  const solicitarEliminarEmpresa = () => {
    if (!selectedEmpresa?._id) return;
    setConfirmDeleteOpen(true);
  };

  const confirmarEliminarEmpresa = async () => {
    if (!selectedEmpresa?._id) return;
    try {
      setErrorMsg(''); setSuccessMsg(''); setLoadingCreate(true);
      const res = await fetch(`${API_BASE}/api/empresas/${selectedEmpresa._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`);

      setEmpresas(prev => prev.filter(e => String(e._id) !== String(selectedEmpresa._id)));
      setSelectedEmpresa(null);
      localStorage.removeItem('selectedEmpresaId');
      setPrinters([]);
      setMode('list');
      setSuccessMsg('Empresa eliminada correctamente');
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoadingCreate(false);
      setConfirmDeleteOpen(false);
    }
  };

  const cancelarEliminarEmpresa = () => setConfirmDeleteOpen(false);

  // ====== UI helpers ======
  const tonerPercent = (lvl, max) => {
    if (!max || max <= 0) return 0;
    const p = Math.round((Number(lvl) / Number(max)) * 100);
    return Math.max(0, Math.min(100, p));
  };

  // Considera "offline" si no hay lecturas en los últimos 5 minutos.
// Si cambiaste el envío del Agente a cada 2 min, 5 min va perfecto como colchón.
const STALE_MS = 5 * 60 * 1000;

const isOnline = (latest) => {
  if (!latest?.lastSeenAt) return false;
  const age = Date.now() - new Date(latest.lastSeenAt).getTime();
  // Además respeta el flag latest.online si el backend lo marca en false
  if (latest.online === false) return false;
  return age <= STALE_MS;
};



  // ====== RENDER ======
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 2,
        p: 2,
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 10% 10%, rgba(79,195,247,0.08) 0%, rgba(15,52,96,0) 40%), ' +
          'radial-gradient(circle at 90% 20%, rgba(79,195,247,0.10) 0%, rgba(15,52,96,0) 45%), ' +
          'linear-gradient(180deg, #0b132b 0%, #0b162f 100%)',
      }}
    >
      {/* PANEL IZQUIERDO */}
      <Card
        sx={{
          bgcolor: '#0f1b3a',
          color: 'white',
          border: '2px solid #123c6b',
          borderRadius: '16px',
          boxShadow:
            '0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.5), inset 0 0 40px rgba(79,195,247,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(79,195,247,0.2)' }}>
          <Button
            fullWidth
            startIcon={<AddCircleIcon />}
            onClick={() => { setMode('create'); setSelectedEmpresa(null); }}
            sx={{
              color: '#0b132b',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(90deg, #29b6f6 -20%, #4fc3f7 50%, #29b6f6 120%)',
              boxShadow: '0 0 20px rgba(79,195,247,0.35)',
              '&:hover': { bgcolor: '#29b6f6' }
            }}
          >
            Agregar Empresa
          </Button>
        </Box>

        <List
          dense
          subheader={
            <ListSubheader
              sx={{
                bgcolor: 'transparent', color: '#9fd8ff',
                borderBottom: '1px solid rgba(79,195,247,0.18)'
              }}
            >
              Empresas
            </ListSubheader>
          }
          sx={{ flex: 1, overflowY: 'auto' }}
        >
          {loadingEmpresas && (
            <Box sx={{ px: 2, py: 1 }}>
              <LinearProgress />
            </Box>
          )}
          {empresas.map((e) => (
            <ListItemButton
              key={e._id}
              selected={selectedEmpresa?._id === e._id}
              onClick={() => handleSelectEmpresa(e)}
              sx={{
                color: 'white',
                '&.Mui-selected': { bgcolor: 'rgba(79,195,247,0.15)' },
                '&:hover': { bgcolor: 'rgba(79,195,247,0.08)' }
              }}
            >
              <ListItemText
                primary={<Typography sx={{ fontWeight: 700 }}>{e.nombre}</Typography>}
                secondary={<Typography sx={{ color: '#89cff0' }}>ID: {e._id}</Typography>}
              />
            </ListItemButton>
          ))}
          {!loadingEmpresas && empresas.length === 0 && (
            <Typography sx={{ p: 2, color: '#89cff0' }}>
              No hay empresas. Crea la primera con el botón de arriba.
            </Typography>
          )}
        </List>
      </Card>

      {/* PANEL DERECHO */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header glow */}
        <Box
          sx={{
            height: 6,
            borderRadius: 3,
            background: 'linear-gradient(90deg, #29b6f6, #4fc3f7, #29b6f6)',
            boxShadow: '0 0 24px 4px rgba(79,195,247,0.45)',
            opacity: 0.9
          }}
        />

        {/* CONTENIDO */}
        {mode === 'create' && (
          <Card
            sx={{
              bgcolor: '#101b3a', color: 'white',
              border: '2px solid #143a66', borderRadius: '16px',
              boxShadow:
                '0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.45), inset 0 0 40px rgba(79,195,247,0.08)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 3, py: 2,
                background: 'linear-gradient(90deg, rgba(20,58,102,0.8) 0%, rgba(15,52,96,0.8) 100%)',
                borderBottom: '1px solid rgba(79,195,247,0.2)',
              }}
            >
              <Typography variant="h5" sx={{ color: '#4fc3f7', fontWeight: 800, letterSpacing: 0.5 }}>
                ⚙️ Agregar empresa & generar ApiKey
              </Typography>
              <Typography sx={{ color: '#9fd8ff', opacity: 0.9, mt: 0.5 }}>
                Crea una empresa y comparte su ApiKey al técnico para configurar el Agente.
              </Typography>
            </Box>

            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                {errorMsg && (
                  <Alert severity="error" sx={{ bgcolor:'rgba(244,67,54,0.08)', color:'#ff9e9e', border:'1px solid rgba(244,67,54,0.35)' }}>
                    {errorMsg}
                  </Alert>
                )}
                {successMsg && (
                  <Alert severity="success" sx={{ bgcolor:'rgba(76,175,80,0.08)', color:'#9de6a2', border:'1px solid rgba(76,175,80,0.35)' }}>
                    {successMsg}
                  </Alert>
                )}

                <TextField
                  label="Nombre de la empresa"
                  variant="outlined"
                  fullWidth
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  inputProps={{ maxLength: 64 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      bgcolor: 'rgba(12,22,48,0.55)',
                      backdropFilter: 'blur(6px)',
                      '& fieldset': { borderColor: '#27496b' },
                      '&:hover fieldset': { borderColor: '#4fc3f7' },
                      '&.Mui-focused fieldset': { borderColor: '#4fc3f7' },
                    },
                    '& .MuiInputLabel-root': { color: '#89cff0' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#4fc3f7' },
                  }}
                  helperText={<span style={{ color: '#6fbbe8' }}>Ingresa un nombre único. Se generará una ApiKey segura.</span>}
                />

                <Button
                  variant="contained"
                  disabled={!canSubmit || loadingCreate}
                  onClick={handleCrearEmpresa}
                  sx={{
                    alignSelf: 'flex-start',
                    color: '#0b132b',
                    fontWeight: 800,
                    px: 3, py: 1.2, textTransform: 'none', borderRadius: '12px',
                    background: 'linear-gradient(90deg, #29b6f6 -20%, #4fc3f7 50%, #29b6f6 120%)',
                    boxShadow: '0 0 20px rgba(79,195,247,0.35)',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 0 28px rgba(79,195,247,0.55)', bgcolor: '#29b6f6' },
                    '&:disabled': { opacity: 0.6, color: '#32536b' }
                  }}
                >
                  {loadingCreate ? 'Creando...' : 'Crear y generar ApiKey'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

{mode === 'empresa' && selectedEmpresa && (
  <Card
    sx={{
      bgcolor: '#101b3a', color: 'white',
      border: '2px solid #143a66', borderRadius: '16px',
      boxShadow:
        '0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.45), inset 0 0 40px rgba(79,195,247,0.08)',
      overflow: 'hidden',
    }}
  >
    {/* Encabezado con botones */}
    <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(79,195,247,0.2)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <DevicesIcon sx={{ color: '#4fc3f7' }} />
      <Typography variant="h6" sx={{ color: '#4fc3f7', fontWeight: 800 }}>
        {selectedEmpresa.nombre}
      </Typography>
      <Chip label={`Empresa ID: ${selectedEmpresa._id}`} size="small" sx={{ ml: 1, color: '#bfe7ff', border: '1px solid #2b4d74' }} />
      <Box sx={{ flex: 1 }} />

      {/* Botón Ver API Key */}
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          setEmpresaRecienCreada({
            empresaId: selectedEmpresa._id,
            apiKey: selectedEmpresa.apiKey || '',
            nombre: selectedEmpresa.nombre
          });
          setModalOpen(true);
        }}
      >
        Ver API Key
      </Button>

      {/* Botón Eliminar empresa */}
      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={() => {
          if (window.confirm(`¿Seguro que quieres eliminar la empresa "${selectedEmpresa.nombre}"?`)) {
            fetch(`${API_BASE}/api/empresas/${selectedEmpresa._id}`, { method: 'DELETE' })
              .then(res => res.json())
              .then(data => {
                if (data.ok) {
                  setEmpresas(prev => prev.filter(e => e._id !== selectedEmpresa._id));
                  setSelectedEmpresa(null);
                  setPrinters([]);
                  setMode('list');
                  setSuccessMsg(`Empresa "${selectedEmpresa.nombre}" eliminada`);
                } else {
                  setErrorMsg(data.error || 'No se pudo eliminar la empresa');
                }
              })
              .catch(err => {
                console.error(err);
                setErrorMsg('Error eliminando la empresa');
              });
          }
        }}
      >
        Eliminar
      </Button>
    </Box>

    <CardContent sx={{ p: 2 }}>
      {loadingPrinters && <LinearProgress />}

      {!loadingPrinters && printers.length === 0 && (
        <Typography sx={{ color: '#89cff0', p: 2 }}>
          Aún no hay impresoras reportadas por el Agente para esta empresa.
        </Typography>
      )}

<Stack spacing={1.5}>
  {printers.map((p) => {
    const latest = p.latest || {};
    const low = !!latest.lowToner;
    const online = isOnline(latest);

    return (
      <Box
        key={p._id}
        sx={{
          p: 1.5, borderRadius: 2,
          border: '1px solid rgba(79,195,247,0.18)',
          bgcolor: 'rgba(12,22,48,0.35)',
        }}
      >
        <Box
          onClick={() => setExpandedPrinterId(expandedPrinterId === p._id ? null : p._id)}
          sx={{ display:'flex', alignItems:'center', gap:1, cursor:'pointer' }}
        >
          <PrintIcon sx={{ color:'#4fc3f7' }} />
          <Typography sx={{ fontWeight:800 }}>
            {p.printerName || p.sysName || p.host}
          </Typography>

          <Chip
            label={online ? 'Online' : 'Offline'}
            size="small"
            sx={{
              ml: 1,
              fontWeight: 700,
              borderRadius: '10px',
              ...(online
                ? {
                    color: '#00ffaa',
                    border: '1px solid #00ffaa',
                    bgcolor: 'rgba(0,255,170,0.10)',
                    boxShadow: '0 0 10px rgba(0,255,170,0.35) inset',
                  }
                : {
                    color: '#ff6b6b',
                    border: '1px solid #ff6b6b',
                    bgcolor: 'rgba(255,0,72,0.10)',
                    boxShadow: '0 0 10px rgba(255,0,72,0.35) inset',
                  })
            }}
          />

          {low && (
            <Tooltip title="Tóner bajo">
              <WarningAmberIcon sx={{ color:'#ffb74d', ml:.5 }} />
            </Tooltip>
          )}

          <Box sx={{ flex:1 }} />
          <Typography sx={{ color:'#89cff0' }}>{p.host}</Typography>
        </Box>

        {expandedPrinterId === p._id && (
          <>
            <Divider sx={{ my: 1, borderColor:'rgba(79,195,247,0.2)' }} />
            <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
              <Box>
                <Typography sx={{ color:'#9fd8ff' }}>Serial</Typography>
                <Typography sx={{ fontFamily:'monospace' }}>{p.serial || '—'}</Typography>

                <Typography sx={{ color:'#9fd8ff', mt:1 }}>Modelo</Typography>
                <Typography sx={{ fontFamily:'monospace' }}>{p.model || p.sysDescr || '—'}</Typography>

                <Typography sx={{ color:'#9fd8ff', mt:1 }}>Última lectura</Typography>
                <Typography sx={{ fontFamily:'monospace' }}>
                  {latest.lastSeenAt ? new Date(latest.lastSeenAt).toLocaleString() : '—'}
                </Typography>

                <Typography sx={{ color:'#9fd8ff', mt:1 }}>Contador de páginas</Typography>
                <Typography sx={{ fontWeight:800 }}>{latest.lastPageCount ?? '—'}</Typography>
              </Box>

              <Box>
                <Typography sx={{ color:'#9fd8ff', mb:1 }}>Consumibles</Typography>
                <Stack spacing={1}>
                  {(latest.lastSupplies || []).map((s, idx) => {
                    const pct = tonerPercent(s.level, s.max);
                    return (
                      <Box key={idx}>
                        <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                          <Typography>{s.name || `Supply ${idx+1}`}</Typography>
                          <Typography sx={{ color: pct<=20 ? '#ff9e9e' : '#9de6a2' }}>
                            {isFinite(pct) ? `${pct}%` : '—'}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={isFinite(pct) ? pct : 0}
                          sx={{
                            height: 8,
                            borderRadius: 6,
                            bgcolor: 'rgba(255,255,255,0.08)',
                            '& .MuiLinearProgress-bar': { transition: 'width .3s' }
                          }}
                        />
                      </Box>
                    );
                  })}
                  {(!latest.lastSupplies || latest.lastSupplies.length === 0) && (
                    <Typography sx={{ color:'#89cff0' }}>Sin datos de tóner.</Typography>
                  )}
                </Stack>
              </Box>
            </Box>
          </>
        )}
      </Box>
    );
  })}
</Stack>
    </CardContent>
  </Card>
)}
      </Box>

      {/* MODAL: ApiKey tras crear */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: '#0f1b3a',
            color: 'white',
            border: '2px solid #123c6b',
            borderRadius: '16px',
            boxShadow:
              '0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.5), inset 0 0 40px rgba(79,195,247,0.08)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#4fc3f7', pr: 6 }}>
          🔑 ApiKey generada
          <IconButton
            onClick={() => setModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: '#bfe7ff' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(79,195,247,0.2)', p: 3 }}>
          {empresaRecienCreada && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ color: '#89cff0' }}>
                Empresa
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>{empresaRecienCreada.nombre}</Typography>

              <Typography variant="subtitle2" sx={{ color: '#89cff0' }}>
                Empresa ID
              </Typography>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, p:1, border:'1px solid #2b4d74', borderRadius:1, bgcolor:'rgba(12,22,48,0.55)' }}>
                <Typography sx={{ fontFamily:'monospace', wordBreak:'break-all', flex:1 }}>
                  {empresaRecienCreada.empresaId}
                </Typography>
                <IconButton onClick={() => copy(empresaRecienCreada.empresaId)} sx={{ color:'#4fc3f7' }}>
                  <ContentCopyIcon />
                </IconButton>
              </Box>

                <Typography variant="subtitle2" sx={{ color: '#89cff0' }}>
                ApiKey
                </Typography>
                <Box sx={{ display:'flex', alignItems:'center', gap:1, p:1, border:'1px solid #2b4d74', borderRadius:1, bgcolor:'rgba(12,22,48,0.55)' }}>
                <Typography sx={{ fontFamily:'monospace', wordBreak:'break-all', flex:1 }}>
                    {empresaRecienCreada.apiKey || '—'}
                </Typography>
                <IconButton onClick={() => empresaRecienCreada.apiKey && copy(empresaRecienCreada.apiKey)} sx={{ color:'#4fc3f7' }}>
                    <ContentCopyIcon />
                </IconButton>
                </Box>

              <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                <Button startIcon={<DownloadIcon />} onClick={downloadEnv}
                  sx={{ bgcolor:'#4fc3f7', color:'#0b132b', fontWeight:800, borderRadius:'12px', px:2, '&:hover':{ bgcolor:'#29b6f6' } }}>
                  Descargar .env
                </Button>
                <Button startIcon={<DownloadIcon />} onClick={downloadConfig}
                  sx={{ bgcolor:'#4fc3f7', color:'#0b132b', fontWeight:800, borderRadius:'12px', px:2, '&:hover':{ bgcolor:'#29b6f6' } }}>
                  Descargar config.json
                </Button>
                <Button startIcon={<QrCode2Icon />} disabled
                  sx={{ border:'1px solid #2b4d74', color:'#89cff0', borderRadius:'12px', px:2 }}>
                  QR (pronto)
                </Button>
              </Stack>

              <Alert severity="info" sx={{ bgcolor: 'rgba(12,22,48,0.55)', color:'#bfe7ff', border:'1px solid rgba(79,195,247,0.25)' }}>
                Entrega esta ApiKey al técnico. En el Agente, pega la ApiKey y selecciona las impresoras a monitorear.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(79,195,247,0.2)', p: 2 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#89cff0', fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}