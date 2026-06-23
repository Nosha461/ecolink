/**
 * Validate uploaded file (type, size).
 * Use after multer - checks req.file or req.files
 */
export const validateFile = (options = {}) => {
  const { maxSize = 5 * 1024 * 1024, allowedMimes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

  return (req, res, next) => {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return next(new Error('No file uploaded', { cause: 400 }));
    }
    if (file.size > maxSize) {
      return next(new Error('File size too large', { cause: 400 }));
    }
    if (allowedMimes.length && file.mimetype && !allowedMimes.includes(file.mimetype)) {
      return next(new Error('Invalid file type', { cause: 400 }));
    }
    next();
  };
};

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\middleware\file-validation.middleware.js
