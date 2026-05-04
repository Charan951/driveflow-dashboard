import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Matches [backend/models/Vehicle.js] `vehicleSchema.methods.calculateHealth`.
/// Progress uses days since last service vs `fixedDays`, and km since last
/// service vs `fixedKm`; the displayed value is the max of the two (capped
/// at 100), rounded — same as the API after `calculateHealth()` runs.
int computeVehicleHealthPercent(
  Map<String, dynamic>? indicator,
  num? vehicleMileage,
) {
  if (indicator == null || indicator.isEmpty) return 0;

  final lastServiceDateRaw = indicator['lastServiceDate'];
  if (lastServiceDateRaw == null) return 0;

  final parsed = DateTime.tryParse(lastServiceDateRaw.toString());
  if (parsed == null) return 0;

  final local = parsed.toLocal();
  final lastDateMidnight = DateTime(local.year, local.month, local.day);
  final now = DateTime.now();
  final nowMidnight = DateTime(now.year, now.month, now.day);
  final diffDays = (nowMidnight.difference(lastDateMidnight).inDays).abs();

  final lastKm = switch (indicator['lastServiceKm']) {
    num n => n.toDouble(),
    _ => 0.0,
  };
  final currentKm = (vehicleMileage ?? 0).toDouble();
  final diffKm = math.max(0.0, currentKm - lastKm);

  final fixedKm = switch (indicator['fixedKm']) {
    num n => n.toDouble(),
    _ => 0.0,
  };
  final fixedDays = switch (indicator['fixedDays']) {
    num n => n.toDouble(),
    _ => 0.0,
  };

  final progressFromDays = fixedDays > 0
      ? math.min(100.0, (diffDays / fixedDays) * 100.0)
      : 0.0;
  final progressFromKm = fixedKm > 0
      ? math.min(100.0, (diffKm / fixedKm) * 100.0)
      : 0.0;

  return math.min(
    100,
    math.max(0, math.max(progressFromDays, progressFromKm).round()),
  );
}

/// Same color bands as [frontend/src/components/VehicleHealthIndicators.tsx].
HealthPercentColors healthPercentColors(int percent) {
  if (percent > 80) {
    return const HealthPercentColors(
      text: Color(0xFFDC2626),
      barStart: Color(0xFFDC2626),
      barEnd: Color(0xFFF87171),
    );
  }
  if (percent > 50) {
    return const HealthPercentColors(
      text: Color(0xFFEA580C),
      barStart: Color(0xFFEA580C),
      barEnd: Color(0xFFFB923C),
    );
  }
  return const HealthPercentColors(
    text: Color(0xFF2563EB),
    barStart: Color(0xFF2563EB),
    barEnd: Color(0xFF60A5FA),
  );
}

class HealthPercentColors {
  final Color text;
  final Color barStart;
  final Color barEnd;

  const HealthPercentColors({
    required this.text,
    required this.barStart,
    required this.barEnd,
  });
}
