import 'package:flutter/services.dart';

/// Normalizes a pasted/typed Indian mobile number: strips spaces, dashes,
/// parentheses, and any country-code prefix, keeping only the last 10
/// digits. Leaves email input untouched (any letters/`@` pass through
/// unchanged) so it's safe to use on a mixed "email or mobile number"
/// field.
///
/// e.g. pasting "+91 98765-43210" or "(91) 98765 43210" both become
/// "9876543210".
class IndianPhoneOrEmailInputFormatter extends TextInputFormatter {
  static final _lettersOrAt = RegExp(r'[a-zA-Z@]');
  static final _nonDigits = RegExp(r'[^0-9]');

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text;
    if (text.isEmpty || _lettersOrAt.hasMatch(text)) return newValue;

    final digits = text.replaceAll(_nonDigits, '');
    final normalized = digits.length > 10
        ? digits.substring(digits.length - 10)
        : digits;

    if (normalized == text) return newValue;
    return TextEditingValue(
      text: normalized,
      selection: TextSelection.collapsed(offset: normalized.length),
    );
  }
}
