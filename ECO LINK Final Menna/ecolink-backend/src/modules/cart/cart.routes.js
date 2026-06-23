
import express from "express";
import { isAuthenticated, allowTo } from "../../middleware/auth.middleware.js";
import * as cartController from "./cart.controller.js";

const router = express.Router();

// ✅ الـ specific routes الأول
router.post("/add", isAuthenticated, allowTo("buyer"), cartController.add);
router.get("/", isAuthenticated, cartController.get);
router.post("/checkout", isAuthenticated, allowTo("buyer"), cartController.checkoutCart);
router.get("/total", isAuthenticated, cartController.getCartTotal);

// ✅ الـ dynamic routes الأخر
router.delete("/:itemId", isAuthenticated, cartController.remove);
router.patch("/:itemId", isAuthenticated, cartController.updateQty, (req, res)=> {
                                                            log('done');
                                                            next();

});


export default router;