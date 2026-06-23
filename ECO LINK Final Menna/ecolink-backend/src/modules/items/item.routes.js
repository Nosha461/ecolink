import express from 'express';
import * as itemController from './item.controller.js';

const router = express.Router();

router.get('/search', itemController.search);
router.get('/autocomplete', itemController.autocomplete);

export default router;
