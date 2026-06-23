import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || 'supersecretjwtkeychangeit';
const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 * @param {Object} options - { payload: { id }, option: { expiresIn } }
 * @returns {string} signed token
 */
export const generateToken = ({
  payload,
  secretKey: customSecret = secretKey,
  option = { expiresIn: accessExpiresIn },
} = {}) => {
  return jwt.sign(payload, customSecret, option);
};

/**
 * Verify JWT token
 * @param {string} token
 * @param {string} customSecret
 * @returns {Object} decoded payload
 */
export const verifyToken = (token, customSecret = secretKey) => {
  return jwt.verify(token, customSecret);
};

/**
 * Generate access token for user
 */
export const generateAccessToken = (userId) =>
  generateToken({
    payload: { id: userId },
    option: { expiresIn: accessExpiresIn },
  });

/**
 * Generate refresh token for user
 */
export const generateRefreshToken = (userId) =>
  generateToken({
    payload: { id: userId },
    option: { expiresIn: refreshExpiresIn },
  });
//E:\ECO LINK\ecolink-backend\src\utils\token\index.js