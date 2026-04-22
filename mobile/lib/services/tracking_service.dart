import '../core/api_client.dart';

class LocationPoint {
  final double lat;
  final double lng;
  final String updatedAt;
  final String? address;

  LocationPoint({
    required this.lat,
    required this.lng,
    required this.updatedAt,
    this.address,
  });

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    return LocationPoint(
      lat: (json['lat'] ?? 0).toDouble(),
      lng: (json['lng'] ?? 0).toDouble(),
      updatedAt: (json['updatedAt'] ?? '').toString(),
      address: json['address']?.toString(),
    );
  }
}

class TrackedStaff {
  final String id;
  final String name;
  final String? role;
  final String? subRole;
  final String? category;
  final String? phone;
  final String email;
  final bool isOnline;
  final bool isShopOpen;
  final String? lastSeen;
  final LocationPoint? location;

  TrackedStaff({
    required this.id,
    required this.name,
    this.role,
    this.subRole,
    this.category,
    this.phone,
    required this.email,
    this.isOnline = false,
    this.isShopOpen = false,
    this.lastSeen,
    this.location,
  });

  factory TrackedStaff.fromJson(Map<String, dynamic> json) {
    return TrackedStaff(
      id: (json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      role: json['role']?.toString(),
      subRole: json['subRole']?.toString(),
      category: json['category']?.toString(),
      phone: json['phone']?.toString(),
      email: (json['email'] ?? '').toString(),
      isOnline: json['isOnline'] == true,
      isShopOpen: json['isShopOpen'] == true,
      lastSeen: json['lastSeen']?.toString(),
      location: json['location'] is Map
          ? LocationPoint.fromJson(Map<String, dynamic>.from(json['location']))
          : null,
    );
  }
}

class ETAResponse {
  final String provider;
  final int durationSec;
  final int distanceMeters;
  final String textDuration;
  final String textDistance;
  final String arrivalTimeIso;

  ETAResponse({
    required this.provider,
    required this.durationSec,
    required this.distanceMeters,
    required this.textDuration,
    required this.textDistance,
    required this.arrivalTimeIso,
  });

  factory ETAResponse.fromJson(Map<String, dynamic> json) {
    return ETAResponse(
      provider: (json['provider'] ?? '').toString(),
      durationSec: (json['durationSec'] ?? 0).toInt(),
      distanceMeters: (json['distanceMeters'] ?? 0).toInt(),
      textDuration: (json['textDuration'] ?? '').toString(),
      textDistance: (json['textDistance'] ?? '').toString(),
      arrivalTimeIso: (json['arrivalTimeIso'] ?? '').toString(),
    );
  }
}

class TrackingService {
  final ApiClient _api = ApiClient();

  Future<Map<String, List<dynamic>>> getLiveLocations() async {
    final res = await _api.getAny('/tracking');
    final staff = <TrackedStaff>[];
    final vehicles = <dynamic>[];
    final merchants = <TrackedStaff>[];

    if (res is Map) {
      if (res['staff'] is List) {
        for (final e in res['staff']) {
          staff.add(TrackedStaff.fromJson(Map<String, dynamic>.from(e)));
        }
      }
      if (res['merchants'] is List) {
        for (final e in res['merchants']) {
          merchants.add(TrackedStaff.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    return {'staff': staff, 'merchants': merchants, 'vehicles': vehicles};
  }

  Future<Map<String, dynamic>> updateMyLocation(
    double lat,
    double lng, {
    String? address,
    String? bookingId,
  }) async {
    return await _api.putAny(
      '/tracking/user',
      body: {
        'lat': lat,
        'lng': lng,
        'address': address,
        'bookingId': bookingId,
      },
    );
  }

  Future<Map<String, dynamic>> updateOnlineStatus(bool isOnline) async {
    return await _api.putAny(
      '/users/online-status',
      body: {'isOnline': isOnline},
    );
  }

  Future<ETAResponse> getETA(
    double originLat,
    double originLng,
    double destLat,
    double destLng,
  ) async {
    final res = await _api.getAny(
      '/tracking/eta?originLat=$originLat&originLng=$originLng&destLat=$destLat&destLng=$destLng',
    );
    if (res is Map<String, dynamic>) return ETAResponse.fromJson(res);
    if (res is Map) return ETAResponse.fromJson(Map<String, dynamic>.from(res));
    throw Exception('Failed to get ETA');
  }
}
