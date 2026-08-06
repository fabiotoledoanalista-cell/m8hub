import { Router } from "express";
import * as WebHooksController from "../controllers/WebHookController";
const webHooksRoutes = Router();

webHooksRoutes.get("/", WebHooksController.index);
webHooksRoutes.post("/", WebHooksController.webHook);
webHooksRoutes.post("/wuzapi", WebHooksController.webHookWuzapi);
export default webHooksRoutes;
