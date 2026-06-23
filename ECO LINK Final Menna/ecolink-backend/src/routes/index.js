import express from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import wasteRoutes from '../modules/waste/waste.routes.js';
import itemRoutes from '../modules/items/item.routes.js';
import ordersRoutes from '../modules/orders/orders.routes.js';
import notificationRoutes from '../modules/notification/notification.routes.js';
import chatRoutes from '../modules/chat/message.routes.js';
import cartRoutes from '../modules/cart/cart.routes.js';
import reviewsRoutes from '../modules/reviews/reviews.routes.js';
import messageRoutes from '../modules/chat/message.routes.js';
import categoryRoutes from '../modules/wasteCategory/category.routes.js';
import paymentRoutes from '../modules/payment/payment.route.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import purchaseRequestRoutes from '../modules/purchaseRequest/purchaseRequest.routes.js';
import contactRoutes from "../modules/contact/contact.routes.js";



const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'EcoLink API is running' });
});

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/waste', wasteRoutes);
router.use('/items', itemRoutes);
router.use('/orders', ordersRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/cart', cartRoutes);
router.use('/review', reviewsRoutes);
router.use('/message', messageRoutes);
router.use('/category', categoryRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/purchase-requests', purchaseRequestRoutes);
router.use("/contact", contactRoutes);

export default router;
//E:\ECO LINK\ecolink-backend\src\routes\index.js