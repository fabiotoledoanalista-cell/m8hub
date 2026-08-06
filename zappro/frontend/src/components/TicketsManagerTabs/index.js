import React, { useContext, useEffect, useRef, useState } from "react";
import { useTheme } from "@material-ui/core/styles";
import { useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  InputBase,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Typography,
  Grid,
  Tooltip,
  Switch,
} from "@material-ui/core";
import {
  Group,
  MoveToInbox as MoveToInboxIcon,
  CheckBox as CheckBoxIcon,
  MessageSharp as MessageSharpIcon,
  AccessTime as ClockIcon,
  Search as SearchIcon,
  Add as AddIcon,
  TextRotateUp,
  TextRotationDown,
} from "@material-ui/icons";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import ToggleButton from "@material-ui/lab/ToggleButton";

import { FilterAltOff, FilterAlt, PlaylistAddCheckOutlined } from "@mui/icons-material";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsListCustom";
import TabPanel from "../TabPanel";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { TagsFilter } from "../TagsFilter";
import { UsersFilter } from "../UsersFilter";
import { StatusFilter } from "../StatusFilter";
import { WhatsappsFilter } from "../WhatsappsFilter";
import { Button, Snackbar } from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";

import api from "../../services/api";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: "transparent",
  },

  tabsHeader: {
    minWidth: "auto",
    width: "auto",
    borderRadius: 8,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    // backgroundColor: "#eee",
    // backgroundColor: theme.palette.tabHeaderBackground,
  },

  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: theme.spacing(1),
  },

  tab: {
    minWidth: "auto",
    width: "auto",
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    transition: "0.3s",
    borderColor: "#aaa",
    borderWidth: "1px",
    borderStyle: "solid",
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(0.5),

    [theme.breakpoints.down("lg")]: {
      fontSize: "0.9rem",
      padding: theme.spacing(0.4, 0.8),
      marginRight: theme.spacing(0.4),
      marginLeft: theme.spacing(0.4),
    },

    [theme.breakpoints.down("md")]: {
      fontSize: "0.8rem",
      padding: theme.spacing(0.3, 0.6),
      marginRight: theme.spacing(0.3),
      marginLeft: theme.spacing(0.3),
    },

    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
    },

    // "&$selected": {
    //   color: "#FFF",
    //   backgroundColor: theme.palette.primary.main,
    // },
  },

  tabPanelItem: {
    minWidth: "33%",
    fontSize: 10.5,
    marginLeft: 0,
    borderRadius: 10,
    minHeight: 40,
    textTransform: "none",
    transition: "all 0.2s ease",
    border: `1px solid ${theme.mode === "light" ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.35)"}`,
    "&.Mui-selected": {
      backgroundColor:
        theme.mode === "light" ? "rgba(37,99,235,0.1)" : "rgba(96,165,250,0.2)",
      borderColor: theme.mode === "light" ? "rgba(37,99,235,0.35)" : "rgba(96,165,250,0.45)",
    },
  },

  tabIndicator: {
    height: 6,
    bottom: 0,
    borderRadius: "0 0 8px 8px",
    backgroundColor: theme.mode === "light" ? theme.palette.primary.main : "#FFF",
  },
  tabsBadge: {
    top: "-26%",
    right: "-10%",
    transform: "none",
    whiteSpace: "nowrap",
    borderRadius: "9px",
    padding: "0 6px",
    backgroundColor: theme.mode === "light" ? theme.palette.primary.main : "#FFF",
    color: theme.mode === "light" ? "#FFF" : theme.palette.primary.main,
    boxShadow: "0 6px 12px rgba(0,0,0,0.12)",
    fontSize: "0.58rem",
    fontWeight: 700,
  },
  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background:
      theme.mode === "light"
        ? "linear-gradient(145deg, #ffffff, #f7faff)"
        : "linear-gradient(145deg, rgba(30,41,59,0.95), rgba(17,24,39,0.95))",
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(0.75),
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    padding: theme.spacing(0.65),
    boxShadow:
      theme.mode === "light"
        ? "0 8px 16px rgba(15,23,42,0.08)"
        : "0 8px 16px rgba(0,0,0,0.35)",
  },

  serachInputWrapper: {
    flex: 1,
    height: 42,
    background:
      theme.mode === "light"
        ? "linear-gradient(145deg, #ffffff, #f8fbff)"
        : "linear-gradient(145deg, rgba(31,41,55,0.95), rgba(17,24,39,0.95))",
    display: "flex",
    alignItems: "center",
    borderRadius: 12,
    padding: "2px 4px 2px 9px",
    border: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    boxShadow:
      theme.mode === "light"
        ? "0 6px 14px rgba(15,23,42,0.08)"
        : "0 6px 14px rgba(0,0,0,0.32)",
  },

  searchIcon: {
    color: theme.mode === "light" ? "#64748b" : "#cbd5e1",
    marginRight: 6,
    alignSelf: "center",
  },

  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 30,
    fontSize: "0.8rem",
    color: theme.palette.text.primary,
  },

  badge: {
    // right: "-10px",
  },

  customBadge: {
    top: 1,
    right: -5,
    backgroundColor: theme.mode === "light" ? "#ef4444" : "#f87171",
    color: "#fff",
    fontWeight: 700,
    minWidth: 16,
    height: 16,
    fontSize: "0.58rem",
    lineHeight: "16px",
    padding: "0 4px",
  },
  tabBadgeWrap: {
    marginRight: theme.spacing(0.55),
    position: "relative",
  },

  show: {
    display: "block",
  },

  hide: {
    display: "none !important",
  },

  closeAllFab: {
    backgroundColor: "red",
    marginBottom: "4px",
    "&:hover": {
      backgroundColor: "darkred",
    },
  },

  speedDial: {
    position: "absolute",
    bottom: theme.spacing(1),
    right: theme.spacing(1),
    "& .MuiFab-root": {
      width: "40px",
      height: "40px",
      marginTop: "4px",
    },
    "& .MuiFab-label": {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },

  snackbar: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: theme.palette.primary.main,
    color: "white",
    borderRadius: 30,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.8em",
    },
    [theme.breakpoints.up("md")]: {
      fontSize: "1em",
    },
  },

  yesButton: {
    backgroundColor: "#FFF",
    color: "rgba(0, 100, 0, 1)",
    padding: "4px 4px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginRight: theme.spacing(1),
    "&:hover": {
      backgroundColor: "darkGreen",
      color: "#FFF",
    },
    borderRadius: 30,
  },
  noButton: {
    backgroundColor: "#FFF",
    color: "rgba(139, 0, 0, 1)",
    padding: "4px 4px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    "&:hover": {
      backgroundColor: "darkRed",
      color: "#FFF",
    },
    borderRadius: 30,
  },
  filterIcon: {
    marginRight: 2,
    alignSelf: "center",
    color: theme.mode === "light" ? "#475569" : "#e2e8f0",
    cursor: "pointer",
  },
  button: {
    height: 31,
    width: 31,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 9,
    marginRight: 5,
    backgroundColor:
      theme.mode === "light" ? "rgba(248,250,252,0.95)" : "rgba(30,41,59,0.9)",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: theme.mode === "light" ? theme.palette.primary.main : "#93c5fd",
      backgroundColor:
        theme.mode === "light" ? "rgba(219,234,254,0.6)" : "rgba(37,99,235,0.22)",
    },
  },
  icon: {
    fontSize: 17,
    color: theme.mode === "light" ? "#64748b" : "#cbd5e1",
    "&:hover": {
      color: theme.mode === "light" ? theme.palette.primary.main : "#FFF",
    },
  },
  buttonOpen: {
    borderColor: theme.mode === "light" ? theme.palette.primary.main : "#93c5fd",
    backgroundColor:
      theme.mode === "light" ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.28)",
    "& $icon": {
      color: theme.mode === "light" ? theme.palette.primary.main : "#FFF",
    },
  },
  statusTabs: {
    margin: theme.spacing(0, 1, 0.5),
    borderRadius: 12,
    overflowX: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.mode === "light"
        ? "linear-gradient(145deg, #ffffff, #f8fbff)"
        : "linear-gradient(145deg, rgba(31,41,55,0.95), rgba(15,23,42,0.95))",
    boxShadow:
      theme.mode === "light"
        ? "0 8px 16px rgba(15,23,42,0.06)"
        : "0 8px 16px rgba(0,0,0,0.35)",
    "& .MuiTabs-flexContainer": {
      padding: theme.spacing(0.3),
      gap: theme.spacing(0.35),
    },
    "& .MuiTabs-scroller": {
      overflowX: "hidden !important",
    },
  },
  listPanel: {
    margin: theme.spacing(0, 1, 0.8),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.mode === "light" ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.78)",
    overflow: "hidden",
  },
  statusTabLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTabIcon: {
    fontSize: 16,
  },
  statusTabTitle: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
}));

const TicketsManagerTabs = () => {
  const theme = useTheme();
  const classes = useStyles();
  const history = useHistory();

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  // const [tabOpen, setTabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [sortTickets, setSortTickets] = useState(false);

  const searchInputRef = useRef();
  const [searchOnMessages, setSearchOnMessages] = useState(false);

  const { user } = useContext(AuthContext);
  const { profile } = user;
  const { setSelectedQueuesMessage } = useContext(QueueSelectedContext);
  const { tabOpen, setTabOpen } = useContext(TicketsContext);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupingCount, setGroupingCount] = useState(0);

  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState([]);
  const [forceSearch, setForceSearch] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [filter, setFilter] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [isHoveredAll, setIsHoveredAll] = useState(false);
  const [isHoveredNew, setIsHoveredNew] = useState(false);
  const [isHoveredResolve, setIsHoveredResolve] = useState(false);
  const [isHoveredOpen, setIsHoveredOpen] = useState(false);
  const [isHoveredClosed, setIsHoveredClosed] = useState(false);
  const [isHoveredSort, setIsHoveredSort] = useState(false);

  const [isFilterActive, setIsFilterActive] = useState(false);

  useEffect(() => {
    setSelectedQueuesMessage(selectedQueueIds);
  }, [selectedQueueIds]);

  useEffect(() => {
    if (user.profile.toUpperCase() === "ADMIN" || user.allUserChat.toUpperCase() === "ENABLED") {
      setShowAllTickets(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
    }
    setForceSearch(!forceSearch);
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setForceSearch(!forceSearch);
      // setFilter(false);
      setTab("open");
      return;
    } else if (tab !== "search") {
      handleFilter();
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleBack = () => {

    history.push("/tickets");
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleChangeTabOpen = (e, newValue) => {
    // if (newValue === "pending" || newValue === "group") {
    handleBack();
    // }

    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  const handleSnackbarOpen = () => {
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const CloseAllTicket = async () => {
    try {
      const { data } = await api.post("/tickets/closeAll", {
        status: tabOpen,
        selectedQueueIds,
      });
      handleSnackbarClose();
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);

    clearTimeout(searchTimeout);

    if (tags.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSelectedTags(tags);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);

    clearTimeout(searchTimeout);

    if (users.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }
    searchTimeout = setTimeout(() => {
      setSelectedUsers(users);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleSelectedWhatsapps = (selecteds) => {
    const whatsapp = selecteds.map((t) => t.id);

    clearTimeout(searchTimeout);

    if (whatsapp.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }
    searchTimeout = setTimeout(() => {
      setSelectedWhatsapp(whatsapp);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleSelectedStatus = (selecteds) => {
    const statusFilter = selecteds.map((t) => t.status);

    clearTimeout(searchTimeout);

    if (statusFilter.length === 0) {
      setForceSearch(!forceSearch);
    } else if (tab !== "search") {
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSelectedStatus(statusFilter);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleFilter = () => {
    if (filter) {
      setFilter(false);
      setTab("open");
    } else setFilter(true);
    setTab("search");
  };

  const [open, setOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  const handleVisibility = () => {
    setHidden((prevHidden) => !prevHidden);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClosed = () => {
    setOpen(false);
  };

  const tooltipTitleStyle = {
    fontSize: "10px",
  };

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      <div className={classes.serachInputWrapper}>
        <SearchIcon className={classes.searchIcon} />
        <InputBase
          className={classes.searchInput}
          inputRef={searchInputRef}
          placeholder={i18n.t("tickets.search.placeholder")}
          type="search"
          onChange={handleSearch}
        />
        <Tooltip placement="top" title="Marque para pesquisar também nos conteúdos das mensagens (mais lento)">
          <div>
            <Switch
              size="small"
              checked={searchOnMessages}
              onChange={(e) => { setSearchOnMessages(e.target.checked) }}
            />
          </div>
        </Tooltip>
        {/* <IconButton
          className={classes.filterIcon}
          color="primary"
          aria-label="upload picture"
          component="span"
          onClick={handleFilter}
        >
          <FilterListIcon />
        </IconButton> */}
        {/* <FilterListIcon
          className={classes.filterIcon}
          color="primary"
          aria-label="upload picture"
          component="span"
          onClick={handleFilter}
        /> */}
        <IconButton
          variant="contained"
          aria-label="filter"
          className={classes.filterIcon}
          onClick={() => {
            setIsFilterActive((prevState) => !prevState);
            handleFilter();
          }}
        >
          {isFilterActive ? (
            <FilterAlt className={classes.icon} />
          ) : (
            <FilterAltOff className={classes.icon} />
          )}
        </IconButton>
      </div>

      {filter === true && (
        <>
          <TagsFilter onFiltered={handleSelectedTags} />
          <WhatsappsFilter onFiltered={handleSelectedWhatsapps} />
          <StatusFilter onFiltered={handleSelectedStatus} />
          {profile === "admin" && (
            <>
              <UsersFilter onFiltered={handleSelectedUsers} />
            </>
          )}
        </>
      )}

      {/* <Paper elevation={0} square className={classes.tabsHeader}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="fullWidth"
          textColor="primary"
          aria-label="icon label tabs example"
          classes={{ indicator: classes.tabIndicator }}
        >
          <Tab
            value={"open"}
            icon={<MoveToInboxIcon />}
            label={i18n.t("tickets.tabs.open.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"closed"}
            icon={<CheckBoxIcon />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"search"}
            icon={<SearchIcon />}
            label={i18n.t("tickets.tabs.search.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper> */}
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Can
              role={user.allUserChat === 'enabled' && user.profile === 'user' ? 'admin' : user.profile}
              perform="tickets-manager:showall"
              yes={() => (
                <Badge
                  color="primary"
                  overlap="rectangular"
                  invisible={
                    !isHoveredAll ||
                    isHoveredNew ||
                    isHoveredResolve ||
                    isHoveredOpen ||
                    isHoveredClosed
                  }
                  badgeContent={"Todos"}
                  classes={{ badge: classes.tabsBadge }}
                >
              <ToggleButton
                onMouseEnter={() => setIsHoveredAll(true)}
                onMouseLeave={() => setIsHoveredAll(false)}
                className={`${classes.button} ${showAllTickets ? classes.buttonOpen : ""}`}
                value="uncheck"
                selected={showAllTickets}
                onChange={() =>
                      setShowAllTickets((prevState) => !prevState)
                    }
                  >
                    {showAllTickets ? (
                      <VisibilityIcon className={classes.icon} />
                    ) : (
                      <VisibilityOffIcon className={classes.icon} />
                    )}
                  </ToggleButton>
                </Badge>
              )}
            />
            <Snackbar
              open={snackbarOpen}
              onClose={handleSnackbarClose}
              message={i18n.t("tickets.inbox.closedAllTickets")}
              ContentProps={{
                className: classes.snackbar,
              }}
              action={
                <>
                  <Button
                    className={classes.yesButton}
                    size="small"
                    onClick={CloseAllTicket}
                  >
                    {i18n.t("tickets.inbox.yes")}
                  </Button>
                  <Button
                    className={classes.noButton}
                    size="small"
                    onClick={handleSnackbarClose}
                  >
                    {i18n.t("tickets.inbox.no")}
                  </Button>
                </>
              }
            />
            <Badge
              color="primary"
              overlap="rectangular"
              invisible={
                isHoveredAll ||
                !isHoveredNew ||
                isHoveredResolve ||
                isHoveredOpen ||
                isHoveredClosed
              }
              badgeContent={i18n.t("tickets.inbox.newTicket")}
              classes={{ badge: classes.tabsBadge }}
            >
              <IconButton
                onMouseEnter={() => setIsHoveredNew(true)}
                onMouseLeave={() => setIsHoveredNew(false)}
                className={classes.button}
                onClick={() => {
                  setNewTicketModalOpen(true);
                }}
              >
                <AddIcon className={classes.icon} />
              </IconButton>
            </Badge>
            {user.profile === "admin" && (
              <Badge
                color="primary"
                overlap="rectangular"
                invisible={
                  isHoveredAll ||
                  isHoveredNew ||
                  !isHoveredResolve ||
                  isHoveredOpen ||
                  isHoveredClosed
                }
                badgeContent={i18n.t("tickets.inbox.closedAll")}
                classes={{ badge: classes.tabsBadge }}
              >
                <IconButton
                  onMouseEnter={() => setIsHoveredResolve(true)}
                  onMouseLeave={() => setIsHoveredResolve(false)}
                  className={classes.button}
                  onClick={handleSnackbarOpen}
                >
                  <PlaylistAddCheckOutlined style={{ color: theme.mode === "light" ? "green" : "#FFF" }} />
                </IconButton>
              </Badge>
            )}
            <Badge
              // color="primary"
              overlap="rectangular"
              invisible={
                !(
                  tab === "open" &&
                  !isHoveredAll &&
                  !isHoveredNew &&
                  !isHoveredResolve &&
                  !isHoveredClosed &&
                  !isHoveredSort
                ) && !isHoveredOpen
              }
              badgeContent={i18n.t("tickets.inbox.open")}
              classes={{ badge: classes.tabsBadge }}
            >
              <IconButton
                onMouseEnter={() => {
                  setIsHoveredOpen(true);
                  setHoveredButton("open");
                }}
                onMouseLeave={() => {
                  setIsHoveredOpen(false);
                  setHoveredButton(null);
                }}
                className={`${classes.button} ${tab === "open" ? classes.buttonOpen : ""}`}
                onClick={() => handleChangeTab(null, "open")}
              >
                <MoveToInboxIcon
                  style={{
                    color: isHoveredOpen
                      ? theme.mode === "light"
                        ? theme.palette.primary.main
                        : "#FFF"
                      : tab === "open"
                        ? theme.mode === "light"
                          ? theme.palette.primary.main
                          : "#FFF"
                        : "#aaa",
                  }}
                />
              </IconButton>
            </Badge>

            <Badge
              color="primary"
              overlap="rectangular"
              invisible={
                !(
                  tab === "closed" &&
                  !isHoveredAll &&
                  !isHoveredNew &&
                  !isHoveredResolve &&
                  !isHoveredOpen &&
                  !isHoveredSort
                ) && !isHoveredClosed
              }
              badgeContent={i18n.t("tickets.inbox.resolverd")}
              classes={{ badge: classes.tabsBadge }}
            >
              <IconButton
                onMouseEnter={() => {
                  setIsHoveredClosed(true);
                  setHoveredButton("closed");
                }}
                onMouseLeave={() => {
                  setIsHoveredClosed(false);
                  setHoveredButton(null);
                }}
                className={`${classes.button} ${tab === "closed" ? classes.buttonOpen : ""}`}
                onClick={() => handleChangeTab(null, "closed")}
              >
                <CheckBoxIcon
                  style={{
                    color: isHoveredClosed
                      ? theme.mode === "light"
                        ? theme.palette.primary.main
                        : "#FFF"
                      : tab === "closed"
                        ? theme.mode === "light"
                          ? theme.palette.primary.main
                          : "#FFF"
                        : "#aaa",
                  }}
                />
              </IconButton>
            </Badge>
            {tab !== "closed" && tab !== "search" && (
              <Badge
                color="primary"
                overlap="rectangular"
                invisible={
                  !isHoveredSort ||
                  isHoveredAll ||
                  isHoveredNew ||
                  isHoveredResolve ||
                  isHoveredOpen ||
                  isHoveredClosed
                }
                badgeContent={!sortTickets ? "Crescente" : "Decrescente"}
                classes={{ badge: classes.tabsBadge }}
              >
                <ToggleButton
                  onMouseEnter={() => setIsHoveredSort(true)}
                  onMouseLeave={() => setIsHoveredSort(false)}
                  className={`${classes.button} ${sortTickets ? classes.buttonOpen : ""}`}
                  value="uncheck"
                  selected={sortTickets}
                  onChange={() =>
                    setSortTickets((prevState) => !prevState)
                  }
                >
                  {!sortTickets ? (
                    <TextRotateUp style={{
                      color: sortTickets
                        ? theme.mode === "light"
                          ? theme.palette.primary.main
                          : "#FFF"
                        : "#aaa",
                    }} />
                  ) : (
                    <TextRotationDown style={{
                      color: sortTickets
                        ? theme.mode === "light"
                          ? theme.palette.primary.main
                          : "#FFF"
                        : "#aaa",
                    }} />
                  )}
                </ToggleButton>
              </Badge>
            )}
          </Grid>
          <Grid item>
            <TicketsQueueSelect
              selectedQueueIds={selectedQueueIds}
              userQueues={user?.queues}
              onChange={(values) => setSelectedQueueIds(values)}
            />
          </Grid>
        </Grid>
      </Paper>
      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          className={classes.statusTabs}
        >
          {/* ATENDENDO */}
          <Tab
            label={
              <div className={classes.statusTabLabel}>
                  <Badge
                    overlap="rectangular"
                    className={classes.tabBadgeWrap}
                    classes={{ badge: classes.customBadge }}
                    badgeContent={openCount}
                    color="primary"
                  >
                    <MessageSharpIcon className={classes.statusTabIcon} />
                  </Badge>
                  <Typography className={classes.statusTabTitle}>
                    {i18n.t("ticketsList.assignedHeader")}
                  </Typography>
              </div>
            }
            value={"open"}
            name="open"
            classes={{ root: classes.tabPanelItem }}
          />

          {/* AGUARDANDO */}
          <Tab
            label={
              <div className={classes.statusTabLabel}>
                  <Badge
                    overlap="rectangular"
                    className={classes.tabBadgeWrap}
                    classes={{ badge: classes.customBadge }}
                    badgeContent={pendingCount}
                    color="primary"
                  >
                    <ClockIcon className={classes.statusTabIcon} />
                  </Badge>
                  <Typography className={classes.statusTabTitle}>
                    {i18n.t("ticketsList.pendingHeader")}
                  </Typography>
              </div>
            }
            value={"pending"}
            name="pending"
            classes={{ root: classes.tabPanelItem }}
          />

          {/* GRUPOS */}
          {user.allowGroup && (
            <Tab
              label={
                <div className={classes.statusTabLabel}>
                    <Badge
                      overlap="rectangular"
                      className={classes.tabBadgeWrap}
                      classes={{ badge: classes.customBadge }}
                      badgeContent={groupingCount}
                      color="primary"
                    >
                      <Group className={classes.statusTabIcon} />
                    </Badge>
                    <Typography className={classes.statusTabTitle}>
                      {i18n.t("ticketsList.groupingHeader")}
                    </Typography>
                </div>
              }
              value={"group"}
              name="group"
              classes={{ root: classes.tabPanelItem }}
            />
          )}
        </Tabs>

        <Paper className={classes.listPanel}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            sortTickets={sortTickets ? "ASC" : "DESC"}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
            setTabOpen={setTabOpen}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            sortTickets={sortTickets ? "ASC" : "DESC"}
            showAll={user.profile === "admin" || user.allUserChat === 'enabled' ? showAllTickets : false}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
            setTabOpen={setTabOpen}
          />
          {user.allowGroup && (
            <TicketsList
              status="group"
              showAll={showAllTickets}
              sortTickets={sortTickets ? "ASC" : "DESC"}
              selectedQueueIds={selectedQueueIds}
              updateCount={(val) => setGroupingCount(val)}
              style={applyPanelStyle("group")}
              setTabOpen={setTabOpen}
            />
          )}
        </Paper>
      </TabPanel>
      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={showAllTickets}
          selectedQueueIds={selectedQueueIds}
          setTabOpen={setTabOpen}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        {profile === "admin" && (
          <>
            <TicketsList
              statusFilter={selectedStatus}
              searchParam={searchParam}
              showAll={showAllTickets}
              tags={selectedTags}
              users={selectedUsers}
              selectedQueueIds={selectedQueueIds}
              whatsappIds={selectedWhatsapp}
              forceSearch={forceSearch}
              searchOnMessages={searchOnMessages}
              status="search"
            />
          </>
        )}

        {profile === "user" && (
          <TicketsList
            statusFilter={selectedStatus}
            searchParam={searchParam}
            showAll={false}
            tags={selectedTags}
            selectedQueueIds={selectedQueueIds}
            whatsappIds={selectedWhatsapp}
            forceSearch={forceSearch}
            searchOnMessages={searchOnMessages}
            status="search"
          />
        )}
      </TabPanel>
    </Paper >
  );
};

export default TicketsManagerTabs;
