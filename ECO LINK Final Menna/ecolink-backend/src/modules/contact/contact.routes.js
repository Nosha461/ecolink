import express from "express";
import { sendContactMessage } from "./contact.controller.js";

const router = express.Router();

router.post("/", sendContactMessage);

export default router;
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\contact\contact.routs.js