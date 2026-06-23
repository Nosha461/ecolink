import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },


    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    chatStatus: {
  type: String,
  enum: ["pending", "accepted", "rejected"],
  default: "pending",
},


  },
  { timestamps: true }

  
);

// conversations index 
messageSchema.index({
  senderId: 1,
  receiverId: 1,
  createdAt: -1
});
// messageSchema.index({createdAt:-1 });

export const Message = mongoose.model('Message', messageSchema);
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\DB\models\message.model.js