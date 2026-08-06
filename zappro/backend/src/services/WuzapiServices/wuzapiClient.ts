import axios, { AxiosRequestConfig, Method } from "axios";
import mime from "mime-types";
import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

const normalizeProvider = (provider?: string | null): string =>
  String(provider || "").trim().toLowerCase();

const isWuzapiProvider = (whatsapp: Whatsapp): boolean =>
  normalizeProvider((whatsapp as any).provider) === "wuzapi";

type WuzapiGlobalSettings = {
  baseUrl: string;
  adminToken: string;
  defaultUserToken: string;
};

const GLOBAL_SETTINGS_TTL_MS = 30000;
let globalSettingsCache: {
  expiresAt: number;
  data: WuzapiGlobalSettings;
} | null = null;

const normalizeBaseUrl = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const normalizeTokenValue = (value: string): string =>
  String(value || "")
    .trim()
    .replace(/^Bearer\s+/i, "");

const resolveInboundWebhookUrl = (): string => {
  const fromExplicit = String(
    process.env.WUZAPI_INBOUND_WEBHOOK_URL || process.env.WUZAPI_WEBHOOK_URL || ""
  ).trim();
  if (fromExplicit) return normalizeBaseUrl(fromExplicit);

  const backendUrl = String(process.env.BACKEND_URL || "").trim();
  if (!backendUrl) return "";

  return `${normalizeBaseUrl(backendUrl)}/webhook/wuzapi`;
};

const loadGlobalSettings = async (
  forceReload = false
): Promise<WuzapiGlobalSettings> => {
  if (!forceReload && globalSettingsCache && globalSettingsCache.expiresAt > Date.now()) {
    return globalSettingsCache.data;
  }

  const empty: WuzapiGlobalSettings = {
    baseUrl: "",
    adminToken: "",
    defaultUserToken: ""
  };

  try {
    const rows = await Setting.findAll({
      where: {
        companyId: 1,
        key: ["WUZAPI_BASE_URL", "WUZAPI_ADMIN_TOKEN", "WUZAPI_DEFAULT_USER_TOKEN"]
      }
    });

    const map: Record<string, string> = {};
    rows.forEach((row: any) => {
      map[row.key] = String(row.value || "").trim();
    });

    // Fallback: quando o super admin salvou em outra company, usa o valor mais recente por chave.
    if (!map.WUZAPI_BASE_URL || !map.WUZAPI_ADMIN_TOKEN) {
      const fallbackRows = await Setting.findAll({
        where: {
          key: ["WUZAPI_BASE_URL", "WUZAPI_ADMIN_TOKEN", "WUZAPI_DEFAULT_USER_TOKEN"]
        },
        order: [["updatedAt", "DESC"], ["id", "DESC"]]
      });

      fallbackRows.forEach((row: any) => {
        const key = String(row.key || "");
        if (!map[key] && String(row.value || "").trim()) {
          map[key] = String(row.value || "").trim();
        }
      });
    }

    const loaded: WuzapiGlobalSettings = {
      baseUrl: normalizeBaseUrl(String(map.WUZAPI_BASE_URL || "")),
      adminToken: normalizeTokenValue(String(map.WUZAPI_ADMIN_TOKEN || "")),
      defaultUserToken: normalizeTokenValue(String(map.WUZAPI_DEFAULT_USER_TOKEN || ""))
    };

    globalSettingsCache = {
      expiresAt: Date.now() + GLOBAL_SETTINGS_TTL_MS,
      data: loaded
    };

    return loaded;
  } catch {
    return empty;
  }
};

const getBaseUrl = async (
  whatsapp: Whatsapp,
  forceReload = false
): Promise<string> => {
  const fromConnection = String((whatsapp as any).wuzapiUrl || "").trim();
  const fromEnv = String(process.env.WUZAPI_BASE_URL || "").trim();
  const fromGlobal = (await loadGlobalSettings(forceReload)).baseUrl;
  const base = fromConnection || fromEnv || fromGlobal;

  if (!base) {
    throw new AppError("WUZAPI_URL_NOT_CONFIGURED");
  }

  return normalizeBaseUrl(base);
};

const getToken = async (
  whatsapp: Whatsapp,
  forceReload = false
): Promise<string> => {
  const fromConnection = String((whatsapp as any).wuzapiToken || "").trim();
  const fromWhatsappToken = String((whatsapp as any).token || "").trim();
  const fromEnv = String(process.env.WUZAPI_TOKEN || "").trim();
  const fromGlobal = (await loadGlobalSettings(forceReload)).defaultUserToken;
  const token = normalizeTokenValue(
    fromConnection || fromWhatsappToken || fromEnv || fromGlobal
  );

  if (!token) {
    throw new AppError("WUZAPI_TOKEN_NOT_CONFIGURED");
  }

  return token;
};

const getAdminToken = async (forceReload = false): Promise<string> => {
  const fromEnv = normalizeTokenValue(String(process.env.WUZAPI_ADMIN_TOKEN || ""));
  if (fromEnv) return fromEnv;
  const fromGlobal = (await loadGlobalSettings(forceReload)).adminToken;
  return normalizeTokenValue(String(fromGlobal || ""));
};

const buildHeaders = (token: string) => ({
  token,
  Token: token,
  Authorization: token,
  "Content-Type": "application/json"
});

const extractData = (response: any): any => {
  if (response?.data?.data !== undefined) return response.data.data;
  if (response?.data !== undefined) return response.data;
  return response;
};

const normalizePhone = (jidOrPhone: string): string => {
  const raw = String(jidOrPhone || "").trim();
  if (!raw) return raw;

  if (raw.includes("@")) {
    const [left, domain] = raw.split("@");
    const primaryId = (left || "").split(":")[0] || left || "";
    const normalizedDomain = String(domain || "").toLowerCase();
    if (!normalizedDomain) return primaryId.replace(/\s+/g, "");
    return `${primaryId.replace(/\s+/g, "")}@${normalizedDomain}`;
  }

  return raw.replace(/\s+/g, "");
};

const randomId = () =>
  `${Date.now()}${Math.random().toString(16).slice(2, 10)}`.toUpperCase();

const isDataUri = (value?: string): boolean =>
  Boolean(value && /^data:[^;]+;base64,/i.test(value));

const guessMime = (fileName?: string, fallback = "application/octet-stream") => {
  if (fileName) {
    const detected = mime.lookup(fileName);
    if (detected) return String(detected);
  }
  return fallback;
};

const toDataUriFromBuffer = (
  value: Buffer,
  mimeType: string = "application/octet-stream"
): string => `data:${mimeType};base64,${value.toString("base64")}`;

const readRemoteAsDataUri = async (url: string, mimeHint?: string): Promise<string> => {
  const resp = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000
  });

  const contentType = String(
    resp.headers?.["content-type"] || mimeHint || "application/octet-stream"
  );
  return toDataUriFromBuffer(Buffer.from(resp.data), contentType);
};

export const wuzapiRequest = async (
  whatsapp: Whatsapp,
  method: Method,
  path: string,
  payload?: any,
  extraConfig?: AxiosRequestConfig
): Promise<any> => {
  if (!isWuzapiProvider(whatsapp)) {
    throw new AppError("WUZAPI_PROVIDER_REQUIRED");
  }

  const baseURL = await getBaseUrl(whatsapp);
  const token = await getToken(whatsapp);
  const url = `${baseURL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await axios({
      url,
      method,
      headers: buildHeaders(token),
      data: payload,
      timeout: 45000,
      ...extraConfig
    });

    return extractData(response);
  } catch (error: any) {
    const status = error?.response?.status;
    const details = error?.response?.data || error?.message || error;
    throw new AppError(
      `WUZAPI_REQUEST_FAILED${status ? `_${status}` : ""}: ${JSON.stringify(details)}`
    );
  }
};

export const ensureWuzapiUserExists = async (whatsapp: Whatsapp): Promise<void> => {
  if (!isWuzapiProvider(whatsapp)) return;

  const userName = `wpp-${whatsapp.companyId}-${whatsapp.id}`;
  const webhookUrl = resolveInboundWebhookUrl();
  const events = "Message,ReadReceipt,Connected,PairSuccess";
  let baseURL = "";
  let token = "";
  let adminTokenInUse = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const forceReload = attempt === 1;
    const adminToken = await getAdminToken(forceReload);
    if (!adminToken) return;
    adminTokenInUse = adminToken;

    baseURL = await getBaseUrl(whatsapp, forceReload);
    token = await getToken(whatsapp, forceReload);

    try {
      await axios.post(
        `${baseURL}/admin/users`,
        {
          name: userName,
          token,
          webhook: webhookUrl,
          events
        },
        {
          headers: {
            Authorization: adminToken,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );
      break;
    } catch (error: any) {
      const status = error?.response?.status;
      const details = error?.response?.data || error?.message || "";
      const normalized = String(JSON.stringify(details)).toLowerCase();
      const alreadyExists =
        status === 409 ||
        normalized.includes("already exists") ||
        normalized.includes("já existe") ||
        normalized.includes("duplicate");

      if (alreadyExists) break;

      if (status === 401 && attempt === 0) {
        continue;
      }

      throw new AppError(
        `WUZAPI_ADMIN_CREATE_USER_FAILED${status ? `_${status}` : ""}: ${JSON.stringify(
          details
        )}`
      );
    }
  }

  if (adminTokenInUse && baseURL && token && webhookUrl) {
    try {
      const listResponse = await axios.get(`${baseURL}/admin/users`, {
        headers: {
          Authorization: adminTokenInUse,
          "Content-Type": "application/json"
        },
        timeout: 30000
      });

      const users = extractData(listResponse);
      const userList: any[] = Array.isArray(users)
        ? users
        : Array.isArray(users?.users)
        ? users.users
        : [];

      const currentUser = userList.find((item: any) => {
        const itemName = String(item?.name || "");
        const itemToken = normalizeTokenValue(String(item?.token || ""));
        return itemName === userName || itemToken === token;
      });

      if (currentUser?.id) {
        const currentWebhook = String(currentUser?.webhook || "").trim();
        const currentEvents = String(currentUser?.events || "").trim();

        if (currentWebhook !== webhookUrl || currentEvents !== events) {
          await axios.put(
            `${baseURL}/admin/users/${currentUser.id}`,
            {
              name: userName,
              webhook: webhookUrl,
              events
            },
            {
              headers: {
                Authorization: adminTokenInUse,
                "Content-Type": "application/json"
              },
              timeout: 30000
            }
          );
        }
      }
    } catch (error: any) {
      logger.warn(
        `WUZAPI_ADMIN_SYNC_WEBHOOK_FAILED: ${JSON.stringify(
          error?.response?.data || error?.message || error
        )}`
      );
    }
  }

  const pendingUpdate: any = {};
  if (!String((whatsapp as any).wuzapiUrl || "").trim()) {
    pendingUpdate.wuzapiUrl = baseURL;
  }
  if (!String((whatsapp as any).wuzapiToken || "").trim()) {
    pendingUpdate.wuzapiToken = token;
  }
  if (Object.keys(pendingUpdate).length > 0) {
    await whatsapp.update(pendingUpdate);
  }
};

export const wuzapiConnectSession = async (whatsapp: Whatsapp): Promise<any> =>
  wuzapiRequest(whatsapp, "POST", "/session/connect", {
    Subscribe: ["Message", "ReadReceipt"],
    Immediate: true
  });

export const wuzapiDisconnectSession = async (whatsapp: Whatsapp): Promise<any> =>
  wuzapiRequest(whatsapp, "POST", "/session/disconnect");

export const wuzapiLogoutSession = async (whatsapp: Whatsapp): Promise<any> =>
  wuzapiRequest(whatsapp, "POST", "/session/logout");

export const wuzapiStatusSession = async (
  whatsapp: Whatsapp
): Promise<{ connected: boolean; loggedIn: boolean; jid?: string; raw: any }> => {
  const data = await wuzapiRequest(whatsapp, "GET", "/session/status");

  const connected = Boolean(data?.Connected ?? data?.connected ?? data?.IsConnected);
  const loggedIn = Boolean(data?.LoggedIn ?? data?.loggedIn ?? data?.IsLoggedIn);
  const jid = data?.Jid || data?.jid;

  return { connected, loggedIn, jid, raw: data };
};

const normalizeDigits = (value: string): string =>
  String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");

export const syncWuzapiStatusFromProvider = async (
  whatsapp: Whatsapp
): Promise<void> => {
  if (!isWuzapiProvider(whatsapp)) return;

  try {
    const status = await wuzapiStatusSession(whatsapp);
    const isConnected = Boolean(status.connected && status.loggedIn);
    const nextStatus = isConnected ? "CONNECTED" : "DISCONNECTED";
    const numberFromStatus = normalizeDigits(String(status.jid || ""));

    const pendingUpdate: any = {};

    if (String(whatsapp.status || "") !== nextStatus) {
      pendingUpdate.status = nextStatus;
    }

    if (isConnected) {
      if (String(whatsapp.qrcode || "").trim()) pendingUpdate.qrcode = "";
      if ((whatsapp as any).retries !== 0) pendingUpdate.retries = 0;
      if (numberFromStatus && String(whatsapp.number || "") !== numberFromStatus) {
        pendingUpdate.number = numberFromStatus;
      }
    } else if (String(whatsapp.status || "") === "CONNECTED") {
      pendingUpdate.qrcode = "";
    }

    if (Object.keys(pendingUpdate).length > 0) {
      await whatsapp.update(pendingUpdate);
    }
  } catch {
    // Falha de comunicação com o WuzAPI não deve derrubar listagens da aplicação.
  }
};

export const wuzapiGetQrCode = async (whatsapp: Whatsapp): Promise<string> => {
  const data = await wuzapiRequest(whatsapp, "GET", "/session/qr");
  return String(data?.QRCode || data?.qrCode || data?.qr || "");
};

const buildContextInfo = (options?: any): any | undefined => {
  const quoted = options?.quoted;
  const quotedKey = quoted?.key || {};

  const stanzaId =
    quotedKey?.id ||
    quoted?.wid ||
    quoted?.id;
  const participant =
    quotedKey?.participant ||
    quotedKey?.remoteJid ||
    quoted?.participant ||
    quoted?.remoteJid;

  if (!stanzaId) return undefined;

  const contextInfo: any = {
    StanzaId: stanzaId
  };

  if (participant) {
    contextInfo.Participant = participant;
  }

  return contextInfo;
};

const mapResponseToWbotShape = (response: any) => {
  const msgId =
    response?.Id ||
    response?.ID ||
    response?.id ||
    response?.MessageID ||
    randomId();

  return {
    key: {
      id: String(msgId)
    },
    messageTimestamp: new Date().toISOString()
  };
};

const sendText = async ({ whatsapp, phone, body, options }: any) => {
  const payload: any = {
    Phone: phone,
    Body: body || ""
  };

  const contextInfo = buildContextInfo(options);
  if (contextInfo) payload.ContextInfo = contextInfo;

  const response = await wuzapiRequest(whatsapp, "POST", "/chat/send/text", payload);
  return mapResponseToWbotShape(response);
};

const sendMedia = async ({
  whatsapp,
  endpoint,
  dataKey,
  phone,
  dataUri,
  caption,
  fileName
}: any) => {
  const payload: any = {
    Phone: phone,
    [dataKey]: dataUri
  };

  if (caption) payload.Caption = caption;
  if (fileName) payload.FileName = fileName;

  const response = await wuzapiRequest(whatsapp, "POST", endpoint, payload);
  return mapResponseToWbotShape(response);
};

const toDataUri = async (
  input: any,
  mimeHint?: string,
  fileName?: string
): Promise<string> => {
  if (!input) throw new AppError("WUZAPI_MEDIA_EMPTY");

  if (Buffer.isBuffer(input)) {
    const resolvedMime = mimeHint || guessMime(fileName);
    return toDataUriFromBuffer(input, resolvedMime);
  }

  if (typeof input === "string") {
    if (isDataUri(input)) return input;
    if (/^https?:\/\//i.test(input)) return readRemoteAsDataUri(input, mimeHint);
    throw new AppError("WUZAPI_MEDIA_STRING_UNSUPPORTED");
  }

  if (input?.url && typeof input.url === "string") {
    if (isDataUri(input.url)) return input.url;
    if (/^https?:\/\//i.test(input.url)) {
      return readRemoteAsDataUri(input.url, mimeHint);
    }
  }

  throw new AppError("WUZAPI_MEDIA_FORMAT_UNSUPPORTED");
};

export const wuzapiSendMessage = async (
  whatsapp: Whatsapp,
  jidOrPhone: string,
  message: any,
  options?: any
): Promise<any> => {
  const phone = normalizePhone(jidOrPhone);

  if (message?.text !== undefined) {
    return sendText({ whatsapp, phone, body: message.text, options });
  }

  if (message?.location) {
    const lat = Number(message.location?.degreesLatitude);
    const lng = Number(message.location?.degreesLongitude);
    const mapLink = `https://maps.google.com/maps?q=${lat}%2C${lng}&z=17`;
    const label = message.location?.name || message.location?.address || "Localizacao";
    return sendText({
      whatsapp,
      phone,
      body: `${label}\n${message.location?.address || ""}\n${mapLink}`.trim(),
      options
    });
  }

  if (message?.image) {
    const mimeType = guessMime(message?.fileName, "image/jpeg");
    const dataUri = await toDataUri(message.image, mimeType, message?.fileName);
    return sendMedia({
      whatsapp,
      endpoint: "/chat/send/image",
      dataKey: "Image",
      phone,
      dataUri,
      caption: message?.caption,
      fileName: message?.fileName
    });
  }

  if (message?.video) {
    const mimeType = guessMime(message?.fileName, "video/mp4");
    const dataUri = await toDataUri(message.video, mimeType, message?.fileName);
    return sendMedia({
      whatsapp,
      endpoint: "/chat/send/video",
      dataKey: "Video",
      phone,
      dataUri,
      caption: message?.caption,
      fileName: message?.fileName
    });
  }

  if (message?.audio) {
    const mimeType = message?.mimetype || guessMime(message?.fileName, "audio/ogg");
    const dataUri = await toDataUri(message.audio, mimeType, message?.fileName);
    return sendMedia({
      whatsapp,
      endpoint: "/chat/send/audio",
      dataKey: "Audio",
      phone,
      dataUri,
      caption: message?.caption,
      fileName: message?.fileName
    });
  }

  if (message?.document) {
    const mimeType =
      message?.mimetype || guessMime(message?.fileName, "application/octet-stream");
    const dataUri = await toDataUri(message.document, mimeType, message?.fileName);
    return sendMedia({
      whatsapp,
      endpoint: "/chat/send/document",
      dataKey: "Document",
      phone,
      dataUri,
      caption: message?.caption,
      fileName: message?.fileName || "document"
    });
  }

  throw new AppError("WUZAPI_MESSAGE_TYPE_UNSUPPORTED");
};

export const createWuzapiSessionAdapter = (whatsapp: Whatsapp, companyId: number): any => {
  const adapter: any = {
    id: whatsapp.id,
    companyId,
    provider: "wuzapi",
    user: {
      id: whatsapp.number ? `${whatsapp.number}@s.whatsapp.net` : undefined
    },
    sendMessage: async (jid: string, message: any, options?: any) =>
      wuzapiSendMessage(whatsapp, jid, message, options),
    sendPresenceUpdate: async () => true,
    presenceSubscribe: async () => true,
    readMessages: async () => true,
    onWhatsApp: async (jid: string) => [{ exists: true, jid }],
    profilePictureUrl: async () => "",
    relayMessage: async () => {
      throw new AppError("WUZAPI_RELAY_NOT_SUPPORTED");
    },
    upsertMessage: async () => true,
    logout: async () => {
      await wuzapiLogoutSession(whatsapp);
      return true;
    },
    ws: {
      close: async () => {
        await wuzapiDisconnectSession(whatsapp);
      }
    }
  };

  return adapter;
};

export { isWuzapiProvider };
