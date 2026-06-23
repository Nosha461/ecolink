import { asyncHandler } from '../../utils/error/index.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, role,phoneNumber } = req.body;
  if(!firstName || !lastName || !email || !password ||!role ||!phoneNumber ){
    return res.status(400).json({ success:false, message:"All fields are required" });
  }
  const result = await authService.register(firstName, lastName, email, password, role ,phoneNumber);
  res.status(201).json({ success: true, data: result });
});




export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyEmailOTP(email, otp);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};



export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if(!email || !password){
    return res.status(400).json({success : false , message : "Email and password are required"})
  }
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, data: result });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const refreshToken = req.body?.refreshToken || req.headers?.refreshtoken;
  if(!refreshToken){
    return res.status(400).json({success:false , message:"Refresh Token is required"});
  }
  const result = await authService.refreshTokens(refreshToken);
  res.status(200).json({ success: true, data: result });
});

export const logout = asyncHandler(async (req, res, next) => {
  const refreshToken = req.body?.refreshToken || req.headers?.refreshtoken;
  await authService.logout(refreshToken);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }
  await authService.forgotPassword(email);
  res.status(200).json({
    success: true,
    message: "Verification code sent"
  });
});

export const verifyCode = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and code are required" });
  }
  await authService.verifyCode(email, code);
  res.status(200).json({
    success: true,
    message: "Code verified successfully"
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }
  await authService.resetPassword(email, password);
  res.status(200).json({
    success: true,
    message: "Password reset successfully"
  });
});

export const switchRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  if (!['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Role must be "buyer" or "seller"' 
    });
  }
  if(!req.user){
    return res.status(401).json({success:false , message:"User not authenticated"})
  }
  await req.user.switchRole(role);
  res.status(200).json({ 
    success: true, 
    message: `Switched to ${role} mode!`,
    user: {
      id: req.user._id,
      currentRole: req.user.currentRole,
      roles: req.user.roles,
      isSeller: req.user.isSeller,
      isBuyer: req.user.isBuyer
    }
  });
});

// ================= RESEND EMAIL OTP =================

export const resendEmailOTP = asyncHandler(
  async (req, res, next) => {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const result =
      await authService.resendEmailOTP(email);

    res.status(200).json({
      success: true,
      message: result.message
    });
  }
);

// ================= RESEND RESET CODE =================

export const resendResetCode = asyncHandler(
  async (req, res, next) => {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const result =
      await authService.resendResetCode(email);

    res.status(200).json({
      success: true,
      message: result.message
    });
  }
);

//E:\ECO LINK\ecolink-backend\src\modules\auth\auth.controller.js