import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    



  },
  {
    timestamps: true,
  }
);

// 🔥 يمنع duplicate conversations
conversationSchema.index(
  { participants: 1 },
  { unique: false }
);

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);