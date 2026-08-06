import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams, useHistory } from "react-router-dom";

import clsx from "clsx";

import { IconButton, InputBase, Paper, makeStyles } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import CloseIcon from "@material-ui/icons/Close";

import ContactDrawer from "../ContactDrawer";
import MessageInput from "../MessageInput";
import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtonsCustom";
import MessagesList from "../MessagesList";
import api from "../../services/api";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";

import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TagsContainer } from "../TagsContainer";
import { isNil } from 'lodash';
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

const drawerWidth = 320;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "transparent",
    padding: theme.spacing(1),
  },

  mainWrapper: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: "0",
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.mode === "light" ? "rgba(255,255,255,0.94)" : "rgba(15,23,42,0.9)",
    marginRight: -drawerWidth,
    boxShadow:
      theme.mode === "light"
        ? "0 14px 28px rgba(15,23,42,0.08)"
        : "0 14px 28px rgba(0,0,0,0.36)",
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },

  mainWrapperShift: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  },
  tagsPaper: {
    borderRadius: 0,
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.mode === "light" ? "rgba(248,250,252,0.95)" : "rgba(30,41,59,0.7)",
  },
  searchBarWrapper: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.8),
    padding: theme.spacing(0.5, 1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.mode === "light" ? "rgba(255,255,255,0.95)" : "rgba(30,41,59,0.72)",
  },
  searchIcon: {
    color: theme.palette.text.secondary,
    fontSize: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: "0.86rem",
  },
}));

const Ticket = () => {
  const { ticketId } = useParams();
  const history = useHistory();
  const classes = useStyles();

  const { user, socket } = useContext(AuthContext);
  const { setTabOpen } = useContext(TicketsContext);


  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [ticket, setTicket] = useState({});
  const [dragDropFiles, setDragDropFiles] = useState([]);
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const { companyId } = user;

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTicket = async () => {
        try {

          if (!isNil(ticketId) && ticketId !== "undefined") {

            const { data } = await api.get("/tickets/u/" + ticketId);

            setContact(data.contact);
            // setWhatsapp(data.whatsapp);
            // setQueueId(data.queueId);
            setTicket(data);
            if (["pending", "open", "group"].includes(data.status)) {
              setTabOpen(data.status);
            }
            setLoading(false);
          }
        } catch (err) {
          history.push("/tickets");   // correção para evitar tela branca uuid não encontrado Feito por Altemir 16/08/2023
          setLoading(false);
          toastError(err);
        }
      };
      fetchTicket();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [ticketId, user, history]);

  useEffect(() => {
    if (!ticket && !ticket.id && ticket.uuid !== ticketId && ticketId === "undefined") {
      return;
    }

    if (user.companyId) {
      //    const socket = socketManager.GetSocket();

      const onConnectTicket = () => {
        socket.emit("joinChatBox", `${ticket.id}`);
      }

      const onCompanyTicket = (data) => {
        if (data.action === "update" && data.ticket.id === ticket?.id) {
          setTicket(data.ticket);
        }

        if (data.action === "delete" && data.ticketId === ticket?.id) {
          history.push("/tickets");
        }
      };

      const onCompanyContactTicket = (data) => {
        if (data.action === "update") {
          // if (isMounted) {
          setContact((prevState) => {
            if (prevState.id === data.contact?.id) {
              return { ...prevState, ...data.contact };
            }
            return prevState;
          });
          // }
        }
      };

      socket.on("connect", onConnectTicket)
      socket.on(`company-${companyId}-ticket`, onCompanyTicket);
      socket.on(`company-${companyId}-contact`, onCompanyContactTicket);

      return () => {

        socket.emit("joinChatBoxLeave", `${ticket.id}`);
        socket.off("connect", onConnectTicket);
        socket.off(`company-${companyId}-ticket`, onCompanyTicket);
        socket.off(`company-${companyId}-contact`, onCompanyContactTicket);
      };
    }
  }, [ticketId, ticket, history]);

  const handleDrawerOpen = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleToggleMessageSearch = useCallback(() => {
    setShowMessageSearch((prev) => {
      if (prev) {
        setMessageSearch("");
      }
      return !prev;
    });
  }, []);

  const renderMessagesList = () => {
    return (
      <>
        <MessagesList
          isGroup={ticket.isGroup}
          onDrop={setDragDropFiles}
          whatsappId={ticket.whatsappId}
          queueId={ticket.queueId}
          channel={ticket.channel}
          ticketDbId={ticket.id}
          ticketUuid={ticket.uuid}
          searchParam={messageSearch}
        >
        </MessagesList>
        <MessageInput
          ticketId={ticket.id}
          ticketStatus={ticket.status}
          ticketChannel={ticket.channel}
          droppedFiles={dragDropFiles}
          contactId={contact.id}
          disableAutoFocus={showMessageSearch}
        />
      </>
    );
  };


  return (
    <div className={classes.root} id="drawer-container">
      <Paper
        variant="outlined"
        elevation={0}
        className={clsx(classes.mainWrapper, {
          [classes.mainWrapperShift]: drawerOpen,
        })}
      >
        {/* <div id="TicketHeader"> */}
        <TicketHeader loading={loading}>
          {ticket.contact !== undefined && (
            <div id="TicketHeader">
              <TicketInfo
                contact={contact}
                ticket={ticket}
                onClick={handleDrawerOpen}
                onToggleSearch={handleToggleMessageSearch}
                isSearching={showMessageSearch}
              />
            </div>
          )}
          <TicketActionButtons
            ticket={ticket}
          />
        </TicketHeader>
        {showMessageSearch && (
          <div className={classes.searchBarWrapper}>
            <SearchIcon className={classes.searchIcon} />
            <InputBase
              autoFocus
              className={classes.searchInput}
              placeholder="Buscar mensagens nesta conversa..."
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
            />
            <IconButton size="small" onClick={handleToggleMessageSearch}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        )}
        {/* </div> */}
        <Paper className={classes.tagsPaper}>
          <TagsContainer contact={contact} />
        </Paper>
        <ReplyMessageProvider>
          <ForwardMessageProvider>
            <EditMessageProvider>
              {renderMessagesList()}
            </EditMessageProvider>
          </ForwardMessageProvider>
        </ReplyMessageProvider>
      </Paper>

      <ContactDrawer
        open={drawerOpen}
        handleDrawerClose={handleDrawerClose}
        contact={contact}
        loading={loading}
        ticket={ticket}
      />

    </div>
  );
};

export default Ticket;
