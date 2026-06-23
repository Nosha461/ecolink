import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // كل user ليه cart واحدة
    },
  },
  { timestamps: true }
);

export const Cart = mongoose.model("Cart", cartSchema);
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\DB\models\cart.model.js