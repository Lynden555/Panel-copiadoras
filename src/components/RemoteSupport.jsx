// src/components/RemoteSupport.jsx

import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

export default function RemoteSupport() {
  const [sessionCode, setSessionCode] = useState("");
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    if (sessionCode.trim()) {
      setConnected(true);
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
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2} alignItems="center">
          <SupportAgentIcon sx={{ fontSize: 48, color: "#4fc3f7" }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#4fc3f7" }}>
            Asistencia Remota
          </Typography>

          {!connected ? (
            <>
              <Typography sx={{ color: "#9fd8ff" }}>
                Ingresa el código de sesión para conectar con soporte.
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
          ) : (
            <Typography sx={{ color: "#9de6a2", fontWeight: 700 }}>
              ✅ Conectado con soporte
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}