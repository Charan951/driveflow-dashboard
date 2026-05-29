import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/env.dart';

/// Live staff location map (web merchant order overview parity).
class MerchantStaffLiveMap extends StatelessWidget {
  final double? lat;
  final double? lng;
  final double height;

  const MerchantStaffLiveMap({
    super.key,
    required this.lat,
    required this.lng,
    this.height = 200,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (lat == null || lng == null) {
      return Container(
        height: height,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isDark ? Colors.grey[900] : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.grey[700]! : const Color(0xFFE5E7EB),
          ),
        ),
        child: Text(
          'Waiting for staff location...',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
          ),
        ),
      );
    }

    final center = LatLng(lat!, lng!);

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: height,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: 15,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: Env.mapTileUrlTemplate,
              subdomains: Env.mapTileSubdomains,
              userAgentPackageName: 'com.speshway.staff',
            ),
            MarkerLayer(
              markers: [
                Marker(
                  point: center,
                  width: 40,
                  height: 40,
                  child: const Icon(
                    Icons.person_pin_circle,
                    color: Color(0xFF2563EB),
                    size: 36,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
