import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/booking.dart';
import '../services/auth_service.dart';
import '../services/booking_service.dart';
import '../services/tracking_service.dart';
import '../services/socket_service.dart';

class StaffHomePage extends StatefulWidget {
  const StaffHomePage({super.key});

  @override
  State<StaffHomePage> createState() => _StaffHomePageState();
}

class _StaffHomePageState extends State<StaffHomePage> {
  final BookingService _bookingService = BookingService();
  final AuthService _authService = AuthService();
  final StaffTrackingService _trackingService = StaffTrackingService.instance;
  final SocketService _socketService = SocketService();

  List<BookingSummary> _bookings = [];
  bool _isLoading = false;
  String? _errorText;
  bool _shareLocation = true;
  String _selectedNav = 'dashboard';
  late final VoidCallback _trackingListener;

  @override
  void initState() {
    super.initState();
    _trackingListener = () {
      if (mounted) {
        setState(() {});
      }
    };
    _trackingService.info.addListener(_trackingListener);
    _socketService.addListener(_onSocketUpdate);
    _loadData();
    _startTrackingIfEnabled();
  }

  void _onSocketUpdate() {
    if (_isLoading) return;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorText = null;
    });
    try {
      final bookings = await _bookingService.getMyBookings();
      if (!mounted) return;
      setState(() {
        _bookings = bookings;
      });
      _updateActiveBookingId();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorText = 'Failed to load data';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
  }

  @override
  void dispose() {
    _trackingService.info.removeListener(_trackingListener);
    _socketService.removeListener(_onSocketUpdate);
    super.dispose();
  }

  Future<void> _startTrackingIfEnabled() async {
    if (_shareLocation) {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (!mounted) return;
        final messenger = ScaffoldMessenger.of(context);
        messenger.showSnackBar(
          SnackBar(
            content: const Text(
              'Please turn on location services to share your live status.',
            ),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: Geolocator.openLocationSettings,
            ),
          ),
        );
        return;
      }

      // Play Store requirement: Prominent Disclosure for Background Location
      final permission = await Geolocator.checkPermission();
      if (!mounted) return;
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        final proceed =
            await showDialog<bool>(
              context: context,
              barrierDismissible: false,
              builder: (context) => AlertDialog(
                title: const Text('Location Access Required'),
                content: const Text(
                  'Speshway Staff collects location data to enable tracking for your assigned orders even when the app is closed or not in use. This information is required for:\n\n'
                  '• Real-time tracking of active service bookings.\n'
                  '• Updating customers on technician arrival status.\n'
                  '• Automatic status updates (e.g., Reached Customer).\n\n'
                  'Your location data is collected in the background only during active working hours and is never shared with third parties or used for advertising.',
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('NO THANKS'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('ACCEPT'),
                  ),
                ],
              ),
            ) ??
            false;

        if (!proceed) {
          setState(() {
            _shareLocation = false;
          });
          return;
        }
      }

      await _trackingService.start();
      _updateActiveBookingId();
      try {
        await _authService.updateOnlineStatus(true);
      } catch (_) {}
    }
  }

  Future<void> _setOffline() async {
    try {
      await _authService.updateOnlineStatus(false);
    } catch (_) {}
  }

  void _updateActiveBookingId() {
    String? id;
    for (final b in _bookings) {
      if (_isActiveStatus(b.status)) {
        id = b.id;
        break;
      }
    }
    _trackingService.setActiveBookingId(id);
  }

  bool _isActiveStatus(String status) {
    final s = status.toUpperCase();
    return s == 'ASSIGNED' ||
        s == 'ACCEPTED' ||
        s == 'REACHED_CUSTOMER' ||
        s == 'VEHICLE_PICKED' ||
        s == 'REACHED_MERCHANT' ||
        s == 'VEHICLE_AT_MERCHANT' ||
        s == 'OUT_FOR_DELIVERY';
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '-';
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Widget _buildSidebarContent(ThemeData theme, TrackingInfo trackingInfo) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Staff Portal',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
              color: const Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 24),
          _NavItem(
            icon: Icons.dashboard_rounded,
            label: 'Dashboard',
            selected: _selectedNav == 'dashboard',
            onTap: () {
              setState(() {
                _selectedNav = 'dashboard';
              });
            },
          ),
          const SizedBox(height: 8),
          _NavItem(
            icon: Icons.list_alt_rounded,
            label: 'Orders',
            selected: _selectedNav == 'orders',
            onTap: () {
              setState(() {
                _selectedNav = 'orders';
              });
            },
          ),
          const SizedBox(height: 8),
          _NavItem(
            icon: Icons.privacy_tip_rounded,
            label: 'Privacy Policy',
            selected: false,
            onTap: () async {
              const url = 'https://car.speshwayhrms.com/privacy';
              if (await canLaunchUrl(Uri.parse(url))) {
                await launchUrl(Uri.parse(url));
              }
            },
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Live Status',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              Switch(
                value: _shareLocation,
                onChanged: (v) {
                  setState(() {
                    _shareLocation = v;
                  });
                  if (v) {
                    _startTrackingIfEnabled();
                  } else {
                    _trackingService.stop();
                    _setOffline();
                  }
                },
                activeThumbColor: Colors.white,
                activeTrackColor: const Color(0xFF22C55E),
              ),
            ],
          ),
          Text(
            'Share location',
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF3),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFF22C55E),
                      ),
                      child: const Icon(
                        Icons.check_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _shareLocation
                            ? 'You are Online & Tracking'
                            : 'Tracking paused',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF166534),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _StatusLine(
                  label: 'Latitude',
                  value: trackingInfo.lat != null
                      ? trackingInfo.lat!.toStringAsFixed(6)
                      : '-',
                ),
                const SizedBox(height: 4),
                _StatusLine(
                  label: 'Longitude',
                  value: trackingInfo.lng != null
                      ? trackingInfo.lng!.toStringAsFixed(6)
                      : '-',
                ),
                const SizedBox(height: 4),
                _StatusLine(
                  label: 'Last Update',
                  value: _formatTime(trackingInfo.lastUpdate),
                ),
                const SizedBox(height: 4),
                _StatusLine(
                  label: 'Server Sync',
                  value: _formatTime(trackingInfo.lastServerSync),
                ),
              ],
            ),
          ),
          const Spacer(),
          SizedBox(
            height: 44,
            child: TextButton.icon(
              onPressed: _logout,
              icon: const Icon(
                Icons.logout,
                color: Color(0xFFEF4444),
                size: 20,
              ),
              label: const Text(
                'Logout',
                style: TextStyle(
                  color: Color(0xFFEF4444),
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: TextButton.styleFrom(alignment: Alignment.centerLeft),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainContent(
    ThemeData theme,
    List<BookingSummary> bookings,
    int todayCount,
    int completedCount,
    int pendingCount,
  ) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 960),
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 480;
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                children: [
                  RepaintBoundary(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedNav == 'dashboard'
                                  ? 'Staff Dashboard'
                                  : 'Orders',
                              style: theme.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF1D4ED8),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _selectedNav == 'dashboard'
                                  ? 'Overview of your assigned jobs and live orders'
                                  : 'View and manage your active orders',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: const Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: Colors.white,
                          child: Icon(
                            Icons.person,
                            color: const Color(0xFF2563EB),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (_selectedNav == 'dashboard') ...[
                    if (isCompact)
                      RepaintBoundary(
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: _StatCard(
                                    title: "Today's Orders",
                                    value: todayCount.toString(),
                                    icon: Icons.inventory_2,
                                    color: const Color(0xFF2563EB),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _StatCard(
                                    title: 'Pending',
                                    value: pendingCount.toString(),
                                    icon: Icons.schedule,
                                    color: const Color(0xFF0EA5E9),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: _StatCard(
                                    title: 'Completed',
                                    value: completedCount.toString(),
                                    icon: Icons.check_circle,
                                    color: const Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      )
                    else
                      RepaintBoundary(
                        child: Row(
                          children: [
                            Expanded(
                              child: _StatCard(
                                title: "Today's Orders",
                                value: todayCount.toString(),
                                icon: Icons.inventory_2,
                                color: const Color(0xFF2563EB),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _StatCard(
                                title: 'Pending',
                                value: pendingCount.toString(),
                                icon: Icons.schedule,
                                color: const Color(0xFF0EA5E9),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _StatCard(
                                title: 'Completed',
                                value: completedCount.toString(),
                                icon: Icons.check_circle,
                                color: const Color(0xFF10B981),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 32),
                    RepaintBoundary(
                      child: Row(
                        children: [
                          Icon(
                            Icons.assignment_outlined,
                            color: const Color(0xFF1E3A8A),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Active Jobs',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF1E3A8A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (_selectedNav != 'dashboard')
                    Text(
                      'Active Orders',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  const SizedBox(height: 12),
                  if (_isLoading && bookings.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Center(child: CircularProgressIndicator()),
                    )
                  else if (_errorText != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        vertical: 48,
                        horizontal: 16,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Center(child: Text(_errorText!)),
                    )
                  else if (bookings.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        vertical: 48,
                        horizontal: 16,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.inbox_outlined,
                            size: 40,
                            color: const Color(0xFF9CA3AF),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No active orders',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "You don't have any active orders assigned.",
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Column(
                      children: bookings
                          .map(
                            (b) => Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFE5E7EB),
                                ),
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(16),
                                leading: CircleAvatar(
                                  radius: 22,
                                  backgroundColor: const Color(0xFFE0EAFF),
                                  child: Icon(
                                    Icons.directions_car_filled_rounded,
                                    color: const Color(0xFF2563EB),
                                  ),
                                ),
                                title: Text(
                                  b.vehicleName ?? 'Booking',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Order #${b.orderNumber ?? b.id}',
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: const Color(0xFF374151),
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Status: ${b.status}',
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: const Color(0xFF2563EB),
                                          ),
                                    ),
                                    if (b.locationAddress != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        b.locationAddress!,
                                        style: theme.textTheme.bodySmall,
                                      ),
                                    ],
                                    if (b.date != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        b.date!,
                                        style: theme.textTheme.bodySmall,
                                      ),
                                    ],
                                  ],
                                ),
                                onTap: () {
                                  Navigator.of(
                                    context,
                                  ).pushNamed('/order', arguments: b.id);
                                },
                              ),
                            ),
                          )
                          .toList(),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bookings = _bookings;
    final trackingInfo = _trackingService.info.value;

    int todayCount = 0;
    int completedCount = 0;
    for (final b in bookings) {
      if (b.date != null) {
        final parsed = DateTime.tryParse(b.date!);
        if (parsed != null) {
          final now = DateTime.now();
          if (parsed.year == now.year &&
              parsed.month == now.month &&
              parsed.day == now.day) {
            todayCount++;
          }
        }
      }
      final status = b.status.toUpperCase();
      if (status == 'DELIVERED' || status == 'COMPLETED') {
        completedCount++;
      }
    }
    final pendingCount = bookings.length - completedCount;
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 720;
        if (isCompact) {
          return Scaffold(
            appBar: AppBar(
              title: Text(
                _selectedNav == 'dashboard' ? 'Staff Dashboard' : 'Orders',
              ),
            ),
            drawer: Drawer(
              child: SafeArea(child: _buildSidebarContent(theme, trackingInfo)),
            ),
            body: Container(
              color: const Color(0xFFF3F4F6),
              child: _buildMainContent(
                theme,
                bookings,
                todayCount,
                completedCount,
                pendingCount,
              ),
            ),
          );
        }

        return Scaffold(
          body: SafeArea(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 260,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: const Border(
                      right: BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 20,
                        offset: const Offset(4, 0),
                      ),
                    ],
                  ),
                  child: _buildSidebarContent(theme, trackingInfo),
                ),
                Expanded(
                  child: Container(
                    color: const Color(0xFFF3F4F6),
                    child: _buildMainContent(
                      theme,
                      bookings,
                      todayCount,
                      completedCount,
                      pendingCount,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: selected ? const Color(0xFF2563EB) : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: selected ? Colors.white : const Color(0xFF4B5563),
        ),
        title: Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: selected ? Colors.white : const Color(0xFF374151),
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        visualDensity: const VisualDensity(horizontal: -1, vertical: -2),
        onTap: onTap,
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusLine extends StatelessWidget {
  final String label;
  final String value;

  const _StatusLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: const Color(0xFF6B7280),
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF111827),
          ),
        ),
      ],
    );
  }
}
