import React, { useState, useEffect, useContext, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import { useMediaQuery, useTheme } from '@material-ui/core';
import { isNil } from "lodash";
import {
  CircularProgress,
  ClickAwayListener,
  IconButton,
  InputBase,
  makeStyles,
  Paper,
  Hidden,
  Menu,
  MenuItem,
  Tooltip,
  Fab,
} from "@material-ui/core";
import {
  blue,
  green,
  pink,
  grey,
} from "@material-ui/core/colors";
import {
  AttachFile,
  CheckCircleOutline,
  Clear,
  Comment,
  Create,
  Description,
  HighlightOff,
  Mic,
  Mood,
  MoreVert,
  Send,
  PermMedia,
  Person,
  Room,
  Reply,
  Duo,
  Timer,
} from "@material-ui/icons";
import AddIcon from "@material-ui/icons/Add";
import BoltIcon from '@mui/icons-material/FlashOn';
import { CameraAlt } from "@material-ui/icons";
import MicRecorder from "mic-recorder-to-mp3";
import clsx from "clsx";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";

import useQuickMessages from "../../hooks/useQuickMessages";
import { isString, isEmpty } from "lodash";
import ContactSendModal from "../ContactSendModal";
import CameraModal from "../CameraModal";
import axios from "axios";
import ButtonModal from "../ButtonModal";
import MenuIcon from '@material-ui/icons/Menu';
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import MessageUploadMedias from "../MessageUploadMedias";
import { EditMessageContext } from "../../context/EditingMessage/EditingMessageContext";
import ScheduleModal from "../ScheduleModal";
import LocationModal from "../LocationModal";


const Mp3Recorder = new MicRecorder({ bitRate: 192 });

const useStyles = makeStyles((theme) => ({
  mainWrapper: {
    background: "#eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
    [theme.breakpoints.down("sm")]: {
      position: "sticky",
      bottom: 0,
      width: "100%",
      zIndex: 3,
      paddingBottom: "env(safe-area-inset-bottom)",
    },
  },
  avatar: {
    width: "50px",
    height: "50px",
    borderRadius: "25%",
  },
  dropInfo: {
    background: "#eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: 15,
    left: 0,
    right: 0,
  },
  dropInfoOut: {
    display: "none",
  },
  gridFiles: {
    maxHeight: "100%",
    overflow: "scroll",
  },
  newMessageBox: {
    background: theme.palette.background.default,
    width: "100%",
    display: "flex",
    padding: "7px",
    alignItems: "center",
  },
  messageInputWrapper: {
    padding: 6,
    marginRight: 7,
    background: theme.palette.background.paper,
    display: "flex",
    borderRadius: 20,
    flex: 1,
    position: "relative",
  },
  messageInputWrapperPrivate: {
    padding: 6,
    marginRight: 7,
    background: "#F0E68C",
    display: "flex",
    borderRadius: 20,
    flex: 1,
    position: "relative",
  },
  messageInput: {
    paddingLeft: 10,
    flex: 1,
    border: "none",

  },
  messageInputPrivate: {
    paddingLeft: 10,
    flex: 1,
    border: "none",
    color: grey[800],

  },
  sendMessageIcons: {
    color: grey[700],
  },
  ForwardMessageIcons: {
    color: grey[700],
    transform: 'scaleX(-1)'
  },
  uploadInput: {
    display: "none",
  },
  viewMediaInputWrapper: {
    maxHeight: "100%",
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.mode === 'light' ? "#ffffff" : "#202c33",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },
  emojiBox: {
    position: "absolute",
    bottom: 63,
    width: 40,
    borderTop: "1px solid #e8e8e8",
  },
  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },
  audioLoading: {
    color: green[500],
    opacity: "70%",
  },
  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
  },
  cancelAudioIcon: {
    color: "red",
  },
  sendAudioIcon: {
    color: "green",
  },
  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
    backgroundColor: theme.palette.optionsBackground,
  },
  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: theme.mode === "light" ? "#f0f0f0" : "#1d282f", //"rgba(0, 0, 0, 0.05)",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },
  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },
  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },
  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#6bcbef",
  },
  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },
  messageQuickAnswersWrapper: {
    margin: 0,
    position: "absolute",
    bottom: "54px",
    background:
      theme.mode === "light"
        ? "linear-gradient(165deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)"
        : "linear-gradient(165deg, rgba(30,41,59,0.96) 0%, rgba(15,23,42,0.96) 100%)",
    padding: 4,
    border: `1px solid ${theme.mode === "light" ? "rgba(148,163,184,0.26)" : "rgba(148,163,184,0.36)"}`,
    borderRadius: 14,
    boxShadow:
      theme.mode === "light"
        ? "0 14px 30px rgba(15,23,42,0.16)"
        : "0 16px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(6px)",
    left: 0,
    width: "100%",
    zIndex: 30,
    maxHeight: 290,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    animation: "$quickAnswersReveal 0.18s ease-out",
    "& li": {
      listStyle: "none",
    },
  },
  "@keyframes quickAnswersReveal": {
    "0%": {
      opacity: 0,
      transform: "translateY(6px)",
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
  messageQuickAnswersWrapperItem: {
    borderBottom: `1px solid ${theme.mode === "light" ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.32)"}`,
    "&:last-child": {
      borderBottom: "none",
    },
  },
  messageQuickAnswerLink: {
    display: "block",
    padding: "9px 11px",
    cursor: "pointer",
    textDecoration: "none",
    borderRadius: 10,
    transition: "all .16s ease",
    "&:hover": {
      background:
        theme.mode === "light"
          ? "linear-gradient(145deg, rgba(37,99,235,0.12), rgba(14,165,233,0.08))"
          : "linear-gradient(145deg, rgba(59,130,246,0.2), rgba(14,165,233,0.12))",
    },
  },
  messageQuickAnswerShortcut: {
    display: "block",
    fontWeight: 700,
    fontSize: "0.81rem",
    color: theme.mode === "light" ? "#0f172a" : "#f1f5f9",
    lineHeight: 1.25,
    marginBottom: 3,
  },
  messageQuickAnswerPreview: {
    display: "block",
    fontSize: "0.73rem",
    color: theme.mode === "light" ? grey[600] : "#9ca3af",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  invertedFabMenu: {
    border: "none",
    borderRadius: 50, // Define o raio da borda para 0 para remover qualquer borda
    boxShadow: "none", // Remove a sombra
    padding: theme.spacing(1),
    backgroundColor: "transparent",
    color: "grey",
    "&:hover": {
      backgroundColor: "transparent",
    },
    "&:disabled": {
      backgroundColor: "transparent !important",
    },
  },
  invertedFabMenuMP: {
    border: "none",
    borderRadius: 0, // Define o raio da borda para 0 para remover qualquer borda
    boxShadow: "none", // Remove a sombra
    width: theme.spacing(4), // Ajuste o tamanho de acordo com suas preferências
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: blue[800],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuCont: {
    border: "none",
    borderRadius: 0, // Define o raio da borda para 0 para remover qualquer borda
    boxShadow: "none", // Remove a sombra
    minHeight: "auto",
    width: theme.spacing(4), // Ajuste o tamanho de acordo com suas preferências
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: blue[500],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuMeet: {
    border: "none",
    borderRadius: 0, // Define o raio da borda para 0 para remover qualquer borda
    boxShadow: "none", // Remove a sombra
    minHeight: "auto",
    width: theme.spacing(4), // Ajuste o tamanho de acordo com suas preferências
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: green[500],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuDoc: {
    border: "none",
    borderRadius: 0, // Define o raio da borda para 0 para remover qualquer borda
    boxShadow: "none", // Remove a sombra
    width: theme.spacing(4), // Ajuste o tamanho de acordo com suas preferências
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: "#7f66ff",
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuCamera: {
    border: "none",
    borderRadius: 0, // Define o raio da borda para 0 para remover qualquer borda
    boxShadow: "none", // Remove a sombra
    width: theme.spacing(4), // Ajuste o tamanho de acordo com suas preferências
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: pink[500],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  flexContainer: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
  },
  flexItem: {
    flex: 1,
  },
}));

const MessageInput = ({
  ticketId,
  ticketStatus,
  droppedFiles,
  contactId,
  ticketChannel,
  disableAutoFocus = false
}) => {

  const classes = useStyles();
  const theme = useTheme();
  const [mediasUpload, setMediasUpload] = useState([]);
  const isMounted = useRef(true);
  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef();
  const [onDragEnter, setOnDragEnter] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { setReplyingMessage, replyingMessage } = useContext(ReplyMessageContext);
  const { setEditingMessage, editingMessage } = useContext(EditMessageContext);
  const { user } = useContext(AuthContext);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [signMessagePar, setSignMessagePar] = useState(false);
  const { get: getSetting } = useCompanySettings();
  const [signMessage, setSignMessage] = useState(true);
  const [privateMessage, setPrivateMessage] = useState(false);
  const [privateMessageInputVisible, setPrivateMessageInputVisible] = useState(false);
  const [senVcardModalOpen, setSenVcardModalOpen] = useState(false);
  const [showModalMedias, setShowModalMedias] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const useNativeRecorderRef = useRef(false);

  const { list: listQuickMessages } = useQuickMessages();


  const isMobile = useMediaQuery('(max-width: 767px)'); // Ajuste o valor conforme necessário
  const [placeholderText, setPlaceHolderText] = useState("");

  // Determine o texto do placeholder com base no ticketStatus
  useEffect(() => {
    if (ticketStatus === "open" || ticketStatus === "group") {
      setPlaceHolderText(i18n.t("messagesInput.placeholderOpen"));
    } else {
      setPlaceHolderText(i18n.t("messagesInput.placeholderClosed"));
    }

    // Limitar o comprimento do texto do placeholder apenas em ambientes mobile
    const maxLength = isMobile ? 20 : Infinity; // Define o limite apenas em mobile

    if (isMobile && placeholderText.length > maxLength) {
      setPlaceHolderText(placeholderText.substring(0, maxLength) + "...");
    }
  }, [ticketStatus])

  const {
    selectedMessages,
    setForwardMessageModalOpen,
    showSelectMessageCheckbox } = useContext(ForwardMessageContext);

  useEffect(() => {
    if (droppedFiles && droppedFiles.length > 0) {
      const selectedMedias = Array.from(droppedFiles);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  }, [droppedFiles]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!disableAutoFocus && inputRef.current) {
      inputRef.current.focus();
    }
    if (editingMessage) {
      setInputMessage(editingMessage.body);
    }
  }, [replyingMessage, editingMessage, disableAutoFocus]);

  useEffect(() => {
    if (!disableAutoFocus && inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      setInputMessage("");
      setShowEmoji(false);
      setMediasUpload([]);
      setReplyingMessage(null);
      //setSignMessage(true);
      setPrivateMessage(false);
      setPrivateMessageInputVisible(false)
      setEditingMessage(null);
    };
  }, [ticketId, setReplyingMessage, setEditingMessage, disableAutoFocus]);

  useEffect(() => {
    if (!disableAutoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disableAutoFocus]);

  useEffect(() => {
    setTimeout(() => {
      if (isMounted.current)
        setOnDragEnter(false);
    }, 1000);
    // eslint-disable-next-line
  }, [onDragEnter === true]);

  //permitir ativar/desativar firma
  useEffect(() => {
    const fetchSettings = async () => {
      const setting = await getSetting({
        "column": "sendSignMessage"
      });

      if (isMounted.current) {
        if (setting.sendSignMessage === "enabled") {
          setSignMessagePar(true);
          const signMessageStorage = JSON.parse(
            localStorage.getItem("persistentSignMessage")
          );
          if (isNil(signMessageStorage)) {
            setSignMessage(true)
          } else {
            setSignMessage(signMessageStorage);
          }
        } else {
          setSignMessagePar(false);
        }
      }
    };
    fetchSettings();
  }, []);

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const handleSendLinkVideo = async () => {
    const link = `https://meet.jit.si/${ticketId}`;
    setInputMessage(link);
  }

  const handleChangeInput = (e) => {
    setInputMessage(e.target.value);
  };

  const handlePrivateMessage = (e) => {
    setPrivateMessage(!privateMessage);
    setPrivateMessageInputVisible(!privateMessageInputVisible);
  };

  const handleButtonModalOpen = () => {
    handleMenuItemClick();
    setButtonModalOpen(true); // Define o estado como true para abrir o modal
  };

  const handleQuickAnswersClick = async (value) => {
    if (value.mediaPath) {
      try {
        const { data } = await axios.get(value.mediaPath, {
          responseType: "blob",
        });

        handleUploadQuickMessageMedia(data, value.value);
        setInputMessage("");
        return;
        //  handleChangeMedias(response)
      } catch (err) {
        toastError(err);
      }
    }

    setInputMessage("");
    setInputMessage(value.value);
    setTypeBar(false);
  };

  const handleAddEmoji = (e) => {
    let emoji = e.native;
    setInputMessage((prevState) => prevState + emoji);
  };

  const [modalCameraOpen, setModalCameraOpen] = useState(false);

  const handleCapture = (imageData) => {
    if (imageData) {
      handleUploadCamera(imageData);
    }
  };

  const handleChangeMedias = (e) => {
    if (!e.target.files) {
      return;
    }
    const selectedMedias = Array.from(e.target.files);
    setMediasUpload(selectedMedias);
    setShowModalMedias(true);
  };

  const handleChangeSign = (e) => {
    getStatusSingMessageLocalstogare();
  };

  const handleOpenModalForward = () => {
    if (selectedMessages.length === 0) {
      setForwardMessageModalOpen(false)
      toastError(i18n.t("messagesList.header.notMessage"));
      return;
    }
    setForwardMessageModalOpen(true);
  }

  const getStatusSingMessageLocalstogare = () => {
    const signMessageStorage = JSON.parse(
      localStorage.getItem("persistentSignMessage")
    );
    //si existe uma chave "sendSingMessage"
    if (signMessageStorage !== null) {
      if (signMessageStorage) {
        localStorage.setItem("persistentSignMessage", false);
        setSignMessage(false);
      } else {
        localStorage.setItem("persistentSignMessage", true);
        setSignMessage(true);
      }
    } else {
      localStorage.setItem("persistentSignMessage", false);
      setSignMessage(false);
    }
  };

  const handleInputPaste = (e) => {
    if (e.clipboardData.files[0]) {
      const selectedMedias = Array.from(e.clipboardData.files);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  };

  const handleInputDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      const selectedMedias = Array.from(e.dataTransfer.files);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  };

  const handleUploadMedia = async (mediasUpload) => {
    setLoading(true);
    // e.preventDefault();

    // Certifique-se de que a variável medias esteja preenchida antes de continuar
    if (!mediasUpload.length) {
      console.log("Nenhuma mídia selecionada.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("fromMe", true);
    formData.append("isPrivate", privateMessage ? "true" : "false");
    mediasUpload.forEach((media) => {
      formData.append("body", media.caption);
      formData.append("medias", media.file);
    });

    try {
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setLoading(false);
    setMediasUpload([]);
    setShowModalMedias(false);
    setPrivateMessage(false);
    setPrivateMessageInputVisible(false)
  };

  const handleSendContatcMessage = async (vcard) => {
    setSenVcardModalOpen(false);
    setLoading(true);

    if (isNil(vcard)) {
      setLoading(false);
      return;
    }

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: null,
      quotedMsg: replyingMessage,
      isPrivate: privateMessage ? "true" : "false",
      vCard: vcard,
    };
    try {
      await api.post(`/messages/${ticketId}`, message);
    } catch (err) {
      toastError(err);
    }

    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
    setEditingMessage(null);
    setPrivateMessage(false);
    setPrivateMessageInputVisible(false);
  };

  const focusMessageInput = () => {
    if (disableAutoFocus || !inputRef.current) return;
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSendMessage = async () => {
    if (loading || inputMessage.trim() === "") return;
    setLoading(true);

    const userName = privateMessage
      ? `${user.name} - Mensagem Privada`
      : user.name;

    const sendMessage = inputMessage.trim();

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: (signMessage || privateMessage) && !editingMessage
        ? `*${userName}:*\n${sendMessage}`
        : sendMessage,
      quotedMsg: replyingMessage,
      isPrivate: privateMessage ? "true" : "false",
    };

    try {
      if (editingMessage !== null) {
        await api.post(`/messages/edit/${editingMessage.id}`, message);
      } else {
        await api.post(`/messages/${ticketId}`, message);
      }
    } catch (err) {
      toastError(err);
    }

    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
    setPrivateMessage(false);
    setEditingMessage(null);
    setPrivateMessageInputVisible(false)
    handleMenuItemClick();
    focusMessageInput();
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      const canUseNativeRecorder =
        typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined";

      if (canUseNativeRecorder) {
        const preferredMimeTypes = [
          "audio/mp4;codecs=mp4a.40.2",
          "audio/mp4",
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
        ];

        const mimeType = preferredMimeTypes.find((type) =>
          window.MediaRecorder.isTypeSupported(type)
        );

        const options = mimeType
          ? { mimeType, audioBitsPerSecond: 192000 }
          : { audioBitsPerSecond: 192000 };

        const recorder = new window.MediaRecorder(stream, options);
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
        mediaStreamRef.current = stream;
        useNativeRecorderRef.current = true;
      } else {
        stream.getTracks().forEach((track) => track.stop());
        await Mp3Recorder.start();
        useNativeRecorderRef.current = false;
      }

      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const messages = await listQuickMessages({ companyId, userId: user.id });
      const options = messages.map((m) => {
        let truncatedMessage = m.message;
        if (isString(truncatedMessage) && truncatedMessage.length > 90) {
          truncatedMessage = m.message.substring(0, 90) + "...";
        }
        return {
          value: m.message,
          label: `/${m.shortcode}`,
          preview: truncatedMessage,
          shortcode: m.shortcode,
          mediaPath: m.mediaPath,
        };
      });
      if (isMounted.current) {

        setQuickAnswer(options);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      isString(inputMessage) &&
      !isEmpty(inputMessage) &&
      inputMessage.length >= 1
    ) {
      const firstWord = inputMessage.charAt(0);

      if (firstWord === "/") {
        setTypeBar(firstWord.indexOf("/") > -1);

        const filteredOptions = quickAnswers.filter((m) => {
          const search = inputMessage.toLowerCase();
          return (
            m.label.toLowerCase().indexOf(search) > -1 ||
            (m.preview || "").toLowerCase().indexOf(search) > -1
          );
        });
        setTypeBar(filteredOptions);
      } else {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMessage]);

  const disableOption = () => {
    return (
      loading ||
      recording ||
      (ticketStatus !== "open" && ticketStatus !== "group")
    );
  };

  const handleUploadCamera = async (blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = `${new Date().getTime()}.png`;
      formData.append("medias", blob, filename);
      formData.append("body", privateMessage ? `\u200d` : "");
      formData.append("fromMe", true);

      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
    setLoading(false);
  };

  const handleUploadQuickMessageMedia = async (blob, message) => {
    setLoading(true);
    try {
      const extension = blob.type.split("/")[1];

      const formData = new FormData();
      const filename = `${new Date().getTime()}.${extension}`;
      formData.append("medias", blob, filename);
      formData.append("body", privateMessage ? `\u200d${message}` : message);
      formData.append("fromMe", true);

      if (isMounted.current) {
        await api.post(`/messages/${ticketId}`, formData);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };


  const handleUploadAudio = async () => {

    setLoading(true);
    try {
      let blob;

      if (useNativeRecorderRef.current && mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;

        blob = await new Promise((resolve, reject) => {
          recorder.onerror = (event) => reject(event?.error || new Error("Audio recording failed"));
          recorder.onstop = () => {
            const mimeType = recorder.mimeType || "audio/webm";
            resolve(new Blob(audioChunksRef.current, { type: mimeType }));
          };
          recorder.stop();
        });
      } else {
        const mp3Result = await Mp3Recorder.stop().getMp3();
        blob = mp3Result[1];
      }

      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }

      const formData = new FormData();
      const mimeType = blob.type || "";
      const extension =
        mimeType.includes("mp4") || mimeType.includes("aac")
          ? "m4a"
          : mimeType.includes("ogg") || mimeType.includes("opus")
            ? "ogg"
            : mimeType.includes("webm")
              ? "webm"
              : ticketChannel === "whatsapp"
                ? "mp3"
                : "m4a";

      const filename = `${new Date().getTime()}.${extension}`;
      formData.append("medias", blob, filename);
      formData.append("body", filename);
      formData.append("fromMe", true);

      if (isMounted.current) {
        await api.post(`/messages/${ticketId}`, formData);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      useNativeRecorderRef.current = false;

      if (isMounted.current) {
        setLoading(false);
        setRecording(false);
      }
    }
  };

  const handleCloseModalMedias = () => {
    setShowModalMedias(false);
  };
  const handleCancelAudio = async () => {
    try {
      if (useNativeRecorderRef.current && mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } else {
        await Mp3Recorder.stop().getMp3();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      useNativeRecorderRef.current = false;
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (event) => {
    setAnchorEl(null);
  };

  const handleSendContactModalOpen = async () => {
    handleMenuItemClick();
    setSenVcardModalOpen(true);
  };

  const handleSendLocation = () => {
    handleMenuItemClick();

    if (ticketChannel !== "whatsapp" || privateMessage) {
      return;
    }

    setLocationModalOpen(true);
  };

  const handleSendLocationMessage = async locationData => {
    setLoading(true);
    try {
      const message = {
        read: 1,
        fromMe: true,
        body: "",
        quotedMsg: replyingMessage,
        isPrivate: privateMessage ? "true" : "false",
        location: locationData
      };

      await api.post(`/messages/${ticketId}`, message);
      setInputMessage("");
      setShowEmoji(false);
      setReplyingMessage(null);
      setEditingMessage(null);
      setPrivateMessage(false);
      setPrivateMessageInputVisible(false);
    } finally {
      setLoading(false);
      setLocationModalOpen(false);
    }
  };

  const handleCameraModalOpen = async () => {
    handleMenuItemClick();
    setModalCameraOpen(true);
  };

  const handleCancelSelection = () => {
    setMediasUpload([]);
    setShowModalMedias(false);
  };

  const renderReplyingMessage = (message) => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          {replyingMessage && (
            <div className={classes.replyginMsgBody}>
              {!message.fromMe && (
                <span className={classes.messageContactName}>
                  {message.contact?.name}
                </span>
              )}
              {message.body}
            </div>
          )
          }
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={disableOption()}
          onClick={() => {
            setReplyingMessage(null);
            setEditingMessage(null);
            setInputMessage("");
          }}
        >
          <Clear className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  if (mediasUpload.length > 0) {
    return (

      <Paper
        elevation={0}
        square
        className={classes.viewMediaInputWrapper}
        onDragEnter={() => setOnDragEnter(true)}
        onDrop={(e) => handleInputDrop(e)}
      >
        {showModalMedias && (
          <MessageUploadMedias
            isOpen={showModalMedias}
            files={mediasUpload}
            onClose={handleCloseModalMedias}
            onSend={handleUploadMedia}
            onCancelSelection={handleCancelSelection}
          />
        )}

      </Paper>
    )
  }
  else {
    return (
      <>
        {modalCameraOpen && (
          <CameraModal
            isOpen={modalCameraOpen}
            onRequestClose={() => setModalCameraOpen(false)}
            onCapture={handleCapture}
          />
        )}
        {senVcardModalOpen && (
          <ContactSendModal
            modalOpen={senVcardModalOpen}
            onClose={(c) => {
              handleSendContatcMessage(c);
            }}
          />
        )}
        {locationModalOpen && (
          <LocationModal
            open={locationModalOpen}
            onClose={() => setLocationModalOpen(false)}
            onSubmit={handleSendLocationMessage}
            defaultAddress={inputMessage}
          />
        )}
        <Paper
          square
          elevation={0}
          className={classes.mainWrapper}
          onDragEnter={() => setOnDragEnter(true)}
          onDrop={(e) => handleInputDrop(e)}
        >
          {(replyingMessage && renderReplyingMessage(replyingMessage)) || (editingMessage && renderReplyingMessage(editingMessage))}
          <div className={classes.newMessageBox}>
            <Hidden only={["sm", "xs"]}>
              <IconButton
                aria-label="emojiPicker"
                component="span"
                disabled={disableOption()}
                onClick={(e) => setShowEmoji((prevState) => !prevState)}
              >
                <Mood className={classes.sendMessageIcons} />
              </IconButton>
              {showEmoji ? (
                <div className={classes.emojiBox}>
                  <ClickAwayListener onClickAway={(e) => setShowEmoji(true)}>
                    <Picker
                      perLine={16}
                      theme={"dark"}
                      i18n={i18n}
                      showPreview={true}
                      showSkinTones={false}
                      onSelect={handleAddEmoji}
                    />
                  </ClickAwayListener>
                </div>
              ) : null}

              <Fab
                disabled={disableOption()}
                aria-label="uploadMedias"
                component="span"
                className={classes.invertedFabMenu}
                onClick={handleOpenMenuClick}
              >
                <AddIcon />
              </Fab>
              <Menu
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleMenuItemClick}
                id="simple-menu"
              >
                <MenuItem onClick={handleMenuItemClick}>
                  <input
                    multiple
                    type="file"
                    id="upload-img-button"
                    accept="image/*, video/*, audio/* "
                    // disabled={disableOption()}
                    className={classes.uploadInput}
                    onChange={handleChangeMedias}
                  />
                  <label htmlFor="upload-img-button">
                    <Fab
                      aria-label="upload-img"
                      component="span"
                      className={classes.invertedFabMenuMP}
                    >
                      <PermMedia />
                    </Fab>
                    {i18n.t("messageInput.type.imageVideo")}
                  </label>
                </MenuItem>
                <MenuItem onClick={handleCameraModalOpen}>
                  <Fab className={classes.invertedFabMenuCamera}>
                    <CameraAlt />
                  </Fab>
                  {i18n.t("messageInput.type.cam")}
                </MenuItem>
                <MenuItem onClick={handleMenuItemClick}>
                  <input
                    multiple
                    type="file"
                    id="upload-doc-button"
                    accept="application/*, text/*"
                    // disabled={disableOption()}
                    className={classes.uploadInput}
                    onChange={handleChangeMedias}
                  />
                  <label htmlFor="upload-doc-button">
                    <Fab aria-label="upload-img"
                      component="span" className={classes.invertedFabMenuDoc}>
                      <Description />
                    </Fab>
                    Documento
                  </label>
                </MenuItem>
                <MenuItem onClick={handleSendContactModalOpen}>
                  <Fab className={classes.invertedFabMenuCont}>
                    <Person />
                  </Fab>
                  {i18n.t("messageInput.type.contact")}
                </MenuItem>
                <MenuItem
                  onClick={handleSendLocation}
                  disabled={
                    disableOption() ||
                    ticketChannel !== "whatsapp" ||
                    privateMessage
                  }
                >
                  <Fab className={classes.invertedFabMenuCont}>
                    <Room />
                  </Fab>
                  {i18n.t("messageInput.type.location")}
                </MenuItem>
                <MenuItem onClick={handleSendLinkVideo}>
                  <Fab className={classes.invertedFabMenuMeet}>
                    <Duo />
                  </Fab>
                  {i18n.t("messageInput.type.meet")}
                </MenuItem>
                {buttonModalOpen && (
          <ButtonModal
            modalOpen={buttonModalOpen}
            onClose={() => setButtonModalOpen(false)} // Função para fechar o modal
            ticketId={ticketId}
          />
        )}
                <MenuItem onClick={handleButtonModalOpen}>
                  <Fab className={classes.invertedFabMenuCont}>
                    <MenuIcon />
                  </Fab>
                  Botões
                </MenuItem>
              </Menu>
              {/* <IconButton
				  aria-label="upload"
				  component="span"
				  disabled={disableOption()}
				  onMouseOver={() => setOnDragEnter(true)}
				>
				  <AttachFile className={classes.sendMessageIcons} />
				</IconButton> */}

              {/* </label> */}
              {signMessagePar && (
                <Tooltip title={i18n.t("messageInput.tooltip.signature")}>
                  <IconButton
                    aria-label="send-upload"
                    component="span"
                    onClick={handleChangeSign}
                  >
                    {signMessage === true ? (
                      <Create style={{ color: theme.mode === "light" ? theme.palette.primary.main : "#EEE" }} />
                    ) : (
                      <Create style={{ color: "grey" }} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={i18n.t("messageInput.tooltip.privateMessage")}>
                <IconButton
                  aria-label="send-upload"
                  component="span"
                  onClick={handlePrivateMessage}
                >
                  {privateMessage === true ? (
                    <Comment style={{ color: theme.mode === "light" ? theme.palette.primary.main : "#EEE" }} />
                  ) : (
                    <Comment style={{ color: "grey" }} />
                  )}
                </IconButton>
              </Tooltip>
              {/* <Tooltip title={i18n.t("messageInput.tooltip.meet")}>
                <IconButton
                  aria-label="send-upload"
                  component="span"
                  onClick={handleSendLinkVideo}
                >
                  <Duo style={{ color: "grey" }} />
                </IconButton>
              </Tooltip> */}
            </Hidden>
            <Hidden only={["md", "lg", "xl"]}>
              <IconButton
                aria-controls="simple-menu"
                aria-haspopup="true"
                onClick={handleOpenMenuClick}
              >
                <MoreVert></MoreVert>
              </IconButton>
              <Menu
                id="simple-menu"
                keepMounted
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuItemClick}
              >
                <MenuItem onClick={handleMenuItemClick}>
                  <IconButton
                    aria-label="emojiPicker"
                    component="span"
                    disabled={disableOption()}
                    onClick={(e) => setShowEmoji((prevState) => !prevState)}
                  >
                    <Mood className={classes.sendMessageIcons} />
                  </IconButton>
                </MenuItem>
                <MenuItem onClick={handleMenuItemClick}>
                  <input
                    multiple
                    type="file"
                    id="upload-button"
                    disabled={disableOption()}
                    className={classes.uploadInput}
                    onChange={handleChangeMedias}
                  />
                  <label htmlFor="upload-button">
                    <IconButton
                      aria-label="upload"
                      component="span"
                      disabled={disableOption()}
                    >
                      <AttachFile className={classes.sendMessageIcons} />
                    </IconButton>
                  </label>
                </MenuItem>
                <MenuItem onClick={handleSendLocation}>
                  <IconButton
                    aria-label="sendLocation"
                    component="span"
                    disabled={
                      disableOption() ||
                      ticketChannel !== "whatsapp" ||
                      privateMessage
                    }
                  >
                    <Room className={classes.sendMessageIcons} />
                  </IconButton>
                </MenuItem>
                {signMessagePar && (
                  <Tooltip title="Habilitar/Desabilitar Assinatura">
                    <IconButton
                      aria-label="send-upload"
                      component="span"
                      onClick={handleChangeSign}
                    >
                      {signMessage === true ? (
                        <Create style={{ color: theme.mode === "light" ? theme.palette.primary.main : "#EEE" }} />
                      ) : (
                        <Create style={{ color: "grey" }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Habilitar/Desabilitar Comentários">
                  <IconButton
                    aria-label="send-upload"
                    component="span"
                    onClick={handlePrivateMessage}
                  >
                    {privateMessage === true ? (
                      <Comment style={{ color: theme.mode === "light" ? theme.palette.primary.main : "#EEE" }} />
                    ) : (
                      <Comment style={{ color: "grey" }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Menu>
            </Hidden>
            <div className={classes.flexContainer}>
              {privateMessageInputVisible && (
                <div className={classes.flexItem}>
                  <div className={classes.messageInputWrapperPrivate}>
                    <InputBase
                      inputRef={(input) => {
                        input && (inputRef.current = input);
                      }}
                      className={classes.messageInputPrivate}
                      placeholder={
                        ticketStatus === "open" || ticketStatus === "group"
                          ? i18n.t("messagesInput.placeholderPrivateMessage")
                          : i18n.t("messagesInput.placeholderClosed")
                      }
                      multiline
                      maxRows={5}
                      value={inputMessage}
                      onChange={handleChangeInput}
                      disabled={disableOption()}
                      onPaste={(e) => {
                        (ticketStatus === "open" || ticketStatus === "group") &&
                          handleInputPaste(e);
                      }}
                      onKeyDown={(e) => {
                        if (loading || e.shiftKey || e.nativeEvent.isComposing) return;
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}

                    />
                    {typeBar ? (
                      <ul className={classes.messageQuickAnswersWrapper}>
                        {typeBar.map((value, index) => {
                          return (
                            <li
                              className={classes.messageQuickAnswersWrapperItem}
                              key={index}
                            >
                              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                              <a
                                className={classes.messageQuickAnswerLink}
                                onClick={() => handleQuickAnswersClick(value)}
                              >
                                <span className={classes.messageQuickAnswerShortcut}>
                                  {value.label}
                                </span>
                                <span className={classes.messageQuickAnswerPreview}>
                                  {value.preview || value.value}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div></div>
                    )}
                  </div>
                </div>
              )}
              {!privateMessageInputVisible && (
                <div className={classes.flexItem}>
                  <div className={classes.messageInputWrapper}>
                    <InputBase
                      inputRef={(input) => {
                        input && (inputRef.current = input);
                      }}
                      className={classes.messageInput}
                      placeholder={placeholderText}
                      multiline
                      maxRows={5}
                      value={inputMessage}
                      onChange={handleChangeInput}
                      disabled={disableOption()}
                      onPaste={(e) => {
                        (ticketStatus === "open" || ticketStatus === "group") &&
                          handleInputPaste(e);
                      }}
                      onKeyDown={(e) => {
                        if (loading || e.shiftKey || e.nativeEvent.isComposing) return;
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    {typeBar ? (
                      <ul className={classes.messageQuickAnswersWrapper}>
                        {typeBar.map((value, index) => {
                          return (
                            <li
                              className={classes.messageQuickAnswersWrapperItem}
                              key={index}
                            >
                              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                              <a
                                className={classes.messageQuickAnswerLink}
                                onClick={() => handleQuickAnswersClick(value)}
                              >
                                <span className={classes.messageQuickAnswerShortcut}>
                                  {value.label}
                                </span>
                                <span className={classes.messageQuickAnswerPreview}>
                                  {value.preview || value.value}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div></div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!privateMessageInputVisible && (
              <>
              <Tooltip title={i18n.t("tickets.buttons.quickMessageFlash")}>
  <IconButton
    aria-label={i18n.t("tickets.buttons.quickMessageFlash")}
    component="span"
    onClick={() => setInputMessage('/')}
  >
    <BoltIcon className={classes.sendMessageIcons} />
  </IconButton>
</Tooltip>
                <Tooltip title={i18n.t("tickets.buttons.scredule")}>
                  <IconButton
                    aria-label="scheduleMessage"
                    component="span"
                    onClick={() => setAppointmentModalOpen(true)}
                    disabled={loading}
                  >
                    <Timer className={classes.sendMessageIcons} />
                  </IconButton>
                </Tooltip>
                {inputMessage || showSelectMessageCheckbox ? (
                  <>
                    <IconButton
                      aria-label="sendMessage"
                      component="span"
                      onClick={showSelectMessageCheckbox ? handleOpenModalForward : handleSendMessage}
                      disabled={loading}
                    >
                      {showSelectMessageCheckbox ?
                        <Reply className={classes.ForwardMessageIcons} /> : <Send className={classes.sendMessageIcons} />}
                    </IconButton>
                  </>
                ) : recording ? (
                  <div className={classes.recorderWrapper}>
                    <IconButton
                      aria-label="cancelRecording"
                      component="span"
                      fontSize="large"
                      disabled={loading}
                      onClick={handleCancelAudio}
                    >
                      <HighlightOff className={classes.cancelAudioIcon} />
                    </IconButton>
                    {loading ? (
                      <div>
                        <CircularProgress className={classes.audioLoading} />
                      </div>
                    ) : (
                      <RecordingTimer />
                    )}

                    <IconButton
                      aria-label="sendRecordedAudio"
                      component="span"
                      onClick={handleUploadAudio}
                      disabled={loading}
                    >
                      <CheckCircleOutline className={classes.sendAudioIcon} />
                    </IconButton>
                  </div>
                ) : (
                  <IconButton
                    aria-label="showRecorder"
                    component="span"
                    disabled={disableOption()}
                    onClick={handleStartRecording}
                  >
                    <Mic className={classes.sendMessageIcons} />
                  </IconButton>
                )}
              </>
            )}

            {privateMessageInputVisible && (
              <>
                <IconButton
                  aria-label="sendMessage"
                  component="span"
                  onClick={showSelectMessageCheckbox ? handleOpenModalForward : handleSendMessage}
                  disabled={loading}
                >
                  {showSelectMessageCheckbox ?
                    <Reply className={classes.ForwardMessageIcons} /> : <Send className={classes.sendMessageIcons} />}
                </IconButton>
              </>
            )}
            {appointmentModalOpen && (
              <ScheduleModal
                open={appointmentModalOpen}
                onClose={() => setAppointmentModalOpen(false)}
                message={inputMessage}
                contactId={contactId}
              />
            )}
          </div>
        </Paper>
      </>
    );
  }
};

export default MessageInput;
