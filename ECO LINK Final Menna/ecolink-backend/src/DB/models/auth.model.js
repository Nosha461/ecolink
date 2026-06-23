import mongoose from 'mongoose';

const { Schema } = mongoose;

const TOKEN_TYPES = ['access', 'refresh'];

/**
 * Auth model – stores refresh tokens for session management.
 * Used by auth module for login, refresh, logout.
 */
const AuthSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: TOKEN_TYPES,
      required: true,
    },
    
  },
  { timestamps: true }
);

// Use existing 'tokens' collection for compatibility
AuthSchema.set('collection', 'tokens');

// Add index for better performance
AuthSchema.index({ user: 1, type: 1 });
AuthSchema.index({ token: 1 });
AuthSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 604800, partialFilterExpression: { type: 'refresh' } }
);



export const Auth = mongoose.model('Auth', AuthSchema);
export { TOKEN_TYPES };


//E:\ECO LINK\ecolink-backend\src\DB\models\auth.model.js



//