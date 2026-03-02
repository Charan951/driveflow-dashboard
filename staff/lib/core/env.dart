import 'dart:io';

import 'package:flutter/foundation.dart';

class Env {
  static const bool useProduction = true;

  static const String mapTileUrlTemplate = String.fromEnvironment(
    'MAP_TILE_URL_TEMPLATE',
    defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  );

  static const List<String> mapTileSubdomains = <String>['a', 'b', 'c'];

  static String get localBaseUrl {
    const fromEnv = String.fromEnvironment('LOCAL_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:5000';
    return 'http://localhost:5000';
  }

  static String get productionBaseUrl {
    return 'https://carb.speshwayhrms.com';
  }

  static String get baseUrl {
    return useProduction ? productionBaseUrl : localBaseUrl;
  }

  static String get apiBaseUrl =>
      baseUrl.endsWith('/api') ? baseUrl : '$baseUrl/api';
}

class ApiEndpoints {
  static const String authLogin = '/auth/login';
  static const String authProfile = '/users/profile';
  static const String usersMe = '/users/me';
  static const String usersOnlineStatus = '/users/online-status';
  static const String myBookings = '/bookings/mybookings';
  static const String trackingUser = '/tracking/user';
  static String bookingById(String id) => '/bookings/$id';
  static String bookingStatus(String id) => '/bookings/$id/status';
  static String bookingGenerateOtp(String id) => '/bookings/$id/generate-otp';
  static String bookingVerifyOtp(String id) => '/bookings/$id/verify-otp';
  static String bookingDetails(String id) => '/bookings/$id/details';
  static const String uploadMultiple = '/upload/multiple';
}
