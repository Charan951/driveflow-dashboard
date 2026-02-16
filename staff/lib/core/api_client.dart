import 'dart:async';
import 'dart:convert';
import 'dart:io';

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

  Future<dynamic> putAny(String path, {Map<String, dynamic>? body}) async {
    final token = await AppStorage().getToken();
    final headers = {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    try {
      final res = await _client
          .put(uri, headers: headers, body: jsonEncode(body ?? {}))
          .timeout(_timeout);
      return _decodeBody(res);
    } on TimeoutException {
      throw ApiException(statusCode: 408, message: 'Request timed out');
    }
  }

  Future<List<dynamic>> uploadFiles(
    String path,
    List<File> files, {
    String fieldName = 'files',
  }) async {
    final token = await AppStorage().getToken();
    final uri = Uri.parse('${Env.apiBaseUrl}$path');
    final request = http.MultipartRequest('POST', uri);
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    for (final file in files) {
      final stream = http.ByteStream(file.openRead());
      final length = await file.length();
      request.files.add(
        http.MultipartFile(
          fieldName,
          stream,
          length,
          filename: file.path.split(Platform.pathSeparator).last,
        ),
      );
    }
    final streamed = await request.send().timeout(_timeout);
    final res = await http.Response.fromStream(streamed);
    final decoded = _decodeBody(res);
    if (decoded is List) return decoded;
    if (decoded is Map && decoded['files'] is List) {
      return decoded['files'] as List;
    }
    throw ApiException(statusCode: 500, message: 'Unexpected upload response');
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

  Future<Map<String, dynamic>> putJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final data = await putAny(path, body: body);
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }
}
