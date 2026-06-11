export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
export const MAX_EMAIL_LENGTH = 30;
export const MAX_PASSWORD_LENGTH = 15;
export const MAX_NAME_LENGTH = 30;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_SUBJECT_LENGTH = 100;
export const MIN_SUBJECT_LENGTH = 3;
export const MIN_TICKET_MESSAGE_LENGTH = 10;
export const MAX_TICKET_DESCRIPTION_LENGTH = 1000;
export const MAX_CHAT_MESSAGE_LENGTH = 2000;
export const MAX_REVIEW_COMMENT_LENGTH = 500;
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
export const MAX_SLIDE_TITLE_LENGTH = 20;
export const MAX_SLIDE_SUBTITLE_LENGTH = 150;
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
export const MAX_CONSECUTIVE_CHARS = 25;

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

export const isValidEmail = (value: string): { valid: boolean; error?: string } => {
  // Trim first
  const trimmed = value.trim();

  // Check if empty
  if (!trimmed) {
    return { valid: false, error: 'Email is required.' };
  }

  // Check max length (254 per RFC)
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email cannot be longer than 254 characters.' };
  }

  // Check for spaces
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'Email cannot contain spaces.' };
  }

  // Check that it starts with a letter
  const firstChar = trimmed.charAt(0);
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Email must start with a letter.' };
  }

  // Check for consecutive dots
  if (/\.\./.test(trimmed)) {
    return { valid: false, error: 'Invalid email format.' };
  }

  // Check for leading/trailing dots, or dot before/after @
  if (/^\./.test(trimmed) || /\.$/.test(trimmed) || /@\./.test(trimmed) || /\.@/.test(trimmed)) {
    return { valid: false, error: 'Invalid email format.' };
  }

  // Check for exactly one @
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) {
    return { valid: false, error: 'Invalid email format.' };
  }

  // Split into local and domain
  const [localPart, domainPart] = trimmed.split('@');
  if (!localPart || !domainPart) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // Check domain has at least one dot and valid extension
  if (!domainPart.includes('.')) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const domainParts = domainPart.split('.');
  if (domainParts.some(part => part === '')) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const extension = domainParts[domainParts.length - 1].toLowerCase();
  // Valid extensions (com, in, org, net, co.in, etc.)
  const validExtensions = new Set(['com', 'in', 'org', 'net', 'co', 'io', 'tech', 'app', 'dev', 'edu', 'gov', 'mil']);
  if (!validExtensions.has(extension)) {
    // If extension has multiple parts (like co.in), check the last part
    if (domainParts.length >= 2) {
      const lastPart = domainParts[domainParts.length - 1];
      if (!validExtensions.has(lastPart)) {
        return { valid: false, error: 'Please enter a valid email address.' };
      }
    } else {
      return { valid: false, error: 'Please enter a valid email address.' };
    }
  }

  // Check against EMAIL_REGEX as a final sanity check
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // Check if it's a disposable email
  const domain = domainPart.toLowerCase();
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  return { valid: true };
};

// Helper for compatibility with existing code
export const isEmailValid = (value: string): boolean => isValidEmail(value).valid;

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

export const isOnlySpecialCharacters = (value: string): boolean => {
  const trimmed = value.trim();
  // Check if there are no alphanumeric characters
  return trimmed.length > 0 && !/[a-zA-Z0-9]/.test(trimmed);
};

export const isOnlyNumbers = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed.replace(/\s/g, ''));
};

export const isPasswordTooLong = (value: string): boolean => {
  return value.length > MAX_PASSWORD_LENGTH;
};

export const isValidPhone10 = (value: string): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^\d{10}$/.test(trimmed);
};

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
  // Allow letters, numbers, spaces, apostrophes, ampersands, and hyphens, must start with alphanumeric
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
  if (typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim().replace(/\//g, '-');
  if (!trimmed) return false;

  // 1. Check standard YYYY-MM-DD
  const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (yyyymmddRegex.test(trimmed)) {
    const [yearStr, monthStr, dayStr] = trimmed.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    const date = new Date(year, month - 1, day);
    return !isNaN(date.getTime()) && 
           date.getFullYear() === year && 
           (date.getMonth() + 1) === month && 
           date.getDate() === day;
  }

  // 2. Check DD-MM-YYYY or MM-DD-YYYY
  const ddmmyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (ddmmyyyyRegex.test(trimmed)) {
    const parts = trimmed.split('-').map(Number);
    const year = parts[2];
    const p1 = parts[0];
    const p2 = parts[1];

    if (year < 1900 || year > 2100) return false;

    // A: p1 is day, p2 is month (DD-MM-YYYY)
    const dateA = new Date(year, p2 - 1, p1);
    const validA = !isNaN(dateA.getTime()) && 
                   dateA.getFullYear() === year && 
                   (dateA.getMonth() + 1) === p2 && 
                   dateA.getDate() === p1;

    // B: p1 is month, p2 is day (MM-DD-YYYY)
    const dateB = new Date(year, p1 - 1, p2);
    const validB = !isNaN(dateB.getTime()) && 
                   dateB.getFullYear() === year && 
                   (dateB.getMonth() + 1) === p1 && 
                   dateB.getDate() === p2;

    return validA || validB;
  }

  return false;
};

// Hero validation
export const isValidHeroTitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false; // Required - not optional
  if (isOnlySpecialCharacters(trimmed)) return false;
  if (isOnlyNumbers(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isHeroTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_HERO_TITLE_LENGTH;
};

export const isValidHeroSubtitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false; // Required - not optional
  if (isOnlySpecialCharacters(trimmed)) return false;
  if (isOnlyNumbers(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isValidSlideTitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Letters, numbers, and spaces only
  if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) return false;
  // Cannot be only digits (must have at least one letter)
  if (/^\d+$/.test(trimmed.replace(/\s/g, ''))) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isHeroSubtitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_HERO_SUBTITLE_LENGTH;
};

export const isSlideTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_SLIDE_TITLE_LENGTH;
};

export const isSlideSubtitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_SLIDE_SUBTITLE_LENGTH;
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
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\s'&-.,!?"():;+#%]*$/.test(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_TITLE_LENGTH;
};

export const isValidBlogExcerpt = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (isOnlySpecialCharacters(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogExcerptTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_EXCERPT_LENGTH;
};

export const isValidBlogContent = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (isOnlySpecialCharacters(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogContentTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_CONTENT_LENGTH;
};

export const isValidBlogAuthor = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\s'.-]*$/.test(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogAuthorTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_AUTHOR_LENGTH;
};

export const isValidBlogTags = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (!/^[a-zA-Z0-9\s]+(?:,\s*[a-zA-Z0-9\s]+)*$/.test(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

export const isBlogTagsTooLong = (value: string): boolean => {
  return value.trim().length > MAX_BLOG_TAGS_LENGTH;
};

export const isValidBlogReadTime = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (!/^\d+\s*[a-zA-Z\s]*$/.test(trimmed)) return false;
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
const validateRequiredCareerText = (trimmed: string): boolean => {
  if (isOnlySpecialCharacters(trimmed)) return false;
  if (isOnlyNumbers(trimmed)) return false;
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

const validateOptionalCareerText = (trimmed: string): boolean => {
  if (trimmed.length === 0) return true;
  return validateRequiredCareerText(trimmed);
};

export const isValidCareerTitle = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return validateRequiredCareerText(trimmed);
};

export const isCareerTitleTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_TITLE_LENGTH;
};

export const isValidCareerDepartment = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return validateRequiredCareerText(trimmed);
};

export const isCareerDepartmentTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_DEPARTMENT_LENGTH;
};

export const isValidCareerLocation = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return validateRequiredCareerText(trimmed);
};

export const isCareerLocationTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_LOCATION_LENGTH;
};

export const isValidCareerType = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return validateRequiredCareerText(trimmed);
};

export const isCareerTypeTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_TYPE_LENGTH;
};

export const isValidCareerSalary = (value: string): boolean => {
  return validateOptionalCareerText(value.trim());
};

export const isCareerSalaryTooLong = (value: string): boolean => {
  return value.trim().length > MAX_CAREER_SALARY_LENGTH;
};

export const isValidCareerShortDescription = (value: string): boolean => {
  return validateOptionalCareerText(value.trim());
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

export type CareerFormField =
  | 'title'
  | 'department'
  | 'location'
  | 'type'
  | 'salary'
  | 'shortDescription'
  | 'applyUrl';

const CAREER_FIELD_LABELS: Record<CareerFormField, string> = {
  title: 'Job title',
  department: 'Department',
  location: 'Location',
  type: 'Type',
  salary: 'Salary',
  shortDescription: 'Short description',
  applyUrl: 'Apply URL',
};

export const validateCareerField = (field: CareerFormField, value: string): string | null => {
  const trimmed = value.trim();
  const label = CAREER_FIELD_LABELS[field];
  const isRequired = field === 'title' || field === 'department' || field === 'location' || field === 'type';

  if (isRequired && !trimmed) {
    return `${label} is required`;
  }

  if (!trimmed) {
    if (field === 'applyUrl') return null;
    return null;
  }

  if (field !== 'applyUrl') {
    if (isOnlySpecialCharacters(trimmed)) {
      return `${label} cannot contain only special characters`;
    }
    if (isOnlyNumbers(trimmed)) {
      return `${label} cannot contain only numbers`;
    }
    if (hasExcessiveRepeatedChars(value)) {
      return `${label} contains too many repeated characters`;
    }
  }

  switch (field) {
    case 'title':
      if (isCareerTitleTooLong(value)) return `${label} is too long`;
      break;
    case 'department':
      if (isCareerDepartmentTooLong(value)) return `${label} is too long`;
      break;
    case 'location':
      if (isCareerLocationTooLong(value)) return `${label} is too long`;
      break;
    case 'type':
      if (isCareerTypeTooLong(value)) return `${label} is too long`;
      break;
    case 'salary':
      if (isCareerSalaryTooLong(value)) return `${label} is too long`;
      break;
    case 'shortDescription':
      if (isCareerShortDescriptionTooLong(value)) return `${label} is too long`;
      break;
    case 'applyUrl':
      if (!isValidCareerApplyUrl(value)) return `${label} is invalid`;
      if (isCareerApplyUrlTooLong(value)) return `${label} is too long`;
      break;
  }

  return null;
};

export const validateSubject = (value: string): { valid: boolean; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: 'Subject is required.' };
  if (trimmed.length < MIN_SUBJECT_LENGTH) {
    return { valid: false, error: `Subject should be at least ${MIN_SUBJECT_LENGTH} characters.` };
  }
  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    return { valid: false, error: `Subject should be at most ${MAX_SUBJECT_LENGTH} characters.` };
  }
  if (isOnlySpecialCharacters(trimmed)) {
    return { valid: false, error: 'Subject cannot contain only special characters.' };
  }
  if (hasExcessiveRepeatedChars(trimmed)) {
    return { valid: false, error: 'Subject contains excessive repeated characters.' };
  }
  return { valid: true };
};

export const validateTicketMessage = (value: string): { valid: boolean; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: 'Description is required.' };
  if (trimmed.length < MIN_TICKET_MESSAGE_LENGTH) {
    return { valid: false, error: `Description should be at least ${MIN_TICKET_MESSAGE_LENGTH} characters.` };
  }
  if (trimmed.length > MAX_TICKET_DESCRIPTION_LENGTH) {
    return { valid: false, error: `Description should be at most ${MAX_TICKET_DESCRIPTION_LENGTH} characters.` };
  }
  if (hasExcessiveRepeatedChars(trimmed)) {
    return { valid: false, error: 'Description contains excessive repeated characters.' };
  }
  return { valid: true };
};

export const validateChatMessage = (value: string): { valid: boolean; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: 'Message cannot be empty.' };
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    return { valid: false, error: `Message is too long (max ${MAX_CHAT_MESSAGE_LENGTH} characters).` };
  }
  return { valid: true };
};

export const validateReviewComment = (value: string): { valid: boolean; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true };
  if (trimmed.length > MAX_REVIEW_COMMENT_LENGTH) {
    return { valid: false, error: `Comment should be at most ${MAX_REVIEW_COMMENT_LENGTH} characters.` };
  }
  if (hasExcessiveRepeatedChars(trimmed)) {
    return { valid: false, error: 'Comment contains excessive repeated characters.' };
  }
  return { valid: true };
};
