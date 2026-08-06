import React, { useContext, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  makeStyles,
} from "@material-ui/core";

import { useHistory, useParams } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";

import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";

import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    height: "calc(100% - 58px)",
    overflow: "hidden",
    borderRadius: 0,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.01)"
        : "rgba(248, 250, 255, 0.82)",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    padding: theme.spacing(1, 0.75),
  },
  listItemActive: {
    cursor: "pointer",
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(96, 165, 250, 0.14)"
        : "rgba(47, 75, 124, 0.08)",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 8px 18px rgba(0, 0, 0, 0.32)"
        : "0 8px 16px rgba(15, 23, 42, 0.10)",
    position: "relative",
    "&::before": {
      content: '""',
      position: "absolute",
      left: 4,
      top: 8,
      bottom: 8,
      width: 4,
      borderRadius: 999,
      backgroundColor: theme.palette.primary.main,
    },
  },
  listItem: {
    cursor: "pointer",
    backgroundColor: "transparent",
    borderRadius: 12,
    marginBottom: 6,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(148, 163, 184, 0.22)"
        : "rgba(203, 213, 225, 0.7)"
    }`,
    paddingLeft: theme.spacing(1),
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(148, 163, 184, 0.1)"
          : "rgba(15, 23, 42, 0.03)",
    },
  },
  unreadChip: {
    marginLeft: 6,
    height: 20,
    minWidth: 20,
    fontWeight: 700,
    fontSize: "0.72rem",
  },
  secondaryAction: {
    right: 8,
  },
  actionButton: {
    color: theme.palette.text.secondary,
  },
  emptyState: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
    fontSize: "0.82rem",
  },
}));

export default function ChatList({
  chats,
  handleSelectChat,
  handleDeleteChat,
  handleEditChat,
  pageInfo,
  loading,
}) {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { datetimeToClient } = useDate();

  const [confirmationModal, setConfirmModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState({});

  const { id } = useParams();

  const goToMessages = async (chat) => {
    if (unreadMessages(chat) > 0) {
      try {
        await api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) {}
    }

    if (id !== chat.uuid) {
      history.push(`/chats/${chat.uuid}`);
      handleSelectChat(chat);
    }
  };

  const handleDelete = () => {
    handleDeleteChat(selectedChat);
  };

  const unreadMessages = (chat) => {
    const currentUser = chat.users.find((u) => u.userId === user.id);
    return currentUser.unreads;
  };

  const getPrimaryText = (chat) => {
    const mainText = chat.title;
    const unreads = unreadMessages(chat);
    return (
      <>
        {mainText}
        {unreads > 0 && (
          <Chip
            size="small"
            className={classes.unreadChip}
            label={unreads}
            color="secondary"
          />
        )}
      </>
    );
  };

  const getSecondaryText = (chat) => {
    return chat.lastMessage !== ""
      ? `${datetimeToClient(chat.updatedAt)}: ${chat.lastMessage}`
      : "";
  };

  return (
    <>
      <ConfirmationModal
        title={"Excluir Conversa"}
        open={confirmationModal}
        onClose={setConfirmModalOpen}
        onConfirm={handleDelete}
      >
        Esta ação não pode ser revertida, confirmar?
      </ConfirmationModal>
      <div className={classes.mainContainer}>
        <div className={classes.chatList}>
          <List disablePadding>
            {Array.isArray(chats) &&
              chats.length > 0 &&
              chats.map((chat, key) => (
                <ListItem
                  onClick={() => goToMessages(chat)}
                  key={key}
                  className={chat.uuid === id ? classes.listItemActive : classes.listItem}
                  // style={getItemStyle(chat)}
                  button
                >
                  <ListItemText
                    primary={getPrimaryText(chat)}
                    secondary={getSecondaryText(chat)}
                    primaryTypographyProps={{ noWrap: true, style: { fontWeight: 600 } }}
                    secondaryTypographyProps={{ noWrap: true, style: { fontSize: "0.76rem" } }}
                  />
                  {chat.ownerId === user.id && (
                    <ListItemSecondaryAction className={classes.secondaryAction}>
                      <IconButton
                        onClick={() => {
                          goToMessages(chat).then(() => {
                            handleEditChat(chat);
                          });
                        }}
                        edge="end"
                        aria-label="delete"
                        size="small"
                        className={classes.actionButton}
                        style={{ marginRight: 5 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setSelectedChat(chat);
                          setConfirmModalOpen(true);
                        }}
                        edge="end"
                        aria-label="delete"
                        size="small"
                        className={classes.actionButton}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            {(!Array.isArray(chats) || chats.length === 0) && (
              <Box className={classes.emptyState}>
                Nenhuma conversa interna encontrada.
              </Box>
            )}
          </List>
        </div>
      </div>
    </>
  );
}
