import express from 'express';
import { isAuthenticated, allowTo } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import * as ordersController from './orders.controller.js';
import { validateCreateOrder } from './orders.validation.js';

const router = express.Router();

router.use(isAuthenticated, allowTo('buyer'));

router.post(
  '/make-order',
  validate(validateCreateOrder),
  ordersController.create
);

router.get('/list-my-orders', ordersController.listMine);
router.get('/get-order/:id', ordersController.getOne);
router.delete('/delete-order/:id', ordersController.remove);

export default router;
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\orders\orders.routes.js
