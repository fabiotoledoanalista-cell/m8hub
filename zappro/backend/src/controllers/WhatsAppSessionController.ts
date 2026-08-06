import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import {
  clearSessionRuntimeState,
  removeWbot,
  tryGetWbot
} from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "../libs/cache";
import {
  isWuzapiProvider,
  wuzapiDisconnectSession,
  wuzapiLogoutSession
} from "../services/WuzapiServices/wuzapiClient";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);
  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  if (whatsapp.channel === "whatsapp") {
    clearSessionRuntimeState(whatsapp.id);
    await removeWbot(whatsapp.id, false);
    await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
    if (isWuzapiProvider(whatsapp)) {
      try {
        await wuzapiDisconnectSession(whatsapp);
      } catch {}
      await whatsapp.update({
        qrcode: "",
        retries: 0,
        status: "OPENING"
      });
      await StartWhatsAppSession(whatsapp, companyId);
      return res.status(200).json({ message: "Starting session." });
    }
    await whatsapp.update({
      session: "",
      qrcode: "",
      number: "",
      retries: 0,
      status: "DISCONNECTED"
    });
    await StartWhatsAppSession(whatsapp, companyId);
  }

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  console.log("DISCONNECTING SESSION", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);


  if (whatsapp.channel === "whatsapp") {
    clearSessionRuntimeState(whatsapp.id);
    if (isWuzapiProvider(whatsapp)) {
      try {
        await wuzapiLogoutSession(whatsapp);
      } catch {}
    } else {
      await DeleteBaileysService(whatsappId);
    }
    await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);

    const wbot = tryGetWbot(whatsapp.id);

    if (wbot) {
      try {
        await wbot.logout();
      } catch {}
      try {
        wbot.ws.close();
      } catch {}
    }
    await removeWbot(whatsapp.id, false);
  }

  await whatsapp.update({
    session: "",
    qrcode: "",
    number: "",
    retries: 0,
    status: "DISCONNECTED"
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
    action: "update",
    session: whatsapp
  });

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
