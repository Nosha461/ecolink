import Joi from 'joi';

export const validateCreateOrder = Joi.object({
  wasteId: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  shippingAddress: Joi.string().trim().required(),
});


//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\orders\orders.validation.js