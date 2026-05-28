import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/env.dart';

class ServiceModel {
  final String id;
  final String name;
  final String description;
  final num price;
  final num duration;
  final String category;
  final String vehicleType;
  final String? image;
  final List<String> features;
  final bool isQuickService;
  final String? createdAt;
  final String? updatedAt;

  ServiceModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.duration,
    required this.category,
    required this.vehicleType,
    this.image,
    this.features = const [],
    this.isQuickService = false,
    this.createdAt,
    this.updatedAt,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    final featuresList = json['features'] as List?;
    return ServiceModel(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: (json['price'] as num?) ?? 0,
      duration: (json['duration'] as num?) ?? 0,
      category: json['category']?.toString() ?? '',
      vehicleType: json['vehicleType']?.toString() ?? '',
      image: json['image']?.toString(),
      features: featuresList?.map((e) => e.toString()).toList() ?? [],
      isQuickService: json['isQuickService'] as bool? ?? false,
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'description': description,
      'price': price,
      'duration': duration,
      'category': category,
      'vehicleType': vehicleType,
      'image': image,
      'features': features,
      'isQuickService': isQuickService,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class ServiceService {
  final ApiClient _api = ApiClient();

  Future<List<ServiceModel>> getServices({
    String? vehicleType,
    String? category,
    String? service,
    bool? isQuickService,
  }) async {
    final queryParams = <String>[];
    if (vehicleType != null) {
      queryParams.add('vehicleType=$vehicleType');
    }
    if (category != null) {
      queryParams.add('category=$category');
    }
    if (service != null) {
      queryParams.add('service=$service');
    }
    if (isQuickService != null) {
      queryParams.add('isQuickService=$isQuickService');
    }

    final path = queryParams.isNotEmpty
        ? '${ApiEndpoints.services}?${queryParams.join('&')}'
        : ApiEndpoints.services;

    final data = await _api.getAny(path);
    final items = <ServiceModel>[];

    if (data is List) {
      for (final e in data) {
        try {
          if (e is Map<String, dynamic>) {
            items.add(ServiceModel.fromJson(e));
          } else if (e is Map) {
            items.add(ServiceModel.fromJson(Map<String, dynamic>.from(e)));
          }
        } catch (err) {
          debugPrint('Error parsing service: $err');
        }
      }
      return items;
    }
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<ServiceModel> getServiceById(String id) async {
    final data = await _api.getJson(ApiEndpoints.serviceById(id));
    return ServiceModel.fromJson(data);
  }

  Future<ServiceModel> createService({
    required String name,
    required String description,
    required num price,
    required num duration,
    required String category,
    required String vehicleType,
    String? image,
    List<String> features = const [],
    bool isQuickService = false,
  }) async {
    final data = await _api.postJson(
      ApiEndpoints.services,
      body: {
        'name': name,
        'description': description,
        'price': price,
        'duration': duration,
        'category': category,
        'vehicleType': vehicleType,
        'image': image,
        'features': features,
        'isQuickService': isQuickService,
      },
    );
    return ServiceModel.fromJson(data);
  }

  Future<ServiceModel> updateService(
    String id, {
    String? name,
    String? description,
    num? price,
    num? duration,
    String? category,
    String? vehicleType,
    String? image,
    List<String>? features,
    bool? isQuickService,
  }) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (description != null) body['description'] = description;
    if (price != null) body['price'] = price;
    if (duration != null) body['duration'] = duration;
    if (category != null) body['category'] = category;
    if (vehicleType != null) body['vehicleType'] = vehicleType;
    if (image != null) body['image'] = image;
    if (features != null) body['features'] = features;
    if (isQuickService != null) body['isQuickService'] = isQuickService;

    final data = await _api.putJson(ApiEndpoints.serviceById(id), body: body);
    return ServiceModel.fromJson(data);
  }

  Future<void> deleteService(String id) async {
    await _api.deleteAny(ApiEndpoints.serviceById(id));
  }
}
