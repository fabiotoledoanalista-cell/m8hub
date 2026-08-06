import React, { useEffect, useState, useContext } from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormHelperText from "@material-ui/core/FormHelperText";

import useSettings from "../../hooks/useSettings";

import { makeStyles } from "@material-ui/core/styles";
import { grey, blue } from "@material-ui/core/colors";

import { Box, Button, ButtonGroup, Paper, Tab, Tabs, TextField } from "@material-ui/core";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import useCompanySettings from "../../hooks/useSettings/companySettings";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: "#ffffff",
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "18px",
    color: blue[700],
  },
  cardSubtitle: {
    color: grey[600],
    fontSize: "14px",
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  tab: {
    backgroundColor: theme.mode === "light" ? "#f2f2f2" : "#7f7f7f",
    borderRadius: 4,
    width: "100%",
    "& .MuiTabs-flexContainer": {
      justifyContent: "center",
    },
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
  },
  optionRow: {
    padding: theme.spacing(1.75, 2),
    borderRadius: 10,
    border: `1px solid ${theme.mode === "light" ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.35)"}`,
    background:
      theme.mode === "light"
        ? "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
        : "linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)",
  },
  optionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
  },
  optionTitle: {
    fontWeight: 700,
    fontSize: "0.92rem",
  },
  optionDescription: {
    marginTop: theme.spacing(0.4),
    color: theme.mode === "light" ? "#64748b" : "#94a3b8",
    fontSize: "0.78rem",
  },
  toggleGroup: {
    minWidth: 225,
  },
  toggleButton: {
    textTransform: "none",
    fontWeight: 700,
  },
  selectField: {
    minWidth: 240,
  },
  updatingText: {
    marginTop: theme.spacing(0.7),
    color: theme.mode === "light" ? "#64748b" : "#94a3b8",
    fontSize: "0.72rem",
    fontWeight: 600,
  },
}));

export default function Options(props) {
  const { oldSettings, settings, scheduleTypeChanged, user } = props;

  const classes = useStyles();
  const [userRating, setUserRating] = useState("disabled");
  const [scheduleType, setScheduleType] = useState("disabled");
  const [chatBotType, setChatBotType] = useState("text");

  const [loadingUserRating, setLoadingUserRating] = useState(false);
  const [loadingScheduleType, setLoadingScheduleType] = useState(false);

  const [userCreation, setUserCreation] = useState("disabled");
  const [loadingUserCreation, setLoadingUserCreation] = useState(false);

  const [SendGreetingAccepted, setSendGreetingAccepted] = useState("enabled");
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] =
    useState(false);

  const [UserRandom, setUserRandom] = useState("enabled");
  const [loadingUserRandom, setLoadingUserRandom] = useState(false);

  const [SettingsTransfTicket, setSettingsTransfTicket] = useState("enabled");
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] =
    useState(false);

  const [AcceptCallWhatsapp, setAcceptCallWhatsapp] = useState("enabled");
  const [loadingAcceptCallWhatsapp, setLoadingAcceptCallWhatsapp] =
    useState(false);

  const [sendSignMessage, setSendSignMessage] = useState("enabled");
  const [loadingSendSignMessage, setLoadingSendSignMessage] = useState(false);

  const [sendQueuePosition, setSendQueuePosition] = useState("enabled");
  const [loadingSendQueuePosition, setLoadingSendQueuePosition] =
    useState(false);

  const [sendFarewellWaitingTicket, setSendFarewellWaitingTicket] =
    useState("enabled");
  const [
    loadingSendFarewellWaitingTicket,
    setLoadingSendFarewellWaitingTicket,
  ] = useState(false);

  const [acceptAudioMessageContact, setAcceptAudioMessageContact] =
    useState("enabled");
  const [
    loadingAcceptAudioMessageContact,
    setLoadingAcceptAudioMessageContact,
  ] = useState(false);

  // LGPD
  const [enableLGPD, setEnableLGPD] = useState("disabled");
  const [loadingEnableLGPD, setLoadingEnableLGPD] = useState(false);

  const [lgpdMessage, setLGPDMessage] = useState("");
  const [loadinglgpdMessage, setLoadingLGPDMessage] = useState(false);

  const [lgpdLink, setLGPDLink] = useState("");
  const [loadingLGPDLink, setLoadingLGPDLink] = useState(false);

  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState("disabled");
  const [loadingLGPDDeleteMessage, setLoadingLGPDDeleteMessage] =
    useState(false);

  const [lgpdConsent, setLGPDConsent] = useState("disabled");
  const [loadingLGPDConsent, setLoadingLGPDConsent] = useState(false);

  const [lgpdHideNumber, setLGPDHideNumber] = useState("disabled");
  const [loadingLGPDHideNumber, setLoadingLGPDHideNumber] = useState(false);

  // Tag obrigatória
  const [requiredTag, setRequiredTag] = useState("enabled");
  const [loadingRequiredTag, setLoadingRequiredTag] = useState(false);

  // Fechar ticket ao transferir para outro setor
  const [closeTicketOnTransfer, setCloseTicketOnTransfer] = useState(false);
  const [loadingCloseTicketOnTransfer, setLoadingCloseTicketOnTransfer] =
    useState(false);

  // Usar carteira de clientes
  const [directTicketsToWallets, setDirectTicketsToWallets] = useState(false);
  const [
    loadingDirectTicketsToWallets,
    setLoadingDirectTicketsToWallets,
  ] = useState(false);

  // MENSAGENS CUSTOMIZADAS
  const [transferMessage, setTransferMessage] = useState(
    "Seu Atendimento foi Transferido para o setor ${queue.name},Aguarde atendimento por favor..."
  );
  const [loadingTransferMessage, setLoadingTransferMessage] = useState(false);

  const [greetingAcceptedMessage, setGreetingAcceptedMessage] = useState("");
  const [loadingGreetingAcceptedMessage, setLoadingGreetingAcceptedMessage] =
    useState(false);

  const [AcceptCallWhatsappMessage, setAcceptCallWhatsappMessage] =
    useState("");
  const [
    loadingAcceptCallWhatsappMessage,
    setLoadingAcceptCallWhatsappMessage,
  ] = useState(false);

  const [sendQueuePositionMessage, setSendQueuePositionMessage] = useState("");
  const [
    loadingSendQueuePositionMessage,
    setLoadingSendQueuePositionMessage,
  ] = useState(false);

  const [showNotificationPending, setShowNotificationPending] = useState(false);
  const [
    loadingShowNotificationPending,
    setLoadingShowNotificationPending,
  ] = useState(false);

  // 🔑 Chave da API de transcrição (OpenAI / Gemini)
  const [apiTranscription, setApiTranscription] = useState("");
  const [loadingApiTranscription, setLoadingApiTranscription] = useState(false);

  const { update: updateUserCreation, getAll } = useSettings();
  const { update } = useCompanySettings();
  const updatingLabel = i18n.t("settings.settings.options.updating");
  const notifyUpdated = () => toast.success(i18n.t("settings.success"));

  const isSuper = () => {
    return user.super;
  };

  useEffect(() => {
    if (Array.isArray(oldSettings) && oldSettings.length) {
      const userPar = oldSettings.find((s) => s.key === "userCreation");

      if (userPar) {
        setUserCreation(userPar.value);
      }

      // Carregar chave apiTranscription da tabela Setting
      const transcriptionSetting = oldSettings.find(
        (s) => s.key === "apiTranscription"
      );
      if (transcriptionSetting) {
        setApiTranscription(transcriptionSetting.value);
      }
    }
  }, [oldSettings]);

  useEffect(() => {
    for (const [key, value] of Object.entries(settings)) {
      if (key === "userRating") setUserRating(value);
      if (key === "scheduleType") setScheduleType(value);
      if (key === "chatBotType") setChatBotType(value);
      if (key === "acceptCallWhatsapp") setAcceptCallWhatsapp(value);
      if (key === "userRandom") setUserRandom(value);
      if (key === "sendSignMessage") setSendSignMessage(value);
      if (key === "sendFarewellWaitingTicket")
        setSendFarewellWaitingTicket(value);
      if (key === "sendGreetingAccepted") setSendGreetingAccepted(value);
      if (key === "sendQueuePosition") setSendQueuePosition(value);
      if (key === "acceptAudioMessageContact")
        setAcceptAudioMessageContact(value);
      if (key === "enableLGPD") setEnableLGPD(value);
      if (key === "requiredTag") setRequiredTag(value);
      if (key === "lgpdDeleteMessage") setLGPDDeleteMessage(value);
      if (key === "lgpdHideNumber") setLGPDHideNumber(value);
      if (key === "lgpdConsent") setLGPDConsent(value);
      if (key === "lgpdMessage") setLGPDMessage(value);
      if (key === "sendMsgTransfTicket") setSettingsTransfTicket(value);
      if (key === "lgpdLink") setLGPDLink(value);
      if (key === "DirectTicketsToWallets") setDirectTicketsToWallets(value);
      if (key === "closeTicketOnTransfer") setCloseTicketOnTransfer(value);
      if (key === "transferMessage") setTransferMessage(value);
      if (key === "greetingAcceptedMessage")
        setGreetingAcceptedMessage(value);
      if (key === "AcceptCallWhatsappMessage")
        setAcceptCallWhatsappMessage(value);
      if (key === "sendQueuePositionMessage")
        setSendQueuePositionMessage(value);
      if (key === "showNotificationPending") setShowNotificationPending(value);
    }
  }, [settings]);

  async function handleChangeUserCreation(value) {
    setUserCreation(value);
    setLoadingUserCreation(true);
    await updateUserCreation({
      key: "userCreation",
      value,
    });
    notifyUpdated();
    setLoadingUserCreation(false);
  }

  // 🔑 Salvar chave da API de transcrição (Setting: apiTranscription)
  async function handleApiTranscription(value) {
    setApiTranscription(value);
    setLoadingApiTranscription(true);
    await updateUserCreation({
      key: "apiTranscription",
      value,
    });
    setLoadingApiTranscription(false);
  }

  async function handleChangeUserRating(value) {
    setUserRating(value);
    setLoadingUserRating(true);
    await update({
      column: "userRating",
      data: value,
    });
    notifyUpdated();
    setLoadingUserRating(false);
  }

  async function handleScheduleType(value) {
    setScheduleType(value);
    setLoadingScheduleType(true);
    await update({
      column: "scheduleType",
      data: value,
    });
    notifyUpdated();
    setLoadingScheduleType(false);
    if (typeof scheduleTypeChanged === "function") {
      scheduleTypeChanged(value);
    }
  }

  async function handleChatBotType(value) {
    setChatBotType(value);
    await update({
      column: "chatBotType",
      data: value,
    });
    notifyUpdated();
    if (typeof scheduleTypeChanged === "function") {
      setChatBotType(value);
    }
  }

  async function handleLGPDMessage(value) {
    setLGPDMessage(value);
    setLoadingLGPDMessage(true);
    await update({
      column: "lgpdMessage",
      data: value,
    });
    setLoadingLGPDMessage(false);
  }

  async function handletransferMessage(value) {
    setTransferMessage(value);
    setLoadingTransferMessage(true);
    await update({
      column: "transferMessage",
      data: value,
    });
    setLoadingTransferMessage(false);
  }

  async function handleGreetingAcceptedMessage(value) {
    setGreetingAcceptedMessage(value);
    setLoadingGreetingAcceptedMessage(true);
    await update({
      column: "greetingAcceptedMessage",
      data: value,
    });
    setLoadingGreetingAcceptedMessage(false);
  }

  async function handleAcceptCallWhatsappMessage(value) {
    setAcceptCallWhatsappMessage(value);
    setLoadingAcceptCallWhatsappMessage(true);
    await update({
      column: "AcceptCallWhatsappMessage",
      data: value,
    });
    setLoadingAcceptCallWhatsappMessage(false);
  }

  async function handlesendQueuePositionMessage(value) {
    setSendQueuePositionMessage(value);
    setLoadingSendQueuePositionMessage(true);
    await update({
      column: "sendQueuePositionMessage",
      data: value,
    });
    setLoadingSendQueuePositionMessage(false);
  }

  async function handleShowNotificationPending(value) {
    setShowNotificationPending(value);
    setLoadingShowNotificationPending(true);
    await update({
      column: "showNotificationPending",
      data: value,
    });
    notifyUpdated();
    setLoadingShowNotificationPending(false);
  }

  async function handleLGPDLink(value) {
    setLGPDLink(value);
    setLoadingLGPDLink(true);
    await update({
      column: "lgpdLink",
      data: value,
    });
    setLoadingLGPDLink(false);
  }

  async function handleLGPDDeleteMessage(value) {
    setLGPDDeleteMessage(value);
    setLoadingLGPDDeleteMessage(true);
    await update({
      column: "lgpdDeleteMessage",
      data: value,
    });
    notifyUpdated();
    setLoadingLGPDDeleteMessage(false);
  }

  async function handleLGPDConsent(value) {
    setLGPDConsent(value);
    setLoadingLGPDConsent(true);
    await update({
      column: "lgpdConsent",
      data: value,
    });
    notifyUpdated();
    setLoadingLGPDConsent(false);
  }

  async function handleLGPDHideNumber(value) {
    setLGPDHideNumber(value);
    setLoadingLGPDHideNumber(true);
    await update({
      column: "lgpdHideNumber",
      data: value,
    });
    notifyUpdated();
    setLoadingLGPDHideNumber(false);
  }

  async function handleSendGreetingAccepted(value) {
    setSendGreetingAccepted(value);
    setLoadingSendGreetingAccepted(true);
    await update({
      column: "sendGreetingAccepted",
      data: value,
    });
    notifyUpdated();
    setLoadingSendGreetingAccepted(false);
  }

  async function handleUserRandom(value) {
    setUserRandom(value);
    setLoadingUserRandom(true);
    await update({
      column: "userRandom",
      data: value,
    });
    notifyUpdated();
    setLoadingUserRandom(false);
  }

  async function handleSettingsTransfTicket(value) {
    setSettingsTransfTicket(value);
    setLoadingSettingsTransfTicket(true);
    await update({
      column: "sendMsgTransfTicket",
      data: value,
    });
    notifyUpdated();
    setLoadingSettingsTransfTicket(false);
  }

  async function handleAcceptCallWhatsapp(value) {
    setAcceptCallWhatsapp(value);
    setLoadingAcceptCallWhatsapp(true);
    await update({
      column: "acceptCallWhatsapp",
      data: value,
    });
    notifyUpdated();
    setLoadingAcceptCallWhatsapp(false);
  }

  async function handleSendSignMessage(value) {
    setSendSignMessage(value);
    setLoadingSendSignMessage(true);
    await update({
      column: "sendSignMessage",
      data: value,
    });
    notifyUpdated();
    localStorage.setItem("sendSignMessage", value === "enabled" ? true : false); //atualiza localstorage para sessão
    setLoadingSendSignMessage(false);
  }

  async function handleSendQueuePosition(value) {
    setSendQueuePosition(value);
    setLoadingSendQueuePosition(true);
    await update({
      column: "sendQueuePosition",
      data: value,
    });
    notifyUpdated();
    setLoadingSendQueuePosition(false);
  }

  async function handleSendFarewellWaitingTicket(value) {
    setSendFarewellWaitingTicket(value);
    setLoadingSendFarewellWaitingTicket(true);
    await update({
      column: "sendFarewellWaitingTicket",
      data: value,
    });
    notifyUpdated();
    setLoadingSendFarewellWaitingTicket(false);
  }

  async function handleAcceptAudioMessageContact(value) {
    setAcceptAudioMessageContact(value);
    setLoadingAcceptAudioMessageContact(true);
    await update({
      column: "acceptAudioMessageContact",
      data: value,
    });
    notifyUpdated();
    setLoadingAcceptAudioMessageContact(false);
  }

  async function handleEnableLGPD(value) {
    setEnableLGPD(value);
    setLoadingEnableLGPD(true);
    await update({
      column: "enableLGPD",
      data: value,
    });
    notifyUpdated();
    setLoadingEnableLGPD(false);
  }

  async function handleRequiredTag(value) {
    setRequiredTag(value);
    setLoadingRequiredTag(true);
    await update({
      column: "requiredTag",
      data: value,
    });
    notifyUpdated();
    setLoadingRequiredTag(false);
  }

  async function handleCloseTicketOnTransfer(value) {
    setCloseTicketOnTransfer(value);
    setLoadingCloseTicketOnTransfer(true);
    await update({
      column: "closeTicketOnTransfer",
      data: value,
    });
    notifyUpdated();
    setLoadingCloseTicketOnTransfer(false);
  }

  async function handleDirectTicketsToWallets(value) {
    setDirectTicketsToWallets(value);
    setLoadingDirectTicketsToWallets(true);
    await update({
      column: "DirectTicketsToWallets",
      data: value,
    });
    notifyUpdated();
    setLoadingDirectTicketsToWallets(false);
  }

  const enabledValue = (value) => (value === true || value === "enabled" ? "enabled" : "disabled");
  const booleanFromEnabledValue = (value) => value === "enabled";

  const optionDescriptions = {
    userCreation: "Habilita ou desabilita o cadastro de novas empresas no sistema.",
    userRating: "Ativa o fluxo de avaliação após o encerramento do atendimento.",
    scheduleType: "Define a regra de horário de expediente aplicada ao atendimento.",
    sendGreetingAccepted: "Envia uma mensagem automática ao assumir um ticket.",
    userRandom: "Distribui atendimento de forma automática e aleatória entre atendentes.",
    sendMsgTransfTicket: "Envia mensagem automática quando o ticket for transferido.",
    chatBotType: "Define como o menu inicial do bot será exibido para o cliente.",
    acceptCallWhatsapp: "Envia uma mensagem automática ao contato informando que ligações no WhatsApp não são aceitas.",
    sendSignMessage: "Permite que o atendente remova/ative assinatura ao enviar mensagens.",
    sendQueuePosition: "Envia ao cliente a posição atual na fila de atendimento.",
    sendFarewellWaitingTicket: "Envia mensagem de encerramento para tickets em aguardando.",
    acceptAudioMessageContact: "Permite aceitar ou bloquear mensagens de áudio dos contatos.",
    enableLGPD: "Ativa regras de privacidade e consentimento conforme a LGPD.",
    requiredTag: "Exige classificação por tag antes de concluir o atendimento.",
    closeTicketOnTransfer: "Fecha automaticamente o ticket ao transferir para outro setor.",
    showNotificationPending: "Mostra alertas para tickets com status aguardando.",
  };

  const renderEnabledDisabledRow = ({
    keyId,
    label,
    value,
    loading,
    onChange,
    isBoolean = false,
  }) => (
    <Paper className={classes.optionRow} elevation={0}>
      <div className={classes.optionHeader}>
        <Box>
          <div className={classes.optionTitle}>{label}</div>
          <div className={classes.optionDescription}>
            {optionDescriptions[keyId] || "Configuração operacional do atendimento."}
          </div>
        </Box>

        <ButtonGroup
          variant="outlined"
          color="primary"
          size="small"
          className={classes.toggleGroup}
          aria-label={`${keyId}-toggle`}
        >
          <Button
            className={classes.toggleButton}
            variant={enabledValue(value) === "disabled" ? "contained" : "outlined"}
            onClick={() => onChange(isBoolean ? false : "disabled")}
            disabled={loading}
          >
            {i18n.t("settings.settings.options.disabled")}
          </Button>
          <Button
            className={classes.toggleButton}
            variant={enabledValue(value) === "enabled" ? "contained" : "outlined"}
            onClick={() => onChange(isBoolean ? true : "enabled")}
            disabled={loading}
          >
            {i18n.t("settings.settings.options.enabled")}
          </Button>
        </ButtonGroup>
      </div>
      {loading && <div className={classes.updatingText}>{updatingLabel}</div>}
    </Paper>
  );

  return (
    <>
      <div className={classes.optionsList}>
        {isSuper() &&
          renderEnabledDisabledRow({
            keyId: "userCreation",
            label: "Cadastro de Empresas",
            value: userCreation,
            loading: loadingUserCreation,
            onChange: handleChangeUserCreation,
          })}

        {renderEnabledDisabledRow({
          keyId: "userRating",
          label: i18n.t("settings.settings.options.evaluations"),
          value: userRating,
          loading: loadingUserRating,
          onChange: handleChangeUserRating,
        })}

        <Paper className={classes.optionRow} elevation={0}>
          <div className={classes.optionHeader}>
            <Box>
              <div className={classes.optionTitle}>
                {i18n.t("settings.settings.options.officeScheduling")}
              </div>
              <div className={classes.optionDescription}>
                {optionDescriptions.scheduleType}
              </div>
            </Box>
            <FormControl variant="outlined" size="small" className={classes.selectField}>
              <Select
                value={scheduleType}
                onChange={async (e) => {
                  handleScheduleType(e.target.value);
                }}
              >
                <MenuItem value={"disabled"}>
                  {i18n.t("settings.settings.options.disabled")}
                </MenuItem>
                <MenuItem value={"queue"}>
                  {i18n.t("settings.settings.options.queueManagement")}
                </MenuItem>
                <MenuItem value={"company"}>
                  {i18n.t("settings.settings.options.companyManagement")}
                </MenuItem>
                <MenuItem value={"connection"}>
                  {i18n.t("settings.settings.options.connectionManagement")}
                </MenuItem>
              </Select>
            </FormControl>
          </div>
          {loadingScheduleType && <div className={classes.updatingText}>{updatingLabel}</div>}
        </Paper>

        {renderEnabledDisabledRow({
          keyId: "sendGreetingAccepted",
          label: i18n.t("settings.settings.options.sendGreetingAccepted"),
          value: SendGreetingAccepted,
          loading: loadingSendGreetingAccepted,
          onChange: handleSendGreetingAccepted,
        })}

        {renderEnabledDisabledRow({
          keyId: "userRandom",
          label: i18n.t("settings.settings.options.userRandom"),
          value: UserRandom,
          loading: loadingUserRandom,
          onChange: handleUserRandom,
        })}

        {renderEnabledDisabledRow({
          keyId: "sendMsgTransfTicket",
          label: i18n.t("settings.settings.options.sendMsgTransfTicket"),
          value: SettingsTransfTicket,
          loading: loadingSettingsTransfTicket,
          onChange: handleSettingsTransfTicket,
        })}

        <Paper className={classes.optionRow} elevation={0}>
          <div className={classes.optionHeader}>
            <Box>
              <div className={classes.optionTitle}>
                {i18n.t("settings.settings.options.chatBotType")}
              </div>
              <div className={classes.optionDescription}>
                {optionDescriptions.chatBotType}
              </div>
            </Box>
            <FormControl variant="outlined" size="small" className={classes.selectField}>
              <Select
                value={chatBotType}
                onChange={async (e) => {
                  handleChatBotType(e.target.value);
                }}
              >
                <MenuItem value={"text"}>Texto</MenuItem>
              </Select>
            </FormControl>
          </div>
        </Paper>

        {renderEnabledDisabledRow({
          keyId: "acceptCallWhatsapp",
          label: i18n.t("settings.settings.options.acceptCallWhatsapp"),
          value: AcceptCallWhatsapp,
          loading: loadingAcceptCallWhatsapp,
          onChange: handleAcceptCallWhatsapp,
        })}

        {renderEnabledDisabledRow({
          keyId: "sendSignMessage",
          label: i18n.t("settings.settings.options.sendSignMessage"),
          value: sendSignMessage,
          loading: loadingSendSignMessage,
          onChange: handleSendSignMessage,
        })}

        {renderEnabledDisabledRow({
          keyId: "sendQueuePosition",
          label: i18n.t("settings.settings.options.sendQueuePosition"),
          value: sendQueuePosition,
          loading: loadingSendQueuePosition,
          onChange: handleSendQueuePosition,
        })}

        {renderEnabledDisabledRow({
          keyId: "sendFarewellWaitingTicket",
          label: i18n.t("settings.settings.options.sendFarewellWaitingTicket"),
          value: sendFarewellWaitingTicket,
          loading: loadingSendFarewellWaitingTicket,
          onChange: handleSendFarewellWaitingTicket,
        })}

        {renderEnabledDisabledRow({
          keyId: "acceptAudioMessageContact",
          label: i18n.t("settings.settings.options.acceptAudioMessageContact"),
          value: acceptAudioMessageContact,
          loading: loadingAcceptAudioMessageContact,
          onChange: handleAcceptAudioMessageContact,
        })}

        {renderEnabledDisabledRow({
          keyId: "enableLGPD",
          label: i18n.t("settings.settings.options.enableLGPD"),
          value: enableLGPD,
          loading: loadingEnableLGPD,
          onChange: handleEnableLGPD,
        })}

        {renderEnabledDisabledRow({
          keyId: "requiredTag",
          label: i18n.t("settings.settings.options.requiredTag"),
          value: requiredTag,
          loading: loadingRequiredTag,
          onChange: handleRequiredTag,
        })}

        {renderEnabledDisabledRow({
          keyId: "closeTicketOnTransfer",
          label: i18n.t("settings.settings.options.closeTicketOnTransfer"),
          value: enabledValue(closeTicketOnTransfer),
          loading: loadingCloseTicketOnTransfer,
          onChange: (value) => handleCloseTicketOnTransfer(booleanFromEnabledValue(value)),
        })}

        {renderEnabledDisabledRow({
          keyId: "showNotificationPending",
          label: i18n.t("settings.settings.options.showNotificationPending"),
          value: enabledValue(showNotificationPending),
          loading: loadingShowNotificationPending,
          onChange: (value) => handleShowNotificationPending(booleanFromEnabledValue(value)),
        })}
      </div>
      <br></br>
      {/*-----------------LGPD-----------------*/}
      {enableLGPD === "enabled" && (
        <>
          <Grid spacing={3} container style={{ marginBottom: 10 }}>
            <Tabs
              value={0}
              indicatorColor="primary"
              textColor="primary"
              scrollButtons="on"
              variant="scrollable"
              className={classes.tab}
            >
              <Tab label={i18n.t("settings.settings.LGPD.title")} />
            </Tabs>
          </Grid>
          <Grid spacing={1} container>
            <Grid xs={12} sm={6} md={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="lgpdMessage"
                  name="lgpdMessage"
                  margin="dense"
                  multiline
                  minRows={3}
                  label={i18n.t("settings.settings.LGPD.welcome")}
                  variant="outlined"
                  value={lgpdMessage}
                  onChange={(e) => setLGPDMessage(e.target.value)}
                  onBlur={async (e) => {
                    await handleLGPDMessage(e.target.value);
                    notifyUpdated();
                  }}
                ></TextField>
                <FormHelperText>
                  {loadinglgpdMessage &&
                    i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} md={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="lgpdLink"
                  name="lgpdLink"
                  margin="dense"
                  label={i18n.t("settings.settings.LGPD.linkLGPD")}
                  variant="outlined"
                  value={lgpdLink}
                  onChange={(e) => setLGPDLink(e.target.value)}
                  onBlur={async (e) => {
                    await handleLGPDLink(e.target.value);
                    notifyUpdated();
                  }}
                ></TextField>
                <FormHelperText>
                  {loadingLGPDLink &&
                    i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD Manter ou nao mensagem deletada pelo contato */}
            <Grid xs={12} sm={6} md={4} item>
              <FormControl className={classes.selectContainer}>
                <InputLabel id="lgpdDeleteMessage-label">
                  {i18n.t(
                    "settings.settings.LGPD.obfuscateMessageDelete"
                  )}
                </InputLabel>
                <Select
                  labelId="lgpdDeleteMessage-label"
                  value={lgpdDeleteMessage}
                  onChange={async (e) => {
                    handleLGPDDeleteMessage(e.target.value);
                  }}
                >
                  <MenuItem value={"disabled"}>
                    {i18n.t("settings.settings.LGPD.disabled")}
                  </MenuItem>
                  <MenuItem value={"enabled"}>
                    {i18n.t("settings.settings.LGPD.enabled")}
                  </MenuItem>
                </Select>
                <FormHelperText>
                  {loadingLGPDDeleteMessage &&
                    i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD Sempre solicitar confirmaçao / conscentimento dos dados */}
            <Grid xs={12} sm={6} md={4} item>
              <FormControl className={classes.selectContainer}>
                <InputLabel id="lgpdConsent-label">
                  {i18n.t("settings.settings.LGPD.alwaysConsent")}
                </InputLabel>
                <Select
                  labelId="lgpdConsent-label"
                  value={lgpdConsent}
                  onChange={async (e) => {
                    handleLGPDConsent(e.target.value);
                  }}
                >
                  <MenuItem value={"disabled"}>
                    {i18n.t("settings.settings.LGPD.disabled")}
                  </MenuItem>
                  <MenuItem value={"enabled"}>
                    {i18n.t("settings.settings.LGPD.enabled")}
                  </MenuItem>
                </Select>
                <FormHelperText>
                  {loadingLGPDConsent &&
                    i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD Ofuscar número telefone para usuários */}
            <Grid xs={12} sm={6} md={4} item>
              <FormControl className={classes.selectContainer}>
                <InputLabel id="lgpdHideNumber-label">
                  {i18n.t("settings.settings.LGPD.obfuscatePhoneUser")}
                </InputLabel>
                <Select
                  labelId="lgpdHideNumber-label"
                  value={lgpdHideNumber}
                  onChange={async (e) => {
                    handleLGPDHideNumber(e.target.value);
                  }}
                >
                  <MenuItem value={"disabled"}>
                    {i18n.t("settings.settings.LGPD.disabled")}
                  </MenuItem>
                  <MenuItem value={"enabled"}>
                    {i18n.t("settings.settings.LGPD.enabled")}
                  </MenuItem>
                </Select>
                <FormHelperText>
                  {loadingLGPDHideNumber &&
                    i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </>
      )}
      <Grid spacing={1} container>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="transferMessage"
              name="transferMessage"
              margin="dense"
              multiline
              minRows={3}
              label={i18n.t(
                "settings.settings.customMessages.transferMessage"
              )}
              variant="outlined"
              value={transferMessage}
              required={SettingsTransfTicket === "enabled"}
              onChange={(e) => setTransferMessage(e.target.value)}
              onBlur={async (e) => {
                await handletransferMessage(e.target.value);
                notifyUpdated();
              }}
            ></TextField>
            <FormHelperText>
              {loadingTransferMessage &&
                i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="greetingAcceptedMessage"
              name="greetingAcceptedMessage"
              margin="dense"
              multiline
              minRows={3}
              label={i18n.t(
                "settings.settings.customMessages.greetingAcceptedMessage"
              )}
              variant="outlined"
              value={greetingAcceptedMessage}
              required={SendGreetingAccepted === "enabled"}
              onChange={(e) => setGreetingAcceptedMessage(e.target.value)}
              onBlur={async (e) => {
                await handleGreetingAcceptedMessage(e.target.value);
                notifyUpdated();
              }}
            ></TextField>
            <FormHelperText>
              {loadingGreetingAcceptedMessage &&
                i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="AcceptCallWhatsappMessage"
              name="AcceptCallWhatsappMessage"
              margin="dense"
              multiline
              minRows={3}
              label={i18n.t(
                "settings.settings.customMessages.AcceptCallWhatsappMessage"
              )}
              variant="outlined"
              required={AcceptCallWhatsapp === "disabled"}
              value={AcceptCallWhatsappMessage}
              onChange={(e) => setAcceptCallWhatsappMessage(e.target.value)}
              onBlur={async (e) => {
                await handleAcceptCallWhatsappMessage(e.target.value);
                notifyUpdated();
              }}
            ></TextField>
            <FormHelperText>
              {loadingAcceptCallWhatsappMessage &&
                i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="sendQueuePositionMessage"
              name="sendQueuePositionMessage"
              margin="dense"
              multiline
              required={sendQueuePosition === "enabled"}
              minRows={3}
              label={i18n.t(
                "settings.settings.customMessages.sendQueuePositionMessage"
              )}
              variant="outlined"
              value={sendQueuePositionMessage}
              onChange={(e) => setSendQueuePositionMessage(e.target.value)}
              onBlur={async (e) => {
                await handlesendQueuePositionMessage(e.target.value);
                notifyUpdated();
              }}
            ></TextField>
            <FormHelperText>
              {loadingSendQueuePositionMessage &&
                i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* 🔑 Campo movido para baixo, após as mensagens */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="apiTranscription"
              name="apiTranscription"
              margin="dense"
              label="Chave da API de Transcrição (OpenAI)"
              variant="outlined"
              type="password"
              value={apiTranscription}
              placeholder="coloque sua chave da openai..."
              onChange={(e) => setApiTranscription(e.target.value)}
              onBlur={async (e) => {
                await handleApiTranscription(e.target.value);
                notifyUpdated();
              }}
            />
            <FormHelperText>
              {loadingApiTranscription &&
                i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
}
