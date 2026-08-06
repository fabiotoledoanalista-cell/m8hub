import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";

import MainHeader from "../../components/MainHeader";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import AnnouncementModal from "../../components/AnnouncementModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Grid } from "@material-ui/core";
import { isArray } from "lodash";
// import { SocketContext } from "../../context/Socket/SocketContext";


import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_ANNOUNCEMENTS") {
    const announcements = action.payload;
    const newAnnouncements = [];

    if (isArray(announcements)) {
      announcements.forEach((announcement) => {
        const announcementIndex = state.findIndex(
          (u) => u.id === announcement.id
        );
        if (announcementIndex !== -1) {
          state[announcementIndex] = announcement;
        } else {
          newAnnouncements.push(announcement);
        }
      });
    }

    return [...state, ...newAnnouncements];
  }

  if (action.type === "UPDATE_ANNOUNCEMENTS") {
    const announcement = action.payload;
    const announcementIndex = state.findIndex((u) => u.id === announcement.id);

    if (announcementIndex !== -1) {
      state[announcementIndex] = announcement;
      return [...state];
    } else {
      return [announcement, ...state];
    }
  }

  if (action.type === "DELETE_ANNOUNCEMENT") {
    const announcementId = action.payload;

    const announcementIndex = state.findIndex((u) => u.id === announcementId);
    if (announcementIndex !== -1) {
      state.splice(announcementIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  pageRoot: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    padding: theme.spacing(2),
    height: "calc(100% - 48px)",
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
  },
  controlsPaper: {
    marginBottom: theme.spacing(2),
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.08)",
    padding: theme.spacing(1.25),
    backgroundColor: theme.palette.background.paper,
  },
  searchField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: theme.palette.background.default,
    },
    "& .MuiInputBase-input": {
      fontSize: "0.82rem",
      paddingTop: 13,
      paddingBottom: 13,
    },
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 10,
    fontWeight: 600,
    fontSize: "0.75rem",
    padding: theme.spacing(0.8, 1.4),
    boxShadow: "0 6px 14px rgba(7, 64, 171, 0.14)",
  },
  mainPaper: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 12px 26px rgba(17, 24, 39, 0.09)",
  },
  tableHeaderCell: {
    fontWeight: 700,
    color: theme.palette.text.secondary,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.04)"
        : "rgba(15, 23, 42, 0.03)",
    fontSize: "0.76rem",
  },
  tableRow: {
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.03)"
          : "rgba(15, 23, 42, 0.035)",
    },
  },
  tableCellText: {
    fontSize: "0.78rem",
  },
  actionCell: {
    minWidth: 120,
  },
  actionIconButton: {
    border: `1px solid ${theme.palette.divider}`,
    margin: theme.spacing(0, 0.2),
  },
}));

const Announcements = () => {
  const classes = useStyles();
  const history = useHistory();

//   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);


  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [announcements, dispatch] = useReducer(reducer, []);

  // trava para nao acessar pagina que não pode  
  useEffect(() => {
    async function fetchData() {
      if (!user.super) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchAnnouncements();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (user.companyId) {
//    const socket = socketManager.GetSocket();

      const onCompanyAnnouncement = (data) => {
        if (data.action === "update" || data.action === "create") {
          dispatch({ type: "UPDATE_ANNOUNCEMENTS", payload: data.record });
        }
        if (data.action === "delete") {
          dispatch({ type: "DELETE_ANNOUNCEMENT", payload: +data.id });
        }
      }

      socket.on(`company-announcement`, onCompanyAnnouncement);
      return () => {
        socket.off(`company-announcement`, onCompanyAnnouncement);
      }
    }
  }, [socket, user.companyId]);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await api.get("/announcements/", {
        params: { searchParam, pageNumber, includeInactive: true },
      });
      dispatch({ type: "LOAD_ANNOUNCEMENTS", payload: data.records });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenAnnouncementModal = () => {
    setSelectedAnnouncement(null);
    setAnnouncementModalOpen(true);
  };

  const handleCloseAnnouncementModal = () => {
    setSelectedAnnouncement(null);
    setAnnouncementModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementModalOpen(true);
  };

  const handleDeleteAnnouncement = async (announcement) => {
    try {
      if (announcement.mediaName)
        await api.delete(`/announcements/${announcement.id}/media-upload`);

      await api.delete(`/announcements/${announcement.id}`);

      toast.success(i18n.t("announcements.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingAnnouncement(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const translatePriority = (val) => {
    if (val === 1) {
      return "Alta";
    }
    if (val === 2) {
      return "Média";
    }
    if (val === 3) {
      return "Baixa";
    }
  };

  const translateMode = (mode) => {
    if (mode === "topbar") return "Banner superior";
    return "Informativo";
  };

  return (
    <div className={classes.pageRoot}>
      <ConfirmationModal
        title={
          deletingAnnouncement &&
          `${i18n.t("announcements.confirmationModal.deleteTitle")} ${deletingAnnouncement.name
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteAnnouncement(deletingAnnouncement)}
      >
        {i18n.t("announcements.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <AnnouncementModal
        resetPagination={() => {
          setPageNumber(1);
          fetchAnnouncements();
        }}
        open={announcementModalOpen}
        onClose={handleCloseAnnouncementModal}
        aria-labelledby="form-dialog-title"
        announcementId={selectedAnnouncement && selectedAnnouncement.id}
      />
      <MainHeader>
        <Grid style={{ width: "100%" }} container>
          <Grid item xs={12}>
            <Paper elevation={0} className={classes.controlsPaper}>
              <Grid spacing={2} container>
                <Grid item xs={12} sm={8} md={9}>
                  <TextField
                    fullWidth
                    placeholder={i18n.t("announcements.searchPlaceholder")}
                    type="search"
                    value={searchParam}
                    onChange={handleSearch}
                    variant="outlined"
                    className={classes.searchField}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon style={{ color: "gray" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleOpenAnnouncementModal}
                    color="primary"
                    className={classes.actionButton}
                    startIcon={<AddIcon />}
                  >
                    {i18n.t("announcements.buttons.add")}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" className={classes.tableHeaderCell}>
                {i18n.t("announcements.table.title")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeaderCell}>
                Tipo
              </TableCell>
              <TableCell align="center" className={classes.tableHeaderCell}>
                {i18n.t("announcements.table.priority")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeaderCell}>
                Cor de fundo
              </TableCell>
              <TableCell align="center" className={classes.tableHeaderCell}>
                {i18n.t("announcements.table.mediaName")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeaderCell}>
                {i18n.t("announcements.table.status")}
              </TableCell>
              <TableCell align="center" className={classes.tableHeaderCell}>
                {i18n.t("announcements.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id} className={classes.tableRow}>
                  <TableCell align="center" className={classes.tableCellText}>{announcement.title}</TableCell>
                  <TableCell align="center" className={classes.tableCellText}>
                    {translateMode(announcement.displayMode)}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCellText}>
                    {translatePriority(announcement.priority)}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCellText}>
                    {announcement.displayMode === "topbar" ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: "1px solid #d1d5db",
                            backgroundColor: announcement.backgroundColor || "#0f766e",
                          }}
                        />
                        <span>{announcement.backgroundColor || "#0f766e"}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCellText}>
                    {announcement.mediaName ?? i18n.t("quickMessages.noAttachment")}
                  </TableCell>
                  <TableCell align="center" className={classes.tableCellText}>
                    {announcement.status ? i18n.t("announcements.active") : i18n.t("announcements.inactive")}
                  </TableCell>
                  <TableCell align="center" className={classes.actionCell}>
                    <IconButton
                      size="small"
                      className={classes.actionIconButton}
                      onClick={() => handleEditAnnouncement(announcement)}
                    >
                      <EditIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      className={classes.actionIconButton}
                      onClick={(e) => {
                        setConfirmModalOpen(true);
                        setDeletingAnnouncement(announcement);
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={7} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </div >
  )
};

export default Announcements;
