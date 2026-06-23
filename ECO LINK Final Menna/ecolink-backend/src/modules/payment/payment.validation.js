import mongoose from 'mongoose';

export const validateOrderIdParam = (_data, req) => {
  const orderId = req?.params?.orderId;
  if (!orderId || !String(orderId).trim()) return 'orderId is required';
  if (!mongoose.Types.ObjectId.isValid(String(orderId).trim())) return 'Invalid order id';
  return null;
};

export const validateMockPayment = (body) => {
  const { orderId, cardNumber, expiry, cvv } = body || {};

  if (!orderId) return 'orderId is required';

  if (!cardNumber) return 'cardNumber is required';

  if (!/^\d{16}$/.test(cardNumber)) return 'cardNumber must be 16 digits';

  if (!expiry) return 'expiry is required';

  if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'expiry must be MM/YY';

  if (!cvv) return 'cvv is required';

  if (!/^\d{3,4}$/.test(cvv)) return 'invalid cvv';

  return null;
};
