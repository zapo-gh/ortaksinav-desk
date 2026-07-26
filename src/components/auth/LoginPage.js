import React from "react";
import {
  Box, TextField, Button, Alert, Typography,
  Tabs, Tab, Divider, FormControlLabel, Checkbox, CircularProgress,
  Paper
} from "@mui/material";
import { signInWithEmail } from "../../auth/authState";
import { register as localRegister } from "../../services/localAuth";
import { useExamStore } from "../../store/useExamStore";

const LoginPage = ({ onSuccess }) => {
  const setAuthUser = useExamStore(s => s.setAuthUser);
  const setRoleAction = useExamStore(s => s.setRole);

  const [tab, setTab] = React.useState(0);
  const [loginUsername, setLoginUsername] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [regUsername, setRegUsername] = React.useState("");
  const [regDisplayName, setRegDisplayName] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const trimmed = (loginUsername || '').trim();
      if (!trimmed || !loginPassword) {
        throw new Error('Kullanıcı adı ve şifre zorunludur.');
      }
      console.time('⏱ Login (signInWithEmail)');
      const session = await signInWithEmail(trimmed, loginPassword, rememberMe);
      console.timeEnd('⏱ Login (signInWithEmail)');
      setAuthUser({ uid: session.id, email: session.username, displayName: session.displayName });
      setRoleAction('admin');
      setLoginPassword(""); setLoginUsername("");
      onSuccess?.();
    } catch (err) {
      setError(err?.message || "Kullanıcı adı veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (regPassword !== regPasswordConfirm) { setError("Şifreler eşleşmiyor."); return; }
    setLoading(true); setError(null);
    try {
      console.time('⏱ Register');
      await localRegister(regUsername, regPassword, regDisplayName);
      console.timeEnd('⏱ Register');
      setSuccess("Hesap oluşturuldu! Giriş yapabilirsiniz.");
      setRegUsername(""); setRegPassword(""); setRegPasswordConfirm(""); setRegDisplayName("");
      setTab(0);
    } catch (err) { setError(err.message || "Hesap oluşturulamadı."); }
    finally { setLoading(false); }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eef5 50%, #dfe6ed 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 440,
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Logo alanı */}
        <Box sx={{ bgcolor: 'primary.main', py: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
            Ortak Sınav Yerleşim Programı
          </Typography>
        </Box>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(null); setSuccess(null); }} variant="fullWidth">
          <Tab label="GİRİŞ YAP" />
          <Tab label="KAYIT OL" />
        </Tabs>
        <Divider />

        {tab === 0 && (
          <Box component="form" onSubmit={handleLogin} sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <TextField label="E-Posta" value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="email" autoFocus type="email" />
            <TextField label="Şifre" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="current-password" />
            <FormControlLabel
              control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} size="small" />}
              label="Beni hatırla"
              sx={{ mt: 0.5 }}
            />
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 2, py: 1.2 }}>
              {loading ? <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={18} thickness={5} color="inherit" />GİRİŞ YAPILIYOR...
              </Box> : "GİRİŞ YAP"}
            </Button>
          </Box>
        )}

        {tab === 1 && (
          <Box component="form" onSubmit={handleRegister} sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <TextField label="E-Posta" type="email" value={regUsername} onChange={e => setRegUsername(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="email" autoFocus />
            <TextField label="Ad Soyad (isteğe bağlı)" value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)}
              fullWidth size="small" margin="dense" />
            <TextField label="Şifre" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="new-password" inputProps={{ minLength: 6 }} helperText="En az 6 karakter" />
            <TextField label="Şifre Tekrar" type="password" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="new-password" />
            <Button type="submit" variant="contained" color="success" fullWidth disabled={loading} sx={{ mt: 2, py: 1.2 }}>
              {loading ? <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={18} thickness={5} color="inherit" />Oluşturuluyor...
              </Box> : "Hesap Oluştur"}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default LoginPage;