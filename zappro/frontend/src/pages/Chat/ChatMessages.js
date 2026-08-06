import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Box,
  FormControl,
  IconButton,
  Input,
  InputAdornment,
  makeStyles,
  Paper,
  Typography,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";

import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflow: "hidden",
    borderRadius: 0,
    height: "100%",
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  chatHeader: {
    padding: theme.spacing(1.1, 1.4),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.03)"
        : "rgba(15, 23, 42, 0.02)",
  },
  chatTitle: {
    fontWeight: 700,
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
  },
  chatSubtitle: {
    fontSize: "0.76rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  messageList: {
    position: "relative",
    overflowY: "auto",
    height: "100%",
    ...theme.scrollbarStyles,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(15, 23, 42, 0.55)"
        : "rgba(248, 250, 255, 0.82)",
  },
  inputArea: {
    position: "relative",
    height: "auto",
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.03)"
        : "rgba(255,255,255,0.96)",
  },
  input: {
    padding: "12px 16px",
    fontSize: "0.85rem",
  },
  buttonSend: {
    margin: theme.spacing(0.4, 0.7),
    color: theme.palette.primary.main,
  },
  boxLeft: {
    padding: "8px 11px 6px",
    margin: "10px",
    position: "relative",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(30, 41, 59, 0.88)" : "#ffffff",
    color: theme.palette.type === "dark" ? "#e2e8f0" : "#303030",
    maxWidth: 360,
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(148, 163, 184, 0.22)"
        : "rgba(0, 0, 0, 0.12)"
    }`,
    boxShadow:
      theme.palette.type === "dark"
        ? "0 8px 18px rgba(0, 0, 0, 0.35)"
        : "0 6px 14px rgba(15, 23, 42, 0.08)",
  },
  boxRight: {
    padding: "8px 11px 6px",
    margin: "10px 10px 10px auto",
    position: "relative",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(37, 99, 235, 0.22)" : "#dcf8c6",
    color: theme.palette.type === "dark" ? "#dbeafe" : "#303030",
    textAlign: "right",
    maxWidth: 360,
    borderRadius: 12,
    borderBottomRightRadius: 0,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(96, 165, 250, 0.35)"
        : "rgba(0, 0, 0, 0.12)"
    }`,
    boxShadow:
      theme.palette.type === "dark"
        ? "0 8px 18px rgba(0, 0, 0, 0.35)"
        : "0 6px 14px rgba(15, 23, 42, 0.08)",
  },
  messageSender: {
    fontSize: "0.76rem",
    fontWeight: 700,
    marginBottom: 2,
  },
  messageText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: "0.84rem",
    lineHeight: 1.35,
  },
  messageTime: {
    fontSize: "0.7rem",
    marginTop: 3,
    opacity: 0.72,
  },
  emptyState: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.text.secondary,
    fontSize: "0.84rem",
  },
}));

export default function ChatMessages({
  chat,
  messages,
  handleSendMessage,
  handleLoadMore,
  scrollToBottomRef,
  pageInfo,
  loading,
}) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { datetimeToClient } = useDate();
  const baseRef = useRef();

  const [contentMessage, setContentMessage] = useState("");

  const scrollToBottom = () => {
    if (baseRef.current) {
      baseRef.current.scrollIntoView({});
    }
  };

  const unreadMessages = (chat) => {
    if (chat !== undefined) {
      const currentUser = chat.users.find((u) => u.userId === user.id);
      return currentUser.unreads > 0;
    }
    return 0;
  };

  useEffect(() => {
    if (unreadMessages(chat) > 0) {
      try {
        api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) {}
    }
    scrollToBottomRef.current = scrollToBottom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    if (!pageInfo.hasMore || loading) return;
    if (scrollTop < 600) {
      handleLoadMore();
    }
  };

  return (
    <Paper className={classes.mainContainer}>
      <div className={classes.chatHeader}>
        <Typography className={classes.chatTitle}>{chat?.title || "Conversa interna"}</Typography>
        <Typography className={classes.chatSubtitle}>
          {Array.isArray(chat?.users) ? `${chat.users.length} participantes` : "Equipe interna"}
        </Typography>
      </div>
      <div onScroll={handleScroll} className={classes.messageList}>
        {Array.isArray(messages) &&
          messages.length > 0 &&
          messages.map((item, key) => {
            if (item.senderId === user.id) {
              return (
                <Box key={key} className={classes.boxRight}>
                  <Typography className={classes.messageSender}>
                    {item.sender.name}
                  </Typography>
                  <Typography className={classes.messageText}>{item.message}</Typography>
                  <Typography className={classes.messageTime} display="block">
                    {datetimeToClient(item.createdAt)}
                  </Typography>
                </Box>
              );
            } else {
              return (
                <Box key={key} className={classes.boxLeft}>
                  <Typography className={classes.messageSender}>
                    {item.sender.name}
                  </Typography>
                  <Typography className={classes.messageText}>{item.message}</Typography>
                  <Typography className={classes.messageTime} display="block">
                    {datetimeToClient(item.createdAt)}
                  </Typography>
                </Box>
              );
            }
          })}
        {(!Array.isArray(messages) || messages.length === 0) && (
          <Box className={classes.emptyState}>Nenhuma mensagem ainda. Envie a primeira mensagem.</Box>
        )}
        <div ref={baseRef}></div>
      </div>
      <div className={classes.inputArea}>
        <FormControl variant="outlined" fullWidth>
          <Input
            multiline
            placeholder="Digite uma mensagem para o time..."
            value={contentMessage}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && contentMessage.trim() !== "") {
                e.preventDefault();
                handleSendMessage(contentMessage);
                setContentMessage("");
              }
            }}
            onChange={(e) => setContentMessage(e.target.value)}
            className={classes.input}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => {
                    if (contentMessage.trim() !== "") {
                      handleSendMessage(contentMessage);
                      setContentMessage("");
                    }
                  }}
                  className={classes.buttonSend}
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>
      </div>
    </Paper>
  );
}
