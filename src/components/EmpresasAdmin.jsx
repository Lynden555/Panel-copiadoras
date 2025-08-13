import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, CardHeader, TextField, Button, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, Alert
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CloseIcon from '@mui/icons-material/Close';

// 🔧 Ajusta según tu despliegue
const API_BASE = 'https://copias-backend-production.up.railway.app';

export default function EmpresasAdmin() {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [empresa, setEmpresa] = useState(null); // { empresaId, apiKey, nombre }

  const canSubmit = useMemo(() => (nombre.trim().length >= 3), [nombre]);

  const crearEmpresa = async () => {
    try {
      setErrorMsg(''); setSuccessMsg(''); setLoading(true);
      const res = await fetch(`${API_BASE}/api/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`);

      setEmpresa({ empresaId: data.empresaId, apiKey: data.apiKey, nombre: nombre.trim() });
      setModalOpen(true);
      setSuccessMsg(`Empresa creada: ${nombre.trim()}`);
      setNombre('');
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

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
    if (!empresa) return;
    const env = [
      `API_URL=${API_BASE}/api/metrics/impresoras`,
      `SITE_API_KEY=${empresa.apiKey}`,            // el agente lo manda en Authorization: Bearer
      `EMPRESA_ID=${empresa.empresaId}`,           // opcional si el backend infiere por key
      `SNMP_COMMUNITY=public`,
      `INTERVAL_MS=300000`,
      `AGENT_VERSION=1.0.0`
    ].join('\n');
    downloadFile(`${empresa.nombre.replace(/\s+/g,'_')}.env`, env + '\n');
  };

  const downloadConfig = () => {
    if (!empresa) return;
    const cfg = {
      apiUrl: `${API_BASE}/api/metrics/impresoras`,
      siteApiKey: empresa.apiKey,
      empresaId: empresa.empresaId,   // opcional
      community: 'public',
      intervalMs: 300000,
      printers: []                    // el agente lo llenará tras el descubrimiento
    };
    downloadFile(`config_${empresa.nombre.replace(/\s+/g,'_')}.json`, JSON.stringify(cfg, null, 2));
  };

return (
  <Box
    sx={{
      p: 3,
      minHeight: '100vh',
      // fondo con patrón “grid” gamer
      background:
        'radial-gradient(circle at 10% 10%, rgba(79,195,247,0.08) 0%, rgba(15,52,96,0) 40%), ' +
        'radial-gradient(circle at 90% 20%, rgba(79,195,247,0.10) 0%, rgba(15,52,96,0) 45%), ' +
        'linear-gradient(180deg, #0b132b 0%, #0b162f 100%)',
    }}
  >
    {/* Barra superior glow */}
    <Box
      sx={{
        maxWidth: 980,
        mx: 'auto',
        mb: 2,
        height: 6,
        borderRadius: 3,
        background:
          'linear-gradient(90deg, #29b6f6, #4fc3f7, #29b6f6)',
        boxShadow: '0 0 24px 4px rgba(79,195,247,0.45)',
        opacity: 0.9
      }}
    />

    <Card
      sx={{
        maxWidth: 980, mx: 'auto',
        bgcolor: '#101b3a', color: 'white',
        border: '2px solid #143a66', borderRadius: '16px',
        boxShadow:
          '0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.45),' +
          'inset 0 0 40px rgba(79,195,247,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header con “neón” */}
      <Box
        sx={{
          px: 3, py: 2,
          background:
            'linear-gradient(90deg, rgba(20,58,102,0.8) 0%, rgba(15,52,96,0.8) 100%)',
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
            <Alert
              severity="error"
              sx={{
                bgcolor: 'rgba(244,67,54,0.08)',
                color: '#ff9e9e',
                border: '1px solid rgba(244,67,54,0.35)',
              }}
            >
              {errorMsg}
            </Alert>
          )}
          {successMsg && (
            <Alert
              severity="success"
              sx={{
                bgcolor: 'rgba(76,175,80,0.08)',
                color: '#9de6a2',
                border: '1px solid rgba(76,175,80,0.35)',
              }}
            >
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
            helperText={
              <span style={{ color: '#6fbbe8' }}>
                Ingresa un nombre único. Se generará una ApiKey segura automáticamente.
              </span>
            }
          />

          <Button
            variant="contained"
            disabled={!canSubmit || loading}
            onClick={crearEmpresa}
            sx={{
              alignSelf: 'flex-start',
              color: '#0b132b',
              fontWeight: 800,
              px: 3,
              py: 1.2,
              textTransform: 'none',
              borderRadius: '12px',
              background:
                'linear-gradient(90deg, #29b6f6 -20%, #4fc3f7 50%, #29b6f6 120%)',
              boxShadow: '0 0 20px rgba(79,195,247,0.35)',
              transition: 'transform 120ms ease, box-shadow 120ms ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 0 28px rgba(79,195,247,0.55)',
                bgcolor: '#29b6f6'
              },
              '&:disabled': {
                opacity: 0.6,
                color: '#32536b'
              }
            }}
          >
            {loading ? 'Creando...' : 'Crear y generar ApiKey'}
          </Button>

          {/* Pasitos rápidos */}
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              border: '1px dashed rgba(79,195,247,0.25)',
              bgcolor: 'rgba(12,22,48,0.35)',
            }}
          >
            <Typography sx={{ color: '#89cff0', mb: 1, fontWeight: 700 }}>
              🧭 Pasos
            </Typography>
            <Typography sx={{ color: '#bfe7ff' }}>
              1) Crea la empresa → 2) Copia la ApiKey → 3) Descarga <code>.env</code> o <code>config.json</code> → 4) Pega en el Agente y empieza a monitorear.
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>

    {/* Modal con la apiKey */}
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
            '0 0 0 1px rgba(41,182,246,0.15), 0 10px 30px rgba(0,0,0,0.5),' +
            'inset 0 0 40px rgba(79,195,247,0.08)',
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
        {empresa && (
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ color: '#89cff0' }}>
              Empresa
            </Typography>
            <Typography sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
              {empresa.nombre}
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#89cff0' }}>
              Empresa ID
            </Typography>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: 1, border: '1px solid #2b4d74', borderRadius: 1,
                bgcolor: 'rgba(12,22,48,0.55)',
              }}
            >
              <Typography sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>
                {empresa.empresaId}
              </Typography>
              <IconButton onClick={() => copy(empresa.empresaId)} sx={{ color: '#4fc3f7' }}>
                <ContentCopyIcon />
              </IconButton>
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#89cff0' }}>
              ApiKey
            </Typography>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: 1.2, border: '1px solid #2b4d74', borderRadius: 1,
                bgcolor: 'rgba(12,22,48,0.7)',
                boxShadow: 'inset 0 0 18px rgba(79,195,247,0.08)'
              }}
            >
              <Typography
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1, fontSize: '0.95rem' }}
              >
                {empresa.apiKey}
              </Typography>
              <IconButton onClick={() => copy(empresa.apiKey)} sx={{ color: '#4fc3f7' }}>
                <ContentCopyIcon />
              </IconButton>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
              <Button
                startIcon={<DownloadIcon />}
                onClick={downloadEnv}
                sx={{
                  bgcolor: '#4fc3f7',
                  color: '#0b132b',
                  fontWeight: 800,
                  borderRadius: '12px',
                  px: 2,
                  '&:hover': { bgcolor: '#29b6f6' }
                }}
              >
                Descargar .env
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={downloadConfig}
                sx={{
                  bgcolor: '#4fc3f7',
                  color: '#0b132b',
                  fontWeight: 800,
                  borderRadius: '12px',
                  px: 2,
                  '&:hover': { bgcolor: '#29b6f6' }
                }}
              >
                Descargar config.json
              </Button>
              <Button
                startIcon={<QrCode2Icon />}
                disabled
                sx={{
                  border: '1px solid #2b4d74',
                  color: '#89cff0',
                  borderRadius: '12px',
                  px: 2
                }}
              >
                QR (pronto)
              </Button>
            </Stack>

            <Alert
              severity="info"
              sx={{
                bgcolor: 'rgba(12,22,48,0.55)',
                color: '#bfe7ff',
                border: '1px solid rgba(79,195,247,0.25)'
              }}
            >
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