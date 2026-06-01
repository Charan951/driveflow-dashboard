export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
export const MAX_EMAIL_LENGTH = 30;
export const MAX_PASSWORD_LENGTH = 15;
export const MAX_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_PRICE_LENGTH = 10;
export const MAX_DURATION_LENGTH = 3;
export const MAX_ESTIMATION_TIME_LENGTH = 50;
export const MAX_IMAGE_URL_LENGTH = 500;
export const MAX_FEATURE_LENGTH = 100;
export const PHONE_10_REGEX = /^\d{10}$/;
export const LICENSE_PLATE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}$/;

export const isValidEmail = (value: string): boolean => {
  // No spaces anywhere in email
  if (/\s/.test(value)) {
    return false;
  }
  // No consecutive dots
  if (/\.\./.test(value)) {
    return false;
  }
  // No leading or trailing dots in local or domain parts
  if (/^\./.test(value) || /\.$/.test(value) || /@\./.test(value) || /\.@/.test(value)) {
    return false;
  }
  return value.length <= MAX_EMAIL_LENGTH && 
         EMAIL_REGEX.test(value);
};

export const isEmailTooLong = (value: string): boolean => {
  return value.length > MAX_EMAIL_LENGTH;
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

export const isDescriptionTooLong = (value: string): boolean => {
  return value.trim().length > MAX_DESCRIPTION_LENGTH;
};

export const isPriceTooLong = (value: string | number): boolean => {
  return String(value).length > MAX_PRICE_LENGTH;
};

export const isDurationTooLong = (value: string | number): boolean => {
  return String(value).length > MAX_DURATION_LENGTH;
};

export const isEstimationTimeTooLong = (value: string): boolean => {
  return value.trim().length > MAX_ESTIMATION_TIME_LENGTH;
};

export const isValidImageUrl = (value: string): boolean => {
  if (!value.trim()) return true; // not mandatory, so empty is okay
  // Simple URL validation
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isImageUrlTooLong = (value: string): boolean => {
  return value.trim().length > MAX_IMAGE_URL_LENGTH;
};

export const isValidFeature = (value: string): boolean => {
  if (!value.trim()) return true; // empty is okay, we filter them out
  // Allow letters, numbers, spaces, apostrophes, hyphens, commas, periods, colons, slashes
  return /^[a-zA-Z0-9\s'-.,:/]*$/.test(value);
};

export const isFeatureTooLong = (value: string): boolean => {
  return value.trim().length > MAX_FEATURE_LENGTH;
};

export const isValidDate = (dateStr: string): boolean => {
  // Check if the string is in YYYY-MM-DD format first
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }
  
  const date = new Date(dateStr);
  
  // Make sure the parsed date components match the input (to avoid dates like 2023-02-30 being accepted)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  return !isNaN(date.getTime()) && formattedDate === dateStr;
};
