export const requireAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }
    next();
  };
  