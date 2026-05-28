export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_EMAIL_LENGTH = 35;
export const MAX_PASSWORD_LENGTH = 15;
export const MAX_NAME_LENGTH = 50;
export const PHONE_10_REGEX = /^\d{10}$/;
export const LICENSE_PLATE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}$/;

export const isValidEmail = (value: string): boolean => {
  return value.length === value.trim().length && 
         value.length <= MAX_EMAIL_LENGTH && 
         EMAIL_REGEX.test(value.trim());
};

export const isEmailTooLong = (value: string): boolean => {
  return value.trim().length > MAX_EMAIL_LENGTH;
};

export const hasLeadingTrailingSpaces = (value: string): boolean => {
  return value.length !== value.trim().length;
};

export const isPasswordTooLong = (value: string): boolean => {
  return value.length > MAX_PASSWORD_LENGTH;
};

export const isValidPhone10 = (value: string): boolean =>
  PHONE_10_REGEX.test(value.replace(/\D/g, ""));

export const isValidLicensePlate = (value: string): boolean =>
  LICENSE_PLATE_REGEX.test(value.trim().toUpperCase());

export const isStrongPassword = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.length >= 8 &&
    /[A-Z]/.test(trimmed) &&
    /[a-z]/.test(trimmed) &&
    /\d/.test(trimmed)
  );
};

export const isValidName = (value: string): boolean => {
  const trimmed = value.trim();
  // Allow letters, spaces, apostrophes, hyphens only
  return /^[a-zA-Z][a-zA-Z\s'-]*$/.test(trimmed) && trimmed.length > 0;
};

export const isNameTooLong = (value: string): boolean => {
  return value.trim().length > MAX_NAME_LENGTH;
};
