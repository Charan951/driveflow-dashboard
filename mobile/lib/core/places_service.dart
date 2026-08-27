import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

import 'api_client.dart';

/// One text-search result from Google Places Autocomplete.
class PlacePrediction {
  final String placeId;
  final String description;

  const PlacePrediction({required this.placeId, required this.description});
}

/// Lat/lng + formatted address resolved from a [PlacePrediction] via the
/// Place Details endpoint.
class PlaceDetails {
  final LatLng location;
  final String formattedAddress;

  const PlaceDetails({required this.location, required this.formattedAddress});
}

/// Thrown when the place-search request fails — kept distinct from a plain
/// empty result so callers can surface it instead of silently showing
/// nothing.
class PlacesApiException implements Exception {
  final String status;
  final String? message;

  const PlacesApiException(this.status, this.message);

  @override
  String toString() => 'PlacesApiException($status${message != null ? ': $message' : ''})';
}

/// Place search (business/POI names, matching what a user sees labelled on
/// Google Maps) via the backend's Google Places proxy — the API key lives
/// server-side (backend/.env: GOOGLE_PLACES_API_KEY), never shipped inside
/// this app, so it can't be pulled out of a decompiled APK/IPA.
class PlacesService {
  PlacesService._();

  static final ApiClient _api = ApiClient();
  static final Random _random = Random.secure();

  /// A session token groups one search-and-select flow into a single
  /// billing session (Google charges per session instead of per keystroke).
  /// Call [newSessionToken] when a search box is opened / cleared, and
  /// reuse the same token across autocomplete calls until a place is
  /// picked via [getPlaceDetails].
  static String newSessionToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return List.generate(
      24,
      (_) => chars[_random.nextInt(chars.length)],
    ).join();
  }

  /// Text-search predictions for [query], optionally biased toward
  /// [near] (e.g. the user's current location) so nearby places rank
  /// higher.
  static Future<List<PlacePrediction>> autocomplete(
    String query, {
    required String sessionToken,
    LatLng? near,
  }) async {
    try {
      final qs = Uri(
        queryParameters: {
          'q': query,
          'sessiontoken': sessionToken,
          if (near != null) 'lat': near.latitude.toString(),
          if (near != null) 'lng': near.longitude.toString(),
        },
      ).query;
      final res = await _api.getJson('/tracking/places-autocomplete?$qs');
      final predictions = res['predictions'];
      if (predictions is! List) return [];

      return predictions
          .whereType<Map>()
          .map(
            (p) => PlacePrediction(
              placeId: p['place_id']?.toString() ?? '',
              description: p['description']?.toString() ?? '',
            ),
          )
          .where((p) => p.placeId.isNotEmpty)
          .toList();
    } on ApiException catch (e) {
      debugPrint('[Places] autocomplete failed (${e.statusCode}): ${e.message}');
      throw PlacesApiException(e.statusCode.toString(), e.message);
    }
  }

  /// Resolves a prediction's [placeId] to a lat/lng + formatted address.
  /// Pass the same [sessionToken] used for the autocomplete calls that led
  /// to this pick — this closes out the billing session.
  static Future<PlaceDetails?> getPlaceDetails(
    String placeId, {
    required String sessionToken,
  }) async {
    try {
      final qs = Uri(
        queryParameters: {'place_id': placeId, 'sessiontoken': sessionToken},
      ).query;
      final res = await _api.getJson('/tracking/place-details?$qs');
      final lat = (res['lat'] as num?)?.toDouble();
      final lng = (res['lng'] as num?)?.toDouble();
      if (lat == null || lng == null) return null;

      return PlaceDetails(
        location: LatLng(lat, lng),
        formattedAddress: res['address']?.toString() ?? '',
      );
    } on ApiException catch (e) {
      debugPrint('[Places] details failed (${e.statusCode}): ${e.message}');
      return null;
    }
  }
}
