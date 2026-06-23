import express from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import * as wasteController from './waste.controller.js';
import { validateCreateWaste, validateUpdateWaste, validateWasteIdParam } from './waste.validation.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import {fileValidation,localFileUpload} from "../../utils/multer/multer.local.js";
const router = express.Router();

/* ================= SEARCH (لازم قبل :id) ================= */
router.get('/search', wasteController.search);

const attachCategoryIdFromParams = (req, _res, next) => {
  if (req.params?.categoryId) {
    req.body.categoryId = req.params.categoryId;
  }
  next();
};

router.get("/list", wasteController.list);
router.get("/getwaste/:id", wasteController.getOne);

router.post(
  "/addwaste/:categoryId",
  isAuthenticated,
  localFileUpload({
    customPath: "waste",
    validation: fileValidation.image,
    folder:"waste image",
  }).array("images"),
  validateRequest(validateCreateWaste),
  wasteController.add
);
router.patch(
  "/updatewaste/:id/:categoryId?",
  isAuthenticated,
  localFileUpload({customPath:"waste",validation:fileValidation.image, folder:"waste image"
  }).array("images"),
  attachCategoryIdFromParams,
  validateRequest(validateUpdateWaste),
  wasteController.update,
);
router.delete(
  "/deletewaste/:id",
  isAuthenticated,
  validateRequest(validateWasteIdParam),
  wasteController.remove,
);


export default router;
