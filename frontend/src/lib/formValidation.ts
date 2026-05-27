export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_10_REGEX = /^\d{10}$/;
export const LICENSE_PLATE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}$/;

export const isValidEmail = (value: string): boolean =>
  EMAIL_REGEX.test(value.trim());

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
