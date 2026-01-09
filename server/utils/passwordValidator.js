function validatePassword(password) {
  const errors = [];

  if (password.length < 9) {
    errors.push('Password must be at least 9 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = { validatePassword };
