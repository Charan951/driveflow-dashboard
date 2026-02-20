import '../core/api_client.dart';

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      type: (json['type'] ?? 'info').toString(),
      isRead: json['isRead'] == true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class NotificationService {
  final ApiClient _api = ApiClient();

  Future<List<NotificationItem>> listMyNotifications() async {
    final data = await _api.getAny('/notifications/my');
    if (data is List) {
      return data
          .map((e) => NotificationItem.fromJson(
                e is Map<String, dynamic>
                    ? e
                    : Map<String, dynamic>.from(e as Map),
              ))
          .toList();
    }
    return [];
  }

  Future<void> markAsRead(String id) async {
    if (id.isEmpty) return;
    await _api.putAny('/notifications/$id/read');
  }
}

