import { User } from '../../DB/models/user.model.js';
import { Auth } from '../../DB/models/auth.model.js';
import { hashPassword, comparePassword } from '../../utils/hash/index.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../utils/token/index.js';
import { sendEmail } from "../../utils/email/index.js";
import crypto from "crypto";

const formatUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  currentRole: user.currentRole,     
  roles: user.roles,          
  isSeller: user.isSeller,           
  isBuyer: user.isBuyer,             
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ================= REGISTER =================
// export const register = async (firstName, lastName, email, password, role, phoneNumber) => {
//   // Check if user exists by email OR phone
//   const existingUser = await User.findOne({ 
//     $or: [
//       { email: email.toLowerCase() },
//       { phoneNumber: phoneNumber }
//     ]
//   });
  
//   if (existingUser) {
//     if (existingUser.email === email.toLowerCase()) {
//       const error = new Error('Email is already registered');
// error.status = 401;
// throw error;
//     }
//     if (existingUser.phoneNumber === phoneNumber) {
//       const error = new Error('Phone number is already registered');
// error.status = 401;
// throw error;
//     }
//   }

//   const passwordHash = await hashPassword(password);

//   const user = await User.create({
//     firstName,
//     lastName,
//     email: email.toLowerCase(),
//     password: passwordHash,
//     phoneNumber: phoneNumber,
//     roles: [{ type: role, isActive: true }],  
//     activeRole: role
//   });

//   const token = generateAccessToken(user._id);
//   const refreshToken = generateRefreshToken(user._id);

//   await Auth.create({ token: refreshToken, user: user._id, type: 'refresh' });

//   return { user: formatUser(user), token, refreshToken };
// };
export const register = async (firstName, lastName, email, password, role, phoneNumber) => {

  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { phoneNumber }
    ]
  });

  if (existingUser) {
    const error = new Error("User already exists");
    error.status = 401;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  // 🔥 OTP generation
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: passwordHash,
    phoneNumber,
    roles: [{ type: role, isActive: true }],
    activeRole: role,

    // 🔥 مهم جدًا
    otp,
    otpExpire: Date.now() + 10 * 60 * 1000,
    isVerified: false
  });

    // ✅ ابعت الـ OTP على الإيميل
    console.log("OTP SENT:", otp);
  await sendEmail({
    to: email,
    subject: "Verify Your Email - ECO LINK",
    html: `
      <h2>Welcome to ECO LINK!</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
      <p>This code expires in <strong>10 minutes</strong>.</p>
    `,
  });

  const token = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await Auth.create({ token: refreshToken, user: user._id, type: 'refresh' });

  return { user: formatUser(user), token, refreshToken , otp};
};

// ================= LOGIN =================
export const login = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.cause = 401;
    throw error;
  }



  const match = await comparePassword(password, user.password);

  if (!match) {
    throw new Error('Invalid email or password', { cause: 401 });
  }

  if (!user.isVerified) {
  throw new Error("Please verify your email first");
}

  const token = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await Auth.create({ token: refreshToken, user: user._id, type: 'refresh' });

  return { user: formatUser(user), token, refreshToken };
};

// ================= REFRESH TOKENS =================
export const refreshTokens = async (refreshToken) => {
  const payload = verifyToken(refreshToken);

  const tokenDoc = await Auth.findOne({
    token: refreshToken,
    user: payload.id,
    type: 'refresh'
  });

  if (!tokenDoc) {
    throw new Error('Invalid refresh token, please login again', { cause: 401 });
  }

  // Delete old refresh token
  await Auth.findOneAndDelete({
    token: refreshToken,
    user: payload.id,
    type: 'refresh'
  });

  const token = generateAccessToken(payload.id);
  const newRefreshToken = generateRefreshToken(payload.id);

  await Auth.create({
    token: newRefreshToken,
    user: payload.id,
    type: 'refresh'
  });

  const user = await User.findById(payload.id);
  if (!user) throw new Error('User not found', { cause: 404 });

  return { user: formatUser(user), token, refreshToken: newRefreshToken };
};

// ================= LOGOUT =================
export const logout = async (refreshToken) => {
  if (refreshToken) {
    await Auth.findOneAndDelete({ token: refreshToken, type: 'refresh' });
  }
  return { success: true };
};

// ================= FORGOT PASSWORD =================
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('User not found', { cause: 404 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = await hashPassword(code);

  user.resetCode = hashedCode;
  user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.isResetVerified = false;

  await user.save();
  
  // In production, send email here

await sendEmail({
  to :email,
  subject : "Verify Your Email",
  html :`Your OTP code is: ${code}`,
});

  return { message: "Verification code sent" };
};

// ================= VERIFY CODE =================
export const verifyCode = async (email, code) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new Error('User not found', { cause: 404 });
  }

  if (!user.resetCode || user.resetCodeExpires < Date.now()) {
    throw new Error('Code expired. Please request a new code', { cause: 400 });
  }

  const isMatch = await comparePassword(code, user.resetCode);

  if (!isMatch) {
    throw new Error('Invalid code', { cause: 400 });
  }

  user.isResetVerified = true;
  await user.save();

  return { message: "Code verified successfully" };
};

// ================= RESET PASSWORD =================
export const resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new Error('User not found', { cause: 404 });
  }

  if (!user.isResetVerified) {
    throw new Error('Please verify your code first', { cause: 400 });
  }

  const hashedPassword = await hashPassword(newPassword);

  user.password = hashedPassword;
  user.credentialsUpdatedAt = Date.now();
  user.resetCode = null;
  user.resetCodeExpires = null;
  user.isResetVerified = false;

  // Delete all refresh tokens for this user
  await Auth.deleteMany({ user: user._id, type: 'refresh' });

  await user.save();

  return { message: "Password reset successful" };
};


//______________________________________________________________________________
export const verifyEmailOTP = async (email, otp) => {

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isVerified) {
    throw new Error("Already verified");
  }

  if (!user.otp || user.otpExpire < Date.now()) {
    throw new Error("OTP expired");
  }

  if (user.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpire = null;

  await user.save();

  return { message: "Email verified successfully" };
};// ================= RESEND EMAIL OTP =================

export const resendEmailOTP = async (email) => {

  const user = await User.findOne({
    email: email.toLowerCase()
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isVerified) {
    throw new Error("Email already verified");
  }

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail({
    to: email,
    subject: "Verify Your Email - ECO LINK",
    html: `
      <h2>Email Verification</h2>
      <p>Your new OTP code is:</p>
      <h1>${otp}</h1>
      <p>Expires in 10 minutes.</p>
    `
  });

  return {
    message: "OTP sent successfully"
  };
};

// ================= RESEND RESET CODE =================

export const resendResetCode = async (email) => {

  const user = await User.findOne({
    email: email.toLowerCase()
  });

  if (!user) {
    throw new Error("User not found");
  }

  const code = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const hashedCode = await hashPassword(code);

  user.resetCode = hashedCode;
  user.resetCodeExpires =
    Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail({
    to: email,
    subject: "Reset Password Code",
    html: `
      <h2>Password Reset</h2>
      <p>Your new OTP code is:</p>
      <h1>${code}</h1>
      <p>Expires in 10 minutes.</p>
    `
  });

  return {
    message: "Reset code sent successfully"
  };
};


//E:\ECO LINK\ecolink-backend\src\modules\auth\auth.service.js