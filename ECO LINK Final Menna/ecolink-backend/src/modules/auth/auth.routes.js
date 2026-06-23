
import express from 'express';
import { validateRequest } from '../../middleware/validation.middleware.js';
import * as authController from './auth.controller.js';
import { validateRegister, validateLogin, validateRefreshToken, validateSwitchRole } from './auth.validation.js';
import { isAuthenticated } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', validateRequest(validateRegister), authController.register);
router.post('/login', validateRequest(validateLogin), authController.login);
router.post('/refresh-token', validateRequest(validateRefreshToken), authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-code', authController.verifyCode);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post(
  '/resend-otp',
  authController.resendEmailOTP
);

router.post(
  '/resend-reset-code',
  authController.resendResetCode
);

router.use(isAuthenticated);
router.put('/switch-role', validateRequest(validateSwitchRole), authController.switchRole);

export default router;
//E:\ECO LINK\ecolink-backend\src\modules\auth\auth.routes.js