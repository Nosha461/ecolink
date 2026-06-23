import express from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { fileValidation, localFileUpload } from '../../utils/multer/multer.local.js';
import * as userController from './user.controller.js';
import {
  validateUpdateProfile,
  validateChangePassword,
  validateUploadProfilePic,
} from './user.validation.js';

const router = express.Router();

router.use(isAuthenticated);

router.get('/profile', userController.getProfile);
router.patch('/profile', validateRequest(validateUpdateProfile), userController.updateProfile);
router.patch('/change-password', validateRequest(validateChangePassword), userController.changePassword);
const profilePictureUpload = [
  localFileUpload({
    customPath: 'profile',
    validation: fileValidation.image,
    folder: 'avatar',
  }).single('profilePicture'),
  validateRequest(validateUploadProfilePic),
  userController.uploadProfilePic,
];

// POST: first-time upload (no existing picture). PATCH: replace existing picture.
// upload for first time
router.post('/upload-profile-picture', ...profilePictureUpload);
// update profile pic
router.patch('/upload-profile-picture', ...profilePictureUpload);

export default router;
//E:\ECO LINK\ecolink-backend\src\modules\user\user.routes.js