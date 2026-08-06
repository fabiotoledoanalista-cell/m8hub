import CompaniesSettings from "../../models/CompaniesSettings";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import { tryGetWbot } from "../../libs/wbot";
import logger from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import { wuzapiRequest } from "./wuzapiClient";

const normalizeDigits = (value: string): string =>
  String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");

const isGroupJid = (value: string): boolean =>
  String(value || "")
    .toLowerCase()
    .endsWith("@g.us");

const normalizeJid = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw || !raw.includes("@")) return raw;
  const [left, domain] = raw.split("@");
  const primaryId = (left || "").split(":")[0] || left || "";
  return `${primaryId}@${String(domain || "").toLowerCase()}`;
};

const parsePayload = (body: any): any => {
  if (body && typeof body === "object" && body.jsonData) {
    try {
      const parsed = JSON.parse(String(body.jsonData));
      return {
        ...parsed,
        instanceName: body.instanceName || parsed.instanceName,
        userID: body.userID || parsed.userID
      };
    } catch {
      return body;
    }
  }
  return body;
};

const extractWhatsappIdFromInstanceName = (instanceName: string): number | null => {
  const match = String(instanceName || "").match(/^wpp-(\d+)-(\d+)$/i);
  if (!match) return null;
  const id = Number(match[2]);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const extractMessagePayload = (event: any): any => {
  const candidates = [
    event?.Message,
    event?.message,
    event?.RawMessage,
    event?.rawMessage,
    event?.Data,
    event?.data
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate?.message) return candidate.message;
    if (candidate?.Message) return candidate.Message;
    return candidate;
  }

  return {};
};

const resolveWuzapiAvatarUrl = async (
  whatsapp: Whatsapp,
  phoneOrJid: string
): Promise<string> => {
  const phone = normalizeDigits(phoneOrJid);
  if (!phone) return "";

  try {
    const data = await wuzapiRequest(whatsapp, "POST", "/user/avatar", {
      Phone: phone,
      Preview: true
    });

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return String(parsed?.URL || parsed?.url || "");
      } catch {
        return "";
      }
    }

    return String(data?.URL || data?.url || "");
  } catch {
    return "";
  }
};

const extractMessageBody = (messagePayload: any): { body: string; mediaType?: string } => {
  const conversation = messagePayload?.conversation;
  if (conversation) return { body: String(conversation) };

  const extended = messagePayload?.extendedTextMessage?.text;
  if (extended) return { body: String(extended) };

  if (messagePayload?.imageMessage) {
    return { body: String(messagePayload?.imageMessage?.caption || ":image:"), mediaType: "image" };
  }

  if (messagePayload?.videoMessage) {
    return { body: String(messagePayload?.videoMessage?.caption || ":video:"), mediaType: "video" };
  }

  if (messagePayload?.audioMessage) {
    return { body: ":audio:", mediaType: "audio" };
  }

  if (messagePayload?.documentMessage) {
    return {
      body: String(messagePayload?.documentMessage?.caption || ":document:"),
      mediaType: "document"
    };
  }

  if (messagePayload?.stickerMessage) {
    return { body: ":sticker:", mediaType: "sticker" };
  }

  if (messagePayload?.contactMessage) {
    return {
      body: String(messagePayload?.contactMessage?.displayName || ":contact:"),
      mediaType: "contact"
    };
  }

  if (messagePayload?.locationMessage) {
    return {
      body: String(messagePayload?.locationMessage?.name || ":location:"),
      mediaType: "location"
    };
  }

  return { body: "" };
};

const handleWuzapiWebhook = async (inputBody: any): Promise<void> => {
  const body = parsePayload(inputBody);
  const eventType = String(body?.type || "").trim();

  if (eventType !== "Message") return;

  const event = body?.event || body?.Event || {};
  const info = event?.Info || event?.info || {};
  const isFromMe = Boolean(info?.IsFromMe ?? info?.isFromMe ?? info?.FromMe);

  const instanceName = String(body?.instanceName || "");
  const whatsappId = extractWhatsappIdFromInstanceName(instanceName);
  if (!whatsappId) {
    logger.warn(`[WUZAPI_WEBHOOK] instanceName inválido: ${instanceName || "vazio"}`);
    return;
  }

  const whatsapp = await Whatsapp.findOne({
    where: {
      id: whatsappId,
      provider: "wuzapi",
      channel: "whatsapp"
    }
  });

  if (!whatsapp) {
    logger.warn(`[WUZAPI_WEBHOOK] conexão não encontrada para id=${whatsappId}`);
    return;
  }

  const senderJid = String(info?.Sender || info?.sender || "");
  const senderAltJid = String(info?.SenderAlt || info?.senderAlt || "");
  const chatJid = String(info?.Chat || info?.chat || senderJid);
  const remoteJid = normalizeJid(chatJid || senderJid);
  const isGroupChat = isGroupJid(remoteJid);
  const participantJid = normalizeJid(String(senderAltJid || senderJid || ""));
  const contactJid = normalizeJid(
    isFromMe
      ? (isGroupChat ? participantJid : remoteJid)
      : (participantJid || remoteJid)
  );
  const participantNumber = normalizeDigits(participantJid);
  const directNumber = normalizeDigits(contactJid || senderAltJid || senderJid || chatJid);
  const number = isGroupChat ? participantNumber : directNumber;

  if (!number) {
    logger.warn(`[WUZAPI_WEBHOOK] número inválido (sender=${senderJid}, chat=${chatJid})`);
    return;
  }

  const messageIdRaw = String(info?.ID || info?.id || "").trim();
  const messageId = messageIdRaw || `wuzapi-${whatsapp.id}-${Date.now()}`;

  const alreadyExists = await Message.findOne({
    where: {
      wid: messageId,
      companyId: whatsapp.companyId
    }
  });
  if (alreadyExists) return;

  const messagePayload = extractMessagePayload(event);
  const { body: messageBody, mediaType } = extractMessageBody(messagePayload);
  const fallbackBody = String(
    event?.Body ||
      event?.body ||
      messagePayload?.text ||
      messagePayload?.caption ||
      ""
  ).trim();
  const finalBody = String(messageBody || fallbackBody || "").trim();
  if (!finalBody && !mediaType) {
    return;
  }
  const pushName = String(info?.PushName || info?.pushName || "").trim();

  const wbot =
    tryGetWbot(whatsapp.id, whatsapp.companyId) ||
    ({
      profilePictureUrl: async () => ""
    } as any);
  const profilePicUrl = await resolveWuzapiAvatarUrl(
    whatsapp,
    senderAltJid || senderJid || number
  );
  const contact = await CreateOrUpdateContactService({
    name: pushName || number,
    number,
    profilePicUrl,
    isGroup: false,
    companyId: whatsapp.companyId,
    channel: "whatsapp",
    remoteJid: contactJid || (number ? `${number}@s.whatsapp.net` : remoteJid),
    whatsappId: whatsapp.id,
    wbot
  });

  let groupContact;
  if (isGroupChat) {
    const groupNumber = normalizeDigits(remoteJid);
    if (!groupNumber) return;
    groupContact = await CreateOrUpdateContactService({
      name: remoteJid,
      number: groupNumber,
      profilePicUrl: "",
      isGroup: true,
      companyId: whatsapp.companyId,
      channel: "whatsapp",
      remoteJid,
      whatsappId: whatsapp.id,
      wbot
    });
  }

  const settings = await CompaniesSettings.findOne({
    where: {
      companyId: whatsapp.companyId
    }
  });

  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp,
    1,
    whatsapp.companyId,
    0,
    0,
    groupContact,
    "whatsapp",
    false,
    false,
    settings
  );

  await ticket.update({
    lastMessage: finalBody
  });

  await CreateMessageService({
    companyId: whatsapp.companyId,
    messageData: {
      wid: messageId,
      ticketId: ticket.id,
      contactId: contact.id,
      body: finalBody,
      fromMe: isFromMe,
      read: isFromMe,
      ack: isFromMe ? 2 : 1,
      mediaType,
      remoteJid,
      dataJson: JSON.stringify(body),
      channel: "whatsapp"
    }
  });
};

export default handleWuzapiWebhook;
