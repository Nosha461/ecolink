import mongoose from 'mongoose';
import { PurchaseRequest } from '../../DB/models/purchaseRequest.model.js';
import { Waste } from '../../DB/models/waste.model.js';
import { Factory } from '../../DB/models/factory.model.js';
import { createNotification } from '../notification/notification.service.js';
import { User } from '../../DB/models/user.model.js';
import { sendEmail } from '../../utils/email/index.js';

export const createRequest = async (user, payload) => {
  if (user?.currentRole !== 'buyer') {
    throw new Error('Only buyers can create purchase requests', { cause: 403 });
  }

  const wasteId = String(payload?.wasteId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(wasteId)) {
    throw new Error('Invalid waste id', { cause: 400 });
  }

  const waste = await Waste.findById(wasteId);
  if (!waste) throw new Error('Waste not found', { cause: 404 });

  const quantity = Number(payload?.quantity);  
  if (
    waste.status === 'out_of_stock' ||
    waste.status === 'sold' ||
    waste.status === 'archived'
  ) {
    throw new Error(
      'This waste listing is no longer available for purchase',
      { cause: 400 }
    );
  }

  if (!quantity || Number.isNaN(quantity) || quantity < 1) {
    throw new Error('Quantity must be at least 1', { cause: 400 });
  }

    // validation
    if (quantity <= 0 || isNaN(quantity)) {
      throw new Error('Invalid quantity', { cause: 400 });
    }
  
    if (quantity > waste.quantity) {
      throw new Error(
        'Requested quantity exceeds available quantity',
        { cause: 400 }
      );
    }

  const factory = waste.factory ? await Factory.findById(waste.factory) : null;
  const supplierId = factory?.user;

  if (!supplierId) {
    throw new Error('Waste supplier not found', { cause: 404 });
  }

  if (String(supplierId) === String(user._id)) {
    throw new Error('You cannot request your own waste', { cause: 400 });
  }

  const existingPending = await PurchaseRequest.findOne({
    buyerId: user._id,
    wasteId,
    status: 'pending',
  });

  if (existingPending) {
    throw new Error('You already have a pending request for this waste', { cause: 409 });
  }


  const request = await PurchaseRequest.create({
    buyerId: user._id,
    supplierId,
    wasteId,
    quantity,
    offeredPrice: payload?.offeredPrice,
    message: payload?.message,
    status: 'pending',
  });

  // ================= NOTIFICATION + EMAIL (FIXED PLACE) =================

  try {
    const sellerUser = await User.findById(supplierId);

    // 1. Notification
    await createNotification({
      userId: supplierId,
      type: 'request',
      title: 'New Purchase Request',
      body: `You received a new request for ${waste.title}`,
      relatedId: request._id,
    });

    // 2. Email
    if (sellerUser?.email) {
      await sendEmail({
        to: sellerUser.email,
        subject: 'New Purchase Request - ECO LINK',
        html: `
          <h2>New Purchase Request</h2>
          <p>You received a new request for:</p>
          <p><strong>${waste.title}</strong></p>
          <p>Quantity: ${quantity}</p>
          <p>Message: ${payload?.message || 'No message'}</p>
        `,
      });
    }
  } catch (err) {
    console.error('Notification/Email error:', err.message);
  }

  return request;
};

// ================= GET WASTE REQUESTS =================
export const getWasteRequests = async (user, wasteId) => {
  if (user?.currentRole !== 'seller') {
    throw new Error('Only suppliers can view purchase requests', { cause: 403 });
  }

  const id = String(wasteId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid waste id', { cause: 400 });
  }

  const waste = await Waste.findById(id);
  if (!waste) throw new Error('Waste not found', { cause: 404 });

  const factory = waste.factory ? await Factory.findById(waste.factory) : null;
  const supplierId = factory?.user;

  if (!supplierId) throw new Error('Waste supplier not found', { cause: 404 });

  if (String(supplierId) !== String(user._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  return await PurchaseRequest.find({ wasteId: id })
    .populate('buyerId', 'firstName lastName email phoneNumber profilePicture')
    .sort({ createdAt: -1 });
};

// ================= ACCEPT REQUEST =================
export const acceptRequest = async (user, requestId) => {
  if (user?.currentRole !== 'seller') {
    throw new Error('Only suppliers can accept purchase requests', { cause: 403 });
  }

  const id = String(requestId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid request id', { cause: 400 });
  }

  const request = await PurchaseRequest.findById(id);
  if (!request) throw new Error('Purchase request not found', { cause: 404 });

  if (String(request.supplierId) !== String(user._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  request.status = 'accepted';
await request.save();

try {
  const buyer = await User.findById(request.buyerId);

  await createNotification({
    userId: request.buyerId,
    type: 'request',
    title: 'Request Accepted',
    body: 'Your purchase request has been accepted',
    relatedId: request._id,
  });

  if (buyer?.email) {
    await sendEmail({
      to: buyer.email,
      subject: 'Purchase Request Accepted - ECO LINK',
      html: `
        <h2>Request Accepted</h2>
        <p>Your purchase request has been accepted.</p>
      `,
    });
  }
} catch (err) {
  console.error('Notification/Email error:', err.message);
}

return request;
};

// ================= DECLINE REQUEST =================
export const declineRequest = async (user, requestId) => {
  if (user?.currentRole !== 'seller') {
    throw new Error('Only suppliers can decline purchase requests', { cause: 403 });
  }

  const id = String(requestId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid request id', { cause: 400 });
  }

  const request = await PurchaseRequest.findById(id);
  if (!request) throw new Error('Purchase request not found', { cause: 404 });

  if (String(request.supplierId) !== String(user._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  request.status = 'declined';
  await request.save();

  return request;
};
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\purchaseRequest\purchaseRequest.service.js
// buyer APIs Requests
// GET MY REQUESTS
export const getMyRequests = async (user) => {
  if (user?.currentRole === 'seller') {
    throw new Error(
      'Only buyers can view their purchase requests',
      { cause: 403 }
    );
  }

  return await PurchaseRequest.find({
    buyerId: user._id,
  })
    .populate('wasteId', 'title price unit image quantity')
    .populate('supplierId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// GET ACCEPTED
export const getMyAcceptedRequests = async (user) => {
  if (user?.currentRole === 'seller') {
    throw new Error(
      'Only buyers can view their purchase requests',
      { cause: 403 }
    );
  }

  return await PurchaseRequest.find({
    buyerId: user._id,
    status: 'accepted',
  })
    .populate('wasteId', 'title price unit image quantity')
    .populate('supplierId', 'firstName lastName email phoneNumber')
    .sort({ updatedAt: -1 });
};

// GET STATUS
export const getRequestStatus = async (user, requestId) => {
  if (user?.currentRole !== 'buyer') {
    throw new Error(
      'Only buyers can view their purchase requests',
      { cause: 403 }
    );
  }
  const id = String(requestId ?? '').trim();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid request id', {cause: 400,});
  }

  const request = await PurchaseRequest.findById(id)
    .populate('wasteId', 'title price unit')
    .populate('supplierId', 'firstName lastName email')
    .populate('buyerId', 'firstName lastName email');

  if (!request) {
    throw new Error(
      'Purchase request not found',
      { cause: 404 }
    );
  }

  const isBuyer =
    String(request.buyerId?._id) === String(user._id);

  const isSupplier =
    String(request.supplierId?._id) === String(user._id);

  if (!isBuyer && !isSupplier) {
    throw new Error('Forbidden', { cause: 403 });
  }

  return request;
};

// CANCEL REQUEST
export const cancelRequest = async (
  user,
  requestId
) => {
  if (user?.currentRole !== 'buyer') {
    throw new Error(
      'Only buyers can cancel their requests',
      { cause: 403 }
    );
  }

  const id = String(requestId ?? '').trim();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid request id', {
      cause: 400,
    });
  }

  const request = await PurchaseRequest.findOne({
    _id: id,
    buyerId: user._id,
  });

  if (!request) {
    throw new Error(
      'Purchase request not found',
      { cause: 404 }
    );
  }

  if (request.status !== 'pending') {
    throw new Error(
      'Only pending requests can be cancelled',
      { cause: 400 }
    );
  }

  request.status = 'cancelled';
  await request.save();

  return request;
};