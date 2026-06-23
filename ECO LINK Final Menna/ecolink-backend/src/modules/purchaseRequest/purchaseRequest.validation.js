import Joi from 'joi';

const objectId = Joi.string().trim().length(24).hex();

export const validateCreatePurchaseRequest = (body) => {
  const schema = Joi.object({
    wasteId: objectId.required(),
    quantity: Joi.number().integer().min(1).required(),
    offeredPrice: Joi.number().min(0).optional(),
    message: Joi.string().trim().max(2000).optional(),
  });

  const { error } = schema.validate(body, { abortEarly: true });
  return error ? error.details?.[0]?.message : null;
};

export const validateRequestIdParam = (params) => {
  const schema = Joi.object({
    id: objectId.required(),
  });

  const { error } = schema.validate(params, { abortEarly: true });
  return error ? error.details?.[0]?.message : null;
};

export const validateWasteIdParam = (params) => {
  const schema = Joi.object({
    wasteId: objectId.required(),
  });

  const { error } = schema.validate(params, { abortEarly: true });
  return error ? error.details?.[0]?.message : null;
};

// Helpers to use with validateRequest middleware (it may pass body first).
export const validateRequestIdParamFromReq = (_data, req) => validateRequestIdParam(req.params);
export const validateWasteIdParamFromReq = (_data, req) => validateWasteIdParam(req.params);

