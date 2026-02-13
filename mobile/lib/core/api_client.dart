import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'env.dart';
import 'storage.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final http.Client _client = http.Client();
  static const Duration _timeout = Duration(seconds: 12);

  dynamic _decodeBody(http.Response res) {
    final rawBody = res.body.isEmpty ? 'null' : res.body;
    final decoded = jsonDecode(rawBody);
    if (res.statusCode >= 400) {
      final message = decoded is Map && decoded['message'] != null
          ? decoded['message'].toString()
          : 'Request failed';
      throw ApiException(statusCode: res.statusCode, message: message);
    }
    return decoded;
  }

  Future<dynamic> getAny(String path) async {
    final token = await AppStorage().getToken();
    final headers = {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    try {
      final res = await _client.get(uri, headers: headers).timeout(_timeout);
      return _decodeBody(res);
    } on TimeoutException {
      throw ApiException(statusCode: 408, message: 'Request timed out');
    }
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
    try {
      final res = await _client
          .post(uri, headers: headers, body: jsonEncode(body ?? {}))
          .timeout(_timeout);
      return _decodeBody(res);
    } on TimeoutException {
      throw ApiException(statusCode: 408, message: 'Request timed out');
    }
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
}
