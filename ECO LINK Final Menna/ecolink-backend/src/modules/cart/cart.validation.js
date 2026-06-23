const validateAddCartItem = (body) => {
  const { wasteId, quantity } = body || {};
  if (!wasteId) return 'wasteId is required';
  if (quantity === undefined || Number.isNaN(Number(quantity))) return 'quantity is required';
  if (Number(quantity) <= 0) return 'quantity must be > 0';
  return null;
};

const validateUpdateCartItem = (body) => {
  const { quantity } = body || {};
  if (quantity === undefined || Number.isNaN(Number(quantity))) return 'quantity is required';
  if (Number(quantity) <= 0) return 'quantity must be > 0';
  return null;
};

export { validateAddCartItem, validateUpdateCartItem };
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\cart\cart.validation.js