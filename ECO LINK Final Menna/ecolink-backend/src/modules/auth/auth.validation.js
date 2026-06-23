const validateRegister = (body) => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    role,
    phoneNumber,
  } = body || {};

  if (!firstName || !firstName.trim()) return "First name is required";
  if (!lastName || !lastName.trim()) return "Last name is required";

  if (!email || !email.trim()) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Invalid email format";

  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";

  if (!confirmPassword) return "Confirm password is required";
  if (password !== confirmPassword) return "Passwords do not match";

  if (!phoneNumber || !phoneNumber.trim()) return "Phone is required";
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phoneNumber)) return "Invalid phone number";

  if (role && !["buyer", "seller"].includes(role)) {
    return 'Role must be "buyer" or "seller"';
  }

  return null;
};

const validateLogin = (body) => {
  const { email, password } = body || {};

  if (!email || !email.trim()) return "Email is required";
  if (!password) return "Password is required";

  return null;
};

const validateRefreshToken = (body, req) => {
  // Check body first, then headers
  const refreshToken = body?.refreshToken || req?.headers?.refreshtoken || req?.headers?.refresh_token;

  if (!refreshToken) return "Refresh token is required";

  return null;
};

const validateSwitchRole = (body) => {
  const { role } = body || {};

  if (!role) return "Role is required";
  if (!["buyer", "seller"].includes(role)) {
    return 'Role must be "buyer" or "seller"';
  }

  return null;
};

export {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateSwitchRole,
};
//E:\ECO LINK\ecolink-backend\src\modules\auth\auth.validation.js