import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Box,
  FormControlLabel,
  Switch,
  MenuItem,
  makeStyles,
} from "@material-ui/core";
import { Save, CloudUpload, DeleteOutline } from "@material-ui/icons";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1)
    }
  },
  hero: {
    borderRadius: 16,
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    background: "linear-gradient(135deg, rgba(15,76,129,.1) 0%, rgba(19,111,99,.1) 100%)",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.07)"
  },
  title: {
    marginBottom: theme.spacing(0.5),
    fontWeight: 700
  },
  subtitle: {
    fontSize: "0.86rem",
    color: "rgba(17,24,39,.72)"
  },
  tabs: {
    marginBottom: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    "& .MuiTabs-flexContainer": {
      padding: theme.spacing(0.5)
    },
    "& .MuiTab-root": {
      textTransform: "none",
      minHeight: 40,
      borderRadius: 8,
      fontWeight: 600
    }
  },
  sectionTitle: {
    marginBottom: theme.spacing(0.75),
    fontWeight: 700
  },
  sectionDescription: {
    marginBottom: theme.spacing(2),
    fontSize: "0.8rem",
    color: "rgba(17,24,39,.64)"
  },
  form: {
    marginTop: theme.spacing(1)
  },
  sectionCard: {
    borderRadius: 14,
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    background: theme.palette.background.paper
  },
  sectionCardScrollable: {
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto",
    paddingRight: theme.spacing(1.2),
    [theme.breakpoints.down("sm")]: {
      maxHeight: "none",
      overflowY: "visible",
      paddingRight: theme.spacing(2)
    }
  },
  textField: {
    marginBottom: theme.spacing(2)
  },
  actions: {
    marginTop: theme.spacing(3),
    display: "flex",
    justifyContent: "flex-end"
  },
  button: {
    minWidth: 160
  },
  loadingWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(4)
  },
  helperText: {
    color: "rgba(17,24,39,.64)",
    fontSize: "0.78rem",
    marginTop: -theme.spacing(0.3),
    marginBottom: theme.spacing(2)
  },
  brandingPreviewImg: {
    maxWidth: "100%",
    maxHeight: 120,
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    objectFit: "contain",
    background: "#fafafa"
  },
  uploadButton: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  uploadActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  smtpRowCard: {
    padding: theme.spacing(1.5),
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    background: "rgba(248,250,252,.9)",
    marginBottom: theme.spacing(2)
  },
  smtpColumnCard: {
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    padding: theme.spacing(1.5),
    height: "100%"
  },
  compactField: {
    marginBottom: theme.spacing(1.2)
  },
  templatePreview: {
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    background: "#f8fafc",
    padding: theme.spacing(1.25),
    maxHeight: 140,
    overflow: "auto"
  }
}));

// helper pra montar URL da imagem (relativa ou absoluta)
const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;

  const base = process.env.REACT_APP_BACKEND_URL || "";
  if (!base) return value;

  const normalizedBase = base.replace(/\/+$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedBase}${path}`;
};

const GlobalConfig = () => {
  const classes = useStyles();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingWelcomeTest, setSendingWelcomeTest] = useState(false);
  const [welcomeTestEmail, setWelcomeTestEmail] = useState("");
  const [uploading, setUploading] = useState({
    loginLogo: false,
    loginBackground: false
  });
  const [removing, setRemoving] = useState({
    loginLogo: false,
    loginBackground: false
  });

  const [config, setConfig] = useState({
    mpAccessToken: "",
    paymentGateway: "mercadopago",
    asaasApiKey: "",
    asaasWebhookSecret: "",
    smtpHost: "",
    smtpPort: "",
    smtpSecure: "false",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    welcomeEmailEnabled: "disabled",
    welcomeEmailSubject: "Bem-vindo(a) | Seu acesso foi liberado",
    welcomeEmailTemplate:
      "<div style='font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:24px'><table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb'><tr><td style='background:linear-gradient(135deg,#0f4c81,#136f63);padding:22px 24px;color:#ffffff'><h1 style='margin:0;font-size:20px'>Bem-vindo(a), {name}!</h1><p style='margin:8px 0 0;font-size:13px;opacity:.92'>Seu acesso foi liberado com sucesso.</p></td></tr><tr><td style='padding:24px'><p style='margin:0 0 14px;color:#1f2937;font-size:14px'>Olá, {name}. Abaixo estão os dados iniciais da sua conta:</p><table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px'><tr><td style='padding:14px 16px;color:#111827;font-size:14px;line-height:1.6'><strong>Empresa:</strong> {companyName}<br/><strong>E-mail:</strong> {email}<br/><strong>Senha provisória:</strong> {password}<br/><strong>Vencimento:</strong> {dueDate}</td></tr></table><p style='margin:16px 0 0;color:#374151;font-size:14px'>Acesse: <a href='{loginUrl}' style='color:#0f4c81;text-decoration:none'>{loginUrl}</a></p><p style='margin:18px 0 0;color:#6b7280;font-size:12px'>Por segurança, recomendamos alterar sua senha no primeiro acesso.</p></td></tr><tr><td style='padding:14px 24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px'>Este é um e-mail automático da plataforma {companyName}.</td></tr></table></div>",
    trialExpiration: "",
    loginLogo: "",
    loginBackground: "",
    loginWhatsapp: "",
    wuzapiBaseUrl: "",
    wuzapiAdminToken: ""
  });

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleChange = e => {
    const { name, value } = e.target;

    if (name === "trialExpiration") {
      const onlyDigits = value.replace(/\D/g, "");
      return setConfig(prev => ({ ...prev, [name]: onlyDigits }));
    }

    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleWelcomeEmailToggle = (event) => {
    setConfig(prev => ({
      ...prev,
      welcomeEmailEnabled: event.target.checked ? "enabled" : "disabled"
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const selectedGateway = String(config.paymentGateway || "").toLowerCase();

    if (selectedGateway === "asaas") {
      if (!String(config.asaasApiKey || "").trim()) {
        toast.error("Informe a API Key do Asaas.");
        return;
      }

      if (!String(config.asaasWebhookSecret || "").trim()) {
        toast.error("Informe o Token de Webhook do Asaas.");
        return;
      }
    }

    setSaving(true);

    try {
      await api.put("/global-config", config);
      setConfig(prev => ({
        ...prev
      }));
      toast.success("Configurações salvas com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/global-config");
      setConfig(prev => ({
        ...prev,
        ...data,
        trialExpiration:
          data.trialExpiration !== undefined && data.trialExpiration !== null
            ? String(data.trialExpiration)
            : prev.trialExpiration
      }));
      setWelcomeTestEmail(data?.smtpUser || "");
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleBrandingUpload = async (field, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field); // "loginLogo" ou "loginBackground"

    try {
      setUploading(prev => ({ ...prev, [field]: true }));
      const { data } = await api.post("/global-config/upload", formData);

      // backend retorna { field, url }
      const url = data?.url || data?.[field];

      if (url) {
        setConfig(prev => ({
          ...prev,
          [field]: url
        }));
      }

      toast.success("Imagem atualizada com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleBrandingRemove = async (field) => {
    try {
      setRemoving(prev => ({ ...prev, [field]: true }));
      await api.post("/global-config/upload/remove", { field });

      setConfig(prev => ({
        ...prev,
        [field]: ""
      }));

      toast.success("Imagem removida com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setRemoving(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSendWelcomeEmailTest = async () => {
    if (!welcomeTestEmail) {
      toast.error("Informe um e-mail para teste.");
      return;
    }

    setSendingWelcomeTest(true);
    try {
      await api.post("/global-config/test-welcome-email", {
        testEmail: welcomeTestEmail,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        smtpFrom: config.smtpFrom,
        welcomeEmailEnabled: config.welcomeEmailEnabled,
        welcomeEmailSubject: config.welcomeEmailSubject,
        welcomeEmailTemplate: config.welcomeEmailTemplate
      });
      toast.success("E-mail de teste enviado com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setSendingWelcomeTest(false);
    }
  };

  const renderSaveButton = () => (
    <div className={classes.actions}>
      <Button
        type="submit"
        color="primary"
        variant="contained"
        className={classes.button}
        startIcon={!saving && <Save />}
        disabled={saving}
      >
        {saving ? <CircularProgress size={20} /> : "Salvar"}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.loadingWrapper}>
          <CircularProgress />
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Paper elevation={0} className={classes.hero}>
        <Typography variant="h5" className={classes.title}>
          Configurações Globais da Plataforma
        </Typography>
        <Typography className={classes.subtitle}>
          Centralize pagamentos, e-mail transacional, período de trial e visual de login com padrão profissional.
        </Typography>
      </Paper>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        className={classes.tabs}
      >
        <Tab label="Meios de Pagamento" />
        <Tab label="E-mail (SMTP)" />
        <Tab label="Trial / Assinatura" />
        <Tab label="Login / Capa" />
        <Tab label="WuzAPI" />
      </Tabs>

      <form onSubmit={handleSubmit} className={classes.form}>
        {/* ABA 0: MEIOS DE PAGAMENTO */}
        {tab === 0 && (
          <Paper elevation={0} className={classes.sectionCard}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Pagamentos
            </Typography>
            <Typography className={classes.sectionDescription}>
              Selecione o gateway padrão da plataforma e configure as credenciais.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Gateway padrão"
                  name="paymentGateway"
                  value={config.paymentGateway || "mercadopago"}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                >
                  <MenuItem value="mercadopago">Mercado Pago</MenuItem>
                  <MenuItem value="asaas">Asaas</MenuItem>
                </TextField>
                <div className={classes.helperText}>
                  Define qual gateway será usado no botão de pagamento das faturas.
                </div>
              </Grid>
              {String(config.paymentGateway || "").toLowerCase() === "mercadopago" && (
                <Grid item xs={12}>
                  <TextField
                    label="Mercado Pago - Access Token"
                    name="mpAccessToken"
                    value={config.mpAccessToken}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.textField}
                    size="small"
                  />
                  <div className={classes.helperText}>
                    Use o Access Token do Mercado Pago da conta principal da
                    plataforma. As empresas clientes usarão sempre essa
                    configuração.
                  </div>
                </Grid>
              )}

              {String(config.paymentGateway || "").toLowerCase() === "asaas" && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      label="Asaas - API Key"
                      name="asaasApiKey"
                      value={config.asaasApiKey}
                      onChange={handleChange}
                      variant="outlined"
                      fullWidth
                      className={classes.textField}
                      size="small"
                    />
                    <div className={classes.helperText}>
                      API Key do Asaas usada para criar cobranças.
                    </div>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Asaas - Token de Webhook"
                      name="asaasWebhookSecret"
                      value={config.asaasWebhookSecret}
                      onChange={handleChange}
                      variant="outlined"
                      fullWidth
                      required
                      className={classes.textField}
                      size="small"
                    />
                    <div className={classes.helperText}>
                      URL do webhook Asaas: <strong>{`${process.env.REACT_APP_BACKEND_URL || ""}/subscription/webhook/asaas`}</strong>
                    </div>
                  </Grid>
                </>
              )}
            </Grid>
            {renderSaveButton()}
          </Paper>
        )}

        {/* ABA 1: SMTP */}
        {tab === 1 && (
          <Paper elevation={0} className={`${classes.sectionCard} ${classes.sectionCardScrollable}`}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              E-mail (SMTP)
            </Typography>
            <Typography className={classes.sectionDescription}>
              Configure o servidor SMTP e personalize o e-mail de boas-vindas.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} className={classes.smtpColumnCard}>
                  <TextField
                    label="Host"
                    name="smtpHost"
                    value={config.smtpHost}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.compactField}
                    size="small"
                  />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <TextField
                        label="Porta"
                        name="smtpPort"
                        value={config.smtpPort}
                        onChange={handleChange}
                        variant="outlined"
                        fullWidth
                        className={classes.compactField}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Secure"
                        name="smtpSecure"
                        value={config.smtpSecure}
                        onChange={handleChange}
                        variant="outlined"
                        fullWidth
                        className={classes.compactField}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    label="E-mail"
                    name="smtpUser"
                    value={config.smtpUser}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.compactField}
                    size="small"
                  />
                  <TextField
                    label="Senha de app"
                    name="smtpPass"
                    value={config.smtpPass}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.compactField}
                    size="small"
                    type="password"
                  />
                  <TextField
                    label="Remetente (FROM)"
                    name="smtpFrom"
                    value={config.smtpFrom}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.compactField}
                    size="small"
                  />
                  <div className={classes.helperText} style={{ marginBottom: 0 }}>
                    Use `true` em Secure para SSL/TLS e `false` para STARTTLS.
                  </div>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={0} className={classes.smtpColumnCard}>
                  <Paper elevation={0} className={classes.smtpRowCard}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={String(config.welcomeEmailEnabled) === "enabled"}
                          onChange={handleWelcomeEmailToggle}
                          color="primary"
                        />
                      }
                      label="Enviar e-mail de boas-vindas automaticamente"
                    />
                    <div className={classes.helperText} style={{ marginBottom: 0 }}>
                      Ative para disparar e-mail no cadastro de empresas e usuários.
                    </div>
                  </Paper>

                  <TextField
                    label="Assunto do e-mail de boas-vindas"
                    name="welcomeEmailSubject"
                    value={config.welcomeEmailSubject}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.compactField}
                    size="small"
                    disabled={String(config.welcomeEmailEnabled) !== "enabled"}
                  />

                  <TextField
                    label="Conteúdo HTML do e-mail"
                    name="welcomeEmailTemplate"
                    value={config.welcomeEmailTemplate}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                    className={classes.compactField}
                    multiline
                    minRows={5}
                    disabled={String(config.welcomeEmailEnabled) !== "enabled"}
                  />
                  <div className={classes.helperText}>
                    Variáveis: {"{name}, {companyName}, {email}, {password}, {dueDate}, {loginUrl}"}.
                  </div>

                  <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                    Pré-visualização
                  </Typography>
                  <Box
                    className={classes.templatePreview}
                    dangerouslySetInnerHTML={{
                      __html: config.welcomeEmailTemplate || "<p>Template vazio</p>"
                    }}
                  />

                  <Grid container spacing={1} style={{ marginTop: 8 }}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        label="E-mail para teste"
                        value={welcomeTestEmail}
                        onChange={(e) => setWelcomeTestEmail(e.target.value)}
                        variant="outlined"
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        style={{ height: 40 }}
                        onClick={handleSendWelcomeEmailTest}
                        disabled={sendingWelcomeTest}
                      >
                        {sendingWelcomeTest ? "Enviando..." : "Enviar teste"}
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
            {renderSaveButton()}
          </Paper>
        )}

        {/* ABA 2: TRIAL */}
        {tab === 2 && (
          <Paper elevation={0} className={classes.sectionCard}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Trial / Período de Teste
            </Typography>
            <Typography className={classes.sectionDescription}>
              Controle o tempo padrão de avaliação para novos clientes.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Dias de teste"
                  name="trialExpiration"
                  value={config.trialExpiration}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  type="number"
                  inputProps={{ min: 1 }}
                />
                <div className={classes.helperText}>
                  Quantidade de dias de teste que a empresa nova terá. Se
                  vazio, o sistema usa o valor padrão do .env (APP_TRIALEXPIRATION,
                  ex.: 3).
                </div>
              </Grid>
            </Grid>
            {renderSaveButton()}
          </Paper>
        )}

        {/* ABA 3: LOGIN / CAPA */}
        {tab === 3 && (
          <Paper elevation={0} className={classes.sectionCard}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Login / capa
            </Typography>
            <Typography className={classes.sectionDescription}>
              Personalize logo, capa de login e link de suporte.
            </Typography>

            <Grid container spacing={3}>
              {/* LOGO DO LOGIN (apenas upload + preview) */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Logo do login</Typography>

                {config.loginLogo && (
                  <Box mt={1} mb={1}>
                    <img
                      src={resolveImageUrl(config.loginLogo)}
                      alt="Logo do login"
                      className={classes.brandingPreviewImg}
                    />
                  </Box>
                )}

                <input
                  id="loginLogoUpload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleBrandingUpload("loginLogo", e.target.files[0])
                  }
                />
                <div className={classes.uploadActions}>
                  <label htmlFor="loginLogoUpload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUpload />}
                      className={classes.uploadButton}
                      disabled={uploading.loginLogo}
                    >
                      {uploading.loginLogo ? "Enviando..." : "Enviar logo"}
                    </Button>
                  </label>

                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<DeleteOutline />}
                    className={classes.uploadButton}
                    disabled={!config.loginLogo || removing.loginLogo}
                    onClick={() => handleBrandingRemove("loginLogo")}
                  >
                    {removing.loginLogo ? "Removendo..." : "Remover"}
                  </Button>
                </div>

                <div className={classes.helperText}>
                  Se nenhuma imagem for enviada, o sistema usa <code>/logo.png</code>.
                </div>
              </Grid>

              {/* CAPA / BACKGROUND DO LOGIN (apenas upload + preview) */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">
                  Imagem de fundo (capa do login)
                </Typography>

                {config.loginBackground && (
                  <Box mt={1} mb={1}>
                    <img
                      src={resolveImageUrl(config.loginBackground)}
                      alt="Capa do login"
                      className={classes.brandingPreviewImg}
                    />
                  </Box>
                )}

                <input
                  id="loginBackgroundUpload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleBrandingUpload("loginBackground", e.target.files[0])
                  }
                />
                <div className={classes.uploadActions}>
                  <label htmlFor="loginBackgroundUpload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUpload />}
                      className={classes.uploadButton}
                      disabled={uploading.loginBackground}
                    >
                      {uploading.loginBackground ? "Enviando..." : "Enviar capa"}
                    </Button>
                  </label>

                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<DeleteOutline />}
                    className={classes.uploadButton}
                    disabled={!config.loginBackground || removing.loginBackground}
                    onClick={() => handleBrandingRemove("loginBackground")}
                  >
                    {removing.loginBackground ? "Removendo..." : "Remover"}
                  </Button>
                </div>

                <div className={classes.helperText}>
                  Recomendada imagem em <code>.webp</code> ou <code>.jpg</code>. 
                  Se vazio, o sistema usa a capa padrão.
                </div>
              </Grid>

              {/* LINK DO WHATSAPP DO LOGIN (mantém campo de texto) */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Link do WhatsApp do login"
                  name="loginWhatsapp"
                  value={config.loginWhatsapp}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                />
                <div className={classes.helperText}>
                  Exemplo: <code>https://wa.me/5541999999999</code>. Usado no botão
                  de WhatsApp da tela de login e no botão "Chamar suporte".
                </div>
              </Grid>
            </Grid>
            {renderSaveButton()}
          </Paper>
        )}

        {/* ABA 4: WUZAPI */}
        {tab === 4 && (
          <Paper elevation={0} className={classes.sectionCard}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              WuzAPI
            </Typography>
            <Typography className={classes.sectionDescription}>
              Configure os dados finais retornados pela instalação do WuzAPI na VPS.
              Essas informações ficam centralizadas no Super Admin para uso global.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="URL WuzAPI"
                  name="wuzapiBaseUrl"
                  value={config.wuzapiBaseUrl}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  placeholder="http://127.0.0.1:8080"
                />
                <div className={classes.helperText}>
                  URL base do serviço WuzAPI desse servidor.
                </div>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Admin Token"
                  name="wuzapiAdminToken"
                  value={config.wuzapiAdminToken}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  type="password"
                />
                <div className={classes.helperText}>
                  Token administrativo para criar usuários/sessões no WuzAPI.
                </div>
              </Grid>

            </Grid>
            {renderSaveButton()}
          </Paper>
        )}
      </form>
    </div>
  );
};

export default GlobalConfig;
