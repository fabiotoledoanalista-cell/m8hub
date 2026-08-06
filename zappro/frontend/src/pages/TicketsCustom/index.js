import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Paper from "@material-ui/core/Paper";
import Hidden from "@material-ui/core/Hidden";
import { makeStyles } from "@material-ui/core/styles";
import TicketsManager from "../../components/TicketsManagerTabs";
import Ticket from "../../components/Ticket";

import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";

const defaultTicketsManagerWidth = 550;
const minTicketsManagerWidth = 404;
const maxTicketsManagerWidth = 700;

const useStyles = makeStyles((theme) => ({
	chatContainer: {
		flex: 1,
		padding: theme.spacing(1.2),
		height: `calc(100% - 48px)`,
		overflowY: "hidden",
		background:
			theme.mode === "light"
				? "linear-gradient(155deg, #f5f9ff 0%, #eef4ff 48%, #f7fbff 100%)"
				: "linear-gradient(155deg, #0f172a 0%, #111827 50%, #1f2937 100%)",
	},
	chatPapper: {
		display: "flex",
		height: "100%",
		borderRadius: 18,
		overflow: "hidden",
		boxShadow:
			theme.mode === "light"
				? "0 16px 35px rgba(15, 23, 42, 0.11)"
				: "0 16px 35px rgba(0, 0, 0, 0.42)",
	},
	contactsWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflowY: "hidden",
		position: "relative",
		backgroundColor:
			theme.mode === "light" ? "rgba(255,255,255,0.94)" : "rgba(17,24,39,0.92)",
		backdropFilter: "blur(8px)",
	},
	messagesWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		flexGrow: 1,
		backgroundColor:
			theme.mode === "light" ? "rgba(255,255,255,0.86)" : "rgba(15,23,42,0.92)",
	},
	welcomeMsg: {
		background:
			theme.mode === "light"
				? "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)"
				: "linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		height: "100%",
		textAlign: "center",
		borderRadius: 16,
		border: `1px solid ${theme.palette.divider}`,
		margin: theme.spacing(1),
		boxShadow:
			theme.mode === "light"
				? "0 10px 22px rgba(15, 23, 42, 0.08)"
				: "0 10px 22px rgba(0, 0, 0, 0.35)",
		color: theme.palette.text.primary,
	},
	welcomeInner: {
		maxWidth: 420,
		padding: theme.spacing(2),
	},
	welcomeTitle: {
		fontSize: "1.15rem",
		fontWeight: 700,
		marginTop: theme.spacing(1),
	},
	welcomeText: {
		marginTop: theme.spacing(0.7),
		fontSize: "0.86rem",
		lineHeight: 1.45,
		color: theme.palette.text.secondary,
	},
	dragger: {
		width: "5px",
		cursor: "ew-resize",
		padding: "4px 0 0",
		borderTop: "1px solid rgba(148,163,184,0.45)",
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		zIndex: 100,
		background:
			theme.mode === "light"
				? "linear-gradient(180deg, #e8edf5 0%, #dbe4ef 100%)"
				: "linear-gradient(180deg, #243244 0%, #1f2937 100%)",
		userSelect: "none", // Evita a seleção de texto no elemento de redimensionamento
		transition: "all 0.2s ease",
		"&:hover": {
			width: 7,
		},
	},
	logo: {
		logo: theme.logo,
		content: "url(" + (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) + ")",
		opacity: 0.92,
		filter: theme.mode === "light" ? "none" : "brightness(1.12)",
	},
}));

const TicketsCustom = () => {
	const { user } = useContext(AuthContext);

	const classes = useStyles({ ticketsManagerWidth: user.defaultTicketsManagerWidth || defaultTicketsManagerWidth });

	const { ticketId } = useParams();

	const [ticketsManagerWidth, setTicketsManagerWidth] = useState(0);
	const ticketsManagerWidthRef = useRef(ticketsManagerWidth);

	useEffect(() => {
		if (user && user.defaultTicketsManagerWidth) {
			setTicketsManagerWidth(user.defaultTicketsManagerWidth);
		}
	}, [user]);

	// useEffect(() => {
	// 	if (ticketId && currentTicket.uuid === undefined) {
	// 		history.push("/tickets");
	// 	}
	// }, [ticketId, currentTicket.uuid, history]);

	const handleMouseDown = (e) => {
		document.addEventListener("mouseup", handleMouseUp, true);
		document.addEventListener("mousemove", handleMouseMove, true);
	};
	const handleSaveContact = async value => {
		if (value < 404)
			value = 404
		await api.put(`/users/toggleChangeWidht/${user.id}`, { defaultTicketsManagerWidth: value });

	}
	const handleMouseMove = useCallback(
		(e) => {
			const newWidth = e.clientX - document.body.offsetLeft;
			if (
				newWidth > minTicketsManagerWidth &&
				newWidth < maxTicketsManagerWidth
			) {
				ticketsManagerWidthRef.current = newWidth;
				setTicketsManagerWidth(newWidth);
			}
		},
		[]
	);

	const handleMouseUp = async () => {
		document.removeEventListener("mouseup", handleMouseUp, true);
		document.removeEventListener("mousemove", handleMouseMove, true);

		const newWidth = ticketsManagerWidthRef.current;

		if (newWidth !== ticketsManagerWidth) {
			await handleSaveContact(newWidth);
		}
	};

	return (
		<QueueSelectedProvider>
			<div className={classes.chatContainer}>
				<div className={classes.chatPapper}>
					<div
						className={classes.contactsWrapper}
						style={{ width: ticketsManagerWidth }}
					>
						<TicketsManager />
						<div onMouseDown={e => handleMouseDown(e)} className={classes.dragger} />
					</div>
					<div className={classes.messagesWrapper}>
						{ticketId ? (
							<>
								{/* <Suspense fallback={<CircularProgress />}> */}
								<Ticket />
								{/* </Suspense> */}
							</>
						) : (
							<Hidden only={["sm", "xs"]}>
								<Paper square variant="outlined" className={classes.welcomeMsg}>
									<div className={classes.welcomeInner}>
										<center>
											<img className={classes.logo} width="48%" alt="" />
										</center>
										<div className={classes.welcomeTitle}>Central de Atendimentos</div>
										<div className={classes.welcomeText}>{i18n.t("chat.noTicketMessage")}</div>
									</div>
								</Paper>
							</Hidden>
						)}
					</div>
				</div>
			</div>
		</QueueSelectedProvider>
	);
};

export default TicketsCustom;
