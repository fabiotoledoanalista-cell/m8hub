import type { proto, WAMessage, WAMessageContent, WASocket } from "baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { isNil } from "lodash";
import fs from "fs";

import formatBody from "../../helpers/Mustache";
import { dynamicImport } from "../../utils/dynamicImport";

let baileysMod: typeof import("baileys") | null = null;
async function getBaileys() {
  if (!baileysMod) baileysMod = await dynamicImport("baileys");
  return baileysMod;
}

interface TemplateButton {
  index: number;
  urlButton?: {
    displayText: string;
    url: string;
  };
  callButton?: {
    displayText: string;
    phoneNumber: string;
  };
  quickReplyButton?: {
    displayText: string;
    id: string;
  };
}

interface Request {
  body?: string;
  ticket: Ticket;
  quotedMsg?: Message;
  msdelay?: number;
  vCard?: Contact;
  isForwarded?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  } | null;
  templateButtons?: TemplateButton[];
  messageTitle?: string;
  imageUrl?: string;
}

const safeParseJson = (value: string | null | undefined): any => {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const buildQuotedOptions = async (
  quotedMsg: Message | undefined,
  targetJid: string,
  isGroup: boolean
) => {
  if (!quotedMsg?.id) return {};

  const chatMessage = await Message.findOne({
    where: { id: quotedMsg.id }
  });
  if (!chatMessage) return {};

  const parsed = safeParseJson(chatMessage.dataJson);
  const parsedKey = parsed?.key || {};
  const parsedMessage = parsed?.message;

  const quotedKey = {
    ...parsedKey,
    id: parsedKey?.id || chatMessage.wid,
    remoteJid: targetJid || parsedKey?.remoteJid || chatMessage.remoteJid || undefined,
    participant: isGroup
      ? (parsedKey?.participant || chatMessage.participant || undefined)
      : undefined,
    fromMe:
      typeof parsedKey?.fromMe === "boolean"
        ? parsedKey.fromMe
        : Boolean(chatMessage.fromMe)
  };

  const fallbackMessage =
    parsedMessage ||
    (chatMessage.body ? { conversation: chatMessage.body } : undefined);

  if (!quotedKey.id || !fallbackMessage) return {};

  return {
    quoted: {
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      key: quotedKey,
      message: fallbackMessage
    }
  };
};

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  msdelay,
  vCard,
  isForwarded = false,
  location,
  templateButtons,
  messageTitle,
  imageUrl,
}: Request): Promise<WAMessage | proto.WebMessageInfo> => {
  let options: any = {};
  const wbot = await GetTicketWbot(ticket);
  const { delay } = await getBaileys();
  const contactNumber = await Contact.findByPk(ticket.contactId);

  let number: string;

  if (
    contactNumber.remoteJid &&
    contactNumber.remoteJid !== "" &&
    contactNumber.remoteJid.includes("@")
  ) {
    number = contactNumber.remoteJid;
  } else {
    number = `${contactNumber.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
  }

  options = await buildQuotedOptions(quotedMsg, number, Boolean(ticket.isGroup));

  if (!isNil(vCard)) {
    const numberContact = vCard.number;
    const firstName = vCard.name.split(" ")[0];
    const lastName = String(vCard.name).replace(firstName, "");

    const vcard =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `N:${lastName};${firstName};;;\n` +
      `FN:${vCard.name}\n` +
      `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n` +
      `END:VCARD`;

    try {
      await delay(msdelay);
      const sentMessage = await wbot.sendMessage(
        number,
        {
          contacts: {
            displayName: `${vCard.name}`,
            contacts: [{ vcard }],
          },
        },
        options
      );
      await ticket.update({
        lastMessage: formatBody(vcard, ticket),
        imported: null,
      });
      return sentMessage as WAMessage;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  if (location) {
    try {
      await delay(msdelay);

      const lat = Number(location.latitude);
      const lng = Number(location.longitude);
      const mapLink = `https://maps.google.com/maps?q=${lat}%2C${lng}&z=17`;
      const locationLabel = location.name || location.address || "Localização";

      const isWuzapiProvider =
        String((wbot as any)?.provider || "").toLowerCase() === "wuzapi";

      if (isWuzapiProvider) {
        const fallbackText = [locationLabel, location.address, mapLink]
          .filter(Boolean)
          .join("\n");

        const sentMessage = await wbot.sendMessage(
          number,
          { text: fallbackText },
          options
        );

        await ticket.update({
          lastMessage: `${locationLabel}: ${mapLink}`,
          imported: null
        });
        return sentMessage as WAMessage;
      }

      const sentMessage = await wbot.sendMessage(
        number,
        {
          location: {
            degreesLatitude: lat,
            degreesLongitude: lng,
            name: location.name || undefined,
            address: location.address || undefined
          }
        },
        options
      );

      await ticket.update({
        lastMessage: `${locationLabel}: ${mapLink}`,
        imported: null
      });
      return sentMessage as WAMessage;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  // ✅ ENVIO DE MENSAGEM COM BOTÕES
  if (templateButtons && templateButtons.length > 0) {
    try {
      await delay(msdelay);

      const formattedBody = formatBody(body || "", ticket);
      const footer = messageTitle || "";
      let mediaMessage: any = null;

      if (imageUrl) {
        if (fs.existsSync(imageUrl)) {
          const imageBuffer = fs.readFileSync(imageUrl);
          mediaMessage = {
            image: imageBuffer,
            caption: formattedBody,
            footer,
            templateButtons,
            headerType: 4
          };
        } else if (imageUrl.startsWith("http")) {
          mediaMessage = {
            image: { url: imageUrl },
            caption: formattedBody,
            footer,
            templateButtons,
            headerType: 4
          };
        }
      }

      const messageData = mediaMessage || {
        text: formattedBody,
        footer,
        templateButtons,
        headerType: 1
      };

      const sentMessage = await wbot.sendMessage(
        number,
        messageData as any,
        options
      );

      await ticket.update({ lastMessage: formattedBody, imported: null });
      return sentMessage as WAMessage;
    } catch (err) {
      console.log(
        `Erro ao enviar mensagem com botões na company ${ticket.companyId}: `,
        err
      );
      Sentry.captureException(err);
      throw new AppError("ERR_SENDING_WAPP_BUTTON_MSG");
    }
  }

  if (body) {
    try {
      await delay(msdelay);
      const sentMessage = await wbot.sendMessage(
        number,
        {
          text: formatBody(body, ticket),
          contextInfo: {
            forwardingScore: isForwarded ? 2 : 0,
            isForwarded: !!isForwarded,
          },
        },
        options
      );
      await ticket.update({
        lastMessage: formatBody(body, ticket),
        imported: null,
      });
      return sentMessage as WAMessage;
    } catch (err) {
      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  throw new AppError("ERR_NO_MESSAGE_CONTENT_PROVIDED");
};

export default SendWhatsAppMessage;
