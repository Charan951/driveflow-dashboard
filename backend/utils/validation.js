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
  return !/[a-zA-Z0-9]/.test(trimmed);
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
  // Check day is at least 1 and max 31
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
    if (!titleWhite.trim()) {
      return { valid: false, message: `Slide ${i + 1} white title is required` };
    }
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

    // Check if titleBlue is required and valid
    if (!titleBlue.trim()) {
      return { valid: false, message: `Slide ${i + 1} blue title is required` };
    }
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

    // Check if subtitle is required and valid
    if (!subtitle.trim()) {
      return { valid: false, message: `Slide ${i + 1} subtitle is required` };
    }
    if (hasExcessiveRepeatedChars(subtitle)) {
      return { valid: false, message: `Slide ${i + 1} subtitle contains excessive repeated characters` };
    }
    if (subtitle.length > MAX_SLIDE_SUBTITLE_LENGTH) {
      return { valid: false, message: `Slide ${i + 1} subtitle is too long (max ${MAX_SLIDE_SUBTITLE_LENGTH})` };
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
    if (title && hasExcessiveRepeatedChars(title)) {
      return { valid: false, message: `${pageId} hero title contains excessive repeated characters` };
    }
    if (title.length > MAX_HERO_TITLE_LENGTH) {
      return { valid: false, message: `${pageId} hero title is too long` };
    }

    // Check if subtitle is valid (if provided)
    if (subtitle && hasExcessiveRepeatedChars(subtitle)) {
      return { valid: false, message: `${pageId} hero subtitle contains excessive repeated characters` };
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

  if (author && typeof author === 'string') {
    if (hasExcessiveRepeatedChars(author)) {
      return { valid: false, message: 'Blog author contains excessive repeated characters' };
    }
    if (author.length > MAX_BLOG_AUTHOR_LENGTH) {
      return { valid: false, message: 'Blog author is too long' };
    }
  }

  if (readTime && typeof readTime === 'string') {
    if (hasExcessiveRepeatedChars(readTime)) {
      return { valid: false, message: 'Blog read time contains excessive repeated characters' };
    }
    if (readTime.length > MAX_BLOG_READ_TIME_LENGTH) {
      return { valid: false, message: 'Blog read time is too long' };
    }
  }

  if (image && typeof image === 'string') {
    if (!isValidImageUrl(image)) {
      return { valid: false, message: 'Blog image URL is invalid' };
    }
    if (image.length > MAX_IMAGE_URL_LENGTH) {
      return { valid: false, message: 'Blog image URL is too long' };
    }
  }

  if (!category) {
    return { valid: false, message: 'Category is required' };
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

const validateCareer = (data) => {
  const { title, department, location, type, salary, shortDescription, applyUrl } = data;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return { valid: false, message: 'Career title is required' };
  }
  if (hasExcessiveRepeatedChars(title)) {
    return { valid: false, message: 'Career title contains excessive repeated characters' };
  }
  if (title.length > MAX_CAREER_TITLE_LENGTH) {
    return { valid: false, message: 'Career title is too long' };
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    return { valid: false, message: 'Career department is required' };
  }
  if (hasExcessiveRepeatedChars(department)) {
    return { valid: false, message: 'Career department contains excessive repeated characters' };
  }
  if (department.length > MAX_CAREER_DEPARTMENT_LENGTH) {
    return { valid: false, message: 'Career department is too long' };
  }

  if (!location || typeof location !== 'string' || !location.trim()) {
    return { valid: false, message: 'Career location is required' };
  }
  if (hasExcessiveRepeatedChars(location)) {
    return { valid: false, message: 'Career location contains excessive repeated characters' };
  }
  if (location.length > MAX_CAREER_LOCATION_LENGTH) {
    return { valid: false, message: 'Career location is too long' };
  }

  if (!type || typeof type !== 'string' || !type.trim()) {
    return { valid: false, message: 'Career type is required' };
  }
  if (hasExcessiveRepeatedChars(type)) {
    return { valid: false, message: 'Career type contains excessive repeated characters' };
  }
  if (type.length > MAX_CAREER_TYPE_LENGTH) {
    return { valid: false, message: 'Career type is too long' };
  }

  if (salary && typeof salary === 'string') {
    if (hasExcessiveRepeatedChars(salary)) {
      return { valid: false, message: 'Career salary contains excessive repeated characters' };
    }
    if (salary.length > MAX_CAREER_SALARY_LENGTH) {
      return { valid: false, message: 'Career salary is too long' };
    }
  }

  if (shortDescription && typeof shortDescription === 'string') {
    if (hasExcessiveRepeatedChars(shortDescription)) {
      return { valid: false, message: 'Career short description contains excessive repeated characters' };
    }
    if (shortDescription.length > MAX_CAREER_SHORT_DESCRIPTION_LENGTH) {
      return { valid: false, message: 'Career short description is too long' };
    }
  }

  if (applyUrl && typeof applyUrl === 'string') {
    try {
      new URL(applyUrl);
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
