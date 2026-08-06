import '../core/api_client.dart';
import '../core/env.dart';

class ContactDetails {
  final String address;
  final String mobileNumber;
  final String email;

  const ContactDetails({
    required this.address,
    required this.mobileNumber,
    required this.email,
  });

  factory ContactDetails.fromJson(Map<String, dynamic> json) {
    return ContactDetails(
      address: (json['address'] ?? '').toString(),
      mobileNumber: (json['mobileNumber'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
    );
  }
}

/// Fetches the site-wide contact details (phone/email/address) that the
/// admin manages from the "Edit Website" hero/contact settings page.
class ContactDetailsService {
  final ApiClient _api = ApiClient();

  static ContactDetails? _cached;

  Future<ContactDetails?> getContactDetails({bool forceRefresh = false}) async {
    if (!forceRefresh && _cached != null) return _cached;
    final res = await _api.getJson(ApiEndpoints.hero);
    final data = res['contactDetails'];
    if (data is Map<String, dynamic>) {
      _cached = ContactDetails.fromJson(data);
      return _cached;
    }
    return null;
  }
}
