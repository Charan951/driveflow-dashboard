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
    // Both children always occupy the same slots in this Stack — toggling
    // via Offstage rather than conditionally inserting/removing a child
    // avoids a list-shape change here racing a structural change elsewhere
    // in the tree (e.g. a ModalRoute being pushed) in the same frame.
    return Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: Offstage(
            offstage: _hasConnection,
            child: NoInternetScreen(onRetry: _checkInitial),
          ),
        ),
      ],
    );
  }
}
