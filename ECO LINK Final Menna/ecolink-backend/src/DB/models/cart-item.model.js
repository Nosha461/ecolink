import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
    },

    waste: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Waste",
      required: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    price: {
      type: Number,
      required: true, // snapshot وقت الإضافة
    },
  },
  { timestamps: true }
);

export const CartItem = mongoose.model("CartItem", cartItemSchema);
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\DB\models\cart-item.model.js