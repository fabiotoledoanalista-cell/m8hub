import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import AssignmentTurnedInIcon from "@material-ui/icons/AssignmentTurnedIn";
import AccessTimeIcon from "@material-ui/icons/AccessTime";

const useStyles = makeStyles((theme) => ({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    padding: theme.spacing(2),
    height: "calc(100% - 48px)",
    overflowY: "hidden",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
    background:
      theme.mode === "light"
        ? "radial-gradient(900px 260px at -8% -18%, rgba(59,130,246,0.14), transparent 56%), radial-gradient(900px 260px at 110% -20%, rgba(16,185,129,0.12), transparent 60%)"
        : "transparent",
  },
  controlsPaper: {
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(1.4),
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.mode === "light"
        ? "linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%)"
        : theme.palette.background.paper,
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
  },
  toolbarRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      flexDirection: "column",
      alignItems: "flex-start",
    },
  },
  countPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700,
    color: theme.mode === "light" ? "#1d4ed8" : "#bfdbfe",
    background: theme.mode === "light" ? "rgba(37, 99, 235, 0.12)" : "rgba(37, 99, 235, 0.2)",
    border: theme.mode === "light" ? "1px solid rgba(37,99,235,0.18)" : "1px solid rgba(125,211,252,0.18)",
  },
  editHint: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.mode === "light" ? "#b45309" : "#facc15",
    background: theme.mode === "light" ? "rgba(251, 191, 36, 0.16)" : "rgba(250, 204, 21, 0.16)",
    borderRadius: 999,
    padding: "4px 10px",
  },
  inputRow: {
    display: "flex",
    gap: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      flexDirection: "column",
    },
  },
  input: {
    flex: 1,
  },
  actionButton: {
    minWidth: 132,
    borderRadius: 10,
    fontWeight: 700,
    boxShadow: "0 10px 20px rgba(29, 78, 216, 0.22)",
  },
  mainPaper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 16px 28px rgba(17, 24, 39, 0.08)",
    padding: theme.spacing(1),
  },
  taskCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    background:
      theme.mode === "light"
        ? "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)"
        : "rgba(15,23,42,0.35)",
    padding: theme.spacing(1.1, 1.2),
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.2),
    marginBottom: theme.spacing(1),
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 10px 20px rgba(15,23,42,0.08)",
    },
  },
  taskText: {
    fontWeight: 600,
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
    lineHeight: 1.35,
  },
  taskMeta: {
    marginTop: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  taskActions: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}));

const ToDoList = () => {
  const classes = useStyles();
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);
  const [editIndex, setEditIndex] = useState(-1);

  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        setTasks([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = () => {
    const normalizedTask = task.trim();
    if (!normalizedTask) return;

    const now = new Date().toISOString();

    if (editIndex >= 0) {
      const newTasks = [...tasks];
      newTasks[editIndex] = {
        ...newTasks[editIndex],
        text: normalizedTask,
        updatedAt: now,
      };
      setTasks(newTasks);
      setEditIndex(-1);
    } else {
      setTasks([
        ...tasks,
        {
          text: normalizedTask,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    setTask("");
  };

  const handleEditTask = (index) => {
    setTask(tasks[index].text);
    setEditIndex(index);
  };

  const handleDeleteTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
    if (editIndex === index) {
      setEditIndex(-1);
      setTask("");
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("pt-BR");
  };

  return (
    <div className={classes.pageRoot}>
      <Paper elevation={0} className={classes.controlsPaper}>
        <div className={classes.toolbarRow}>
          <span className={classes.countPill}>
            <AssignmentTurnedInIcon style={{ fontSize: 14 }} />
            {tasks.length} tarefas
          </span>
          {editIndex >= 0 && <span className={classes.editHint}>Editando tarefa</span>}
        </div>
        <div className={classes.inputRow}>
          <TextField
            className={classes.input}
            label="Nova tarefa"
            value={task}
            onChange={(event) => setTask(event.target.value)}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddTask}
            className={classes.actionButton}
          >
            {editIndex >= 0 ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </Paper>

      <Paper className={classes.mainPaper} variant="outlined">
        {tasks.length === 0 ? (
          <div className={classes.emptyState}>
            <AssignmentTurnedInIcon />
            <Typography variant="body2">Nenhuma tarefa cadastrada.</Typography>
          </div>
        ) : (
          <Box>
            {tasks.map((item, index) => (
              <div key={`${item.createdAt || "task"}-${index}`} className={classes.taskCard}>
                <div>
                  <Typography className={classes.taskText}>{item.text}</Typography>
                  <span className={classes.taskMeta}>
                    <AccessTimeIcon style={{ fontSize: 14 }} />
                    Atualizado em {formatTimestamp(item.updatedAt)}
                  </span>
                </div>
                <div className={classes.taskActions}>
                  <IconButton className={classes.actionIcon} onClick={() => handleEditTask(index)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton className={classes.actionIcon} onClick={() => handleDeleteTask(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            ))}
          </Box>
        )}
      </Paper>
    </div>
  );
};

export default ToDoList;
