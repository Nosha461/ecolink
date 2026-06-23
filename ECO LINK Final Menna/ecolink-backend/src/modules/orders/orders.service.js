import { Deal } from '../../DB/models/deal.model.js';
import { Order } from '../../DB/models/order.model.js';
import { Payment } from '../../DB/models/payment.model.js';
import { Shipping } from '../../DB/models/shipping.model.js';
import { Waste } from '../../DB/models/waste.model.js';
import { Factory } from '../../DB/models/factory.model.js';
import { ensureFactoryForUser } from '../factories/factories.service.js';
import { PurchaseRequest } from '../../DB/models/purchaseRequest.model.js';
import { Cart } from '../../DB/models/cart.model.js';
import { CartItem } from '../../DB/models/cart-item.model.js';
const assertBuyer = (user) => {
  if (user.currentRole === 'seller') {
    throw new Error('Only buyers can place orders', { cause: 403 });
  }
};

const ensureAcceptedRequest = async (buyerId, wasteId) => {
  const acceptedRequest = await PurchaseRequest.findOne({
    buyerId,
    wasteId,
    status: 'accepted',
  });

  if (!acceptedRequest) {
    throw new Error(
      'You cannot place an order without an accepted purchase request from the supplier',
      { cause: 403 }
    );
  }

  return acceptedRequest;
};

//================= CREATE ORDER =================

export const createOrder = async (user) => {
  console.log("🔥 CREATE ORDER HIT");
  const buyer = await ensureFactoryForUser(user);

  const cart = await Cart.findOne({ user: user._id });
  if (!cart) throw new Error("Cart not found");

  const items = await CartItem.find({ cart: cart._id }).populate("waste");

  if (!items.length) throw new Error("Cart is empty");

  let totalAmount = 0;

  const createdOrders = [];

  for (const item of items) {
    const waste = item.waste;

    if (!waste) throw new Error("Waste not found", { cause: 404 });

    // لازم يكون فيه Purchase Request accepted
   // await ensureAcceptedRequest(user._id, waste._id);

   const qty = Number(item.quantity);

   if (qty <= 0 || isNaN(qty)) {
     throw new Error("Invalid quantity", { cause: 400 });
   }

   if (qty > waste.quantity) {
     throw new Error(
       "Requested quantity exceeds available quantity",
       { cause: 400 }
     );
   }

    if (
      waste.status === "out_of_stock" ||
      waste.status === "sold" ||
      waste.status === "archived"
    ) {
      throw new Error(
        "This waste listing is no longer available for purchase",
        { cause: 400 }
      );
    }

    const sellerFactoryId = waste.factory;
    const sellerFactory = await Factory.findById(sellerFactoryId);

    // منع شراء نفسه
    // if (
    //   sellerFactory &&
    //   String(sellerFactory.user) === String(user._id)
    // ) {
    //   throw new Error("You cannot order your own listing", {
    //     cause: 400,
    //   });
    // }


    const unitPrice = Number(waste.price);
    const itemTotal = unitPrice * qty;
    totalAmount += itemTotal;

    // إنشاء الأوردر لكل waste (نفس logic بتاعك بدون حذف)
    const order = await Order.create({
      buyer: buyer._id,
      seller: sellerFactoryId,
      waste: waste._id,
      quantity: qty,
      unitPrice,
      totalAmount: itemTotal,
      currency: waste.currency || "USD",
      status: "pending",
    });

    // خصم الكمية
    waste.quantity -= qty;

    if (waste.quantity <= 0) {
      waste.quantity = 0;
      waste.status = "out_of_stock";
    }

    await waste.save();

    // Shipping (زي ما هو)
    await Shipping.create({
      order: order._id,
      address: user.shippingAddress || "Not provided",
      status: "pending",
    });

    // Deal (زي ما هو)
    await Deal.create({
      order: order._id,
      status: "non_completed",
    });

    createdOrders.push(order);
  }

  // تفريغ الكارت بعد النجاح
  await CartItem.deleteMany({ cart: cart._id });

  return {
    orders: createdOrders,
    totalAmount,
  };
};

// ================= LIST MY ORDERS =================

export const listMyOrders = async (user) => {
  assertBuyer(user);

  const buyer = await ensureFactoryForUser(user);

  return await Order.find({
    buyer: buyer._id,
  })
    .populate('buyer')
    .populate('seller')
    .populate('waste')
    .sort({ createdAt: -1 });
};

// ================= GET ORDER BY ID =================

export const getOrderById = async (user, orderId) => {
  assertBuyer(user);

  const buyer = await ensureFactoryForUser(user);

  const order = await Order.findById(orderId)
    .populate('buyer')
    .populate('seller')
    .populate('waste');

  if (!order) {
    throw new Error('Order not found', { cause: 404 });
  }

  if (String(order.buyer._id) !== String(buyer._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  const shipping = await Shipping.findOne({
    order: order._id,
  });

  const payment = await Payment.findOne({
    order: order._id,
    status: 'paid',
  });

  const deal = await Deal.findOne({
    order: order._id,
  });

  return {
    order,
    shipping,
    payment,
    deal,
  };
};

// ================= DELETE ORDER =================

export const deleteOrder = async (user, orderId) => {
  assertBuyer(user);

  const buyer = await ensureFactoryForUser(user);

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found', { cause: 404 });
  }

  if (String(order.buyer) !== String(buyer._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  if (order.status !== 'pending') {
    throw new Error(
      'Only pending orders can be deleted',
      { cause: 400 }
    );
  }

  // رجع الكمية للـ waste
  const waste = await Waste.findById(order.waste);

  if (waste) {
    waste.quantity += order.orderQty;

    if (waste.status === 'out_of_stock') {
      waste.status = 'available';
    }

    await waste.save();
  }

  await Shipping.deleteOne({ order: order._id });
  await Deal.deleteOne({ order: order._id });

  await order.deleteOne();

  return { success: true };
};
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\orders\orders.service.js