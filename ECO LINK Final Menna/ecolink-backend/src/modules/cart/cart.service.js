import { Cart } from "../../DB/models/cart.model.js";
import { CartItem } from "../../DB/models/cart-item.model.js";
import { Waste } from "../../DB/models/waste.model.js";
import { Order } from "../../DB/models/order.model.js";
import { Factory } from "../../DB/models/factory.model.js";
import { PurchaseRequest } from "../../DB/models/purchaseRequest.model.js";
import { createNotification } from "../notification/notification.service.js";
import { getIo } from "../sockets/index.js";

const emitToUser = (userId, event, data) => {
  const io = getIo();
  if (io) io.to(userId).emit(event, data);
};

// ================= GET OR CREATE CART =================
export const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId });
  return cart;
};

export const addToCart = async (userId, wasteId, quantity = 1) => {
  const cart = await getOrCreateCart(userId);

  const waste = await Waste.findById(wasteId);
  if (!waste) throw new Error("Waste not found");

  const buyerFactory = await Factory.findOne({ user: userId });
  if (!buyerFactory) throw new Error("Buyer factory not found");

  console.log("BUYER FACTORY:", buyerFactory._id);
  console.log("WASTE ID:", waste._id);

  const accepted = await PurchaseRequest.findOne({
    buyerId: userId,
    wasteId: waste._id,   // ✅ هنا الصح
    status: "accepted",
  });

  console.log("APPROVAL RESULT:", accepted);

  if (!accepted) {
    throw new Error("You are not approved to add this waste to cart");
  }

  const existingItem = await CartItem.findOne({
    cart: cart._id,
    waste: wasteId,
  });

  let item;

  if (existingItem) {
    existingItem.quantity += quantity;
    await existingItem.save();
    item = existingItem;
  } else {
    item = await CartItem.create({
      cart: cart._id,
      waste: wasteId,
      quantity,
      price: waste.price,
    });
  }

  return item;
};

// ================= GET CART =================
export const getCart = async (userId) => {
  const cart = await getOrCreateCart(userId);
  const items = await CartItem.find({ cart: cart._id }).populate("waste");
  const total = items.reduce((sum, item) => sum + item.quantity * (item.waste?.price || 0), 0);
  return { cart, items, total };
};

// ================= REMOVE ITEM =================
export const removeItem = async (userId, itemId) => {
  const cart = await getOrCreateCart(userId);
  const item = await CartItem.findOne({ _id: itemId, cart: cart._id });
  if (!item) throw new Error("Item not found");

  const deletedId = item._id;
  await item.deleteOne();

  await createNotification({
    userId,
    type: "delete_item",
    title: "Cart Updated",
    body: "Item removed from cart",
    relatedId: deletedId,
  });

  emitToUser(userId, "cart:item_removed", { message: "Item removed", itemId: deletedId });
  return { success: true };
};

// ================= UPDATE QUANTITY =================
export const updateQuantity = async (userId, itemId, quantity) => {
  console.log('apdate');
  
  const cart = await getOrCreateCart(userId);
  const item = await CartItem.findOne({ _id: itemId, cart: cart._id });
  if (!item) throw new Error("Item not found");

  if (!quantity || isNaN(quantity) || quantity <= 0)
    throw new Error("Quantity must be greater than 0");

  item.quantity = quantity;
  await item.save();

  await createNotification({
    userId,
    type: "order",
    title: "Cart Updated",
    body: `Quantity changed to ${quantity}`,
    relatedId: item._id,
  });

  emitToUser(userId, "cart:item_updated", { message: "Quantity updated", item });
  return item;
};

// ================= GET CART TOTAL =================
export const getCartTotal = async (userId) => {
  const cart = await getOrCreateCart(userId);
  const items = await CartItem.find({ cart: cart._id }).populate("waste");
  const total = items.reduce((sum, item) => sum + item.quantity * (item.waste?.price || 0), 0);
  return { items, total };
};

// ================= CHECKOUT =================
// export const checkout = async (userId) => {
//   // جيب الـ factory بتاع الـ buyer
//   const buyerFactory = await Factory.findOne({ user: userId });
//   if (!buyerFactory) throw new Error("Buyer factory not found");

//   // جيب الكارت
//   const cart = await getOrCreateCart(userId);

//   // جيب الـ items
//   const items = await CartItem.find({ cart: cart._id }).populate({
//     path: "waste",
//     select: "price factory title quantity status",
//   });

//   if (!items.length) throw new Error("Cart is empty");

//   const orders = [];

//   for (const item of items) {
//     const waste = item.waste;

//     if (!waste) throw new Error("Waste not found");

//     // تحقق إن الـ waste لسه متاح
//     if (["out_of_stock", "sold", "archived"].includes(waste.status))
//       throw new Error(`${waste.title} is no longer available`);

//     // تحقق من الكمية
//     if (item.quantity > waste.quantity)
//       throw new Error(`Not enough quantity for ${waste.title}`);

//     const unitPrice = Number(waste.price);
//     const totalAmount = item.quantity * unitPrice;

//     // إنشاء الـ order
//     const order = await Order.create({
//       buyer: buyerFactory._id,
//       seller: waste.factory,
//       waste: waste._id,
//       quantity: item.quantity,
//       unitPrice,
//       totalAmount,
//       status: "pending",
//     });

//     // خصم الكمية
//     waste.quantity -= item.quantity;
//     if (waste.quantity <= 0) {
//       waste.quantity = 0;
//       waste.status = "out_of_stock";
//     }
//     await waste.save();

//     orders.push(order);
//   }

//   // فرّغ الكارت
//   await CartItem.deleteMany({ cart: cart._id });

//   await createNotification({
//     userId,
//     type: "message",
//     title: "Order Placed",
//     body: `${orders.length} order(s) placed successfully`,
//   });

//   emitToUser(userId, "order:created", {
//     message: "Orders created successfully",
//     orders,
//   });

//   return { orders };
// };

export const checkout = async (user) => {
  const cart = await Cart.findOne({ user: user._id });
  if (!cart) throw new Error("Cart not found");

  const items = await CartItem.find({ cart: cart._id }).populate("waste");
  if (!items.length) throw new Error("Cart is empty");

  const buyerFactory = await Factory.findOne({ user: user._id });
  if (!buyerFactory) throw new Error("Buyer factory not found");

  const orders = [];

  for (const item of items) {
    const waste = item.waste;

    if (!waste) throw new Error("Waste not found");

    console.log("===== CHECKOUT DEBUG =====");
    console.log("BUYER FACTORY:", buyerFactory._id);
    console.log("WASTE ID:", waste._id);
    console.log("WASTE TITLE:", waste.title);
    console.log("BUYER FACTORY:", buyerFactory._id);
console.log("WASTE ID:", waste._id);
console.log("SEARCHING APPROVAL WITH:");
console.log({
  buyerId: buyerFactory._id,
  supplierId: waste.factory,
  status: "accepted",
});

    // 🔵 seller factory
    const sellerFactory = await Factory.findById(waste.factory);
    if (!sellerFactory) throw new Error("Seller not found");

    // 🟠 prevent self order
    if (String(sellerFactory.user) === String(user._id)) {
      throw new Error("You cannot order your own listing");
    }

    // 🟣 stock check
    if (item.quantity > waste.quantity) {
      throw new Error(`Not enough stock for ${waste.title}`);
    }

    // 🟡 approval check (ONLY SOURCE OF TRUTH)
    const accepted = await PurchaseRequest.findOne({
      buyerId: user._id,
      wasteId: waste._id,
      status: "accepted",
    });

    if (!accepted) {
      throw new Error(`No supplier approval for ${waste.title}`);
    }

    // 🟢 create order
    const order = await Order.create({
      buyer: buyerFactory._id,
      seller: sellerFactory._id,
      waste: waste._id,
      quantity: item.quantity,
      unitPrice: waste.price,
      totalAmount: item.quantity * waste.price,
      status: "confirmed",
    });
    await createNotification({
  userId: user._id,
  type: "order",
  title: "Order Placed Successfully",
  body: `Your order for ${waste.title} has been placed`,
  relatedId: order._id,
});

await createNotification({
  userId: sellerFactory.user,
  type: "order",
  title: "New Order Received",
  body: `You received an order for ${waste.title}`,
  relatedId: order._id,
});

    // update stock
    waste.quantity -= item.quantity;

    if (waste.quantity <= 0) {
      waste.quantity = 0;
      waste.status = "out_of_stock";
    }

    await waste.save();

    orders.push(order);
  }

  await CartItem.deleteMany({ cart: cart._id });

  return {
    success: true,
    orders,
  };
};