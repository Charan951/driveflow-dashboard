export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
export const MAX_EMAIL_LENGTH = 30;
export const MAX_PASSWORD_LENGTH = 15;
export const MAX_NAME_LENGTH = 10;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_PRICE_LENGTH = 10;
export const MAX_DURATION_LENGTH = 3;
export const MAX_ESTIMATION_TIME_LENGTH = 3;
export const MAX_IMAGE_URL_LENGTH = 500;
export const MAX_FEATURE_LENGTH = 100;
export const PHONE_10_REGEX = /^\d{10}$/;
export const LICENSE_PLATE_REGEX = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}$/;

// Hero/Content specific max lengths
export const MAX_HERO_TITLE_LENGTH = 100;
export const MAX_HERO_SUBTITLE_LENGTH = 300;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_BLOG_TITLE_LENGTH = 200;
export const MAX_BLOG_EXCERPT_LENGTH = 500;
export const MAX_BLOG_CONTENT_LENGTH = 10000;
export const MAX_BLOG_AUTHOR_LENGTH = 50;
export const MAX_BLOG_TAGS_LENGTH = 200;
export const MAX_BLOG_READ_TIME_LENGTH = 30;
export const MAX_CATEGORY_NAME_LENGTH = 50;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 200;
export const MAX_CAREER_TITLE_LENGTH = 100;
export const MAX_CAREER_DEPARTMENT_LENGTH = 50;
export const MAX_CAREER_LOCATION_LENGTH = 100;
export const MAX_CAREER_TYPE_LENGTH = 30;
export const MAX_CAREER_SALARY_LENGTH = 50;
export const MAX_CAREER_SHORT_DESCRIPTION_LENGTH = 500;
export const MAX_CAREER_APPLY_URL_LENGTH = 500;

// Max consecutive same characters allowed
export const MAX_CONSECUTIVE_CHARS = 10;

// List of common disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yop.co',
  'temp-mail.org', 'tempmail.com', 'tempmail.net', 'temp-mail.io',
  'throwawayemail.com', 'throwawaymail.com',
  'mailinator.com', 'mailinator.net',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  '10minutemail.com', '10minutemail.net',
  'tempmailo.com',
  'getnada.com',
  'generator.email',
  'emailondeck.com',
  'fakemailgenerator.com',
  'moakt.com',
  'temp-mailaddress.com',
  'tempemail.co',
  'tempemail.net',
  'throwawayemail.org',
  'fakemail.net',
  'fakemailgenerator.org',
  'tempmailaddress.com',
  'dispostable.com',
  'mytrashmail.com',
  'trashmail.com', 'trashmail.net', 'trashmail.org',
  'tempemailaddress.com',
  'tempmailaddress.net',
  'tempmailaddress.org',
  'yopmail.org',
  'yopmail.info',
  'yopmail.biz',
  'temp-mailaddress.net',
  'temp-mailaddress.org',
  'emailtemp.com',
  'emailtemp.net',
  'tempemailgenerator.com',
  'tempemailgenerator.net',
  'throwawaymail.net',
  'throwawaymail.org',
  'tempmailgenerator.com',
  'tempmailgenerator.net',
  'fakemailaddress.com',
  'fakemailaddress.net',
  'fakemailaddress.org',
  'tempmailbox.com',
  'tempmailbox.net',
  'tempmailbox.org',
  'tempemailbox.com',
  'tempemailbox.net',
  'tempemailbox.org',
  'throwawayemailaddress.com',
  'throwawayemailaddress.net',
  'throwawayemailaddress.org'
]);

export const isDisposableEmail = (value: string): boolean => {
  if (typeof value !== 'string') return false;
  const atIndex = value.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = value.slice(atIndex + 1).toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
};

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
  // Check format first
  if (value.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(value)) {
    return false;
  }
  // Extract domain and check if it's disposable
  const domain = value.split('@')[1].toLowerCase();
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return false;
  }
  return true;
};

export const isEmailTooLong = (value: string): boolean => {
  return value.length > MAX_EMAIL_LENGTH;
};

export const hasLeadingTrailingSpaces = (value: string): boolean => {
  return value.length !== value.trim().length;
};

export const hasExcessiveRepeatedChars = (value: string, maxConsecutive: number = MAX_CONSECUTIVE_CHARS): boolean => {
  const regex = new RegExp(`(.)\\1{${maxConsecutive},}`, 'g');
  return regex.test(value);
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
  if (trimmed.length === 0) return false;
  // Allow letters, spaces, apostrophes, hyphens only (and numbers now for service names)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\s'&-]*$/.test(trimmed)) return false;
  // Check for excessive repeated characters
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isNameTooLong = (value: string): boolean => {
  return value.trim().length > MAX_NAME_LENGTH;
};

export const isValidDescription = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Check for excessive repeated characters
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
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

export const isValidEstimationTime = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // Optional field
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
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
  // Allow letters, numbers, spaces, apostrophes, hyphens, commas, periods, colons, slashes, ampersands
  if (!/^[a-zA-Z0-9\s'-.,:/&]*$/.test(value)) return false;
  if (hasExcessiveRepeatedChars(value)) return false;
  return true;
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

  // Split into parts and explicitly check month and day ranges
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Check that year is between 1900-2100
  if (year < 1900 || year > 2100) {
    return false;
  }
  // Check month is 1-12
  if (month < 1 || month > 12) {
    return false;
  }
  // Check day is at least 1
  if (day < 1 || day > 31) {
    return false;
  }
  
  const date = new Date(dateStr);
  
  // Make sure the parsed date components match the input (to avoid dates like 2023-02-30 being accepted)
  const parsedYear = date.getFullYear();
  const parsedMonth = String(date.getMonth() + 1).padStart(2, '0');
  const parsedDay = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${parsedYear}-${parsedMonth}-${parsedDay}`;
  
  return !isNaN(date.getTime()) && formattedDate === dateStr;
};

// Hero validation
export const isValidHeroTitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isHeroTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_HERO_TITLE_LENGTH;
};

export const isValidHeroSubtitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isHeroSubtitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_HERO_SUBTITLE_LENGTH;
};

export const isValidAddress = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isAddressTooLong = (value: string): boolean => {
  return value.trim().length > MAX_ADDRESS_LENGTH;
};

// Blog validation
export const isValidBlogTitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_TITLE_LENGTH;
};

export const isValidBlogExcerpt = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogExcerptTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_EXCERPT_LENGTH;
};

export const isValidBlogContent = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogContentTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_CONTENT_LENGTH;
};

export const isValidBlogAuthor = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogAuthorTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_AUTHOR_LENGTH;
};

export const isValidBlogTags = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogTagsTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_TAGS_LENGTH;
};

export const isValidBlogReadTime = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogReadTimeTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_READ_TIME_LENGTH;
};

// Blog Category validation
export const isValidCategoryName = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCategoryNameTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CATEGORY_NAME_LENGTH;
};

export const isValidCategoryDescription = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCategoryDescriptionTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CATEGORY_DESCRIPTION_LENGTH;
};

// Career validation
export const isValidCareerTitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCareerTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_TITLE_LENGTH;
};

export const isValidCareerDepartment = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCareerDepartmentTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_DEPARTMENT_LENGTH;
};

export const isValidCareerLocation = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCareerLocationTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_LOCATION_LENGTH;
};

export const isValidCareerType = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCareerTypeTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_TYPE_LENGTH;
};

export const isValidCareerSalary = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCareerSalaryTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_SALARY_LENGTH;
};

export const isValidCareerShortDescription = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isCareerShortDescriptionTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_SHORT_DESCRIPTION_LENGTH;
};

export const isValidCareerApplyUrl = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional
  // Simple URL validation
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

export const isCareerApplyUrlTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_APPLY_URL_LENGTH;
};
