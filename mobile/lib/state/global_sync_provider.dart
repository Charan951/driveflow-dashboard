import 'package:flutter/foundation.dart';
import '../services/socket_service.dart';

class GlobalSyncEvent {
  final String entity;
  final String action;
  final Map<String, dynamic>? data;
  final DateTime at;

  const GlobalSyncEvent({
    required this.entity,
    required this.action,
    this.data,
    required this.at,
  });
}

/// App-wide sync bus: listens to [SocketService] and notifies all screens.
class GlobalSyncProvider extends ChangeNotifier {
  GlobalSyncEvent? _lastEvent;
  int _version = 0;

  GlobalSyncProvider() {
    SocketService().addListener(_onSocket);
  }

  GlobalSyncEvent? get lastEvent => _lastEvent;
  int get version => _version;

  bool affects(Iterable<String> entities) {
    final e = _lastEvent?.entity;
    if (e == null) return false;
    return entities.map((x) => x.toLowerCase()).contains(e.toLowerCase());
  }

  void _onSocket() {
    final parsed = _parseSocketValue(SocketService().value);
    if (parsed == null) return;
    _lastEvent = parsed;
    _version++;
    notifyListeners();
  }

  GlobalSyncEvent? _parseSocketValue(String? raw) {
    if (raw == null || raw.isEmpty) return null;

    if (raw.startsWith('sync:')) {
      final parts = raw.split(':');
      if (parts.length >= 3) {
        return GlobalSyncEvent(
          entity: parts[1],
          action: parts[2],
          at: DateTime.now(),
        );
      }
    }

    const prefixMap = <String, ({String entity, String action})>{
      'booking_updated': (entity: 'booking', action: 'updated'),
      'booking_created': (entity: 'booking', action: 'created'),
      'booking_cancelled': (entity: 'booking', action: 'cancelled'),
      'notification': (entity: 'notification', action: 'updated'),
      'ticket_updated': (entity: 'ticket', action: 'updated'),
      'new_approval': (entity: 'approval', action: 'created'),
      'user_status_update': (entity: 'user', action: 'updated'),
      'role_updated': (entity: 'user', action: 'updated'),
    };

    for (final entry in prefixMap.entries) {
      if (raw.startsWith(entry.key)) {
        return GlobalSyncEvent(
          entity: entry.value.entity,
          action: entry.value.action,
          at: DateTime.now(),
        );
      }
    }

    return null;
  }

  @override
  void dispose() {
    SocketService().removeListener(_onSocket);
    super.dispose();
  }
}
