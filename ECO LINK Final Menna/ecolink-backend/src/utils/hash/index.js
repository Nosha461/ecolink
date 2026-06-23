import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {string} plainPassword
 * @returns {Promise<string>} hashed password
 */
export const hashPassword = (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare plain password with hashed password
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
export const comparePassword = (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
//E:\ECO LINK\ecolink-backend\src\utils\hash\index.js