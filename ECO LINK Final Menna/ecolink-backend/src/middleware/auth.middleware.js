import { User } from '../DB/models/user.model.js';
import { verifyToken } from '../utils/token/index.js';

export const isAuthenticated = async (req, res, next) => {
  // تجاهل favicon
  if (req.url === '/favicon.ico') {
    return res.status(204).end();
  }
  
  try {
    let authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token is required' });
    }

    // إزالة Bearer لو موجود
    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    const payload = verifyToken(token);
    const userExist = await User.findById(payload.id);
    
    if (!userExist) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userExist.deletedAt) {
      throw new Error('Account has been deleted', { cause: 403 });
    }

    if (userExist.isBlocked) {
      throw new Error('Account is blocked', { cause: 403 });
    }

    if (
      userExist.credentialsUpdatedAt &&
      payload.iat &&
      new Date(userExist.credentialsUpdatedAt).getTime() / 1000 > payload.iat
    ) {
      return res.status(401).json({ success: false, message: 'Token expired, please login again' });
    }

    req.user = userExist;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message || 'Invalid token' });
  }
};
export const allowTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.currentRole)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required: ${roles.join(', ')}` 
      });
    }
    next();
  };
};





// middleware/auth.middleware.js (core logic only)

