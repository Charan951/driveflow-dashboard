import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'env.dart';
import 'storage.dart';

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
  static const Duration _timeout = Duration(seconds: 12);
  static const int _maxRetries = 2;

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
        throw ApiException(
          statusCode: 408,
          message: 'Request timed out. Please check your internet connection.',
          isNetworkError: true,
        );
      } on SocketException {
        if (canRetry && attempts <= _maxRetries) continue;
        throw ApiException(
          statusCode: 0,
          message: 'No internet connection. Please try again later.',
          isNetworkError: true,
        );
      } on http.ClientException {
        if (canRetry && attempts <= _maxRetries) continue;
        throw ApiException(
          statusCode: 0,
          message: 'Connection issue. Please check your network.',
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
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.post(uri, headers: headers, body: jsonEncode(body ?? {})),
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
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.put(uri, headers: headers, body: jsonEncode(body ?? {})),
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
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    return _safeRequest(
      () => _client.delete(uri, headers: headers, body: jsonEncode(body ?? {})),
    );
  }
}
