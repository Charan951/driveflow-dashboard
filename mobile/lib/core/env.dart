import 'dart:io';

import 'package:flutter/foundation.dart';

class Env {
  static const bool useProduction = false;

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

  static String get razorpayKey => 'rzp_test_YourKeyHere'; // TODO: Replace with real key
}

class ApiEndpoints {
  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String usersMe = '/users/me';
  static const String services = '/services';
  static const String vehicles = '/vehicles';
  static const String fetchVehicleDetails = '/vehicles/fetch-details';
  static const String bookings = '/bookings';
  static const String myBookings = '/bookings/mybookings';
  static String bookingById(String id) => '/bookings/$id';
  static String createOrder(String id) => '/bookings/$id/create-order';
  static String verifyPayment(String id) => '/bookings/$id/verify-payment';
}
