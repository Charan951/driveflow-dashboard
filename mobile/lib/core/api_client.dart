import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'env.dart';
import 'storage.dart';
import '../widgets/app_toast.dart';

// Top-level function for background JSON decoding
dynamic _parseJson(String text) => jsonDecode(text);

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final bool isNetworkError;

  ApiException({
    required this.statusCode,
    required this.message,
    this.isNetworkError = false,
  });

  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _client = http.Client();
  static const Duration _timeout = Duration(seconds: 30);
  static const int _maxRetries = 3;

  static DateTime? _lastNetworkToastAt;
  static const Duration _networkToastCooldown = Duration(seconds: 4);

  // A `SocketException` only means *this* connection attempt failed — it
  // fires identically whether the device is truly offline or the API host
  // is just unreachable (wrong/unreachable dev URL, server down, etc.).
  // Checking the device's actual radio state lets us tell those apart
  // instead of always claiming "no internet" when it might just be the
  // configured API host that's unreachable.
  static Future<bool> _deviceHasConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      return results.any((r) => r != ConnectivityResult.none);
    } catch (_) {
      // If the plugin itself fails, don't let that override the real error.
      return true;
    }
  }

  // Only for true transport-level failures (no response reached us at
  // all) — structured 4xx/5xx API responses are left to each caller's own
  // error handling, so nothing double-toasts.
  static void _notifyNetworkError(String message) {
    final now = DateTime.now();
    if (_lastNetworkToastAt != null &&
        now.difference(_lastNetworkToastAt!) < _networkToastCooldown) {
      return;
    }
    _lastNetworkToastAt = now;
    AppToast.showError(message);
  }

  Future<dynamic> _decodeBody(http.Response res) async {
    if (res.body.isEmpty) {
      if (res.statusCode >= 400) {
        throw ApiException(
          statusCode: res.statusCode,
          message: 'Request failed with status: ${res.statusCode}',
        );
      }
      return null;
    }

    dynamic decoded;
    try {
      // Offload large JSON decoding to a background isolate to prevent UI jank.
      // 50KB is a reasonable threshold where the benefit of offloading
      // outweighs the isolate communication overhead.
      if (res.body.length > 50 * 1024) {
        decoded = await compute(_parseJson, res.body);
      } else {
        decoded = jsonDecode(res.body);
      }
    } on FormatException {
      final status = res.statusCode;
      final code = status >= 400 ? status : 500;

      String errorMessage = 'Unexpected response format from server';
      if (res.body.contains('<html>') || res.body.contains('<!DOCTYPE html>')) {
        if (status == 405) {
          errorMessage =
              'Method Not Allowed (405). Possible server misconfiguration.';
        } else if (status == 502) {
          errorMessage = 'Bad Gateway (502). The server might be down.';
        } else if (status == 504) {
          errorMessage =
              'Gateway Timeout (504). Server is taking too long. Please try again.';
        } else if (status == 404) {
          errorMessage = 'API endpoint not found (404).';
        } else if (status == 503) {
          errorMessage =
              'Service Unavailable (503). Server is under maintenance.';
        } else {
          errorMessage =
              'Server error ($status). Received HTML instead of JSON.';
        }
      }

      throw ApiException(statusCode: code, message: errorMessage);
    }

    if (res.statusCode >= 400) {
      final message = decoded is Map && decoded['message'] != null
          ? decoded['message'].toString()
          : 'Request failed (${res.statusCode})';
      throw ApiException(statusCode: res.statusCode, message: message);
    }
    return decoded;
  }

  Future<dynamic> _safeRequest(
    Future<http.Response> Function() request, {
    bool canRetry = false,
  }) async {
    int attempts = 0;
    while (true) {
      attempts++;
      try {
        final res = await request().timeout(_timeout);
        return _decodeBody(res);
      } on TimeoutException {
        if (canRetry && attempts <= _maxRetries) continue;
        const message =
            'Request timed out. Please check your internet connection.';
        _notifyNetworkError(message);
        throw ApiException(
          statusCode: 408,
          message: message,
          isNetworkError: true,
        );
      } on SocketException {
        if (canRetry && attempts <= _maxRetries) continue;
        final message = await _deviceHasConnectivity()
            ? 'Unable to reach the server. Please try again later.'
            : 'No internet connection. Please try again later.';
        _notifyNetworkError(message);
        throw ApiException(
          statusCode: 0,
          message: message,
          isNetworkError: true,
        );
      } on http.ClientException {
        if (canRetry && attempts <= _maxRetries) continue;
        final message = await _deviceHasConnectivity()
            ? 'Unable to reach the server. Please try again later.'
            : 'Connection issue. Please check your network.';
        _notifyNetworkError(message);
        throw ApiException(
          statusCode: 0,
          message: message,
          isNetworkError: true,
        );
      } catch (e) {
        if (e is ApiException) rethrow;
        throw ApiException(
          statusCode: 500,
          message: 'An unexpected error occurred: $e',
        );
      }
    }
  }

  Future<dynamic> getAny(String path) async {
    final token = await AppStorage().getToken();
    final headers = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'mobile',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.get(uri, headers: headers),
      canRetry: true,
    );
  }

  Future<Map<String, dynamic>> getJson(String path) async {
    final data = await getAny(path);
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<dynamic> postAny(String path, {Map<String, dynamic>? body}) async {
    final token = await AppStorage().getToken();
    final headers = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'mobile',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.post(uri, headers: headers, body: jsonEncode(body ?? {})),
      canRetry: true,
    );
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final data = await postAny(path, body: body);
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<dynamic> putAny(String path, {Map<String, dynamic>? body}) async {
    final token = await AppStorage().getToken();
    final headers = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'mobile',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.put(uri, headers: headers, body: jsonEncode(body ?? {})),
      canRetry: true,
    );
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final data = await putAny(path, body: body);
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<dynamic> deleteAny(String path, {Map<String, dynamic>? body}) async {
    final token = await AppStorage().getToken();
    final headers = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'mobile',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.delete(uri, headers: headers, body: jsonEncode(body ?? {})),
      canRetry: true,
    );
  }
}
