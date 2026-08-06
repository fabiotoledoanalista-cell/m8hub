import PushSubscription from "../../models/PushSubscription";
import logger from "../../utils/logger";
import { getPushConfig, hasPushConfig } from "./PushConfig";

const webpush = require("web-push");

interface Request {
  companyId: number;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let vapidConfigured = false;

const ensureVapid = () => {
  if (vapidConfigured) return true;
  if (!hasPushConfig()) return false;

  const { publicKey, privateKey, subject } = getPushConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
};

const SendWebPushNotificationService = async ({
  companyId,
  title,
  body,
  url = "/",
  tag
}: Request): Promise<void> => {
  if (!ensureVapid()) {
    return;
  }

  const subscriptions = await PushSubscription.findAll({
    where: { companyId }
  });

  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title,
    body,
    url,
    tag: tag || `company-${companyId}`,
    data: { url }
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      const subscriptionObject = {
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime ? Number(sub.expirationTime) : null,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(subscriptionObject, payload);
      } catch (error: any) {
        const statusCode = error?.statusCode;

        // 404/410 = inscrição expirada/inválida.
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.destroy({
            where: { id: sub.id }
          });
          return;
        }

        logger.warn(
          `Falha ao enviar web push (company ${companyId}): ${error?.message || error}`
        );
      }
    })
  );
};

export default SendWebPushNotificationService;

