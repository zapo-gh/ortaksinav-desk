import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, TextField, Button, Alert, Box,
  Tabs, Tab, Divider, FormControlLabel, Checkbox,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { signInWithEmail } from "../../auth/authState";
import { register as localRegister } from "../../services/localAuth";
import { useExamStore } from "../../store/useExamStore";

const LoginDialog = ({ open, onClose, onSuccess, forceOpen = false }) => {
  const setAuthUser = useExamStore(s => s.setAuthUser);
  const setRoleAction = useExamStore(s => s.setRole);

  const [tab, setTab] = React.useState(0);

  const [loginUsername, setLoginUsername] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);

  const [regUsername, setRegUsername] = React.useState("");
  const [regDisplayName, setRegDisplayName] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const handleClose = () => {
    if (loading || forceOpen) return;
    setError(null); setSuccess(null);
    onClose?.();
  };

  const handleTabChange = (_, v) => { setTab(v); setError(null); setSuccess(null); };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const trimmed = (loginUsername || '').trim();
      if (!trimmed || !loginPassword) {
        throw new Error('Kullanıcı adı ve şifre zorunludur.');
      }

      // Debug: rememberMe akışını doğrula
      console.log('[LoginDialog] handleLogin rememberMe=', rememberMe);

      const session = await signInWithEmail(trimmed, loginPassword, rememberMe);
      setAuthUser({ uid: session.id, email: session.username, displayName: session.displayName });
      setRoleAction('admin');
      setLoginPassword(""); setLoginUsername("");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Kullanıcı adı veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (regPassword !== regPasswordConfirm) { setError("Åifreler eşleşmiyor."); return; }
    setLoading(true); setError(null);
    try {
      await localRegister(regUsername, regPassword, regDisplayName);
      setSuccess("Hesap oluşturuldu! Giriş yapabilirsiniz.");
      setRegUsername(""); setRegPassword(""); setRegPasswordConfirm(""); setRegDisplayName("");
      setTab(0);
    } catch (err) { setError(err.message || "Hesap oluşturulamadı."); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth disableEscapeKeyDown={forceOpen}>
      <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>Ortak Sınav Yerleşim Programı</DialogTitle>
      <Tabs value={tab} onChange={handleTabChange} sx={{ px: 3 }} variant="fullWidth">
        <Tab label="Giriş Yap" />
        <Tab label="Yeni Hesap Oluştur" />
      </Tabs>
      <Divider />

      {tab === 0 && (
        <form onSubmit={handleLogin}>
          <DialogContent>
            <DialogContentText sx={{ mb: 1 }}>Devam etmek için giriş yapın.</DialogContentText>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <TextField label="E-Posta" value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="email" autoFocus type="email" />
            <TextField label="Åifre" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="current-password" />
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  size="small"
                />
              }
              label="Beni hatırla"
              sx={{ mt: 0.5 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {!forceOpen && <Button onClick={handleClose} disabled={loading}>Vazgeç</Button>}
            <Button type="submit" variant="contained" disabled={loading} fullWidth={forceOpen}>
              {loading ? <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={18} thickness={5} />Giriş yapılıyor...</Box> : "Giriş Yap"}
            </Button>
          </DialogActions>
        </form>
      )}

      {tab === 1 && (
        <form onSubmit={handleRegister}>
          <DialogContent>
            <DialogContentText sx={{ mb: 1 }}>Yeni bir kullanıcı hesabı oluşturun.</DialogContentText>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <TextField label="E-Posta" type="email" value={regUsername} onChange={e => setRegUsername(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="email" autoFocus />
            <TextField label="Ad Soyad (isteğe bağlı)" value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)}
              fullWidth size="small" margin="dense" />
            <TextField label="Åifre" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="new-password" inputProps={{ minLength: 6 }} helperText="En az 6 karakter" />
            <TextField label="Åifre Tekrar" type="password" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)}
              fullWidth required size="small" margin="dense" autoComplete="new-password" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {!forceOpen && <Button onClick={handleClose} disabled={loading}>Vazgeç</Button>}
            <Button type="submit" variant="contained" color="success" disabled={loading} fullWidth={forceOpen}>
              {loading ? <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={18} thickness={5} />Oluşturuluyor...</Box> : "Hesap Oluştur"}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
};

export default LoginDialog;