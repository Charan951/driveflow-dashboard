import 'user.dart';

class Message {
  final String id;
  final String bookingId;
  final MessageSender sender;
  final String text;
  final String type;
  final DateTime createdAt;
  final ApprovalInfo? approval;

  Message({
    required this.id,
    required this.bookingId,
    required this.sender,
    required this.text,
    this.type = 'text',
    required this.createdAt,
    this.approval,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: (json['_id'] ?? '').toString(),
      bookingId: (json['bookingId'] ?? '').toString(),
      sender: MessageSender.fromJson(json['sender']),
      text: (json['text'] ?? '').toString(),
      type: (json['type'] ?? 'text').toString(),
      createdAt: DateTime.parse(json['createdAt'] ?? json['timestamp'] ?? DateTime.now().toIso8601String()).toLocal(),
      approval: json['approval'] != null ? ApprovalInfo.fromJson(json['approval']) : null,
    );
  }
}

class MessageSender {
  final String id;
  final String name;
  final String role;

  MessageSender({
    required this.id,
    required this.name,
    required this.role,
  });

  factory MessageSender.fromJson(dynamic json) {
    if (json is String) {
      return MessageSender(id: json, name: 'User', role: 'unknown');
    }
    final map = json as Map<String, dynamic>;
    return MessageSender(
      id: (map['_id'] ?? '').toString(),
      name: (map['name'] ?? 'User').toString(),
      role: (map['role'] ?? 'unknown').toString(),
    );
  }
}

class ApprovalInfo {
  final String? partName;
  final num? amount;
  final String status;
  final String? approvalId;
  final String? image;

  ApprovalInfo({
    this.partName,
    this.amount,
    this.status = 'pending',
    this.approvalId,
    this.image,
  });

  factory ApprovalInfo.fromJson(Map<String, dynamic> json) {
    return ApprovalInfo(
      partName: json['partName']?.toString(),
      amount: json['amount'] as num?,
      status: (json['status'] ?? 'pending').toString(),
      approvalId: json['approvalId']?.toString(),
      image: json['image']?.toString(),
    );
  }
}
