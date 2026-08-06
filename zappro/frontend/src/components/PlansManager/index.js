import React, { useState, useEffect } from "react";
import {
  makeStyles,
  Paper,
  Box,
  Grid,
  Typography,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from "@material-ui/core";
import { Formik, Form, Field } from "formik";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ConfirmationModal from "../ConfirmationModal";

import { Edit as EditIcon } from "@material-ui/icons";

import { toast } from "react-toastify";
import usePlans from "../../hooks/usePlans";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%"
  },
  mainPaper: {
    width: "100%",
    flex: 1,
    padding: theme.spacing(2),
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === "light"
        ? "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
        : theme.palette.background.paper
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper
  },
  toolbarTitle: {
    fontWeight: 700,
    fontSize: "1rem"
  },
  toolbarSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
    marginTop: theme.spacing(0.5)
  },
  dialogPaper: {
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
  dialogTitleWrap: {
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === "light"
        ? "linear-gradient(120deg, #f5f8ff 0%, #ffffff 100%)"
        : theme.palette.background.default,
  },
  dialogTitleMain: {
    fontWeight: 700,
    fontSize: "1.08rem"
  },
  dialogTitleSub: {
    color: theme.palette.text.secondary,
    fontSize: "0.88rem",
    marginTop: theme.spacing(0.5)
  },
  dialogContent: {
    paddingTop: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
  },
  fullWidth: {
    width: "100%"
  },
  tableContainer: {
    width: "100%",
    overflowX: "auto",
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    ...theme.scrollbarStyles
  },
  tableHeadCell: {
    fontWeight: 700,
    backgroundColor:
      theme.palette.type === "light"
        ? "#f3f6fb"
        : "rgba(51,65,85,0.65)",
    color: theme.palette.text.primary,
  },
  rowHover: {
    "&:hover": {
      backgroundColor:
        theme.palette.type === "light"
          ? "#f8fafc"
          : "rgba(51,65,85,0.55)"
    }
  },
  sectionCard: {
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: "0.92rem",
    marginBottom: theme.spacing(1.5)
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  actionBtn: {
    minWidth: 140
  }
}));

const FEATURE_FIELDS = [
  { name: "useWhatsappBaileys", label: "WhatsApp Baileys" },
  { name: "useWhatsappWuzapi", label: "WhatsApp wuzAPI" },
  { name: "useFacebook", label: "Facebook" },
  { name: "useInstagram", label: "Instagram" },
  { name: "useCampaigns", label: i18n.t("plans.form.campaigns") },
  { name: "useSchedules", label: i18n.t("plans.form.schedules") },
  { name: "useInternalChat", label: "Chat Interno" },
  { name: "useExternalApi", label: "API Externa" },
  { name: "useKanban", label: "Kanban" },
  { name: "useOpenAi", label: "Talk.Ai" },
  { name: "useIntegrations", label: "Integrações" }
];

export function PlanManagerForm(props) {
  const { onSubmit, onDelete, onCancel, initialValue, loading } = props;
  const classes = useStyles();

  const [record, setRecord] = useState({
    name: "",
    users: 0,
    connections: 0,
    queues: 0,
    amount: 0,
    useWhatsapp: true,
    useWhatsappBaileys: true,
    useWhatsappWuzapi: true,
    useFacebook: true,
    useInstagram: true,
    useCampaigns: true,
    useSchedules: true,
    useInternalChat: true,
    useExternalApi: true,
    useKanban: true,
    useOpenAi: true,
    useIntegrations: true,
    isPublic: true
  });

  useEffect(() => {
    setRecord(initialValue);
  }, [initialValue]);

  const handleSubmit = async (data) => {
    onSubmit(data);
  };

  return (
    <Formik
      enableReinitialize
      className={classes.fullWidth}
      initialValues={record}
      onSubmit={(values) => handleSubmit(values)}
    >
      {() => (
        <Form className={classes.fullWidth}>
          <Paper className={classes.sectionCard} elevation={0}>
            <Typography className={classes.sectionTitle}>Informações do plano</Typography>
            <Grid spacing={2} container>
              <Grid xs={12} md={6} item>
                <Field
                  as={TextField}
                  label={i18n.t("plans.form.name")}
                  name="name"
                  variant="outlined"
                  size="small"
                  className={classes.fullWidth}
                />
              </Grid>

              <Grid xs={12} sm={6} md={3} item>
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel htmlFor="status-selection">{i18n.t("plans.form.public")}</InputLabel>
                  <Field
                    as={Select}
                    id="status-selection"
                    label={i18n.t("plans.form.public")}
                    labelId="status-selection-label"
                    name="isPublic"
                  >
                    <MenuItem value={true}>Sim</MenuItem>
                    <MenuItem value={false}>Não</MenuItem>
                  </Field>
                </FormControl>
              </Grid>

              <Grid xs={12} sm={6} md={3} item>
                <Field
                  as={TextField}
                  label="Valor"
                  name="amount"
                  variant="outlined"
                  size="small"
                  className={classes.fullWidth}
                  type="text"
                />
              </Grid>

              <Grid xs={12} sm={4} md={4} item>
                <Field
                  as={TextField}
                  label={i18n.t("plans.form.users")}
                  name="users"
                  variant="outlined"
                  size="small"
                  className={classes.fullWidth}
                  type="number"
                />
              </Grid>

              <Grid xs={12} sm={4} md={4} item>
                <Field
                  as={TextField}
                  label={i18n.t("plans.form.connections")}
                  name="connections"
                  variant="outlined"
                  size="small"
                  className={classes.fullWidth}
                  type="number"
                />
              </Grid>

              <Grid xs={12} sm={4} md={4} item>
                <Field
                  as={TextField}
                  label="Filas"
                  name="queues"
                  variant="outlined"
                  size="small"
                  className={classes.fullWidth}
                  type="number"
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper className={classes.sectionCard} elevation={0}>
            <Typography className={classes.sectionTitle}>Canais e recursos habilitados</Typography>
            <Grid spacing={2} container>
              {FEATURE_FIELDS.map((field) => (
                <Grid xs={12} sm={6} md={4} item key={field.name}>
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel htmlFor={`${field.name}-selection`}>{field.label}</InputLabel>
                    <Field
                      as={Select}
                      id={`${field.name}-selection`}
                      label={field.label}
                      labelId={`${field.name}-selection-label`}
                      name={field.name}
                    >
                      <MenuItem value={true}>{i18n.t("plans.form.enabled")}</MenuItem>
                      <MenuItem value={false}>{i18n.t("plans.form.disabled")}</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Box className={classes.actionsRow}>
            <ButtonWithSpinner
              className={classes.actionBtn}
              loading={loading}
              onClick={() => onCancel()}
              variant="outlined"
            >
              {i18n.t("plans.form.clear")}
            </ButtonWithSpinner>

            {record.id !== undefined ? (
              <ButtonWithSpinner
                className={classes.actionBtn}
                loading={loading}
                onClick={() => onDelete(record)}
                variant="contained"
                color="secondary"
              >
                {i18n.t("plans.form.delete")}
              </ButtonWithSpinner>
            ) : null}

            <ButtonWithSpinner
              className={classes.actionBtn}
              loading={loading}
              type="submit"
              variant="contained"
              color="primary"
            >
              {i18n.t("plans.form.save")}
            </ButtonWithSpinner>
          </Box>
        </Form>
      )}
    </Formik>
  );
}

export function PlansManagerGrid(props) {
  const { records, onSelect } = props;
  const classes = useStyles();

  const renderWhatsapp = (row) => {
    return row.useWhatsapp === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };
  const renderWhatsappBaileys = (row) => {
    return row.useWhatsappBaileys === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };
  const renderWhatsappWuzapi = (row) => {
    return row.useWhatsappWuzapi === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderFacebook = (row) => {
    return row.useFacebook === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderInstagram = (row) => {
    return row.useInstagram === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderCampaigns = (row) => {
    return row.useCampaigns === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderSchedules = (row) => {
    return row.useSchedules === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderInternalChat = (row) => {
    return row.useInternalChat === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderExternalApi = (row) => {
    return row.useExternalApi === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderKanban = (row) => {
    return row.useKanban === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderOpenAi = (row) => {
    return row.useOpenAi === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  const renderIntegrations = (row) => {
    return row.useIntegrations === false ? `${i18n.t("plans.form.no")}` : `${i18n.t("plans.form.yes")}`;
  };

  return (
    <Paper className={classes.tableContainer}>
      <Table className={classes.fullWidth} padding="none" aria-label="plans table">
        <TableHead>
          <TableRow>
            <TableCell align="center" style={{ width: "1%" }} className={classes.tableHeadCell}>#</TableCell>
            <TableCell align="left" className={classes.tableHeadCell}>{i18n.t("plans.form.name")}</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("plans.form.users")}</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("plans.form.public")}</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("plans.form.connections")}</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Filas</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Valor</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>WhatsApp</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>WhatsApp Baileys</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>WhatsApp wuzAPI</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Facebook</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Instagram</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("plans.form.campaigns")}</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>{i18n.t("plans.form.schedules")}</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Chat Interno</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>API Externa</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Kanban</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Talk.Ai</TableCell>
            <TableCell align="center" className={classes.tableHeadCell}>Integrações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((row) => (
            <TableRow key={row.id} className={classes.rowHover}>
              <TableCell align="center" style={{ width: "1%" }}>
                <IconButton onClick={() => onSelect(row)} aria-label="edit plan">
                  <EditIcon />
                </IconButton>
              </TableCell>
              <TableCell align="left">{row.name || "-"}</TableCell>
              <TableCell align="center">{row.users || "-"}</TableCell>
              <TableCell align="center">{row.isPublic ? "Sim" : "Não"}</TableCell>
              <TableCell align="center">{row.connections || "-"}</TableCell>
              <TableCell align="center">{row.queues || "-"}</TableCell>
              <TableCell align="center">
                {i18n.t("plans.form.money")} {row.amount ? row.amount.toLocaleString("pt-br", { minimumFractionDigits: 2 }) : "00.00"}
              </TableCell>
              <TableCell align="center">{renderWhatsapp(row)}</TableCell>
              <TableCell align="center">{renderWhatsappBaileys(row)}</TableCell>
              <TableCell align="center">{renderWhatsappWuzapi(row)}</TableCell>
              <TableCell align="center">{renderFacebook(row)}</TableCell>
              <TableCell align="center">{renderInstagram(row)}</TableCell>
              <TableCell align="center">{renderCampaigns(row)}</TableCell>
              <TableCell align="center">{renderSchedules(row)}</TableCell>
              <TableCell align="center">{renderInternalChat(row)}</TableCell>
              <TableCell align="center">{renderExternalApi(row)}</TableCell>
              <TableCell align="center">{renderKanban(row)}</TableCell>
              <TableCell align="center">{renderOpenAi(row)}</TableCell>
              <TableCell align="center">{renderIntegrations(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function PlansManager() {
  const classes = useStyles();
  const { list, save, update, remove } = usePlans();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [record, setRecord] = useState({});

  const getInitialRecord = () => ({
    id: undefined,
    name: "",
    users: 0,
    connections: 0,
    queues: 0,
    amount: 0,
    useWhatsapp: true,
    useWhatsappBaileys: true,
    useWhatsappWuzapi: true,
    useFacebook: true,
    useInstagram: true,
    useCampaigns: true,
    useSchedules: true,
    useInternalChat: true,
    useExternalApi: true,
    useKanban: true,
    useOpenAi: true,
    useIntegrations: true,
    isPublic: true
  });

  useEffect(() => {
    setRecord(getInitialRecord());
    async function fetchData() {
      await loadPlans();
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const planList = await list();
      setRecords(planList);
    } catch (e) {
      toast.error("Não foi possível carregar a lista de registros");
    }
    setLoading(false);
  };

  const handleSubmit = async (data) => {
    if (loading) return;
    setLoading(true);
    try {
      if (data.id !== undefined) {
        await update(data);
      } else {
        await save(data);
      }
      handleCancel();
      toast.success("Operação realizada com sucesso!");
      try {
        await loadPlans();
      } catch (err) {
        toast.warn("Plano salvo, mas não foi possível atualizar a lista agora.");
      }
    } catch (e) {
      toast.error("Não foi possível realizar a operação. Verifique se já existe uma plano com o mesmo nome ou se os campos foram preenchidos corretamente");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await remove(record.id);
      handleCancel();
      toast.success("Operação realizada com sucesso!");
      try {
        await loadPlans();
      } catch (err) {
        toast.warn("Plano excluído, mas não foi possível atualizar a lista agora.");
      }
    } catch (e) {
      toast.error("Não foi possível realizar a operação");
    }
    setLoading(false);
  };

  const handleOpenDeleteDialog = () => {
    setShowConfirmDialog(true);
  };

  const handleCancel = () => {
    setRecord(getInitialRecord());
    setPlanModalOpen(false);
  };

  const handleSelect = (data) => {
    const useWhatsapp = data.useWhatsapp === false ? false : true;
    const useWhatsappBaileys = data.useWhatsappBaileys === false ? false : true;
    const useWhatsappWuzapi = data.useWhatsappWuzapi === false ? false : true;
    const useFacebook = data.useFacebook === false ? false : true;
    const useInstagram = data.useInstagram === false ? false : true;
    const useCampaigns = data.useCampaigns === false ? false : true;
    const useSchedules = data.useSchedules === false ? false : true;
    const useInternalChat = data.useInternalChat === false ? false : true;
    const useExternalApi = data.useExternalApi === false ? false : true;
    const useKanban = data.useKanban === false ? false : true;
    const useOpenAi = data.useOpenAi === false ? false : true;
    const useIntegrations = data.useIntegrations === false ? false : true;

    setRecord({
      id: data.id,
      name: data.name || "",
      users: data.users || 0,
      connections: data.connections || 0,
      queues: data.queues || 0,
      amount: data.amount?.toLocaleString("pt-br", { minimumFractionDigits: 2 }) || 0,
      useWhatsapp,
      useWhatsappBaileys,
      useWhatsappWuzapi,
      useFacebook,
      useInstagram,
      useCampaigns,
      useSchedules,
      useInternalChat,
      useExternalApi,
      useKanban,
      useOpenAi,
      useIntegrations,
      isPublic: data.isPublic
    });
    setPlanModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setRecord(getInitialRecord());
    setPlanModalOpen(true);
  };

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <Grid spacing={2} container>
        <Grid xs={12} item>
          <Box className={classes.toolbar}>
            <Box>
              <Typography className={classes.toolbarTitle}>Planos cadastrados</Typography>
              <Typography className={classes.toolbarSubtitle}>{records.length} plano(s) no total</Typography>
            </Box>
            <ButtonWithSpinner loading={false} variant="contained" color="primary" onClick={handleOpenCreateModal}>
              Cadastrar plano
            </ButtonWithSpinner>
          </Box>
          <PlansManagerGrid records={records} onSelect={handleSelect} />
        </Grid>
      </Grid>

      <Dialog
        open={planModalOpen}
        onClose={handleCancel}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        classes={{ paper: classes.dialogPaper }}
      >
        <DialogTitle disableTypography className={classes.dialogTitleWrap}>
          <Typography className={classes.dialogTitleMain}>{record.id ? "Editar plano" : "Cadastrar plano"}</Typography>
          <Typography className={classes.dialogTitleSub}>
            Configure limites e recursos disponíveis para este plano.
          </Typography>
        </DialogTitle>
        <DialogContent dividers className={classes.dialogContent}>
          <PlanManagerForm
            initialValue={record}
            onDelete={handleOpenDeleteDialog}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        title="Exclusão de Registro"
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => handleDelete()}
      >
        Deseja realmente excluir esse registro?
      </ConfirmationModal>
    </Paper>
  );
}
