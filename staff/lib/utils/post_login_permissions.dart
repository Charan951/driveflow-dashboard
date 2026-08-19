import '../services/notification_service.dart';

/// OS permission prompts that must not appear on splash, onboarding, or login.
class PostLoginPermissions {
  static bool _requestedThisSession = false;

  static Future<void> request() async {
    if (_requestedThisSession) return;
    _requestedThisSession = true;
    await NotificationService().requestPermissions();
  }
}
