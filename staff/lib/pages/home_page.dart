import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';

import '../models/booking.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/booking_service.dart';
import '../services/notification_service.dart';
import '../services/tracking_service.dart';
import '../services/socket_service.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../state/theme_provider.dart';
import '../widgets/app_side_nav_logo.dart';
import '../widgets/staff/staff_bottom_nav.dart';

class StaffHomePage extends StatefulWidget {
  const StaffHomePage({super.key});

  @override
  State<StaffHomePage> createState() => _StaffHomePageState();
}

class _StaffHomePageState extends State<StaffHomePage> {
  final BookingService _bookingService = BookingService();
  final ApiClient _api = ApiClient();
  final AuthService _authService = AuthService();
  final StaffTrackingService _trackingService = StaffTrackingService.instance;
  final SocketService _socketService = SocketService();
  final NotificationService _notificationService = NotificationService();

  List<BookingSummary> _bookings = [];
  StaffUser? _currentUser;
  bool _isLoading = false;
  bool _isProfileLoading = false;
  String? _errorText;
  bool _shareLocation = true;
  StaffBottomNavTab _selectedTab = StaffBottomNavTab.dashboard;
  late final VoidCallback _trackingListener;
  int _unreadNotifications = 0;
  String _ordersSearchQuery = '';
  String _ordersSort = 'latest';

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
    final event = _socketService.value;
    if (event == null) return;

    if (event.startsWith('booking_created') ||
        event.startsWith('booking_updated') ||
        event.startsWith('booking_cancelled') ||
        event.startsWith('notification') ||
        event.contains('sync:booking') ||
        event.contains('sync:approval')) {
      if (_isLoading) return;
      _loadData();
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      if (_currentUser == null) {
        _isProfileLoading = true;
      }
      _errorText = null;
    });

    // Try to get cached user immediately for profile view
    _authService
        .getCurrentUser(forceRefresh: true)
        .then((user) {
          if (mounted) {
            setState(() {
              _currentUser = user;
              _isProfileLoading = false;
            });
          }
        })
        .catchError((e) {
          debugPrint('StaffHomePage: Error loading user: $e');
          if (mounted) {
            setState(() {
              _isProfileLoading = false;
            });
          }
        });

    try {
      final bookings = await _bookingService.getMyBookings();
      final notifications = await _notificationService.listMyNotifications();
      if (!mounted) return;
      setState(() {
        _bookings = bookings;
        _unreadNotifications = notifications.where((n) => !n.isRead).length;
      });
      _updateActiveBookingId();
    } catch (e) {
      debugPrint('Error loading bookings: $e');
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
    await _trackingService.stop();
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
  }

  Future<void> _showEditStaffProfileDialog() async {
    final user = _currentUser;
    if (user == null) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone ?? '');
    final addressController = TextEditingController(
      text: user.location?.address ?? '',
    );
    double? selectedLat = user.location?.lat;
    double? selectedLng = user.location?.lng;
    bool isPickingLocation = false;

    final shouldSave =
        await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          backgroundColor: isDark ? const Color(0xFF0B1220) : Colors.white,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          builder: (context) => StatefulBuilder(
            builder: (context, setModalState) => Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 8,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Edit Profile',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameController,
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Full Name',
                        labelStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                        ),
                        filled: true,
                        fillColor: isDark
                            ? const Color(0xFF111827)
                            : const Color(0xFFF9FAFB),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isDark
                                ? const Color(0xFF374151)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 1.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        labelStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                        ),
                        filled: true,
                        fillColor: isDark
                            ? const Color(0xFF111827)
                            : const Color(0xFFF9FAFB),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isDark
                                ? const Color(0xFF374151)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 1.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: addressController,
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Address',
                        labelStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                        ),
                        filled: true,
                        fillColor: isDark
                            ? const Color(0xFF111827)
                            : const Color(0xFFF9FAFB),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isDark
                                ? const Color(0xFF374151)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 1.4,
                          ),
                        ),
                        suffixIcon: IconButton(
                          tooltip: 'Use current location',
                          onPressed: isPickingLocation
                              ? null
                              : () async {
                                  setModalState(() => isPickingLocation = true);
                                  try {
                                    final serviceEnabled =
                                        await Geolocator.isLocationServiceEnabled();
                                    if (!serviceEnabled) {
                                      throw ApiException(
                                        statusCode: 400,
                                        message:
                                            'Location services are disabled',
                                      );
                                    }
                                    var permission =
                                        await Geolocator.checkPermission();
                                    if (permission ==
                                        LocationPermission.denied) {
                                      permission =
                                          await Geolocator.requestPermission();
                                    }
                                    if (permission ==
                                            LocationPermission.denied ||
                                        permission ==
                                            LocationPermission.deniedForever) {
                                      throw ApiException(
                                        statusCode: 403,
                                        message: 'Location permission denied',
                                      );
                                    }

                                    final position =
                                        await Geolocator.getCurrentPosition(
                                          desiredAccuracy: LocationAccuracy.high,
                                        );
                                    String address =
                                        '${position.latitude}, ${position.longitude}';
                                    try {
                                      final reverse = await _api.getAny(
                                        '/tracking/reverse?lat=${position.latitude}&lng=${position.longitude}',
                                      );
                                      if (reverse is Map &&
                                          reverse['display_name'] != null) {
                                        address = reverse['display_name']
                                            .toString();
                                      }
                                    } catch (_) {}

                                    addressController.text = address;
                                    selectedLat = position.latitude;
                                    selectedLng = position.longitude;
                                  } catch (e) {
                                    if (!mounted) return;
                                    final message = e is ApiException
                                        ? e.message
                                        : 'Failed to fetch current location';
                                    ScaffoldMessenger.of(
                                      context,
                                    ).showSnackBar(SnackBar(content: Text(message)));
                                  } finally {
                                    if (context.mounted) {
                                      setModalState(() => isPickingLocation = false);
                                    }
                                  }
                                },
                          icon: isPickingLocation
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Icon(
                                  Icons.my_location_rounded,
                                  color: isDark
                                      ? const Color(0xFF93C5FD)
                                      : const Color(0xFF2563EB),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context, false),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: isDark
                                  ? Colors.white
                                  : const Color(0xFF1F2937),
                              side: BorderSide(
                                color: isDark
                                    ? const Color(0xFF6B7280)
                                    : const Color(0xFFD1D5DB),
                              ),
                            ),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Save'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ) ??
        false;

    if (!shouldSave) return;

    try {
      final trimmedName = nameController.text.trim();
      final trimmedPhone = phoneController.text.trim();
      final trimmedAddress = addressController.text.trim();
      final payload = <String, dynamic>{
        if (trimmedName.isNotEmpty) 'name': trimmedName,
        'phone': trimmedPhone,
        'location': {
          'address': trimmedAddress,
          'lat': selectedLat,
          'lng': selectedLng,
        },
      };
      await _authService.updateProfile(payload);
      await _loadData();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } catch (e) {
      if (!mounted) return;
      final message = e is ApiException ? e.message : 'Failed to update profile';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
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
    }
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
        s == 'SERVICE_STARTED' ||
        s == 'SERVICE_COMPLETED' ||
        s == 'OUT_FOR_DELIVERY';
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '-';
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Widget _buildSidebarContent(
    ThemeData theme,
    TrackingInfo trackingInfo,
    bool isCompact,
  ) {
    final isDark = theme.brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const AppSideNavLogo(),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
          _NavItem(
            icon: Icons.dashboard_rounded,
            label: 'Dashboard',
            selected: _selectedTab == StaffBottomNavTab.dashboard,
            isDark: isDark,
            onTap: () {
              setState(() {
                _selectedTab = StaffBottomNavTab.dashboard;
              });
              if (isCompact) {
                Navigator.of(context).pop();
              }
            },
          ),
          const SizedBox(height: 8),
          _NavItem(
            icon: Icons.list_alt_rounded,
            label: 'Orders',
            selected: _selectedTab == StaffBottomNavTab.orders,
            isDark: isDark,
            onTap: () {
              setState(() {
                _selectedTab = StaffBottomNavTab.orders;
              });
              if (isCompact) {
                Navigator.of(context).pop();
              }
            },
          ),
          const SizedBox(height: 8),
          _NavItem(
            icon: Icons.person_rounded,
            label: 'Profile',
            selected: _selectedTab == StaffBottomNavTab.profile,
            isDark: isDark,
            onTap: () {
              setState(() {
                _selectedTab = StaffBottomNavTab.profile;
              });
              if (isCompact) {
                Navigator.of(context).pop();
              }
            },
          ),
          const SizedBox(height: 8),
          _NavItem(
            icon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
            label: isDark ? 'Light Mode' : 'Dark Mode',
            selected: false,
            isDark: isDark,
            onTap: () {
              context.read<ThemeProvider>().toggleTheme();
            },
          ),
          const SizedBox(height: 8),
          _NavItem(
            icon: Icons.privacy_tip_rounded,
            label: 'Privacy Policy',
            selected: false,
            isDark: isDark,
            onTap: () async {
              const url = 'https://carzzi.com/privacy';
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
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              Switch(
                value: _shareLocation,
                onChanged: (v) {
                  setState(() {
                    _shareLocation = v;
                  });
                  _handleToggleTracking(v);
                },
                activeThumbColor: Colors.white,
                activeTrackColor: isDark
                    ? AppColors.success
                    : const Color(0xFF22C55E),
              ),
            ],
          ),
          Text(
            'Share location',
            style: theme.textTheme.bodySmall?.copyWith(
              color: isDark ? AppColors.textMuted : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.backgroundSurface
                  : const Color(0xFFECFDF3),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark ? AppColors.borderColor : const Color(0xFFBBF7D0),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isDark
                            ? AppColors.success
                            : const Color(0xFF22C55E),
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
                          color: isDark
                              ? AppColors.success
                              : const Color(0xFF166534),
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
                  isDark: isDark,
                ),
                const SizedBox(height: 4),
                _StatusLine(
                  label: 'Longitude',
                  value: trackingInfo.lng != null
                      ? trackingInfo.lng!.toStringAsFixed(6)
                      : '-',
                  isDark: isDark,
                ),
                const SizedBox(height: 4),
                _StatusLine(
                  label: 'Last Update',
                  value: _formatTime(trackingInfo.lastUpdate),
                  isDark: isDark,
                ),
                const SizedBox(height: 4),
                _StatusLine(
                  label: 'Server Sync',
                  value: _formatTime(trackingInfo.lastServerSync),
                  isDark: isDark,
                ),
              ],
            ),
          ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleToggleTracking(bool v) async {
    try {
      if (v) {
        await _trackingService.start();
      } else {
        await _trackingService.stop();
      }
    } catch (e) {
      debugPrint('Error toggling live status: $e');
      if (mounted) {
        setState(() {
          _shareLocation = !v;
        });
      }
    }
  }

  String get _selectedTitle {
    switch (_selectedTab) {
      case StaffBottomNavTab.dashboard:
        return 'Carzzi Staff';
      case StaffBottomNavTab.orders:
        return 'Orders';
      case StaffBottomNavTab.profile:
        return 'My Profile';
    }
  }

  Widget _buildMainContent(
    ThemeData theme,
    List<BookingSummary> bookings,
    int todayCount,
    int completedCount,
    bool isDark,
  ) {
    final ongoingAssigned = bookings.where((b) {
      final s = b.status.toUpperCase();
      return s != 'DELIVERED' && s != 'COMPLETED';
    }).toList();
    final deliveredJobs = bookings.where((b) {
      final s = b.status.toUpperCase();
      return s == 'DELIVERED' || s == 'COMPLETED';
    }).toList();
    deliveredJobs.sort((a, b) {
      final aDate = DateTime.tryParse(a.date ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bDate = DateTime.tryParse(b.date ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bDate.compareTo(aDate);
    });
    final jobsForDisplay = _selectedTab == StaffBottomNavTab.dashboard
        ? deliveredJobs.take(5).toList()
        : deliveredJobs;
    List<BookingSummary> filteredOrders = jobsForDisplay;
    if (_selectedTab == StaffBottomNavTab.orders) {
      final query = _ordersSearchQuery.trim();
      if (query.isNotEmpty) {
        filteredOrders = filteredOrders.where((b) {
          final orderNo = b.orderNumber?.toString() ?? b.id;
          return orderNo.toLowerCase().contains(query.toLowerCase());
        }).toList();
      }
      filteredOrders.sort((a, b) {
        final aDate =
            DateTime.tryParse(a.date ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate =
            DateTime.tryParse(b.date ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
        final cmp = bDate.compareTo(aDate);
        return _ordersSort == 'latest' ? cmp : -cmp;
      });
    }
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 960),
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                children: [
                  if (_selectedTab == StaffBottomNavTab.profile) ...[
                    _buildProfileContent(theme, isDark),
                  ] else if (_selectedTab == StaffBottomNavTab.dashboard) ...[
                    RepaintBoundary(
                      child: Row(
                        children: [
                          Icon(
                            Icons.miscellaneous_services_rounded,
                            color: isDark
                                ? const Color(0xFF1D4ED8)
                                : const Color(0xFF1E3A8A),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Ongoing Service',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? const Color(0xFF1D4ED8)
                                  : const Color(0xFF1E3A8A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (ongoingAssigned.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          vertical: 20,
                          horizontal: 16,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.backgroundSecondary
                              : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isDark
                                ? AppColors.borderColor
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        child: Text(
                          'No ongoing assigned services.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                          ),
                        ),
                      )
                    else
                      Column(
                        children: ongoingAssigned
                            .map(
                              (b) => Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? AppColors.backgroundSecondary
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: isDark
                                        ? AppColors.borderColor
                                        : const Color(0xFFE5E7EB),
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 6,
                                  ),
                                  title: Text(
                                    b.vehicleName ?? 'Booking',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? Colors.white : Colors.black,
                                    ),
                                  ),
                                  subtitle: Text(
                                    'Order #${b.orderNumber ?? b.id}',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: isDark
                                          ? Colors.grey[400]
                                          : const Color(0xFF374151),
                                    ),
                                  ),
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF1E293B)
                                          : const Color(0xFFE0EAFF),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      BookingDetail.getStatusLabel(
                                        b.status,
                                        services: b.services,
                                      ),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: isDark
                                            ? const Color(0xFF1D4ED8)
                                            : const Color(0xFF1E40AF),
                                      ),
                                    ),
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
                    const SizedBox(height: 32),
                    RepaintBoundary(
                      child: Row(
                        children: [
                          Expanded(
                            child: _StatCard(
                              title: 'Today',
                              value: todayCount.toString(),
                              icon: Icons.inventory_2,
                              color: isDark
                                  ? const Color(0xFF1D4ED8)
                                  : const Color(0xFF2563EB),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _StatCard(
                              title: 'Completed',
                              value: completedCount.toString(),
                              icon: Icons.check_circle,
                              color: isDark
                                  ? AppColors.success
                                  : const Color(0xFF10B981),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    
                    RepaintBoundary(
                      child: Row(
                        children: [
                          Icon(
                            Icons.assignment_outlined,
                            color: isDark
                                ? const Color(0xFF1D4ED8)
                                : const Color(0xFF1E3A8A),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Active Jobs',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? const Color(0xFF1D4ED8)
                                  : const Color(0xFF1E3A8A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (_selectedTab == StaffBottomNavTab.orders)
                    Text(
                      'Active Orders',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                  if (_selectedTab == StaffBottomNavTab.orders) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextField(
                            onChanged: (v) {
                              setState(() {
                                _ordersSearchQuery = v;
                              });
                            },
                            decoration: InputDecoration(
                              hintText: 'Search by order no',
                              prefixIcon: const Icon(Icons.search_rounded),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 10,
                                horizontal: 12,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: DropdownButtonFormField<String>(
                            initialValue: _ordersSort,
                            isDense: true,
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 10,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'latest',
                                child: Text('Latest'),
                              ),
                              DropdownMenuItem(
                                value: 'oldest',
                                child: Text('Oldest'),
                              ),
                            ],
                            onChanged: (v) {
                              if (v == null) return;
                              setState(() {
                                _ordersSort = v;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 12),
                  if (_selectedTab == StaffBottomNavTab.profile)
                    const SizedBox.shrink()
                  else if (_isLoading && filteredOrders.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.backgroundSecondary
                            : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isDark
                              ? AppColors.borderColor
                              : Colors.transparent,
                        ),
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
                        color: isDark
                            ? AppColors.backgroundSecondary
                            : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isDark
                              ? AppColors.borderColor
                              : Colors.transparent,
                        ),
                      ),
                      child: Center(child: Text(_errorText!)),
                    )
                  else if (filteredOrders.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        vertical: 48,
                        horizontal: 16,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.backgroundSecondary
                            : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isDark
                              ? AppColors.borderColor
                              : Colors.transparent,
                        ),
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
                            'No delivered orders',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "No jobs are delivered yet.",
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: isDark
                                  ? Colors.grey[400]
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Column(
                      children: filteredOrders
                          .map(
                            (b) => Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppColors.backgroundSecondary
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isDark
                                      ? AppColors.borderColor
                                      : const Color(0xFFE5E7EB),
                                ),
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(16),
                                leading: CircleAvatar(
                                  radius: 22,
                                  backgroundColor: isDark
                                      ? AppColors.backgroundSurface
                                      : const Color(0xFFE0EAFF),
                                  child: Icon(
                                    Icons.directions_car_filled_rounded,
                                    color: isDark
                                        ? const Color(0xFF1D4ED8)
                                        : const Color(0xFF2563EB),
                                  ),
                                ),
                                title: Text(
                                  b.vehicleName ?? 'Booking',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.white : Colors.black,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Order #${b.orderNumber ?? b.id}',
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: isDark
                                                ? Colors.grey[400]
                                                : const Color(0xFF374151),
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Status: ${b.status}',
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: isDark
                                                ? const Color(0xFF1D4ED8)
                                                : const Color(0xFF2563EB),
                                          ),
                                    ),
                                    if (b.locationAddress != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        b.locationAddress!,
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                              color: isDark
                                                  ? Colors.grey[400]
                                                  : Colors.black54,
                                            ),
                                      ),
                                    ],
                                    if (b.date != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        b.date!,
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                              color: isDark
                                                  ? Colors.grey[400]
                                                  : Colors.black54,
                                            ),
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

  Widget _buildProfileContent(ThemeData theme, bool isDark) {
    final user = _currentUser;
    if (user == null) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 48),
        decoration: BoxDecoration(
          color: isDark ? AppColors.backgroundSecondary : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isDark ? AppColors.borderColor : Colors.transparent,
          ),
        ),
        child: Center(
          child: _isProfileLoading
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.person_off_rounded,
                      size: 48,
                      color: isDark
                          ? Colors.grey[600]
                          : const Color(0xFF9CA3AF),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No profile data found',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: _loadData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
        ),
      );
    }

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? AppColors.backgroundSecondary : Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
            ),
          ),
          child: Column(
            children: [
              CircleAvatar(
                radius: 48,
                backgroundColor: isDark
                    ? AppColors.backgroundSurface
                    : const Color(0xFFE0EAFF),
                child: Icon(
                  Icons.person_rounded,
                  size: 48,
                  color: isDark
                      ? const Color(0xFF1D4ED8)
                      : const Color(0xFF2563EB),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                user.name,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : const Color(0xFF111827),
                ),
              ),
              Text(
                user.role.toUpperCase(),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isDark
                      ? const Color(0xFF1D4ED8)
                      : const Color(0xFF2563EB),
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 24),
              const Divider(height: 1),
              const SizedBox(height: 24),
              _ProfileDetailItem(
                icon: Icons.email_outlined,
                label: 'Email Address',
                value: user.email,
                isDark: isDark,
              ),
              const SizedBox(height: 16),
              _ProfileDetailItem(
                icon: Icons.phone_android_rounded,
                label: 'Phone Number',
                value: user.phone ?? 'Not provided',
                isDark: isDark,
              ),
              if (user.subRole != null) ...[
                const SizedBox(height: 16),
                _ProfileDetailItem(
                  icon: Icons.work_outline_rounded,
                  label: 'Department',
                  value: user.subRole!,
                  isDark: isDark,
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _logout,
                  icon: const Icon(Icons.logout_rounded, color: AppColors.error),
                  label: const Text(
                    'Logout',
                    style: TextStyle(
                      color: AppColors.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: BorderSide(
                      color: isDark
                          ? AppColors.error.withValues(alpha: 0.45)
                          : AppColors.error.withValues(alpha: 0.25),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 720;
        if (isCompact) {
          return Scaffold(
            appBar: AppBar(
              title: Text(
                _selectedTitle,
                style: theme.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF1E3A8A),
                              ),
              ),
              actions: [
                if (_selectedTab == StaffBottomNavTab.profile)
                  IconButton(
                    tooltip: 'Edit Profile',
                    onPressed: _showEditStaffProfileDialog,
                    icon: const Icon(Icons.edit_outlined),
                  ),
                IconButton(
                  tooltip: 'Notifications',
                  onPressed: () async {
                    await Navigator.pushNamed(context, '/notifications');
                    if (!mounted) return;
                    _loadData();
                  },
                  icon: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(Icons.notifications_none_rounded),
                      if (_unreadNotifications > 0)
                        Positioned(
                          right: -6,
                          top: -6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 5,
                              vertical: 1,
                            ),
                            decoration: const BoxDecoration(
                              color: Color(0xFFEF4444),
                              borderRadius: BorderRadius.all(Radius.circular(999)),
                            ),
                            constraints: const BoxConstraints(minWidth: 16),
                            child: Text(
                              _unreadNotifications > 99
                                  ? '99+'
                                  : _unreadNotifications.toString(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            drawer: Drawer(
              child: SafeArea(
                child: _buildSidebarContent(theme, trackingInfo, true),
              ),
            ),
            bottomNavigationBar: StaffBottomNav(
              selectedTab: _selectedTab,
              onTabSelected: (tab) {
                setState(() {
                  _selectedTab = tab;
                });
              },
            ),
            body: Container(
              color: isDark
                  ? AppColors.backgroundPrimary
                  : const Color(0xFFF3F4F6),
              child: _buildMainContent(
                theme,
                bookings,
                todayCount,
                completedCount,
                isDark,
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
                    color: isDark
                        ? AppColors.backgroundSecondary
                        : Colors.white,
                    border: Border(
                      right: BorderSide(
                        color: isDark
                            ? AppColors.borderColor
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isDark
                            ? Colors.black.withValues(alpha: 0.3)
                            : Colors.black.withValues(alpha: 0.03),
                        blurRadius: 20,
                        offset: const Offset(4, 0),
                      ),
                    ],
                  ),
                  child: _buildSidebarContent(theme, trackingInfo, false),
                ),
                Expanded(
                  child: Container(
                    color: isDark
                        ? AppColors.backgroundPrimary
                        : const Color(0xFFF3F4F6),
                    child: _buildMainContent(
                      theme,
                      bookings,
                      todayCount,
                      completedCount,
                      isDark,
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

class _ProfileDetailItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;

  const _ProfileDetailItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSurface
                : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: isDark ? Colors.grey[400] : const Color(0xFF4B5563),
            size: 20,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 11,
                  color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontSize: 14,
                  color: isDark ? Colors.white : const Color(0xFF111827),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final bool isDark;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: selected
            ? (isDark ? const Color(0xFF1D4ED8) : const Color(0xFF2563EB))
            : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: selected
              ? Colors.white
              : (isDark ? Colors.grey[400] : const Color(0xFF4B5563)),
        ),
        title: Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: selected
                ? Colors.white
                : (isDark ? Colors.grey[300] : const Color(0xFF374151)),
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
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      constraints: const BoxConstraints(minHeight: 104),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0B1220) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
        ),
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
                    color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF111827),
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
  final bool isDark;

  const _StatusLine({
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.grey[300] : const Color(0xFF111827),
          ),
        ),
      ],
    );
  }
}
