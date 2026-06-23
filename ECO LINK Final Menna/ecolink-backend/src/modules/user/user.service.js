import fs from 'node:fs';
import { User } from '../../DB/models/user.model.js';
import { hashPassword, comparePassword } from '../../utils/hash/index.js';

const formatUser = (user) => ({
  id: user._id,
  fullName: user.firstName + ' ' + user.lastName,
  email: user.email,
  role: user.currentRole,
  isVerified: user.isVerified,
  profilePicture: user.profilePicture,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found', { cause: 404 });
  return formatUser(user);
};

export const updateProfile = async (userId, updates) => {
  const allowed = ['firstName', 'lastName'];
  const filtered = {};
  for (const key of allowed) {
     if (typeof updates[key] === 'string' && updates[key].trim()) {
       filtered[key] = updates[key].trim();
     }
  }
  if (Object.keys(filtered).length === 0) {
    throw new Error('No valid fields to update', { cause: 400 });
  }
  const user = await User.findByIdAndUpdate(userId, filtered, { new: true });
  if (!user) throw new Error('User not found', { cause: 404 });
  return formatUser(user);
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found', { cause: 404 });
  const match = await comparePassword(currentPassword, user.password);
  if (!match) throw new Error('Current password is incorrect', { cause: 401 });
  const passwordHash = await hashPassword(newPassword);
  user.password = passwordHash;

  user.credentialsUpdatedAt = new Date();
  await user.save();
  return { success: true };
};

export const uploadProfilePic = async (userId, filePath, existingPicture) => {
  if (!filePath) {
    throw new Error('No file uploaded', { cause: 400 });
  }

  const isFirstUpload = !existingPicture?.trim();

  const user = await User.findByIdAndUpdate(
    userId,
    { profilePicture: filePath },
    { new: true }
  );

  if (!user) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error('User not found', { cause: 404 });
  }

  if (!isFirstUpload && fs.existsSync(existingPicture)) {
    fs.unlinkSync(existingPicture);
  }

  return { ...formatUser(user), isFirstUpload };
};
