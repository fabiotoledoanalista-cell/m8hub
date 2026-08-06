import React, { useState, useRef, useEffect, useContext } from "react";
import { useTheme } from "@material-ui/core/styles";

import { useHistory } from "react-router-dom";
import { format } from "date-fns";
// import { SocketContext } from "../../context/Socket/SocketContext";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import Tooltip from "@material-ui/core/Tooltip";
import ChatIcon from "@material-ui/icons/Chat";
import NotificationsIcon from "@material-ui/icons/Notifications";

import TicketListItem from "../TicketListItem";
import useTickets from "../../hooks/useTickets";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import api from "../../services/api";
import Favicon from "react-favicon";
import { getBackendUrl } from "../../config";
import defaultLogoFavicon from "../../assets/favicon.ico";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { SOUND_MAP } from "../../utils/notificationSounds";

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 350,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 350,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			maxWidth: 270,
		},
	},
	noShadow: {
		boxShadow: "none !important",
	},
}));

const NotificationsPopOver = ({ volume, notificationSound, notificationMuted }) => {
	const classes = useStyles();
	const theme = useTheme();

	const history = useHistory();
	// const socketManager = useContext(SocketContext);
	const { user, socket } = useContext(AuthContext);
	const { profile, queues } = user;

	const ticketIdUrl = +history.location.pathname.split("/")[2];
	const ticketIdRef = useRef(ticketIdUrl);
	const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const queueIds = queues.map((q) => q.id);
	const { get: getSetting } = useCompanySettings();
    const { setCurrentTicket, setTabOpen } = useContext(TicketsContext);

	const [showTicketWithoutQueue, setShowTicketWithoutQueue] = useState(false);
	const [showNotificationPending, setShowNotificationPending] = useState(false);
	const [showGroupNotification, setShowGroupNotification] = useState(false);

	const [, setDesktopNotifications] = useState([]);

	const { tickets } = useTickets({
		withUnreadMessages: "true"
		// showAll: showTicketWithoutQueue ? "true" : "false"
	});

	const selectedSound = SOUND_MAP[notificationSound] || SOUND_MAP.classic;
	const soundAlertRef = useRef();
	const normalizedVolume = Number.isFinite(Number(volume))
		? Math.min(1, Math.max(0, Number(volume)))
		: 1;

	const historyRef = useRef(history);
	const syncingPushRef = useRef(false);

	const urlBase64ToUint8Array = (base64String) => {
		const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; i += 1) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	};

	const ensurePushSubscription = async () => {
		if (syncingPushRef.current) return;
		if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
		if (!("Notification" in window) || Notification.permission !== "granted") return;

		try {
			syncingPushRef.current = true;
			const { data } = await api.get("/push/public-key");
			const publicKey = data?.publicKey;
			if (!publicKey) return;

			const registration = await navigator.serviceWorker.ready;
			let subscription = await registration.pushManager.getSubscription();

			if (!subscription) {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(publicKey),
				});
			}

			if (subscription) {
				await api.post("/push/subscriptions", {
					subscription: subscription.toJSON(),
				});
			}
		} catch (err) {
			console.warn("Falha ao sincronizar inscrição de push:", err);
		} finally {
			syncingPushRef.current = false;
		}
	};

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const setting = await getSetting(
					{
						"column": "showNotificationPending"
					}
				);



				if (setting.showNotificationPending === true) {
					setShowNotificationPending(true);
				}

				if (user.allTicket === "enable") {
					setShowTicketWithoutQueue(true);
				}
				if (user.allowGroup === true) {
					setShowGroupNotification(true);
				}
			} catch (err) {
				toastError(err);
			}
		}

		fetchSettings();
	}, [setShowTicketWithoutQueue, setShowNotificationPending]);

	useEffect(() => {
		if (!("Notification" in window)) {
			console.log("This browser doesn't support notifications");
		} else if (Notification.permission === "default") {
			const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
			const isStandalone = window.navigator.standalone === true;
			if (!(isIOS && isStandalone)) {
				Notification.requestPermission().catch(() => {});
			}
		}
	}, []);

	useEffect(() => {
		if (user?.id && Notification.permission === "granted") {
			ensurePushSubscription();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id]);

	useEffect(() => {
		const alertAudio = new Audio(selectedSound);
		alertAudio.preload = "auto";
		alertAudio.volume = notificationMuted ? 0 : normalizedVolume;
		soundAlertRef.current = alertAudio;

		return () => {
			alertAudio.pause();
		};
	}, [selectedSound, normalizedVolume, notificationMuted]);

	useEffect(() => {
		const processNotifications = () => {
			// if (showTicketWithoutQueue) {
			setNotifications(tickets);
			// } else {
			// 	const newNotifications = tickets.filter(ticket => ticket.status !== "pending");

			// 	setNotifications(newNotifications);
			// }
		}

		processNotifications();
	}, [tickets]);

	useEffect(() => {
		ticketIdRef.current = ticketIdUrl;
	}, [ticketIdUrl]);

	useEffect(() => {
		const companyId = user.companyId;
		// const socket = socketManager.GetSocket();
		if (user.id) {
			const queueIds = queues.map((q) => q.id);

			const onConnectNotificationsPopover = () => {
				socket.emit("joinNotification");
			}

			if (socket.connected) {
				socket.emit("joinNotification");
			}

			const onCompanyTicketNotificationsPopover = (data) => {
				if (data.action === "updateUnread" || data.action === "delete") {
					setNotifications(prevState => {
						const ticketIndex = prevState.findIndex(t => t.id === data.ticketId);
						if (ticketIndex !== -1) {
							prevState.splice(ticketIndex, 1);
							return [...prevState];
						}
						return prevState;
					});

					setDesktopNotifications(prevState => {
						const notfiticationIndex = prevState.findIndex(
							n => n.tag === String(data.ticketId)
						);
						if (notfiticationIndex !== -1) {
							prevState[notfiticationIndex].close();
							prevState.splice(notfiticationIndex, 1);
							return [...prevState];
						}
						return prevState;
					});
				}
			};

			const onCompanyAppMessageNotificationsPopover = (data) => {
				// if (
				// 	data.action === "create" && !data.message.fromMe &&
				// 	(
				// 		data.ticket.status !== 'pending' &&
				// 		data.ticket.status !== "lgpd" &&
				// 		data.ticket.status !== "nps"						
				// 	) &&
				// 	(!data.message.read || (data.ticket.status === "pending" && showTicketWithoutQueue && data.ticket.queueId === null) || (data.ticket.status === "pending" && !showTicketWithoutQueue && user?.queues?.some(queue => (queue.id === data.ticket.queueId)))) &&
				// 	(data.ticket.userId === user?.id || !data.ticket.userId)
				// ) {
				// 
				
				const queueMatchesUser = user?.queues?.some(
					queue => String(queue.id) === String(data.ticket?.queueId)
				);
				const canAccessQueue =
					String(profile).toLowerCase() === "admin" ||
					user?.allTicket === "enable" ||
					String(user?.allUserChat).toLowerCase() === "enabled" ||
					queueMatchesUser ||
					(!data.ticket?.queueId && showTicketWithoutQueue === true);

					if (
						data.action === "create" && !data.message.fromMe &&
						(data.ticket?.userId === user?.id || !data.ticket?.userId) &&
						canAccessQueue &&
						(!["lgpd", "nps", "group"].includes(data.ticket?.status) ||
							(data.ticket?.status === "group" && data.ticket?.whatsapp?.groupAsTicket === "enabled" && showGroupNotification === true))
					) {
					setNotifications(prevState => {
						const ticketIndex = prevState.findIndex(t => t.id === data.ticket.id);
						if (ticketIndex !== -1) {
							prevState[ticketIndex] = data.ticket;
							return [...prevState];
						}
						return [data.ticket, ...prevState];
					});

					const shouldNotNotificate =
						(data.message.ticketId === ticketIdRef.current &&
							document.visibilityState === "visible") ||
						(data.ticket.userId && data.ticket.userId !== user?.id) ||
						(data.ticket.isGroup && data.ticket?.whatsapp?.groupAsTicket === "disabled" && showGroupNotification === false);

						if (!notificationMuted && soundAlertRef.current) {
							soundAlertRef.current.volume = normalizedVolume;
							soundAlertRef.current.currentTime = 0;
							soundAlertRef.current.play().catch((err) => {
								console.warn("Falha ao reproduzir som de notificação:", err);
							});
						}

						if (shouldNotNotificate === true) return;

							handleNotifications(data);
						}
					}

			socket.on("connect", onConnectNotificationsPopover);
			socket.on(`company-${companyId}-ticket`, onCompanyTicketNotificationsPopover);
			socket.on(`company-${companyId}-appMessage`, onCompanyAppMessageNotificationsPopover);

			return () => {
				socket.emit("leaveNotification");
				socket.off("connect", onConnectNotificationsPopover);
				socket.off(`company-${companyId}-ticket`, onCompanyTicketNotificationsPopover);
				socket.off(`company-${companyId}-appMessage`, onCompanyAppMessageNotificationsPopover);
			};
		}
	}, [user, profile, queues, showTicketWithoutQueue, socket, showNotificationPending, showGroupNotification, notificationMuted, normalizedVolume]);

	const handleNotifications = data => {
		const { message, contact, ticket } = data;

		if (!("Notification" in window) || Notification.permission !== "granted") {
			return;
		}

		const options = {
			body: `${message.body} - ${format(new Date(), "HH:mm")}`,
			icon: contact.urlPicture,
			tag: ticket.id,
			renotify: true,
		};
		let notification;
		try {
			notification = new Notification(
				`${i18n.t("tickets.notification.message")} ${contact.name}`,
				options
			);
		} catch (err) {
			console.warn("Falha ao criar notificação do navegador:", err);
			return;
		}

		notification.onclick = e => {
			e.preventDefault();
			window.focus();
			setTabOpen(ticket.status)
			historyRef.current.push(`/tickets/${ticket.uuid}`);
			// handleChangeTab(null, ticket.isGroup? "group" : "open");
		};

		setDesktopNotifications(prevState => {
			const notfiticationIndex = prevState.findIndex(
				n => n.tag === notification.tag
			);
			if (notfiticationIndex !== -1) {
				prevState[notfiticationIndex] = notification;
				return [...prevState];
			}
			return [notification, ...prevState];
		});
	};

	const handleClick = () => {
		setIsOpen(prevState => !prevState);
	};

	const handleEnableNotifications = () => {
		if (!("Notification" in window)) {
			return;
		}

		if (Notification.permission === "default") {
			Notification.requestPermission()
				.then((permission) => {
					if (permission === "granted") {
						ensurePushSubscription();
					}
				})
				.catch(() => {});
			return;
		}

		if (Notification.permission === "granted") {
			ensurePushSubscription();
		}
	};

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const NotificationTicket = ({ children }) => {
		return <div onClick={handleClickAway}>{children}</div>;
	};

	const browserNotification = () => {
		const numbers = "⓿➊➋➌➍➎➏➐➑➒➓⓫⓬⓭⓮⓯⓰⓱⓲⓳⓴";
		if (notifications.length > 0) {
			if (notifications.length < 21) {
				document.title = numbers.substring(notifications.length, notifications.length + 1) + " - " + (theme.appName || "...");
			} else {
				document.title = "(" + notifications.length + ")" + (theme.appName || "...");
			}
		} else {
			document.title = theme.appName || "...";
		}
		return (
			<>
				<Favicon
					animated={true}
					url={(theme?.appLogoFavicon) ? theme.appLogoFavicon : defaultLogoFavicon}
					alertCount={notifications.length}
					iconSize={195}
				/>
			</>
		);
	};

	return (
		<>
			{browserNotification()}

			<Tooltip
				title={
					!("Notification" in window)
						? "Notificações não suportadas"
						: Notification.permission === "granted"
							? "Notificações ativadas"
							: Notification.permission === "denied"
								? "Notificações bloqueadas no navegador"
								: "Ativar notificações"
				}
			>
				<IconButton
					onClick={handleEnableNotifications}
					aria-label="Enable Push Notifications"
					color="inherit"
					style={{ color: "white" }}
				>
					<NotificationsIcon />
				</IconButton>
			</Tooltip>

			<Tooltip title="Mensagens e alertas">
				<IconButton
					onClick={handleClick}
					ref={anchorEl}
					aria-label="Open Notifications"
					color="inherit"
					style={{ color: "white" }}
				>
					<Badge overlap="rectangular" badgeContent={notifications.length} color="secondary">
						<ChatIcon />
					</Badge>
				</IconButton>
			</Tooltip>
			<Popover
				disableScrollLock
				open={isOpen}
				anchorEl={anchorEl.current}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				classes={{ paper: classes.popoverPaper }}
				onClose={handleClickAway}
			>
				<List dense className={classes.tabContainer}>
					{notifications.length === 0 ? (
						<ListItem>
							<ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
						</ListItem>
					) : (
						notifications.map(ticket => (
							<NotificationTicket key={ticket.id}>
								<TicketListItem ticket={ticket} />
							</NotificationTicket>
						))
					)}
				</List>
			</Popover>
		</>
	);
};

export default NotificationsPopOver;
