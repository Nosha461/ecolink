/**
 * Wraps async route handlers to pass errors to global error handler
 * @param {Function} fn - async (req, res, next) => {}
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => next(error));
  };
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = async (err, req, res, next) => {
  const { Auth } = await import('../../DB/models/auth.model.js');
  const { generateToken, verifyToken } = await import('../token/index.js');

  try {
    // Handle JWT expired: try refresh token flow
    if (err.message === 'jwt expired') {
      const refreshToken = req.headers.refreshtoken;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: err.message,
        });
      }
      const payload = verifyToken(refreshToken);
      const tokenDoc = await Auth.findOneAndDelete({
        token: refreshToken,
        user: payload.id,
        type: 'refresh',
      });
      if (!tokenDoc) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token, please login again',
        });
      }
      const token = generateToken({
        payload: { id: payload.id },
        option: { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
      });
      const newRefreshToken = generateToken({
        payload: { id: payload.id },
        option: { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
      });
      await Auth.create({
        token: newRefreshToken,
        user: payload.id,
        type: 'refresh',
      });
      return res.status(200).json({
        success: true,
        message: 'New tokens created successfully',
        data: { token, refreshToken: newRefreshToken },
      });
    }

    const statusCode = err.cause || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  } catch (error) {
    res.status(err.cause || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  }
};
