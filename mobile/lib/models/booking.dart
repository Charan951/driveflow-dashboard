import 'service.dart';
import 'vehicle.dart';

class Booking {
  final String id;
  final String status;
  final String date;
  final num totalAmount;
  final Vehicle? vehicle;
  final List<ServiceItem> services;

  Booking({
    required this.id,
    required this.status,
    required this.date,
    required this.totalAmount,
    required this.vehicle,
    required this.services,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    Vehicle? vehicle;
    final v = json['vehicle'];
    if (v is Map<String, dynamic>) {
      vehicle = Vehicle.fromJson(v);
    } else if (v is Map) {
      vehicle = Vehicle.fromJson(Map<String, dynamic>.from(v));
    }

    final services = <ServiceItem>[];
    final s = json['services'];
    if (s is List) {
      for (final e in s) {
        if (e is Map<String, dynamic>) {
          services.add(ServiceItem.fromJson(e));
        } else if (e is Map) {
          services.add(ServiceItem.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    return Booking(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      totalAmount: (json['totalAmount'] ?? 0) as num,
      vehicle: vehicle,
      services: services,
    );
  }
}
