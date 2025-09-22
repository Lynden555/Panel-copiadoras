import React, { useState } from "react";
import {
  Box,
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

// 🔗 URL de tu backend SaaS en Railway
const API_BASE = "https://copias-backend-production.up.railway.app";

export default function RemoteSupport() {
  const [role, setRole] = useState("cliente"); // "cliente" o "tecnico"
  const [sessionCode, setSessionCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | pending | connected | closed
  const [message, setMessage] = useState("");

  // === Llamadas al backend ===
  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE}/remote/create`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSessionCode(data.code);
        setStatus("pending");
        setMessage("Código generado, compártelo con el técnico.");
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`⚠️ Error de red: ${err.message}`);
    }
  };

  const handleConnect = async () => {
    if (!sessionCode.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/remote/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("connected");
        setMessage(`✅ Conectado a la sesión ${sessionCode}`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`⚠️ Error de red: ${err.message}`);
    }
  };

  const handleClose = async () => {
    if (!sessionCode) return;
    try {
      const res = await fetch(`${API_BASE}/remote/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("closed");
        setMessage(`❌ Sesión ${sessionCode} cerrada`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`⚠️ Error de red: ${err.message}`);
    }
  };

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
        maxWidth: 480,
        mx: "auto",
        mt: 5,
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

          {/* Vista Cliente */}
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
                Generar código
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

          {/* Vista Técnico */}
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
                Conectar
              </Button>
            </>
          )}

          {/* Vista Conectado */}
          {status === "connected" && (
            <>
              <Typography sx={{ color: "#9de6a2", fontWeight: 700 }}>
                ✅ Conectado a la sesión {sessionCode}
              </Typography>
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
            </>
          )}

          {/* Vista Cerrada */}
          {status === "closed" && (
            <Typography sx={{ color: "#f28b82", fontWeight: 700 }}>
              ❌ Sesión cerrada
            </Typography>
          )}

          {/* Mensajes */}
          {message && (
            <Typography
              sx={{
                mt: 2,
                color: "#b3e5fc",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {message}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}