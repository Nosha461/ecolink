// import { Auth } from '../DB/models/auth.model.js';
// import { User } from '../DB/models/user.model.js';
// import { verifyToken } from '../utils/token/index.js';

// export const isAuthenticated = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       throw new Error('Token is required.', { cause: 401 });
//     }
//     const token = authHeader.split(' ')[1];
//     const payload = verifyToken(token);
//     const userExist = await User.findById(payload.id);
//     if (!userExist) {
//       throw new Error('User is not found', { cause: 404 });
//     }
//     if (
//       userExist.credentialsUpdatedAt &&
//       payload.iat &&
//       new Date(userExist.credentialsUpdatedAt).getTime() / 1000 > payload.iat
//     ) {
//       throw new Error('Token expired, please login again', { cause: 401 });
//     }
//     req.user = userExist;
//     req.currentRole = userExist.currentRole;
//     return next();
//   } catch (error) {
//     next(error);
//   }
// };

// export const allowTo = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user || !roles.includes(req.currentRole)) {
//       return res.status(403).json({ 
//         message: `Access denied. Required: ${roles.join(', ')}` 
//       });
//     }
//     next();
//   };
// };

// E:\ECO LINK\ecolink-backend\src\middleware\allowTo.js