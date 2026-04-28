import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/booking_service.dart';
import '../../services/notification_service.dart';
import '../../services/socket_service.dart';
import '../../models/booking.dart';
import '../../models/user.dart';
import '../../widgets/merchant/merchant_nav.dart';
import '../../core/app_colors.dart';

class MerchantDashboardPage extends StatefulWidget {
  const MerchantDashboardPage({super.key});

  @override
  State<MerchantDashboardPage> createState() => _MerchantDashboardPageState();
}

class _MerchantDashboardPageState extends State<MerchantDashboardPage> {
  final AuthService _authService = AuthService();
  final BookingService _bookingService = BookingService();
  final NotificationService _notificationService = NotificationService();
  final SocketService _socketService = SocketService();
  StaffUser? _user;
  bool _isLoading = true;
  Map<String, dynamic> _stats = {
    'activeOrders': 0,
    'completedOrders': 0,
    'pendingBills': 0,
  };
  int _unreadNotifications = 0;
  List<BookingSummary> _recentOrders = [];

  @override
  void initState() {
    super.initState();
    _init();
    _socketService.addListener(_onSocketUpdate);
  }

  @override
  void dispose() {
    _socketService.removeListener(_onSocketUpdate);
    super.dispose();
  }

  void _onSocketUpdate() {
    final event = _socketService.value;
    if (event == null) return;

    if (event.startsWith('booking_created') ||
        event.startsWith('booking_updated') ||
        event.startsWith('booking_cancelled') ||
        event.startsWith('notification') ||
        event.startsWith('user_status_update') ||
        event.contains('sync:booking') ||
        event.contains('sync:approval') ||
        event.contains('sync:payment')) {
      // If we're already loading, skip
      if (_isLoading) return;
      _init(); // Refresh data on socket event
    }
  }

  Future<void> _init() async {
    // Only show full loading if it's the first time
    final shouldShowFullLoading = _user == null;

    if (shouldShowFullLoading) {
      if (mounted) setState(() => _isLoading = true);
    }

    try {
      final user = await _authService.getCurrentUser(forceRefresh: true);
      final stats = await _bookingService.getMerchantStats();
      final bookings = await _bookingService.getMyBookings();
      final notifications = await _notificationService.listMyNotifications();
      bookings.sort((a, b) {
        final aDate =
            DateTime.tryParse(a.date ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate =
            DateTime.tryParse(b.date ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });
      if (mounted) {
        setState(() {
          _user = user;
          _stats = stats;
          _recentOrders = bookings.take(5).toList();
          _unreadNotifications = notifications.where((n) => !n.isRead).length;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return MerchantScaffold(
      title: 'Carzzi Merchant',
      actions: [
        IconButton(
          tooltip: 'Notifications',
          onPressed: () async {
            await Navigator.pushNamed(context, '/merchant-notifications');
            if (!mounted) return;
            _init();
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
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
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
      body: RefreshIndicator(
        onRefresh: _init,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, ${_user?.name ?? 'Merchant'}',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Manage your service center orders and status.',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  _buildStatCard(
                    context,
                    title: 'Ongoing Orders',
                    value: _stats['activeOrders'].toString(),
                    icon: Icons.pending_actions,
                    color: AppColors.primaryBlue,
                    isDark: isDark,
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/merchant-orders',
                      arguments: {'filter': 'active'},
                    ),
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    context,
                    title: 'Completed Orders',
                    value: _stats['completedOrders'].toString(),
                    icon: Icons.check_circle_outline,
                    color: AppColors.success,
                    isDark: isDark,
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/merchant-orders',
                      arguments: {'filter': 'completed'},
                    ),
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    context,
                    title: 'Pending Payments',
                    value: _stats['pendingBills'].toString(),
                    icon: Icons.receipt_long,
                    color: AppColors.warning,
                    isDark: isDark,
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/merchant-orders',
                      arguments: {'filter': 'all'},
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                'Recent Orders',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 16),
              if (_recentOrders.isEmpty)
                Card(
                  elevation: 0,
                  color: isDark ? AppColors.backgroundSecondary : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isDark ? AppColors.borderColor : Colors.grey[200]!,
                    ),
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No recent orders found'),
                  ),
                )
              else
                Column(
                  children: _recentOrders
                      .map(
                        (order) => _buildRecentOrderCard(
                          context,
                          order: order,
                          isDark: isDark,
                        ),
                      )
                      .toList(),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required bool isDark,
    VoidCallback? onTap,
    bool isFullWidth = false,
  }) {
    final theme = Theme.of(context);
    final titleColor = isDark
        ? theme.colorScheme.onSurface.withValues(alpha: 0.78)
        : theme.colorScheme.onSurface.withValues(alpha: 0.72);
    final valueColor = isDark ? Colors.white : const Color(0xFF111827);

    final card = Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? color.withValues(alpha: 0.14)
                : color.withValues(alpha: 0.09),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark
                  ? color.withValues(alpha: 0.3)
                  : color.withValues(alpha: 0.22),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 14),
              Text(
                value,
                style: TextStyle(
                  fontSize: 30,
                  height: 1,
                  fontWeight: FontWeight.w800,
                  color: valueColor,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 10,
                  height: 1.2,
                  fontWeight: FontWeight.w600,
                  color: titleColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (isFullWidth) return card;
    return Expanded(child: card);
  }

  Widget _buildRecentOrderCard(
    BuildContext context, {
    required BookingSummary order,
    required bool isDark,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: isDark ? AppColors.backgroundSecondary : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isDark ? AppColors.borderColor : Colors.grey[200]!),
      ),
      child: ListTile(
        onTap: () => Navigator.pushNamed(
          context,
          '/merchant-order-detail',
          arguments: order.id,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          'Order #${order.orderNumber ?? order.id.substring(order.id.length - 6).toUpperCase()}',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        subtitle: Text(
          '${order.vehicleName ?? 'Booking'} • ${BookingDetail.getStatusLabel(order.status, services: order.services)}',
          style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
      ),
    );
  }
}
