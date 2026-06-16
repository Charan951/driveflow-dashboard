const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
const PHONE_10_REGEX = /^\d{10}$/;
const MAX_CONSECUTIVE_CHARS = 25;
const MAX_EMAIL_LENGTH = 30;

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
const MAX_HERO_TITLE_LENGTH = 100;
const MAX_HERO_SUBTITLE_LENGTH = 300;
const MAX_SLIDE_TITLE_LENGTH = 20;
const MAX_SLIDE_SUBTITLE_LENGTH = 150;
const MAX_ADDRESS_LENGTH = 500;
const MAX_IMAGE_URL_LENGTH = 500;
const MAX_BLOG_TITLE_LENGTH = 200;
const MAX_BLOG_EXCERPT_LENGTH = 500;
const MAX_BLOG_CONTENT_LENGTH = 10000;
const MAX_BLOG_AUTHOR_LENGTH = 50;
const MAX_BLOG_TAGS_LENGTH = 200;
const MAX_BLOG_READ_TIME_LENGTH = 30;
const MAX_CATEGORY_NAME_LENGTH = 50;
const MAX_CATEGORY_DESCRIPTION_LENGTH = 200;
const MAX_CAREER_TITLE_LENGTH = 100;
const MAX_CAREER_DEPARTMENT_LENGTH = 50;
const MAX_CAREER_LOCATION_LENGTH = 100;
const MAX_CAREER_TYPE_LENGTH = 30;
const MAX_CAREER_SALARY_LENGTH = 50;
const MAX_CAREER_SHORT_DESCRIPTION_LENGTH = 500;
const MAX_CAREER_APPLY_URL_LENGTH = 500;

const hasLeadingTrailingSpaces = (value) => {
  if (typeof value !== 'string') return false;
  return value.length !== value.trim().length;
};

const hasExcessiveRepeatedChars = (value, maxConsecutive = MAX_CONSECUTIVE_CHARS) => {
  if (typeof value !== 'string') return false;
  const regex = new RegExp(`(.)\\1{${maxConsecutive},}`, 'g');
  return regex.test(value);
};

const isOnlySpecialCharacters = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !/[a-zA-Z0-9]/.test(trimmed);
};

const isOnlyNumbers = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed.replace(/\s/g, ''));
};

const isValidEmail = (value) => {
  if (typeof value !== 'string') return { valid: false, error: 'Email is required.' };
  const trimmed = value.trim();

  if (!trimmed) return { valid: false, error: 'Email is required.' };

  if (trimmed.length > 254) return { valid: false, error: 'Email cannot be longer than 254 characters.' };

  if (/\s/.test(trimmed)) return { valid: false, error: 'Email cannot contain spaces.' };

  if (!/^[a-zA-Z]/.test(trimmed)) return { valid: false, error: 'Email must start with a letter.' };

  if (/\.\./.test(trimmed)) return { valid: false, error: 'Invalid email format.' };

  if (/^\./.test(trimmed) || /\.$/.test(trimmed) || /@\./.test(trimmed) || /\.@/.test(trimmed)) {
    return { valid: false, error: 'Invalid email format.' };
  }

  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) return { valid: false, error: 'Invalid email format.' };

  const [localPart, domainPart] = trimmed.split('@');
  if (!localPart || !domainPart) return { valid: false, error: 'Please enter a valid email address.' };

  if (!domainPart.includes('.')) return { valid: false, error: 'Please enter a valid email address.' };

  const domainParts = domainPart.split('.');
  if (domainParts.some(part => part === '')) return { valid: false, error: 'Please enter a valid email address.' };

  const extension = domainParts[domainParts.length - 1].toLowerCase();
  const validExtensions = new Set(['com', 'in', 'org', 'net', 'co', 'io', 'tech', 'app', 'dev', 'edu', 'gov', 'mil']);
  if (!validExtensions.has(extension)) {
    if (domainParts.length >= 2) {
      const lastPart = domainParts[domainParts.length - 1];
      if (!validExtensions.has(lastPart)) return { valid: false, error: 'Please enter a valid email address.' };
    } else {
      return { valid: false, error: 'Please enter a valid email address.' };
    }
  }

  if (!EMAIL_REGEX.test(trimmed)) return { valid: false, error: 'Please enter a valid email address.' };

  const domain = domainPart.toLowerCase();
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return { valid: false, error: 'Please enter a valid email address.' };

  return { valid: true };
};

const isEmailValid = (value) => isValidEmail(value).valid;

const isValidPhone10 = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^\d{10}$/.test(trimmed);
};

const isValidName = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Allow letters and spaces only
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) return false;
  // Check for excessive repeated characters
  if (hasExcessiveRepeatedChars(trimmed)) return false;
  return true;
};

const isValidImageUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidDate = (dateStr) => {
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

const validateHeroSettings = (data) => {
  const { homeSlides = [], pageHeroes = {}, contactDetails = {} } = data;

  if (!Array.isArray(homeSlides)) {
    return { valid: false, message: 'homeSlides must be an array' };
  }

  for (let i = 0; i < homeSlides.length; i++) {
    const slide = homeSlides[i];
    const titleWhite = slide.titleWhite || '';
    const titleBlue = slide.titleBlue || '';
    const subtitle = slide.subtitle || '';
    const image = slide.image || '';

    // Check if titleWhite is required and valid
    if (titleWhite.trim()) {
      if (!/^[a-zA-Z0-9\s]+$/.test(titleWhite.trim())) {
        return { valid: false, message: `Slide ${i + 1} white title must contain only letters and numbers` };
      }
      if (/^\d+$/.test(titleWhite.trim().replace(/\s/g, ''))) {
        return { valid: false, message: `Slide ${i + 1} white title cannot contain only numbers` };
      }
      if (hasExcessiveRepeatedChars(titleWhite)) {
        return { valid: false, message: `Slide ${i + 1} white title contains excessive repeated characters` };
      }
      if (titleWhite.length > MAX_SLIDE_TITLE_LENGTH) {
        return { valid: false, message: `Slide ${i + 1} white title is too long (max ${MAX_SLIDE_TITLE_LENGTH})` };
      }
    }

    // Check if titleBlue is required and valid
    if (titleBlue.trim()) {
      if (!/^[a-zA-Z0-9\s]+$/.test(titleBlue.trim())) {
        return { valid: false, message: `Slide ${i + 1} blue title must contain only letters and numbers` };
      }
      if (/^\d+$/.test(titleBlue.trim().replace(/\s/g, ''))) {
        return { valid: false, message: `Slide ${i + 1} blue title cannot contain only numbers` };
      }
      if (hasExcessiveRepeatedChars(titleBlue)) {
        return { valid: false, message: `Slide ${i + 1} blue title contains excessive repeated characters` };
      }
      if (titleBlue.length > MAX_SLIDE_TITLE_LENGTH) {
        return { valid: false, message: `Slide ${i + 1} blue title is too long (max ${MAX_SLIDE_TITLE_LENGTH})` };
      }
    }

    // Check if subtitle is required and valid
    if (subtitle.trim()) {
      if (isOnlySpecialCharacters(subtitle)) {
        return { valid: false, message: `Slide ${i + 1} subtitle cannot contain only special characters` };
      }
      if (isOnlyNumbers(subtitle)) {
        return { valid: false, message: `Slide ${i + 1} subtitle cannot contain only numbers` };
      }
      if (hasExcessiveRepeatedChars(subtitle)) {
        return { valid: false, message: `Slide ${i + 1} subtitle contains excessive repeated characters` };
      }
      if (subtitle.length > MAX_SLIDE_SUBTITLE_LENGTH) {
        return { valid: false, message: `Slide ${i + 1} subtitle is too long (max ${MAX_SLIDE_SUBTITLE_LENGTH})` };
      }
    }

    if (image && !isValidImageUrl(image)) {
      return { valid: false, message: `Slide ${i + 1} image URL is invalid` };
    }
    if (image.length > MAX_IMAGE_URL_LENGTH) {
      return { valid: false, message: `Slide ${i + 1} image URL is too long` };
    }
  }

  if (typeof pageHeroes !== 'object' || pageHeroes === null || Array.isArray(pageHeroes)) {
    return { valid: false, message: 'pageHeroes must be an object' };
  }

  for (const pageId in pageHeroes) {
    const pageHero = pageHeroes[pageId];
    const title = pageHero.title || '';
    const subtitle = pageHero.subtitle || '';
    const image = pageHero.image || '';

    // Check if title is valid (if provided)
    if (title.trim()) {
      if (isOnlySpecialCharacters(title)) {
        return { valid: false, message: `${pageId} hero title cannot contain only special characters` };
      }
      if (isOnlyNumbers(title)) {
        return { valid: false, message: `${pageId} hero title cannot contain only numbers` };
      }
      if (hasExcessiveRepeatedChars(title)) {
        return { valid: false, message: `${pageId} hero title contains excessive repeated characters` };
      }
    }
    if (title.length > MAX_HERO_TITLE_LENGTH) {
      return { valid: false, message: `${pageId} hero title is too long` };
    }

    // Check if subtitle is valid (if provided)
    if (subtitle.trim()) {
      if (isOnlySpecialCharacters(subtitle)) {
        return { valid: false, message: `${pageId} hero subtitle cannot contain only special characters` };
      }
      if (isOnlyNumbers(subtitle)) {
        return { valid: false, message: `${pageId} hero subtitle cannot contain only numbers` };
      }
      if (hasExcessiveRepeatedChars(subtitle)) {
        return { valid: false, message: `${pageId} hero subtitle contains excessive repeated characters` };
      }
    }
    if (subtitle.length > MAX_HERO_SUBTITLE_LENGTH) {
      return { valid: false, message: `${pageId} hero subtitle is too long` };
    }

    if (image && !isValidImageUrl(image)) {
      return { valid: false, message: `${pageId} hero image URL is invalid` };
    }
    if (image.length > MAX_IMAGE_URL_LENGTH) {
      return { valid: false, message: `${pageId} hero image URL is too long` };
    }
  }

  const address = contactDetails.address || '';
  const mobileNumber = contactDetails.mobileNumber || '';
  const email = contactDetails.email || '';

  if (hasExcessiveRepeatedChars(address)) {
    return { valid: false, message: 'Address contains excessive repeated characters' };
  }
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { valid: false, message: 'Address is too long' };
  }

  if (mobileNumber && !isValidPhone10(mobileNumber)) {
    return { valid: false, message: 'Please enter a valid 10-digit mobile number' };
  }

  if (email) {
    const emailValidation = isValidEmail(email);
    if (!emailValidation.valid) {
      return { valid: false, message: emailValidation.error || 'Please enter a valid email address' };
    }
  }

  return { valid: true };
};

const validateBlogPost = (data) => {
  const { title, excerpt, content, image, author, category, readTime, tags } = data;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return { valid: false, message: 'Blog title is required' };
  }
  if (hasExcessiveRepeatedChars(title)) {
    return { valid: false, message: 'Blog title contains excessive repeated characters' };
  }
  if (title.length > MAX_BLOG_TITLE_LENGTH) {
    return { valid: false, message: 'Blog title is too long' };
  }

  if (!excerpt || typeof excerpt !== 'string' || !excerpt.trim()) {
    return { valid: false, message: 'Blog excerpt is required' };
  }
  if (hasExcessiveRepeatedChars(excerpt)) {
    return { valid: false, message: 'Blog excerpt contains excessive repeated characters' };
  }
  if (excerpt.length > MAX_BLOG_EXCERPT_LENGTH) {
    return { valid: false, message: 'Blog excerpt is too long' };
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    return { valid: false, message: 'Blog content is required' };
  }
  if (hasExcessiveRepeatedChars(content)) {
    return { valid: false, message: 'Blog content contains excessive repeated characters' };
  }
  if (content.length > MAX_BLOG_CONTENT_LENGTH) {
    return { valid: false, message: 'Blog content is too long' };
  }

  if (!author || typeof author !== 'string' || !author.trim()) {
    return { valid: false, message: 'Blog author is required' };
  }
  if (hasExcessiveRepeatedChars(author)) {
    return { valid: false, message: 'Blog author contains excessive repeated characters' };
  }
  if (author.length > MAX_BLOG_AUTHOR_LENGTH) {
    return { valid: false, message: 'Blog author is too long' };
  }

  if (!readTime || typeof readTime !== 'string' || !readTime.trim()) {
    return { valid: false, message: 'Blog read time is required' };
  }
  if (hasExcessiveRepeatedChars(readTime)) {
    return { valid: false, message: 'Blog read time contains excessive repeated characters' };
  }
  if (readTime.length > MAX_BLOG_READ_TIME_LENGTH) {
    return { valid: false, message: 'Blog read time is too long' };
  }

  if (!image || typeof image !== 'string' || !image.trim()) {
    return { valid: false, message: 'Blog image URL is required' };
  }
  if (!isValidImageUrl(image)) {
    return { valid: false, message: 'Blog image URL is invalid' };
  }
  if (image.length > MAX_IMAGE_URL_LENGTH) {
    return { valid: false, message: 'Blog image URL is too long' };
  }

  if (!category) {
    return { valid: false, message: 'Category is required' };
  }

  if (!tags) {
    return { valid: false, message: 'Blog tags are required' };
  }
  if (Array.isArray(tags)) {
    if (tags.filter(Boolean).length === 0) {
      return { valid: false, message: 'Blog tags are required' };
    }
    const tagsStr = tags.join(', ');
    if (hasExcessiveRepeatedChars(tagsStr)) {
      return { valid: false, message: 'Blog tags contain excessive repeated characters' };
    }
    if (tagsStr.length > MAX_BLOG_TAGS_LENGTH) {
      return { valid: false, message: 'Blog tags are too long' };
    }
  } else if (typeof tags === 'string') {
    if (!tags.trim()) {
      return { valid: false, message: 'Blog tags are required' };
    }
    if (hasExcessiveRepeatedChars(tags)) {
      return { valid: false, message: 'Blog tags contain excessive repeated characters' };
    }
    if (tags.length > MAX_BLOG_TAGS_LENGTH) {
      return { valid: false, message: 'Blog tags are too long' };
    }
  } else {
    return { valid: false, message: 'Blog tags are invalid' };
  }

  return { valid: true };
};

const validateBlogCategory = (data) => {
  const { name, description } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, message: 'Category name is required' };
  }
  if (hasExcessiveRepeatedChars(name)) {
    return { valid: false, message: 'Category name contains excessive repeated characters' };
  }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { valid: false, message: 'Category name is too long' };
  }

  if (description && typeof description === 'string') {
    if (hasExcessiveRepeatedChars(description)) {
      return { valid: false, message: 'Category description contains excessive repeated characters' };
    }
    if (description.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
      return { valid: false, message: 'Category description is too long' };
    }
  }

  return { valid: true };
};

const validateCareerTextField = (label, value, { required = true, maxLength } = {}) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (!trimmed) {
    if (required) {
      return { valid: false, message: `${label} is required` };
    }
    return null;
  }

  if (isOnlySpecialCharacters(trimmed)) {
    return { valid: false, message: `${label} cannot contain only special characters` };
  }
  if (isOnlyNumbers(trimmed)) {
    return { valid: false, message: `${label} cannot contain only numbers` };
  }
  if (hasExcessiveRepeatedChars(trimmed)) {
    return { valid: false, message: `${label} contains excessive repeated characters` };
  }
  if (maxLength && trimmed.length > maxLength) {
    return { valid: false, message: `${label} is too long` };
  }

  return null;
};

const validateCareer = (data) => {
  const { title, department, location, type, salary, shortDescription, applyUrl } = data;

  const titleError = validateCareerTextField('Career title', title, {
    required: true,
    maxLength: MAX_CAREER_TITLE_LENGTH,
  });
  if (titleError) return titleError;

  const departmentError = validateCareerTextField('Career department', department, {
    required: true,
    maxLength: MAX_CAREER_DEPARTMENT_LENGTH,
  });
  if (departmentError) return departmentError;

  const locationError = validateCareerTextField('Career location', location, {
    required: true,
    maxLength: MAX_CAREER_LOCATION_LENGTH,
  });
  if (locationError) return locationError;

  const typeError = validateCareerTextField('Career type', type, {
    required: true,
    maxLength: MAX_CAREER_TYPE_LENGTH,
  });
  if (typeError) return typeError;

  const salaryError = validateCareerTextField('Career salary', salary, {
    required: false,
    maxLength: MAX_CAREER_SALARY_LENGTH,
  });
  if (salaryError) return salaryError;

  const shortDescriptionError = validateCareerTextField('Career short description', shortDescription, {
    required: false,
    maxLength: MAX_CAREER_SHORT_DESCRIPTION_LENGTH,
  });
  if (shortDescriptionError) return shortDescriptionError;

  if (applyUrl && typeof applyUrl === 'string' && applyUrl.trim()) {
    try {
      new URL(applyUrl.trim());
    } catch {
      return { valid: false, message: 'Career apply URL is invalid' };
    }
    if (applyUrl.length > MAX_CAREER_APPLY_URL_LENGTH) {
      return { valid: false, message: 'Career apply URL is too long' };
    }
  }

  return { valid: true };
};

export {
  validateHeroSettings,
  validateBlogPost,
  validateBlogCategory,
  validateCareer,
  isValidDate,
  isValidEmail,
  isValidPhone10,
  hasExcessiveRepeatedChars,
  isValidName,
  isOnlySpecialCharacters
};
