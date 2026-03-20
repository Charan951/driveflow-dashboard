import '../core/api_client.dart';

class DocumentData {
  final String id;
  final String name;
  final String type;
  final String url;
  final String owner;
  final String entityName;
  final String entityType;
  final String entityId;
  final String? vehicleId;
  final String date;
  final String? expiryDate;
  final bool isInvoice;

  DocumentData({
    required this.id,
    required this.name,
    required this.type,
    required this.url,
    required this.owner,
    required this.entityName,
    required this.entityType,
    required this.entityId,
    this.vehicleId,
    required this.date,
    this.expiryDate,
    this.isInvoice = false,
  });

  factory DocumentData.fromJson(Map<String, dynamic> json) {
    return DocumentData(
      id: (json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      url: (json['url'] ?? '').toString(),
      owner: (json['owner'] ?? '').toString(),
      entityName: (json['entityName'] ?? '').toString(),
      entityType: (json['entityType'] ?? '').toString(),
      entityId: (json['entityId'] ?? '').toString(),
      vehicleId: json['vehicleId']?.toString(),
      date: (json['date'] ?? '').toString(),
      expiryDate: json['expiryDate']?.toString(),
      isInvoice: json['isInvoice'] == true,
    );
  }
}

class DocumentService {
  final ApiClient _api = ApiClient();

  Future<List<DocumentData>> getAllDocuments() async {
    final res = await _api.getAny('/documents');
    final items = <DocumentData>[];
    if (res is List) {
      for (final e in res) {
        if (e is Map<String, dynamic>) {
          items.add(DocumentData.fromJson(e));
        } else if (e is Map) {
          items.add(DocumentData.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return items;
  }
}
