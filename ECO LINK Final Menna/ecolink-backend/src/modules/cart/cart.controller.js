import { asyncHandler } from "../../utils/error/index.js";
import * as cartService from "./cart.service.js";

// ================= ADD =================
export const add = asyncHandler(async (req, res) => {
  const { wasteId, quantity } = req.body;

  const data = await cartService.addToCart(
    req.user._id,
    wasteId,
    quantity
  );

  res.json({
    success: true,
    data,
  });
});

// ================= GET CART =================
export const get = asyncHandler(async (req, res) => {
  const data = await cartService.getCart(req.user._id);

  res.json({
    success: true,
    data,
  });
});

// ================= REMOVE ITEM =================
export const remove = asyncHandler(async (req, res) => {
  const data = await cartService.removeItem(
    req.user._id,
    req.params.itemId
  );

  res.json({
    success: true,
    data,
  });
});

// ================= UPDATE QTY =================
export const updateQty = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const data = await cartService.updateQuantity(
    req.user._id,
    req.params.itemId,
    quantity
  );

  res.json({
    success: true,
    data,
  });
});

// ================= GET CART TOTAL =================
export const getCartTotal = asyncHandler(async (req, res) => {
  const data = await cartService.getCartTotal(req.user._id);

  res.json({
    success: true,
    data,
  });
});


// ================= CHECKOUT ========================
export const checkoutCart = asyncHandler(async (req, res) => {
  const order = await cartService.checkout(req.user._id, req.user);

  res.json({
    success: true,
    data: order,
  });
});