import React, { useState, useEffect, useContext } from "react";
import {
  makeStyles,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Checkbox,
  Select,
  Box,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
} from "@material-ui/core";
import { Formik, Form, Field } from "formik";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ConfirmationModal from "../ConfirmationModal";

import {
  Search as SearchIcon,
  DeleteOutline as DeleteOutlineIcon,
  DeleteSweep as DeleteSweepIcon,
  EditOutlined as EditOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  MonetizationOn as MonetizationOnIcon,
  EventAvailable as EventAvailableIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  HighlightOff as HighlightOffIcon,
  VpnKey as VpnKeyIcon,
  Storage as StorageIcon,
} from "@material-ui/icons";

import { toast } from "react-toastify";
import useCompanies from "../../hooks/useCompanies";
import usePlans from "../../hooks/usePlans";
import ModalUsers from "../ModalUsers";
import api from "../../services/api";
import { head, isArray } from "lodash";
import { useDate } from "../../hooks/useDate";

import moment from "moment";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    padding: "2px",
  },
  mainPaper: {
    width: "100%",
    flex: 1,
    borderRadius: 20,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === "light"
        ? "radial-gradient(circle at top right, #edf4ff 0%, #f8fbff 28%, #ffffff 58%)"
        : theme.palette.background.paper,
    boxShadow:
      theme.palette.type === "light"
        ? "0 20px 45px rgba(15, 23, 42, 0.08)"
        : "0 18px 42px rgba(0, 0, 0, 0.35)",
    padding: theme.spacing(1.5),
  },
  fullWidth: {
    width: "100%",
  },
  tableContainer: {
    width: "100%",
    padding: theme.spacing(0.5),
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    overflowX: "auto",
    backgroundColor: theme.palette.background.paper,
    boxShadow:
      theme.palette.type === "light"
        ? "0 10px 24px rgba(15, 23, 42, 0.06)"
        : "none",
    ...theme.scrollbarStyles,
  },
  tableHead: {
    "& .MuiTableCell-head": {
      background: theme.palette.type === "light" ? "#eef3fa" : theme.palette.background.default,
      fontWeight: 700,
      color: theme.palette.text.primary,
      whiteSpace: "nowrap",
    },
    "& .MuiTableCell-body": {
      color: theme.palette.text.primary,
    },
  },
  tableRoot: {
    borderCollapse: "separate",
    borderSpacing: "0 10px",
  },
  toolbar: {
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    background:
      theme.palette.type === "light"
        ? "linear-gradient(130deg, #ffffff 0%, #f3f8ff 55%, #eef4ff 100%)"
        : theme.palette.background.default,
  },
  toolbarControls: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  masterAccessCard: {
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.25),
    marginBottom: theme.spacing(1.5),
    background:
      theme.palette.type === "light"
        ? "linear-gradient(110deg, #fffdf7 0%, #fff9ec 100%)"
        : theme.palette.background.default,
  },
  masterAccessControls: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  masterAccessInput: {
    minWidth: 260,
    [theme.breakpoints.down("sm")]: {
      minWidth: "100%",
    },
  },
  searchField: {
    minWidth: 240,
    [theme.breakpoints.down("sm")]: {
      minWidth: "100%",
    },
  },
  filterField: {
    minWidth: 180,
  },
  actionIconButton: {
    color: theme.palette.primary.main,
    backgroundColor: "transparent !important",
    borderRadius: 0,
    padding: 6,
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  rowNormal: {
    transition: "all 0.18s ease",
    "&:hover": {
      backgroundColor: theme.palette.type === "light" ? "#f8fbff" : theme.palette.action.hover,
      transform: "translateY(-1px)",
    },
  },
  rowWarning: {
    backgroundColor:
      theme.palette.type === "light"
        ? "#fffce8"
        : "rgba(113,63,18,0.35)",
  },
  rowExpired: {
    backgroundColor:
      theme.palette.type === "light"
        ? "#fff0f0"
        : "rgba(127,29,29,0.32)",
  },
  companyName: {
    fontWeight: 700,
    letterSpacing: 0.1,
  },
  deleteIcon: {
    color: theme.palette.primary.main,
    backgroundColor: "transparent !important",
    borderRadius: 0,
    padding: 6,
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  financeIcon: {
    color: theme.palette.primary.main,
    backgroundColor: "transparent !important",
    borderRadius: 0,
    padding: 6,
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  activeStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#0f7a3b",
    fontWeight: 600,
  },
  inactiveStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#b42318",
    fontWeight: 600,
  },
  dueDateIcon: {
    color: theme.palette.primary.main,
    backgroundColor: "transparent !important",
    borderRadius: 0,
    padding: 6,
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  accessIcon: {
    color: theme.palette.primary.main,
    backgroundColor: "transparent !important",
    borderRadius: 0,
    padding: 6,
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  storageIcon: {
    color: theme.palette.primary.main,
    backgroundColor: "transparent !important",
    borderRadius: 0,
    padding: 6,
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  statusChip: {
    fontWeight: 600,
  },
  invoicesDialogContent: {
    minWidth: 560,
    [theme.breakpoints.down("sm")]: {
      minWidth: "auto",
    },
  },
  invoiceRow: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.type === "light" ? "#f8fbff" : theme.palette.background.default,
  },
  primaryButton: {
    borderRadius: 10,
    padding: "8px 18px",
    boxShadow:
      theme.palette.type === "light"
        ? "0 10px 20px rgba(25, 118, 210, 0.22)"
        : "none",
  },
  neutralButton: {
    borderRadius: 10,
    padding: "8px 16px",
  },
  companyDialogPaper: {
    borderRadius: 20,
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    width: "min(980px, 96vw)",
    maxWidth: "96vw",
  },
  dialogTitleWrap: {
    padding: theme.spacing(2.2, 3, 1.2, 3),
    background:
      theme.palette.type === "light"
        ? "linear-gradient(120deg, #f2f7ff 0%, #ffffff 70%)"
        : theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  dialogTitleMain: {
    fontWeight: 700,
    fontSize: "1.1rem",
    color: theme.palette.text.primary,
  },
  dialogTitleSub: {
    marginTop: theme.spacing(0.4),
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
  },
  formPanel: {
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.5),
    background:
      theme.palette.type === "light"
        ? "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)"
        : theme.palette.background.paper,
  },
  formDialogContent: {
    padding: theme.spacing(2.5),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5),
    },
  },
  inputField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: theme.palette.type === "light" ? "#ffffff" : theme.palette.background.default,
    },
  },
  textfield: {
    width: "100%",
  },
  textRight: {
    textAlign: "right",
  },
  row: {
    // paddingTop: theme.spacing(2),
    // paddingBottom: theme.spacing(2),
  },
  control: {
    // paddingRight: theme.spacing(1),
    // paddingLeft: theme.spacing(1),
  },
  buttonContainer: {
    textAlign: "right",
    // padding: theme.spacing(1),
  },
}));

export function CompanyForm(props) {
  const { onSubmit, onDelete, onCancel, initialValue, loading, cancelLabel, canDelete = true } = props;
  const classes = useStyles();
  const [plans, setPlans] = useState([]);
  const [modalUser, setModalUser] = useState(false);
  const [firstUser, setFirstUser] = useState({});

  const [record, setRecord] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
    status: true,
    // campaignsEnabled: false,
    dueDate: "",
    recurrence: "",
    password: "",
    ...initialValue,
  });

  const normalizePhone = (value = "") => value.replace(/\D/g, "").slice(0, 11);

  const formatPhone = (value = "") => {
    const digits = normalizePhone(value);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const { list: listPlans } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const list = await listPlans();
      setPlans(list);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRecord((prev) => {
      if (moment(initialValue).isValid()) {
        initialValue.dueDate = moment(initialValue.dueDate).format(
          "YYYY-MM-DD"
        );
      }
      return {
        ...prev,
        ...initialValue,
      };
    });
  }, [initialValue]);

  const handleSubmit = async (data) => {
    if (data.dueDate === "" || moment(data.dueDate).isValid() === false) {
      data.dueDate = null;
    }
    data.phone = normalizePhone(data.phone);
    onSubmit(data);
    setRecord({ ...initialValue, dueDate: "" });
  };

  const handleOpenModalUsers = async () => {
    try {
      const { data } = await api.get("/users/list", {
        params: {
          companyId: initialValue.id,
        },
      });
      if (isArray(data) && data.length) {
        setFirstUser(head(data));
      }
      setModalUser(true);
    } catch (e) {
      toast.error(e);
    }
  };

  const handleCloseModalUsers = () => {
    setFirstUser({});
    setModalUser(false);
  };

  const incrementDueDate = () => {
    const data = { ...record };
    if (data.dueDate !== "" && data.dueDate !== null) {
      switch (data.recurrence) {
        case "MENSAL":
          data.dueDate = moment(data.dueDate)
            .add(1, "month")
            .format("YYYY-MM-DD");
          break;
        case "BIMESTRAL":
          data.dueDate = moment(data.dueDate)
            .add(2, "month")
            .format("YYYY-MM-DD");
          break;
        case "TRIMESTRAL":
          data.dueDate = moment(data.dueDate)
            .add(3, "month")
            .format("YYYY-MM-DD");
          break;
        case "SEMESTRAL":
          data.dueDate = moment(data.dueDate)
            .add(6, "month")
            .format("YYYY-MM-DD");
          break;
        case "ANUAL":
          data.dueDate = moment(data.dueDate)
            .add(12, "month")
            .format("YYYY-MM-DD");
          break;
        default:
          break;
      }
    }
    setRecord(data);
  };

  return (
    <>
      <ModalUsers
        userId={firstUser.id}
        companyId={initialValue.id}
        open={modalUser}
        onClose={handleCloseModalUsers}
      />
      <Formik
        enableReinitialize
        className={classes.fullWidth}
        initialValues={record}
        onSubmit={(values, { resetForm }) =>
          setTimeout(() => {
            handleSubmit(values);
            resetForm();
          }, 500)
        }
      >
        {({ values, setFieldValue }) => (
          <Form className={classes.fullWidth}>
            <Box className={classes.formPanel}>
            <Grid spacing={2} justifyContent="center" container>
              <Grid xs={12} sm={6} md={4} item>
                <Field
                  as={TextField}
                  label={i18n.t("compaies.table.name")}
                  name="name"
                  variant="outlined"
                  className={`${classes.fullWidth} ${classes.inputField}`}
                  margin="dense"
                />
              </Grid>
              <Grid xs={12} sm={6} md={5} item>
                <Field
                  as={TextField}
                  label={i18n.t("compaies.table.email")}
                  name="email"
                  variant="outlined"
                  className={`${classes.fullWidth} ${classes.inputField}`}
                  margin="dense"
                  required
                />
              </Grid>
              <Grid xs={12} sm={6} md={3} item>
                <TextField
                  label={i18n.t("compaies.table.phone")}
                  name="phone"
                  variant="outlined"
                  value={formatPhone(values.phone || "")}
                  onChange={(e) => {
                    setFieldValue("phone", normalizePhone(e.target.value));
                  }}
                  className={`${classes.fullWidth} ${classes.inputField}`}
                  margin="dense"
                />
              </Grid>
              <Grid xs={12} sm={6} md={3} item>
                <Field
                  as={TextField}
                  label={i18n.t("compaies.table.password")}
                  name="password"
                  variant="outlined"
                  className={`${classes.fullWidth} ${classes.inputField}`}
                  margin="dense"
                />
              </Grid>
              <Grid xs={12} sm={6} md={3} item>
                <FormControl margin="dense" variant="outlined" fullWidth className={classes.inputField}>
                  <InputLabel htmlFor="plan-selection">{i18n.t("compaies.table.plan")}</InputLabel>
                  <Field
                    as={Select}
                    id="plan-selection"
                    label={i18n.t("compaies.table.plan")}
                    labelId="plan-selection-label"
                    name="planId"
                    margin="dense"
                    required
                  >
                    {plans.map((plan, key) => (
                      <MenuItem key={key} value={plan.id}>
                        {plan.name}
                      </MenuItem>
                    ))}
                  </Field>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={2} item>
                <FormControl margin="dense" variant="outlined" fullWidth className={classes.inputField}>
                  <InputLabel htmlFor="status-selection">{i18n.t("compaies.table.active")}</InputLabel>
                  <Field
                    as={Select}
                    id="status-selection"
                    label={i18n.t("compaies.table.active")}
                    labelId="status-selection-label"
                    name="status"
                    margin="dense"
                  >
                    <MenuItem value={true}>{i18n.t("compaies.table.yes")}</MenuItem>
                    <MenuItem value={false}>{i18n.t("compaies.table.no")}</MenuItem>
                  </Field>
                </FormControl>
              </Grid>
              {/* <Grid xs={12} sm={6} md={3} item>
                <FormControl margin="dense" variant="outlined" fullWidth>
                  <InputLabel htmlFor="payment-method-selection">
                    Método de Pagamento
                  </InputLabel>
                  <Field
                    as={Select}
                    id="payment-method-selection"
                    label="Método de Pagamento"
                    labelId="payment-method-selection-label"
                    name="paymentMethod"
                    margin="dense"
                  >
                    <MenuItem value={"pix"}>PIX</MenuItem>
                  </Field>
                </FormControl>
              </Grid> */}
              <Grid xs={12} sm={6} md={4} item>
                <Field
                  as={TextField}
                  label={i18n.t("compaies.table.document")}
                  name="document"
                  variant="outlined"
                  className={`${classes.fullWidth} ${classes.inputField}`}
                  margin="dense"
                />
              </Grid>
              {/* <Grid xs={12} sm={6} md={2} item>
                <FormControl margin="dense" variant="outlined" fullWidth>
                  <InputLabel htmlFor="status-selection">Campanhas</InputLabel>
                  <Field
                    as={Select}
                    id="campaigns-selection"
                    label="Campanhas"
                    labelId="campaigns-selection-label"
                    name="campaignsEnabled"
                    margin="dense"
                  >
                    <MenuItem value={true}>Habilitadas</MenuItem>
                    <MenuItem value={false}>Desabilitadas</MenuItem>
                  </Field>
                </FormControl>
              </Grid> */}
              <Grid xs={12} sm={6} md={3} item>
                <TextField
                  label={i18n.t("compaies.table.dueDate")}
                  type="date"
                  name="dueDate"
                  value={values.dueDate ? moment(values.dueDate).format("YYYY-MM-DD") : ""}
                  onChange={(e) => setFieldValue("dueDate", e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  className={`${classes.fullWidth} ${classes.inputField}`}
                />
              </Grid>
              <Grid xs={12} sm={6} md={3} item>
                <FormControl margin="dense" variant="outlined" fullWidth className={classes.inputField}>
                  <InputLabel htmlFor="recorrencia-selection">
                  {i18n.t("compaies.table.recurrence")}
                  </InputLabel>
                  <Field
                    as={Select}
                    label="Recorrência"
                    labelId="recorrencia-selection-label"
                    id="recurrence"
                    name="recurrence"
                    margin="dense"
                  >
                    <MenuItem value="MENSAL">{i18n.t("compaies.table.monthly")}</MenuItem>
                    <MenuItem value="BIMESTRAL">{i18n.t("compaies.table.bimonthly")}</MenuItem>
                    <MenuItem value="TRIMESTRAL">{i18n.t("compaies.table.quarterly")}</MenuItem>
                    <MenuItem value="SEMESTRAL">{i18n.t("compaies.table.semester")}</MenuItem>
                    <MenuItem value="ANUAL">{i18n.t("compaies.table.yearly")}</MenuItem>
                  </Field>
                </FormControl>
              </Grid>
              <Grid xs={12} item>
                <Grid justifyContent="flex-end" spacing={1} container>
                  <Grid xs={4} md={1} item>
                    <ButtonWithSpinner
                      className={classes.fullWidth}
                      style={{ marginTop: 8 }}
                      loading={loading}
                      onClick={() => onCancel()}
                      variant="contained"
                      classes={{ root: classes.neutralButton }}
                    >
                      {cancelLabel || i18n.t("compaies.table.clear")}
                    </ButtonWithSpinner>
                  </Grid>
                  {record.id !== undefined ? (
                    <>
                      {canDelete && (
                        <Grid xs={6} md={1} item>
                          <ButtonWithSpinner
                            style={{ marginTop: 8 }}
                            className={classes.fullWidth}
                            loading={loading}
                            onClick={() => onDelete(record)}
                            variant="contained"
                            color="secondary"
                            classes={{ root: classes.neutralButton }}
                          >
                            {i18n.t("compaies.table.delete")}
                          </ButtonWithSpinner>
                        </Grid>
                      )}
                      <Grid xs={6} md={2} item>
                        <ButtonWithSpinner
                          style={{ marginTop: 8 }}
                          className={classes.fullWidth}
                          loading={loading}
                          onClick={() => incrementDueDate()}
                          variant="contained"
                          color="primary"
                          classes={{ root: classes.neutralButton }}
                        >
                          +1 mês
                        </ButtonWithSpinner>
                      </Grid>
                      {/* <Grid xs={6} md={1} item>
                        <ButtonWithSpinner
                          style={{ marginTop: 7 }}
                          className={classes.fullWidth}
                          loading={loading}
                          onClick={() => handleOpenModalUsers()}
                          variant="contained"
                          color="primary"
                        >
                          {i18n.t("compaies.table.user")}
                        </ButtonWithSpinner>
                      </Grid> */}
                    </>
                  ) : null}
                  <Grid xs={6} md={1} item>
                    <ButtonWithSpinner
                      className={classes.fullWidth}
                      style={{ marginTop: 8 }}
                      loading={loading}
                      type="submit"
                      variant="contained"
                      color="primary"
                      classes={{ root: classes.primaryButton }}
                    >
                      {i18n.t("compaies.table.save")}
                    </ButtonWithSpinner>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            </Box>
          </Form>
        )}
      </Formik>
    </>
  );
}

export function CompaniesManagerGrid(props) {
  const {
    records,
    onSelect,
    onRequestDelete,
    onOpenInvoices,
    onAddOneMonth,
    onOpenDetails,
    onOpenMasterAccess,
    onShowStorageUsage,
    bulkSelectionEnabled,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    isCompanyProtected,
  } = props;
  const classes = useStyles();
  const { dateToClient, datetimeToClient } = useDate();

  const renderStatus = (row) => {
    if (row.status === false) {
      return (
        <Tooltip title="Inativa" arrow>
          <span className={classes.inactiveStatus}>
            <HighlightOffIcon fontSize="small" />
          </span>
        </Tooltip>
      );
    }

    return (
      <Tooltip title="Ativa" arrow>
        <span className={classes.activeStatus}>
          <CheckCircleOutlineIcon fontSize="small" />
        </span>
      </Tooltip>
    );
  };

  const renderPlan = (row) => {
    return row.planId !== null ? row.plan.name : "-";
  };

  const renderPlanValue = (row) => {
    return row.planId !== null && row.plan !== null ? row.plan.amount ? row.plan.amount.toLocaleString('pt-br', { minimumFractionDigits: 2 }) : '00.00' : "-";
  };

  // const renderCampaignsStatus = (row) => {
  //   if (
  //     has(row, "settings") &&
  //     isArray(row.settings) &&
  //     row.settings.length > 0
  //   ) {
  //     const setting = row.settings.find((s) => s.key === "campaignsEnabled");
  //     if (setting) {
  //       return setting.value === "true" ? "Habilitadas" : "Desabilitadas";
  //     }
  //   }
  //   return "Desabilitadas";
  // };

  const rowStyle = (record) => {
    if (!moment(record.dueDate).isValid()) return classes.rowNormal;

    const now = moment();
    const dueDate = moment(record.dueDate);
    const diff = dueDate.diff(now, "days");

    if (diff >= 1 && diff <= 5) return classes.rowWarning;
    if (diff <= 0) return classes.rowExpired;
    return classes.rowNormal;
  };

  const selectableRecords = records.filter((row) => !isCompanyProtected(row));
  const allSelected =
    selectableRecords.length > 0 && selectedIds.length === selectableRecords.length;

  return (
    <Paper className={classes.tableContainer}>
      <Table
        className={classes.fullWidth}
        classes={{ root: classes.tableRoot }}
        // size="small"
        padding="none"
        aria-label="a dense table"
        size="small"
      >
        <TableHead className={classes.tableHead}>
          <TableRow>
            <TableCell align="center" style={{ width: "1%" }}>
              {bulkSelectionEnabled ? (
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedIds.length > 0 && !allSelected}
                  onChange={onToggleSelectAll}
                  color="primary"
                />
              ) : (
                "#"
              )}
            </TableCell>
            <TableCell align="left">{i18n.t("compaies.table.name")}</TableCell>
            <TableCell align="left">{i18n.t("compaies.table.email")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.phone")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.plan")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.value")}</TableCell>
            {/* <TableCell align="center">Campanhas</TableCell> */}
            <TableCell align="center">{i18n.t("compaies.table.active")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.createdAt")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.dueDate")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.lastLogin")}</TableCell>
            <TableCell align="center">{i18n.t("compaies.table.actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((row, key) => (
            <TableRow className={rowStyle(row)} key={key}>
              <TableCell align="center" style={{ width: "1%" }}>
                {bulkSelectionEnabled ? (
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onChange={() => onToggleSelect(row.id)}
                    color="primary"
                    disabled={isCompanyProtected(row)}
                  />
                ) : (
                  <Tooltip title="Editar empresa" arrow>
                    <IconButton disableRipple size="small" className={classes.actionIconButton} onClick={() => onSelect(row)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell align="left" className={classes.companyName}>{row.name || "-"}</TableCell>
              <TableCell align="left" size="small">{row.email || "-"}</TableCell>
              <TableCell align="center">{row.phone || "-"}</TableCell>
              <TableCell align="center">{renderPlan(row)}</TableCell>
              <TableCell align="center">{i18n.t("compaies.table.money")} {renderPlanValue(row)}</TableCell>
              {/* <TableCell align="center">{renderCampaignsStatus(row)}</TableCell> */}
              <TableCell align="center">{renderStatus(row)}</TableCell>
              <TableCell align="center">{dateToClient(row.createdAt)}</TableCell>
              <TableCell align="center">{dateToClient(row.dueDate)}<br /><span>{row.recurrence}</span></TableCell>
              <TableCell align="center">{datetimeToClient(row.lastLogin)}</TableCell>
              <TableCell align="center">
                <Tooltip title="Ver detalhes" arrow>
                  <IconButton disableRipple size="small" className={classes.actionIconButton} onClick={() => onOpenDetails(row)}>
                    <VisibilityOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Faturas em aberto" arrow>
                  <IconButton disableRipple size="small" className={classes.financeIcon} onClick={() => onOpenInvoices(row)}>
                    <MonetizationOnIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Adicionar 1 mês no vencimento" arrow>
                  <IconButton disableRipple size="small" className={classes.dueDateIcon} onClick={() => onAddOneMonth(row)}>
                    <EventAvailableIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Acesso com senha master" arrow>
                  <IconButton disableRipple size="small" className={classes.accessIcon} onClick={() => onOpenMasterAccess(row)}>
                    <VpnKeyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Uso de armazenamento (GB)" arrow>
                  <IconButton disableRipple size="small" className={classes.storageIcon} onClick={() => onShowStorageUsage(row)}>
                    <StorageIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {!isCompanyProtected(row) && (
                  <Tooltip title="Excluir empresa" arrow>
                    <IconButton disableRipple size="small" className={classes.deleteIcon} onClick={() => onRequestDelete([row.id], row.name)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function CompaniesManager() {
  const MASTER_PASSWORD_MASK = "*******";
  const PROTECTED_COMPANY_ID = 1;
  const classes = useStyles();
  const { list, save, update, remove, getStorageUsage } = useCompanies();
  const { dateToClient, datetimeToClient } = useDate();
  const { handleLogin } = useContext(AuthContext);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [bulkSelectionEnabled, setBulkSelectionEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dueFilter, setDueFilter] = useState("all");
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState("");
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceCompanyName, setInvoiceCompanyName] = useState("");
  const [openInvoices, setOpenInvoices] = useState([]);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageCompanyName, setStorageCompanyName] = useState("");
  const [storageUsage, setStorageUsage] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsCompany, setDetailsCompany] = useState(null);
  const [masterAccessModalOpen, setMasterAccessModalOpen] = useState(false);
  const [masterAccessEmail, setMasterAccessEmail] = useState("");
  const [masterAccessPassword, setMasterAccessPassword] = useState("");
  const [masterAccessLoading, setMasterAccessLoading] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [masterPasswordConfigured, setMasterPasswordConfigured] = useState(false);
  const [masterPasswordSaving, setMasterPasswordSaving] = useState(false);
  const [record, setRecord] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
    status: true,
    // campaignsEnabled: false,
    dueDate: "",
    recurrence: "",
    password: "",
    document: "",
    paymentMethod: ""
  });

  const resetRecord = () => {
    setRecord((prev) => ({
      ...prev,
      id: undefined,
      name: "",
      email: "",
      phone: "",
      planId: "",
      status: true,
      dueDate: "",
      recurrence: "",
      password: "",
      document: "",
      paymentMethod: ""
    }));
  };

  useEffect(() => {
    loadPlans();
    loadMasterPasswordStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const companyList = await list();
      setRecords(companyList);
    } catch (e) {
      toast.error("Não foi possível carregar a lista de registros");
    }
    setLoading(false);
  };

  const loadMasterPasswordStatus = async () => {
    try {
      const { data } = await api.get("/global-config");
      const hasPassword = !!data?.hasMasterAccessPassword;
      setMasterPasswordConfigured(hasPassword);
      setMasterPasswordInput(hasPassword ? MASTER_PASSWORD_MASK : "");
    } catch (error) {
      setMasterPasswordConfigured(false);
      setMasterPasswordInput("");
    }
  };

  const handleSaveMasterPassword = async () => {
    const password = (masterPasswordInput || "").trim();

    if (!password || password === MASTER_PASSWORD_MASK) {
      toast.error("Digite uma nova senha master para salvar.");
      return;
    }

    setMasterPasswordSaving(true);
    try {
      await api.put("/global-config", {
        masterAccessPassword: password
      });
      setMasterPasswordConfigured(true);
      setMasterPasswordInput(MASTER_PASSWORD_MASK);
      toast.success("Senha master salva com sucesso.");
    } catch (error) {
      toast.error("Não foi possível salvar a senha master.");
    } finally {
      setMasterPasswordSaving(false);
    }
  };

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (data.id !== undefined) {
        await update(data);
      } else {
        await save(data);
      }
      await loadPlans();
      resetRecord();
      setCompanyModalOpen(false);
      toast.success("Operação realizada com sucesso!");
    } catch (e) {
      toast.error(
        "Não foi possível realizar a operação. Verifique se já existe uma empresa com o mesmo nome ou se os campos foram preenchidos corretamente"
      );
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const idsToDelete = (deleteTargetIds.length ? deleteTargetIds : (record.id ? [record.id] : []))
        .filter((id) => Number(id) !== PROTECTED_COMPANY_ID);

      if (!idsToDelete.length) {
        toast.warn("A empresa principal não pode ser excluída.");
        setDeleteTargetIds([]);
        setDeleteTargetLabel("");
        setShowConfirmDialog(false);
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled(idsToDelete.map((id) => remove(id)));
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const errorCount = results.length - successCount;

      await loadPlans();
      resetRecord();
      setCompanyModalOpen(false);

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Empresa excluída com sucesso!"
            : `${successCount} empresas excluídas com sucesso!`
        );
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} empresa(s) não puderam ser excluídas.`);
      }
    } catch (e) {
      toast.error("Não foi possível realizar a operação");
    }
    setDeleteTargetIds([]);
    setDeleteTargetLabel("");
    setShowConfirmDialog(false);
    setLoading(false);
  };

  const handleOpenDeleteDialog = (ids = [], label = "") => {
    let filteredIds = [];

    if (Array.isArray(ids)) {
      filteredIds = (ids.length ? ids : (record.id ? [record.id] : []))
        .filter((id) => Number(id) !== PROTECTED_COMPANY_ID);
      setDeleteTargetIds(filteredIds);
      setDeleteTargetLabel(label);
    } else if (ids && ids.id) {
      filteredIds = Number(ids.id) !== PROTECTED_COMPANY_ID ? [ids.id] : [];
      setDeleteTargetIds(filteredIds);
      setDeleteTargetLabel(ids.name || "");
    } else {
      filteredIds = record.id && Number(record.id) !== PROTECTED_COMPANY_ID ? [record.id] : [];
      setDeleteTargetIds(filteredIds);
      setDeleteTargetLabel(label);
    }

    if (!filteredIds.length) {
      toast.warn("A empresa principal não pode ser excluída.");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleCancel = () => {
    resetRecord();
    setCompanyModalOpen(false);
  };

  const handleSelect = (data) => {
    // let campaignsEnabled = false;

    // const setting = data.settings.find(
    //   (s) => s.key.indexOf("campaignsEnabled") > -1
    // );
    // if (setting) {
    //   campaignsEnabled = setting.value === "true" || setting.value === "enabled";
    // }

    setRecord((prev) => ({
      ...prev,
      id: data.id,
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      planId: data.planId || "",
      status: data.status === false ? false : true,
      // campaignsEnabled,
      dueDate: data.dueDate || "",
      recurrence: data.recurrence || "",
      password: "",
      document: data.document || "",
      paymentMethod: data.paymentMethod || "",
    }));
    setCompanyModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    resetRecord();
    setCompanyModalOpen(true);
  };

  const handleToggleBulkSelection = () => {
    setBulkSelectionEnabled((prev) => !prev);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id) => {
    if (Number(id) === PROTECTED_COMPANY_ID) return;

    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleToggleSelectAll = () => {
    const selectableIds = filteredRecords
      .filter((company) => Number(company.id) !== PROTECTED_COMPANY_ID)
      .map((company) => company.id);

    if (selectedIds.length === selectableIds.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(selectableIds);
  };

  const handleOpenInvoices = async (company) => {
    setInvoiceCompanyName(company.name || "");
    setInvoicesLoading(true);
    setInvoicesModalOpen(true);
    try {
      const invoices = await api.get("/invoices/all", {
        params: { companyId: company.id }
      });

      const pendingInvoices = (invoices.data || []).filter(
        (invoice) => invoice.status !== "paid"
      );
      setOpenInvoices(pendingInvoices);
    } catch (e) {
      setOpenInvoices([]);
      toast.error("Não foi possível carregar as faturas da empresa.");
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleCloseInvoicesModal = () => {
    setInvoicesModalOpen(false);
    setInvoicesLoading(false);
    setInvoiceCompanyName("");
    setOpenInvoices([]);
  };

  const handleOpenDetails = (company) => {
    setDetailsCompany(company);
    setDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setDetailsCompany(null);
  };

  const handleAddOneMonth = async (company) => {
    setLoading(true);
    try {
      const currentDueDate = moment(company.dueDate).isValid()
        ? moment(company.dueDate)
        : moment();
      const updatedDueDate = currentDueDate.clone().add(1, "month").format("YYYY-MM-DD");

      await update({
        id: company.id,
        name: company.name || "",
        email: company.email || "",
        phone: company.phone || "",
        planId: company.planId,
        status: company.status,
        dueDate: updatedDueDate,
        recurrence: company.recurrence || "MENSAL",
        document: company.document || "",
        paymentMethod: company.paymentMethod || ""
      });

      const invoicesResponse = await api.get("/invoices/all", {
        params: { companyId: company.id }
      });

      const pendingInvoices = (invoicesResponse.data || []).filter(
        (invoice) => invoice.status !== "paid"
      );

      const sameDueDateInvoices = pendingInvoices.filter((invoice) =>
        moment(invoice.dueDate).isSame(currentDueDate, "day")
      );

      const invoicesToUpdate = sameDueDateInvoices.length
        ? sameDueDateInvoices
        : pendingInvoices.slice(0, 1);

      if (invoicesToUpdate.length > 0) {
        await Promise.all(
          invoicesToUpdate.map((invoice) =>
            api.put(`/invoices/${invoice.id}`, {
              id: invoice.id,
              status: invoice.status || "open",
              dueDate: updatedDueDate
            })
          )
        );
      }

      toast.success(`Vencimento de ${company.name} atualizado para ${moment(updatedDueDate).format("DD/MM/YYYY")}.`);
      await loadPlans();
    } catch (e) {
      toast.error("Não foi possível adicionar 1 mês ao vencimento.");
    }
    setLoading(false);
  };

  const handleOpenMasterAccess = (company) => {
    setMasterAccessEmail(company?.email || "");
    setMasterAccessPassword("");
    setMasterAccessModalOpen(true);
  };

  const handleShowStorageUsage = async (company) => {
    setStorageCompanyName(company.name || "");
    setStorageUsage(null);
    setStorageLoading(true);
    setStorageModalOpen(true);
    try {
      const usage = await getStorageUsage(company.id);
      setStorageUsage(usage || null);
    } catch (error) {
      toast.error("Não foi possível consultar o armazenamento desta empresa.");
    } finally {
      setStorageLoading(false);
    }
  };

  const handleCloseStorageModal = () => {
    setStorageModalOpen(false);
    setStorageLoading(false);
    setStorageCompanyName("");
    setStorageUsage(null);
  };

  const handleCloseMasterAccess = () => {
    setMasterAccessModalOpen(false);
    setMasterAccessPassword("");
  };

  const handleMasterAccessSubmit = async () => {
    if (!masterAccessEmail || !masterAccessPassword) {
      toast.error("Informe o e-mail da empresa e a senha master.");
      return;
    }

    setMasterAccessLoading(true);
    await handleLogin({
      email: masterAccessEmail.trim(),
      password: masterAccessPassword
    });
    setMasterAccessLoading(false);
  };

  const filteredRecords = records.filter((company) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      (company.name || "").toLowerCase().includes(normalizedSearch) ||
      (company.email || "").toLowerCase().includes(normalizedSearch) ||
      String(company.id || "").includes(normalizedSearch);

    if (!matchesSearch) return false;

    if (dueFilter === "all") return true;
    if (!company.dueDate || !moment(company.dueDate).isValid()) return false;

    const isExpired = moment(company.dueDate).endOf("day").isBefore(moment());
    return dueFilter === "expired" ? isExpired : !isExpired;
  });

  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(filteredRecords.map((company) => company.id));
      const next = prev.filter(
        (id) => visibleIds.has(id) && Number(id) !== PROTECTED_COMPANY_ID
      );
      return next.length === prev.length ? prev : next;
    });
  }, [filteredRecords]);

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <Grid spacing={2} container>
        <Grid xs={12} item>
          <Box className={classes.masterAccessCard}>
            <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
              Senha master de acesso
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
              Define a senha usada para entrar em qualquer empresa.
            </Typography>
            <Box className={classes.masterAccessControls}>
              <TextField
                label="Senha master"
                type="password"
                variant="outlined"
                size="small"
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                className={classes.masterAccessInput}
                autoComplete="new-password"
              />
              <ButtonWithSpinner
                loading={masterPasswordSaving}
                onClick={handleSaveMasterPassword}
                variant="contained"
                color="primary"
                classes={{ root: classes.primaryButton }}
              >
                Salvar senha
              </ButtonWithSpinner>
            </Box>
            <Typography variant="caption" color="textSecondary">
              Status: {masterPasswordConfigured ? "configurada" : "não configurada"}.
            </Typography>
          </Box>
          <Box className={classes.toolbar} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gridGap={12}>
            <Box>
              <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                Empresas cadastradas
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {filteredRecords.length} exibida(s) de {records.length} no total
              </Typography>
            </Box>
            <Box className={classes.toolbarControls}>
              <TextField
                placeholder="Buscar empresa"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={classes.searchField}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl variant="outlined" size="small" className={classes.filterField}>
                <InputLabel id="company-due-filter-label">Filtro</InputLabel>
                <Select
                  labelId="company-due-filter-label"
                  value={dueFilter}
                  onChange={(e) => setDueFilter(e.target.value)}
                  label="Filtro"
                >
                  <MenuItem value="all">Todas empresas</MenuItem>
                  <MenuItem value="expired">Empresas vencidas</MenuItem>
                  <MenuItem value="active">Empresas não vencidas</MenuItem>
                </Select>
              </FormControl>

              <ButtonWithSpinner
                loading={false}
                onClick={handleToggleBulkSelection}
                variant="outlined"
                classes={{ root: classes.neutralButton }}
              >
                {bulkSelectionEnabled ? "Desativar seleção em massa" : "Ativar seleção em massa"}
              </ButtonWithSpinner>

              {bulkSelectionEnabled && selectedIds.length > 0 && (
                <ButtonWithSpinner
                  loading={loading}
                  onClick={() => handleOpenDeleteDialog(selectedIds, `${selectedIds.length} empresas selecionadas`)}
                  variant="contained"
                  color="secondary"
                  startIcon={<DeleteSweepIcon />}
                  classes={{ root: classes.neutralButton }}
                >
                  Excluir selecionadas
                </ButtonWithSpinner>
              )}

              <ButtonWithSpinner
                loading={false}
                onClick={handleOpenCreateModal}
                variant="contained"
                color="primary"
                classes={{ root: classes.primaryButton }}
              >
                Cadastrar empresa
              </ButtonWithSpinner>
            </Box>
          </Box>

          <CompaniesManagerGrid
            records={filteredRecords}
            onSelect={handleSelect}
            onRequestDelete={handleOpenDeleteDialog}
            onOpenInvoices={handleOpenInvoices}
            onAddOneMonth={handleAddOneMonth}
            onOpenDetails={handleOpenDetails}
            onOpenMasterAccess={handleOpenMasterAccess}
            onShowStorageUsage={handleShowStorageUsage}
            bulkSelectionEnabled={bulkSelectionEnabled}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            isCompanyProtected={(company) => Number(company?.id) === PROTECTED_COMPANY_ID}
          />
        </Grid>
      </Grid>
      <Dialog
        open={companyModalOpen}
        onClose={handleCancel}
        fullWidth
        maxWidth="md"
        classes={{ paper: classes.companyDialogPaper }}
      >
        <DialogTitle disableTypography className={classes.dialogTitleWrap}>
          <Typography className={classes.dialogTitleMain}>
            {record.id ? "Editar empresa" : "Cadastrar empresa"}
          </Typography>
          <Typography className={classes.dialogTitleSub}>
            Preencha os dados principais para manter controle de plano, vencimento e status da empresa.
          </Typography>
        </DialogTitle>
        <DialogContent dividers className={classes.formDialogContent}>
          <CompanyForm
            initialValue={record}
            onDelete={handleOpenDeleteDialog}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            canDelete={Number(record?.id) !== PROTECTED_COMPANY_ID}
            cancelLabel="Fechar"
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={invoicesModalOpen}
        onClose={handleCloseInvoicesModal}
        fullWidth
        maxWidth="sm"
        classes={{ paper: classes.companyDialogPaper }}
      >
        <DialogTitle disableTypography className={classes.dialogTitleWrap}>
          <Typography className={classes.dialogTitleMain}>
            Faturas em aberto - {invoiceCompanyName || "Empresa"}
          </Typography>
          <Typography className={classes.dialogTitleSub}>
            Visualize cobranças pendentes e vencimentos da conta selecionada.
          </Typography>
        </DialogTitle>
        <DialogContent dividers className={classes.invoicesDialogContent}>
          {invoicesLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={26} />
            </Box>
          ) : openInvoices.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Nenhuma fatura em aberto encontrada para esta empresa.
            </Typography>
          ) : (
            openInvoices.map((invoice) => (
              <Box key={invoice.id} className={classes.invoiceRow}>
                <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                  #{invoice.id} - {invoice.detail || "Fatura"}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Vencimento: {moment(invoice.dueDate).format("DD/MM/YYYY")}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: {invoice.status === "paid" ? "Pago" : "Em Aberto"}
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  Valor: {Number(invoice.value || 0).toLocaleString("pt-br", { style: "currency", currency: "BRL" })}
                </Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <ButtonWithSpinner
            loading={false}
            onClick={handleCloseInvoicesModal}
            variant="contained"
          >
            Fechar
          </ButtonWithSpinner>
        </DialogActions>
      </Dialog>
      <Dialog
        open={storageModalOpen}
        onClose={handleCloseStorageModal}
        fullWidth
        maxWidth="sm"
        classes={{ paper: classes.companyDialogPaper }}
      >
        <DialogTitle disableTypography className={classes.dialogTitleWrap}>
          <Typography className={classes.dialogTitleMain}>
            Uso de armazenamento - {storageCompanyName || "Empresa"}
          </Typography>
          <Typography className={classes.dialogTitleSub}>
            Volume total ocupado pelos arquivos da empresa.
          </Typography>
        </DialogTitle>
        <DialogContent dividers className={classes.invoicesDialogContent}>
          {storageLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <Box className={classes.invoiceRow}>
              <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                Armazenamento utilizado
              </Typography>
              <Typography variant="body2" color="textSecondary">
                GB:{" "}
                {Number(storageUsage?.gb || 0).toLocaleString("pt-br", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Bytes: {Number(storageUsage?.bytes || 0).toLocaleString("pt-br")}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <ButtonWithSpinner
            loading={false}
            onClick={handleCloseStorageModal}
            variant="contained"
          >
            Fechar
          </ButtonWithSpinner>
        </DialogActions>
      </Dialog>
      <Dialog
        open={masterAccessModalOpen}
        onClose={handleCloseMasterAccess}
        fullWidth
        maxWidth="sm"
        classes={{ paper: classes.companyDialogPaper }}
      >
        <DialogTitle disableTypography className={classes.dialogTitleWrap}>
          <Typography className={classes.dialogTitleMain}>
            Acesso com senha master
          </Typography>
          <Typography className={classes.dialogTitleSub}>
            Informe o e-mail da empresa e a senha master definida no painel super admin.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="E-mail da empresa"
                value={masterAccessEmail}
                onChange={(e) => setMasterAccessEmail(e.target.value)}
                variant="outlined"
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Senha master"
                value={masterAccessPassword}
                onChange={(e) => setMasterAccessPassword(e.target.value)}
                variant="outlined"
                fullWidth
                size="small"
                type="password"
                autoComplete="new-password"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <ButtonWithSpinner
            loading={false}
            onClick={handleCloseMasterAccess}
            variant="contained"
            classes={{ root: classes.neutralButton }}
          >
            Fechar
          </ButtonWithSpinner>
          <ButtonWithSpinner
            loading={masterAccessLoading}
            onClick={handleMasterAccessSubmit}
            variant="contained"
            color="primary"
            classes={{ root: classes.primaryButton }}
          >
            Entrar na conta
          </ButtonWithSpinner>
        </DialogActions>
      </Dialog>
      <Dialog
        open={detailsModalOpen}
        onClose={handleCloseDetails}
        fullWidth
        maxWidth="sm"
        classes={{ paper: classes.companyDialogPaper }}
      >
        <DialogTitle disableTypography className={classes.dialogTitleWrap}>
          <Typography className={classes.dialogTitleMain}>
            Detalhes da empresa
          </Typography>
          <Typography className={classes.dialogTitleSub}>
            Resumo rápido para consulta sem editar cadastro.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {detailsCompany && (
            <Box display="grid" gridTemplateColumns="1fr 1fr" gridGap={12}>
              <Typography><strong>ID:</strong> {detailsCompany.id}</Typography>
              <Typography><strong>Nome:</strong> {detailsCompany.name || "-"}</Typography>
              <Typography><strong>Email:</strong> {detailsCompany.email || "-"}</Typography>
              <Typography><strong>Telefone:</strong> {detailsCompany.phone || "-"}</Typography>
              <Typography><strong>Plano:</strong> {detailsCompany?.plan?.name || "-"}</Typography>
              <Typography>
                <strong>Status:</strong> {detailsCompany.status ? "Ativa" : "Inativa"}
              </Typography>
              <Typography><strong>Criada em:</strong> {dateToClient(detailsCompany.createdAt)}</Typography>
              <Typography><strong>Vencimento:</strong> {dateToClient(detailsCompany.dueDate)}</Typography>
              <Typography><strong>Recorrência:</strong> {detailsCompany.recurrence || "-"}</Typography>
              <Typography><strong>Último login:</strong> {datetimeToClient(detailsCompany.lastLogin)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <ButtonWithSpinner
            loading={false}
            onClick={handleCloseDetails}
            variant="contained"
            classes={{ root: classes.neutralButton }}
          >
            Fechar
          </ButtonWithSpinner>
        </DialogActions>
      </Dialog>
      <ConfirmationModal
        title={
          deleteTargetLabel
            ? `Excluir ${deleteTargetLabel}?`
            : "Exclusão de Registro"
        }
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => handleDelete()}
      >
        {deleteTargetIds.length > 1
          ? "Deseja realmente excluir as empresas selecionadas?"
          : "Deseja realmente excluir esse registro?"}
      </ConfirmationModal>
    </Paper>
  );
}
