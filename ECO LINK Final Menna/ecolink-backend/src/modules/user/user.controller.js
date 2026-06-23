import { asyncHandler } from '../../utils/error/index.js';
import * as userService from './user.service.js';
import { User } from '../../DB/models/user.model.js';
import  {Message} from '../../DB/models/message.model.js';

export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await userService.getProfile(req.user._id);
  res.status(200).json({ success: true, data: user });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.status(200).json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  await userService.changePassword(req.user._id, currentPassword, newPassword);
  res.status(200).json({ success: true, message: 'Password updated successfully' });
});

export const uploadProfilePic = asyncHandler(async (req, res) => {
  const { isFirstUpload, ...user } = await userService.uploadProfilePic(
    req.user._id,
    req.file.path,
    req.user.profilePicture
  );

  res.status(isFirstUpload ? 201 : 200).json({
    success: true,
    message: isFirstUpload
      ? 'Profile picture added successfully'
      : 'Profile picture updated successfully',
    data: user,
  });
});

export const getChatList = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const users = await User.find({ _id: { $ne: currentUserId } });

    const result = await Promise.all(
      users.map(async (user) => {
        // آخر رسالة بينك وبين الشخص ده
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: currentUserId, receiverId: user._id },
            { senderId: user._id, receiverId: currentUserId }
          ]
        })
        .sort({ createdAt: -1 });

        // عدد الرسائل غير المقروءة
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: currentUserId,
          status: { $ne: 'seen' }
        });

        return {
          userId: user._id,
          name: user.firstName + ' ' + user.lastName,
          isOnline: user.isOnline,
          lastMessage: lastMessage?.message || null,
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};
//E:\ECO LINK\ecolink-backend\src\modules\user\user.controller.js