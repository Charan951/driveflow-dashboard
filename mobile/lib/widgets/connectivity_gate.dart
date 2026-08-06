import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'no_internet_screen.dart';

/// Wraps the whole app; overlays [NoInternetScreen] on top of whatever
/// screen is currently showing whenever the device loses network
/// connectivity, and removes it automatically once reconnected.
class ConnectivityGate extends StatefulWidget {
  final Widget child;

  const ConnectivityGate({super.key, required this.child});

  @override
  State<ConnectivityGate> createState() => _ConnectivityGateState();
}

class _ConnectivityGateState extends State<ConnectivityGate> {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _hasConnection = true;

  @override
  void initState() {
    super.initState();
    _checkInitial();
    _subscription = _connectivity.onConnectivityChanged.listen(_onChanged);
  }

  Future<void> _checkInitial() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _onChanged(result);
    } catch (_) {
      // If the plugin itself fails, assume connected rather than blocking
      // the whole app behind a false-positive offline screen.
    }
  }

  void _onChanged(List<ConnectivityResult> results) {
    final connected = results.any((r) => r != ConnectivityResult.none);
    if (mounted && connected != _hasConnection) {
      setState(() => _hasConnection = connected);
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (!_hasConnection)
          Positioned.fill(child: NoInternetScreen(onRetry: _checkInitial)),
      ],
    );
  }
}
