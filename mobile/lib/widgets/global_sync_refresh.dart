import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/global_sync_provider.dart';

/// Re-runs [onSync] whenever a global sync event affects [entities].
class GlobalSyncRefresh extends StatefulWidget {
  final List<String> entities;
  final VoidCallback onSync;
  final Widget child;

  const GlobalSyncRefresh({
    super.key,
    required this.entities,
    required this.onSync,
    required this.child,
  });

  @override
  State<GlobalSyncRefresh> createState() => _GlobalSyncRefreshState();
}

class _GlobalSyncRefreshState extends State<GlobalSyncRefresh> {
  int _lastVersion = 0;

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<GlobalSyncProvider>();
    if (sync.version != _lastVersion && sync.affects(widget.entities)) {
      _lastVersion = sync.version;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onSync();
      });
    }
    return widget.child;
  }
}
