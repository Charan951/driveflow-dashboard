/// Shared text-field validation aligned with frontend `formValidation.ts`.
class FormValidation {
  FormValidation._();

  static const maxEmailLength = 30;
  static const maxPasswordLength = 15;
  static const maxNameLength = 30;
  static const maxDescriptionLength = 500;
  static const maxSubjectLength = 100;
  static const minSubjectLength = 3;
  static const minTicketMessageLength = 10;
  static const maxTicketDescriptionLength = 1000;
  static const maxChatMessageLength = 2000;
  static const maxReviewCommentLength = 500;
  static const maxVehicleFieldLength = 50;
  static const maxConsecutiveChars = 25;
  static const otpLength = 6;

  static final RegExp emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$',
  );
  static final RegExp phoneRegex = RegExp(r'^\d{10}$');
  static final RegExp licensePlateRegex = RegExp(
    r'^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}$',
  );
  static final RegExp licensePlateCompactRegex = RegExp(
    r'^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4}$',
  );
  static final RegExp nameRegex = RegExp(r"^[a-zA-Z0-9][a-zA-Z0-9\s'&-]*$");

  static const Set<String> _disposableDomains = {
    'yopmail.com',
    'temp-mail.org',
    'tempmail.com',
    'mailinator.com',
    'guerrillamail.com',
    '10minutemail.com',
    'trashmail.com',
  };

  static const Set<String> _validExtensions = {
    'com',
    'in',
    'org',
    'net',
    'co',
    'io',
    'tech',
    'app',
    'dev',
    'edu',
    'gov',
    'mil',
  };

  static String digitsOnly(String value) =>
      value.replaceAll(RegExp(r'[^0-9]'), '');

  static bool hasLeadingTrailingSpaces(String value) =>
      value.length != value.trim().length;

  static bool hasExcessiveRepeatedChars(String value) {
    if (value.isEmpty) return false;
    var count = 1;
    for (var i = 1; i < value.length; i++) {
      if (value[i] == value[i - 1]) {
        count++;
        if (count > maxConsecutiveChars) return true;
      } else {
        count = 1;
      }
    }
    return false;
  }

  static bool isOnlySpecialCharacters(String value) {
    final trimmed = value.trim();
    return trimmed.isNotEmpty && !RegExp(r'[a-zA-Z0-9]').hasMatch(trimmed);
  }

  static String? validateEmail(String? value, {String? rawInput}) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Email is required';
    if (rawInput != null && rawInput != rawInput.trim()) {
      return 'Invalid email id';
    }
    if (trimmed.length > maxEmailLength) return 'Too long data not accept';
    if (RegExp(r'\s').hasMatch(trimmed)) return 'Email cannot contain spaces';
    if (!RegExp(r'^[a-zA-Z]').hasMatch(trimmed)) {
      return 'Email must start with a letter';
    }
    if (trimmed.contains('..')) return 'Invalid email format';
    if (RegExp(r'^\.|\.$|@\.|\.@').hasMatch(trimmed)) {
      return 'Invalid email format';
    }
    final atCount = '@'.allMatches(trimmed).length;
    if (atCount != 1) return 'Invalid email format';

    final parts = trimmed.split('@');
    if (parts.length != 2 || parts[0].isEmpty || parts[1].isEmpty) {
      return 'Please enter a valid email address';
    }

    final domainPart = parts[1];
    if (!domainPart.contains('.')) {
      return 'Please enter a valid email address';
    }

    final domainParts = domainPart.split('.');
    if (domainParts.any((part) => part.isEmpty)) {
      return 'Please enter a valid email address';
    }

    final extension = domainParts.last.toLowerCase();
    if (!_validExtensions.contains(extension)) {
      if (domainParts.length < 2 ||
          !_validExtensions.contains(domainParts.last.toLowerCase())) {
        return 'Please enter a valid email address';
      }
    }

    if (!emailRegex.hasMatch(trimmed)) {
      return 'Please enter a valid email address';
    }

    if (_disposableDomains.contains(domainPart.toLowerCase())) {
      return 'Please enter a valid email address';
    }

    return null;
  }

  static String? validatePassword(String? value, {bool required = true}) {
    final pass = value ?? '';
    if (pass.isEmpty) {
      return required ? 'Password is required' : null;
    }
    if (pass.length > maxPasswordLength) return 'Too long data not accept';
    if (pass.length < 8 ||
        !RegExp(r'[A-Z]').hasMatch(pass) ||
        !RegExp(r'[a-z]').hasMatch(pass) ||
        !RegExp(r'\d').hasMatch(pass)) {
      return 'Password must be 8+ chars with uppercase and number';
    }
    return null;
  }

  static String? validateLoginPassword(String? value) {
    final pass = value ?? '';
    if (pass.isEmpty) return 'Password is required';
    if (pass.length > maxPasswordLength) return 'Too long data not accept';
    return null;
  }

  static String? validateName(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Full name is required';
    if (trimmed.length > maxNameLength) return 'Too long data not accept';
    if (!nameRegex.hasMatch(trimmed)) {
      return 'Please enter a valid full name';
    }
    if (hasExcessiveRepeatedChars(trimmed)) {
      return 'Name contains excessive repeated characters';
    }
    return null;
  }

  static String? validatePhone(String? value) {
    final digits = digitsOnly((value ?? '').trim());
    if (digits.isEmpty) return 'Phone number is required';
    if (!phoneRegex.hasMatch(digits)) {
      return 'Enter a valid 10-digit phone number';
    }
    return null;
  }

  static String? validateOtp(String? value) {
    final otp = digitsOnly((value ?? '').trim());
    if (otp.length != otpLength) return 'Enter the 6-digit OTP';
    return null;
  }

  static String? validateSubject(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Subject is required';
    if (trimmed.length < minSubjectLength) {
      return 'Subject must be at least $minSubjectLength characters';
    }
    if (trimmed.length > maxSubjectLength) {
      return 'Subject should be at most $maxSubjectLength characters';
    }
    if (isOnlySpecialCharacters(trimmed)) {
      return 'Subject cannot contain only special characters';
    }
    if (hasExcessiveRepeatedChars(trimmed)) {
      return 'Subject contains excessive repeated characters';
    }
    return null;
  }

  static String? validateTicketMessage(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Description is required';
    if (trimmed.length < minTicketMessageLength) {
      return 'Description must be at least $minTicketMessageLength characters';
    }
    if (trimmed.length > maxTicketDescriptionLength) {
      return 'Description should be at most $maxTicketDescriptionLength characters';
    }
    if (hasExcessiveRepeatedChars(trimmed)) {
      return 'Description contains excessive repeated characters';
    }
    return null;
  }

  static String? validateChatMessage(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Message cannot be empty';
    if (trimmed.length > maxChatMessageLength) {
      return 'Message is too long (max $maxChatMessageLength characters)';
    }
    return null;
  }

  static String? validateReviewComment(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.length > maxReviewCommentLength) {
      return 'Comment should be at most $maxReviewCommentLength characters';
    }
    if (hasExcessiveRepeatedChars(trimmed)) {
      return 'Comment contains excessive repeated characters';
    }
    return null;
  }

  static String? validateLicensePlate(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Registration number is required';
    final normalized = trimmed.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    if (!licensePlateCompactRegex.hasMatch(normalized)) {
      return 'Invalid registration number';
    }
    return null;
  }

  static String? validateVehicleYear(String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return 'Year is required';
    final year = int.tryParse(trimmed);
    final currentYear = DateTime.now().year;
    if (year == null || year < 1980 || year > currentYear + 1) {
      return 'Enter a valid year';
    }
    return null;
  }

  static String? validateVehicleTextField(String? value, {required = true}) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) return required ? 'Required' : null;
    if (trimmed.length > maxVehicleFieldLength) {
      return 'Must be at most $maxVehicleFieldLength characters';
    }
    if (hasExcessiveRepeatedChars(trimmed)) {
      return 'Contains excessive repeated characters';
    }
    return null;
  }
}
