import '../core/api_client.dart';
import '../core/env.dart';

class SupportTicket {
  final String id;
  final String subject;
  final String status;
  final String category;
  final String priority;
  final List<TicketMessage> messages;
  final DateTime createdAt;

  SupportTicket({
    required this.id,
    required this.subject,
    required this.status,
    required this.category,
    required this.priority,
    required this.messages,
    required this.createdAt,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      subject: (json['subject'] ?? '').toString(),
      status: (json['status'] ?? 'Open').toString(),
      category: (json['category'] ?? 'General').toString(),
      priority: (json['priority'] ?? 'Medium').toString(),
      messages: (json['messages'] as List? ?? [])
          .map((e) => TicketMessage.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'].toString())
          : DateTime.now(),
    );
  }
}

class TicketMessage {
  final String senderId;
  final String senderName;
  final String senderRole;
  final String message;
  final DateTime createdAt;

  TicketMessage({
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    required this.message,
    required this.createdAt,
  });

  factory TicketMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'];
    String sId = '';
    String sName = '';
    String sRole = '';

    if (sender is Map) {
      sId = (sender['_id'] ?? sender['id'] ?? '').toString();
      sName = (sender['name'] ?? '').toString();
      sRole = (sender['role'] ?? json['role'] ?? 'customer').toString();
    } else {
      sId = sender.toString();
      sRole = (json['role'] ?? 'customer').toString();
    }

    return TicketMessage(
      senderId: sId,
      senderName: sName,
      senderRole: sRole,
      message: (json['message'] ?? '').toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'].toString())
          : DateTime.now(),
    );
  }
}

class TicketService {
  final ApiClient _api = ApiClient();

  Future<List<SupportTicket>> listMyTickets() async {
    final res = await _api.getAny(ApiEndpoints.tickets);
    if (res is List) {
      return res
          .map((e) => SupportTicket.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return [];
  }

  Future<SupportTicket> createTicket({
    required String subject,
    required String message,
    String category = 'General',
    String priority = 'Medium',
  }) async {
    final res = await _api.postJson(
      ApiEndpoints.tickets,
      body: {
        'subject': subject,
        'message': message,
        'category': category,
        'priority': priority,
      },
    );
    return SupportTicket.fromJson(res);
  }

  Future<SupportTicket> addMessage(String ticketId, String message) async {
    final res = await _api.postJson(
      ApiEndpoints.ticketMessages(ticketId),
      body: {'message': message},
    );
    return SupportTicket.fromJson(res);
  }
}
