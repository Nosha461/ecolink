import express from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import * as categoryController from './category.controller.js';
import {
  validateAddCategory,
  validateCategoryIdParam,
  validateUpdateCategory,
} from './category.validation.js';

const router = express.Router();

router.post('/addcategory',isAuthenticated,validateRequest(validateAddCategory),categoryController.create
);
router.delete(
  '/deletecategory/:id',
  isAuthenticated,
  validateRequest(validateCategoryIdParam),
  categoryController.remove
);
router.get('/getcategory/:id', categoryController.getCategoryById);
router.get('/getcategories', categoryController.getCategories);
router.put(
  '/updatecategory/:id',
  isAuthenticated,
  validateRequest(validateCategoryIdParam),
  validateRequest(validateUpdateCategory),
  categoryController.updateCategory
);

export default router;
