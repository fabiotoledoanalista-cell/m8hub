import React, { useState, useEffect, useRef, useContext, useCallback } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import { grey } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { v4 as uuidv4 } from "uuid";

import GroupIcon from '@material-ui/icons/Group';
import ConnectionIcon from "../ConnectionIcon";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ShowTicketOpen from "../ShowTicketOpenModal";
import { isNil } from "lodash";
import { toast } from "react-toastify";
import { DeleteForever, Done, HighlightOff, Replay, SwapHoriz } from "@material-ui/icons";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import getConnectionColor from "../../utils/connectionColor";
import { 
    Avatar, 
    ListItemAvatar, 
    ListItem, 
    ListItemSecondaryAction, 
    ListItemText, 
    Typography, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    IconButton, 
    Paper, 
    Divider 
} from "@material-ui/core";
import VisibilityIcon from "@material-ui/icons/Visibility";
import CloseIcon from "@material-ui/icons/Close";
import MessageIcon from "@material-ui/icons/Message";
import LocalOfferOutlinedIcon from "@material-ui/icons/LocalOfferOutlined";
import { Can } from "../Can";

const useStyles = makeStyles((theme) => ({
    ticket: {
        position: "relative",
        borderRadius: 14,
        margin: "4px 7px",
        overflow: "hidden",
        padding: "8px 10px 8px 9px",
        border: `1px solid ${theme.mode === "light" ? "rgba(148,163,184,0.28)" : "rgba(148,163,184,0.35)"}`,
        background:
            theme.mode === "light"
                ? "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)"
                : "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.92) 100%)",
        boxShadow:
            theme.mode === "light"
                ? "0 8px 20px rgba(15,23,42,0.08)"
                : "0 10px 22px rgba(0,0,0,0.35)",
        transition: "all .2s ease",
        "&:before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            borderRadius: "14px 0 0 14px",
            backgroundColor: theme.mode === "light" ? "#cbd5e1" : "rgba(148,163,184,0.55)",
            transition: "all 0.2s ease",
            opacity: 0.9,
        },
        "&:hover": {
            transform: "translateY(-1px)",
            boxShadow:
                theme.mode === "light"
                    ? "0 12px 24px rgba(15,23,42,0.12)"
                    : "0 12px 26px rgba(0,0,0,0.45)",
        },
        "&.Mui-selected": {
            borderColor: theme.mode === "light" ? "rgba(37,99,235,0.45)" : "rgba(96,165,250,0.5)",
            background:
                theme.mode === "light"
                    ? "linear-gradient(135deg, rgba(219,234,254,0.65) 0%, #ffffff 100%)"
                    : "linear-gradient(135deg, rgba(30,58,138,0.28) 0%, rgba(30,41,59,0.95) 100%)",
        },
        "&.Mui-selected:before": {
            width: 6,
        },
    },

    unreadTicket: {
        "&:before": {
            background:
                theme.mode === "light"
                    ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
                    : "linear-gradient(180deg, #4ade80 0%, #22c55e 100%)",
            boxShadow:
                theme.mode === "light"
                    ? "0 0 0 1px rgba(34,197,94,0.2)"
                    : "0 0 0 1px rgba(74,222,128,0.3)",
        },
    },

    readTicket: {
        "&:before": {
            backgroundColor: theme.mode === "light" ? "#cbd5e1" : "rgba(148,163,184,0.55)",
        },
    },

    pendingTicket: {
        cursor: "unset",
    },

    avatarWrap: {
        marginLeft: 2,
        marginRight: 8,
    },

    ticketAvatar: {
        width: 46,
        height: 46,
        borderRadius: "50%",
        border: `2px solid ${theme.mode === "light" ? "rgba(148,163,184,0.28)" : "rgba(148,163,184,0.45)"}`,
        boxShadow: theme.mode === "light" ? "0 5px 12px rgba(15,23,42,0.12)" : "0 6px 14px rgba(0,0,0,0.35)",
    },

    contentRoot: {
        marginRight: 110,
    },

    primaryRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
    },

    nameLine: {
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        gap: 6,
    },

    contactName: {
        color: theme.mode === "light" ? "#0f172a" : "#f8fafc",
        fontWeight: 700,
        fontSize: "0.83rem",
        letterSpacing: "0.01em",
    },

    rightTop: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginLeft: "auto",
    },

    unreadCounter: {
        minWidth: 18,
        height: 18,
        borderRadius: 10,
        padding: "0 5px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.62rem",
        fontWeight: "bold",
        color: "#fff",
        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
        boxShadow: "0 4px 10px rgba(22,163,74,0.35)",
    },

    viewIcon: {
        color: theme.mode === "light" ? "#2563eb" : "#93c5fd",
        cursor: "pointer",
        fontSize: "1rem",
    },

    lastMessageTime: {
        color: theme.mode === "light" ? "#64748b" : "#94a3b8",
        fontSize: "0.68rem",
        fontWeight: 600,
    },

    lastMessageTimeUnread: {
        color: theme.mode === "light" ? "#16a34a" : "#4ade80",
        fontSize: "0.68rem",
        fontWeight: "bold",
    },

    secondaryContent: {
        marginTop: 2,
    },

    messagePreview: {
        color: theme.mode === "light" ? "#334155" : "#cbd5e1",
        fontSize: "0.74rem",
        lineHeight: 1.35,
        fontWeight: 500,
    },

    messagePreviewUnread: {
        color: theme.mode === "light" ? "#0f172a" : "#e2e8f0",
        fontWeight: 700,
    },

    metaRow: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexWrap: "wrap",
        marginTop: 6,
    },

    metaPill: {
        color: "#fff",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: "0.56rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
        maxWidth: 112,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    metaTagPill: {
        color: "#fff",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: "0.56rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        maxWidth: 125,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },

    tagsRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 4,
    },

    actionsColumn: {
        right: 8,
        top: 8,
        transform: "none",
        marginTop: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        minWidth: 106,
        gap: 6,
    },

    actionButtonsRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 3,
        flexWrap: "nowrap",
        whiteSpace: "nowrap",
    },

    actionButton: {
        minWidth: 28,
        width: 28,
        height: 28,
        borderRadius: "50%",
        boxShadow: theme.mode === "light" ? "0 4px 10px rgba(15,23,42,0.12)" : "0 4px 10px rgba(0,0,0,0.4)",
        border: `1px solid ${theme.mode === "light" ? "rgba(148,163,184,0.24)" : "rgba(148,163,184,0.35)"}`,
        padding: 0,
        transition: "all .18s ease",
        "&:hover": {
            transform: "translateY(-1px)",
        },
    },
    actionButtonAccept: {
        background: theme.mode === "light"
            ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
            : "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
        color: "#ffffff",
    },
    actionButtonTransfer: {
        background: theme.mode === "light"
            ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            : "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
        color: "#ffffff",
    },
    actionButtonDanger: {
        background: theme.mode === "light"
            ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
            : "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
        color: "#ffffff",
    },
    actionButtonNeutral: {
        background: theme.mode === "light"
            ? "linear-gradient(135deg, #64748b 0%, #475569 100%)"
            : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
        color: "#ffffff",
    },
    actionButtonDelete: {
        background: theme.mode === "light"
            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            : "linear-gradient(135deg, #f87171 0%, #dc2626 100%)",
        color: "#ffffff",
    },

    connectionIcon: {
        marginRight: 1,
    },
    dialogTitle: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: theme.palette.primary.main,
        color: "white",
        paddingBottom: theme.spacing(1),
    },
    closeButton: {
        color: "white",
    },
    messagesContainer: {
        height: "60vh", // Use viewport height instead of fixed pixels
        maxHeight: "600px", // Set a maximum height
        overflowY: "auto",
        padding: theme.spacing(2),
        scrollBehavior: "smooth", // Add smooth scrolling
    },
    scrollToBottomBtn: {
        position: "absolute",
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        zIndex: 1000,
        backgroundColor: theme.palette.primary.main,
        color: "white",
        "&:hover": {
            backgroundColor: theme.palette.primary.dark,
        },
    },
    messageItem: {
        padding: theme.spacing(1),
        margin: theme.spacing(1, 0),
        borderRadius: theme.spacing(1),
        maxWidth: "80%",
        position: "relative",
    },
    fromMe: {
        backgroundColor: "#dcf8c6",
        marginLeft: "auto",
    },
    fromThem: {
        backgroundColor: "#f5f5f5",
    },
    messageTime: {
        fontSize: "0.75rem",
        color: grey[500],
        position: "absolute",
        bottom: "2px",
        right: "8px",
    },
    messageText: {
        marginBottom: theme.spacing(2),
        wordBreak: "break-word",
    },
    emptyMessages: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: grey[500],
    },
    messagesHeader: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(1, 2),
        backgroundColor: theme.palette.grey[100],
    },
    messageAvatar: {
        marginRight: theme.spacing(1),
    },
    messageIcon: {
        marginRight: theme.spacing(1),
        color: theme.palette.primary.main,
    },
    loadingMessages: {
        display: "flex",
        justifyContent: "center",
        padding: theme.spacing(3),
    }
}));

const TicketListItemCustom = ({ setTabOpen, ticket }) => {
    const classes = useStyles();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
    const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);

    const [openAlert, setOpenAlert] = useState(false);
    const [userTicketOpen, setUserTicketOpen] = useState("");
    const [queueTicketOpen, setQueueTicketOpen] = useState("");
    const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
    
    // New states for the ticket messages
    const [ticketMessages, setTicketMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const { ticketId } = useParams();
    const isMounted = useRef(true);
    const { setCurrentTicket } = useContext(TicketsContext);
    const { user } = useContext(AuthContext);

    const { get: getSetting } = useCompanySettings();

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleOpenAcceptTicketWithouSelectQueue = useCallback(() => {
        setAcceptTicketWithouSelectQueueOpen(true);
    }, []);

    const handleCloseTicket = async (id) => {
        const setting = await getSetting(
            {
                "column": "requiredTag"
            }
        );

        if (setting.requiredTag === "enabled") {
            //verificar se tem uma tag   
            try {
                const contactTags = await api.get(`/contactTags/${ticket.contact.id}`);
                if (!contactTags.data.tags) {
                    toast.warning(i18n.t("messagesList.header.buttons.requiredTag"))
                } else {
                    await api.put(`/tickets/${id}`, {
                        status: "closed",
                        userId: user?.id || null,
                    });

                    if (isMounted.current) {
                        setLoading(false);
                    }

                    history.push(`/tickets/`);
                }
            } catch (err) {
                setLoading(false);
                toastError(err);
            }
        } else {
            setLoading(true);
            try {
                await api.put(`/tickets/${id}`, {
                    status: "closed",
                    userId: user?.id || null,
                });

            } catch (err) {
                setLoading(false);
                toastError(err);
            }
            if (isMounted.current) {
                setLoading(false);
            }

            history.push(`/tickets/`);
        }
    };

    const handleCloseIgnoreTicket = async (id) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${id}`, {
                status: "closed",
                userId: user?.id || null,
                sendFarewellMessage: false,
                amountUsedBotQueues: 0
            });

        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }

        history.push(`/tickets/`);
    };

    const truncate = (str, len) => {
        if (!isNil(str)) {
            if (str.length > len) {
                return str.substring(0, len) + "...";
            }
            return str;
        }
    };

    const handleCloseTransferTicketModal = useCallback(() => {
        if (isMounted.current) {
            setTransferTicketModalOpen(false);
        }
    }, []);

    const handleOpenTransferModal = () => {
        setLoading(true)
        setTransferTicketModalOpen(true);
        if (isMounted.current) {
            setLoading(false);
        }
        handleSelectTicket(ticket);
        history.push(`/tickets/${ticket.uuid}`);
    }

    const handleAcepptTicket = async (id) => {
        setLoading(true);
        try {
            const otherTicket = await api.put(`/tickets/${id}`, ({
                status: ticket.isGroup && ticket.channel === 'whatsapp' ? "group" : "open",
                userId: user?.id,
            }));

            if (otherTicket.data.id !== ticket.id) {
                if (otherTicket.data.userId !== user?.id) {
                    setOpenAlert(true);
                    setUserTicketOpen(otherTicket.data.user.name);
                    setQueueTicketOpen(otherTicket.data.queue.name);
                } else {
                    setLoading(false);
                    setTabOpen(ticket.isGroup ? "group" : "open");
                    handleSelectTicket(otherTicket.data);
                    history.push(`/tickets/${otherTicket.uuid}`);
                }
            } else {
                let setting;

                try {
                    setting = await getSetting({
                        "column": "sendGreetingAccepted"
                    });
                } catch (err) {
                    toastError(err);
                }

                if (setting.sendGreetingAccepted === "enabled" && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")) {
                    handleSendMessage(ticket.id);
                }
                if (isMounted.current) {
                    setLoading(false);
                }

                setTabOpen(ticket.isGroup ? "group" : "open");
                handleSelectTicket(ticket);
                history.push(`/tickets/${ticket.uuid}`);
            }
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
    };

    const handleSendMessage = async (id) => {
        let setting;

        try {
            setting = await getSetting({
                "column": "greetingAcceptedMessage"
            })
        } catch (err) {
            toastError(err);
        }

        const msg = `${setting.greetingAcceptedMessage}`;
        const message = {
            read: 1,
            fromMe: true,
            mediaUrl: "",
            body: `${msg.trim()}`,
        };
        try {
            await api.post(`/messages/${id}`, message);
        } catch (err) {
            toastError(err);
        }
    };

    const handleCloseAlert = useCallback(() => {
        setOpenAlert(false);
        setLoading(false);
    }, []);

    const handleDeleteTicket = async (e, ticketData) => {
        e.stopPropagation();

        const confirmed = window.confirm(
            `${i18n.t("ticketOptionsMenu.confirmationModal.title")} ${ticketData.contact?.name}?\n\n${i18n.t("ticketOptionsMenu.confirmationModal.message")}`
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            await api.delete(`/tickets/${ticketData.id}`);
            if (ticketId && ticketId === ticketData.uuid) {
                setCurrentTicket({ id: null, code: null });
                history.push("/tickets");
            }
        } catch (err) {
            toastError(err);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const { id, uuid } = ticket;
        setCurrentTicket({ id, uuid, code });
    };

    // Function to fetch messages for the ticket
    const fetchTicketMessages = async (ticketId) => {
        if (!ticketId) return;
        
        setLoadingMessages(true);
        try {
            const { data } = await api.get(`/messages/${ticketId}`, {
                params: { readOnly: "true" }
            });
            if (isMounted.current) {
                setTicketMessages(data.messages);
            }
        } catch (err) {
            toastError(err);
        } finally {
            setLoadingMessages(false);
        }
    };

    // Handle opening the message dialog
    const handleOpenMessageDialog = (e) => {
        e.stopPropagation();
        setOpenTicketMessageDialog(true);
        fetchTicketMessages(ticket.id);
    };

    const formattedUpdateLabel = ticket.lastMessage
        ? (isSameDay(parseISO(ticket.updatedAt), new Date())
            ? format(parseISO(ticket.updatedAt), "HH:mm")
            : format(parseISO(ticket.updatedAt), "dd/MM/yyyy"))
        : "";
    const connectionBadgeColor = getConnectionColor(ticket?.whatsapp);
    const contactPreviewTags = (
        ticket?.contact?.tags?.length
            ? ticket.contact.tags
            : ticket?.tags || []
    ).slice(0, 3);

    const renderLastMessageLabel = () => {
        if (!ticket.lastMessage) return "Sem mensagens";
        if (ticket.lastMessage.includes("fb.me")) return "Clique de anúncio";
        if (ticket.lastMessage.includes("data:image/png;base64")) return "Localização";
        if (ticket.lastMessage.includes("BEGIN:VCARD")) return "Contato";
        return truncate(ticket.lastMessage, 56);
    };

    return (
        <React.Fragment key={ticket.id}>
            {openAlert && (
                <ShowTicketOpen
                    isOpen={openAlert}
                    handleClose={handleCloseAlert}
                    user={userTicketOpen}
                    queue={queueTicketOpen}
                />
            )}
            {acceptTicketWithouSelectQueueOpen && (
                <AcceptTicketWithouSelectQueue
                    modalOpen={acceptTicketWithouSelectQueueOpen}
                    onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
                    ticketId={ticket.id}
                    ticket={ticket}
                />
            )}
            {transferTicketModalOpen && (
                <TransferTicketModalCustom
                    modalOpen={transferTicketModalOpen}
                    onClose={handleCloseTransferTicketModal}
                    ticketid={ticket.id}
                    ticket={ticket}
                />
            )}
            
            {/* Improved Message Dialog */}
            <Dialog 
                open={openTicketMessageDialog} 
                onClose={() => setOpenTicketMessageDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle disableTypography className={classes.dialogTitle}>
                    <Typography variant="h6">
                        Espiando a conversa
                    </Typography>
                    <IconButton 
                        aria-label="close" 
                        className={classes.closeButton} 
                        onClick={() => setOpenTicketMessageDialog(false)}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                
                <div className={classes.messagesHeader}>
                    <Avatar 
                        src={ticket?.contact?.urlPicture}
                        className={classes.messageAvatar}
                    />
                    <div>
                        <Typography variant="subtitle1">
                            {ticket.contact?.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            {ticket.whatsapp?.name || ticket.channel}
                        </Typography>
                    </div>
                </div>
                
                <Divider />
                
                <DialogContent className={classes.messagesContainer}>
                    {loadingMessages ? (
                        <div className={classes.loadingMessages}>
                            <Typography>Carregando mensagens...</Typography>
                        </div>
                    ) : ticketMessages.length === 0 ? (
                        <div className={classes.emptyMessages}>
                            <MessageIcon fontSize="large" />
                            <Typography variant="body1">
                                {i18n.t("ticketsList.noMessages")}
                            </Typography>
                        </div>
                    ) : (
                        ticketMessages.map((message) => (
                            <Paper 
                                key={message.id} 
                                className={clsx(
                                    classes.messageItem, 
                                    message.fromMe ? classes.fromMe : classes.fromThem
                                )}
                                elevation={0}
                            >
                                <Typography className={classes.messageText}>
                                    {message.body.includes('data:image/png;base64') ? (
                                        <MarkdownWrapper>Localização</MarkdownWrapper>
                                    ) : message.body.includes('BEGIN:VCARD') ? (
                                        <MarkdownWrapper>Contato</MarkdownWrapper>
                                    ) : (
                                        <MarkdownWrapper>{message.body}</MarkdownWrapper>
                                    )}
                                </Typography>
                                <Typography variant="caption" className={classes.messageTime}>
                                    {format(parseISO(message.createdAt), "HH:mm")}
                                </Typography>
                            </Paper>
                        ))
                    )}
                </DialogContent>
            </Dialog>
            
            <ListItem
                button
                dense
                onClick={(e) => {
                    const isCheckboxClicked = (e.target.tagName.toLowerCase() === "input" && e.target.type === "checkbox")
                        || (e.target.tagName.toLowerCase() === "svg" && e.target.type === undefined)
                        || (e.target.tagName.toLowerCase() === "path" && e.target.type === undefined);

                    if (isCheckboxClicked) return;

                    handleSelectTicket(ticket);
                }}
                selected={ticketId && ticketId === ticket.uuid}
                className={clsx(classes.ticket, {
                    [classes.pendingTicket]: ticket.status === "pending",
                    [classes.unreadTicket]: Number(ticket.unreadMessages) > 0,
                    [classes.readTicket]: Number(ticket.unreadMessages) === 0,
                })}
            >
                <ListItemAvatar className={classes.avatarWrap}>
                    <Avatar className={classes.ticketAvatar} src={`${ticket?.contact?.urlPicture}`} />
                </ListItemAvatar>

                <ListItemText
                    disableTypography
                    className={classes.contentRoot}
                    primary={
                        <div className={classes.primaryRow}>
                            <div className={classes.nameLine}>
                                {ticket.isGroup && ticket.channel === "whatsapp" && (
                                    <GroupIcon fontSize="small" style={{ color: grey[700] }} />
                                )}
                                {ticket.channel && (
                                    <ConnectionIcon
                                        width="18"
                                        height="18"
                                        className={classes.connectionIcon}
                                        connectionType={ticket.channel}
                                    />
                                )}
                                <Typography noWrap component="span" className={classes.contactName}>
                                    {truncate(ticket.contact?.name, 42)}
                                </Typography>
                            </div>

                            <div className={classes.rightTop}>
                                {Number(ticket.unreadMessages) > 0 && (
                                    <span className={classes.unreadCounter}>
                                        {ticket.unreadMessages}
                                    </span>
                                )}
                                {ticket.lastMessage && (
                                    <Typography
                                        component="span"
                                        className={Number(ticket.unreadMessages) > 0 ? classes.lastMessageTimeUnread : classes.lastMessageTime}
                                    >
                                        {formattedUpdateLabel}
                                    </Typography>
                                )}
                                <Tooltip title="Espiar conversa">
                                    <VisibilityIcon onClick={handleOpenMessageDialog} className={classes.viewIcon} />
                                </Tooltip>
                            </div>
                        </div>
                    }
                    secondary={
                        <div className={classes.secondaryContent}>
                            <Typography
                                noWrap
                                component="span"
                                className={clsx(classes.messagePreview, {
                                    [classes.messagePreviewUnread]: Number(ticket.unreadMessages) > 0,
                                })}
                            >
                                {renderLastMessageLabel()}
                            </Typography>

                            <div className={classes.metaRow}>
                                {ticket?.whatsapp && (
                                    <span
                                        className={classes.metaPill}
                                        style={{ backgroundColor: connectionBadgeColor }}
                                    >
                                        {ticket.whatsapp?.name.toUpperCase()}
                                    </span>
                                )}
                                <span
                                    className={classes.metaPill}
                                    style={{ backgroundColor: ticket.queue?.color || "#7c7c7c" }}
                                >
                                    {ticket.queueId
                                        ? ticket.queue?.name.toUpperCase()
                                        : ticket.status === "lgpd"
                                            ? "LGPD"
                                            : "SEM FILA"}
                                </span>
                                {ticket?.user && (
                                    <span className={classes.metaPill} style={{ backgroundColor: "#0f172a" }}>
                                        {ticket.user?.name.toUpperCase()}
                                    </span>
                                )}
                                {contactPreviewTags.map((tag) => (
                                    <span
                                        key={`ticket-contact-meta-tag-${ticket.id}-${tag.id}`}
                                        className={classes.metaTagPill}
                                        style={{ backgroundColor: tag.color || "#6b7280" }}
                                        title={tag.name}
                                    >
                                        <LocalOfferOutlinedIcon style={{ fontSize: 10 }} />
                                        {String(tag.name || "").toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    }
                />

                <ListItemSecondaryAction className={classes.actionsColumn}>
                    <div className={classes.actionButtonsRow}>
                        {ticket.status === "pending" && (ticket.queueId === null || ticket.queueId === undefined) && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonAccept)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAcceptTicketWithouSelectQueue();
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.accept")}>
                                    <Done fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {ticket.status === "pending" && ticket.queueId !== null && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonAccept)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcepptTicket(ticket.id);
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.accept")}>
                                    <Done fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {(ticket.status === "pending" || ticket.status === "open" || ticket.status === "group") && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonTransfer)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTransferModal();
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.transfer")}>
                                    <SwapHoriz fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {(ticket.status === "open" || ticket.status === "group") && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonDanger)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseTicket(ticket.id);
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.closed")}>
                                    <HighlightOff fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {(ticket.status === "pending" || ticket.status === "lgpd") && (user.userClosePendingTicket === "enabled" || user.profile === "admin") && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonDanger)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseIgnoreTicket(ticket.id);
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.ignore")}>
                                    <HighlightOff fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {ticket.status === "closed" && (ticket.queueId === null || ticket.queueId === undefined) && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonNeutral)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAcceptTicketWithouSelectQueue();
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.reopen")}>
                                    <Replay fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {ticket.status === "closed" && ticket.queueId !== null && (
                            <ButtonWithSpinner
                                variant="contained"
                                className={clsx(classes.actionButton, classes.actionButtonNeutral)}
                                size="small"
                                loading={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcepptTicket(ticket.id);
                                }}
                            >
                                <Tooltip title={i18n.t("ticketsList.buttons.reopen")}>
                                    <Replay fontSize="small" />
                                </Tooltip>
                            </ButtonWithSpinner>
                        )}

                        {ticket.status === "closed" && (
                            <Can
                                role={user.profile}
                                perform="ticket-options:deleteTicket"
                                yes={() => (
                                    <ButtonWithSpinner
                                        variant="contained"
                                        className={clsx(classes.actionButton, classes.actionButtonDelete)}
                                        size="small"
                                        loading={loading}
                                        onClick={(e) => handleDeleteTicket(e, ticket)}
                                    >
                                        <Tooltip title={i18n.t("ticketOptionsMenu.delete")}>
                                            <DeleteForever fontSize="small" />
                                        </Tooltip>
                                    </ButtonWithSpinner>
                                )}
                            />
                        )}
                    </div>
                </ListItemSecondaryAction>
            </ListItem>
            {/* <Divider variant="inset" component="li" /> */}
        </React.Fragment>
    );
};

export default TicketListItemCustom;
