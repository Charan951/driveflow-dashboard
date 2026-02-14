import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../state/auth_provider.dart';

class MyBookingsPage extends StatefulWidget {
  const MyBookingsPage({super.key});

  @override
  State<MyBookingsPage> createState() => _MyBookingsPageState();
}

class _MyBookingsPageState extends State<MyBookingsPage> {
  final _service = BookingService();

  bool _loading = true;
  String? _error;
  List<Booking> _bookings = const [];

  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthProvider>();
    final navigator = Navigator.of(context);
    if (auth.isAuthenticated) return true;
    await auth.loadMe();
    if (!mounted) return false;
    if (!auth.isAuthenticated) {
      navigator.pushNamedAndRemoveUntil('/login', (route) => false);
      return false;
    }
    return true;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final ok = await _ensureAuthenticated();
      if (!ok) return;
      await _load();
    });
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await _ensureAuthenticated();
    if (!ok) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final items = await _service.listMyBookings();
      items.sort((a, b) => b.date.compareTo(a.date));
      if (mounted) setState(() => _bookings = items);
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await auth.logout();
        if (!mounted) return;
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/login', (route) => false);
        return;
      }
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  DateTime? _parseDate(String value) {
    try {
      return DateTime.parse(value).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _formatDateTime(BuildContext context, String value) {
    final dt = _parseDate(value);
    if (dt == null) return value;
    final date = MaterialLocalizations.of(context).formatMediumDate(dt);
    final time = MaterialLocalizations.of(
      context,
    ).formatTimeOfDay(TimeOfDay.fromDateTime(dt), alwaysUse24HourFormat: false);
    return '$date • $time';
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'CREATED':
        return 'Booked';
      case 'ASSIGNED':
        return 'Pickup Assigned';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REACHED_CUSTOMER':
        return 'Driver Reached';
      case 'VEHICLE_PICKED':
        return 'Vehicle Picked';
      case 'REACHED_MERCHANT':
        return 'Reached Garage';
      case 'VEHICLE_AT_MERCHANT':
        return 'At Garage';
      case 'JOB_CARD':
        return 'Job Card';
      case 'SERVICE_STARTED':
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Ready';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('My Bookings'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: Column(
                  children: [
                    Text(
                      'Failed to load bookings',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _load,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
            else if (_bookings.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: Center(child: Text('No bookings yet')),
              )
            else ...[
              for (final b in _bookings)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () =>
                        Navigator.pushNamed(context, '/track', arguments: b.id),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  'Booking #${b.id}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEDE9FE),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  _statusLabel(b.status),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF4F46E5),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            _formatDateTime(context, b.date),
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: Colors.black54),
                          ),
                          if (b.vehicle != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              '${b.vehicle!.make} ${b.vehicle!.model} • ${b.vehicle!.licensePlate}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ],
                          if (b.services.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              b.services.map((e) => e.name).take(2).join(', ') +
                                  (b.services.length > 2 ? '…' : ''),
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: Colors.black54),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Text(
                                '₹${b.totalAmount}',
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const Spacer(),
                              const Icon(
                                Icons.chevron_right,
                                color: Colors.black38,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
