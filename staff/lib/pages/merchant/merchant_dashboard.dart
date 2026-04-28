import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/booking_service.dart';
import '../../services/socket_service.dart';
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
  final SocketService _socketService = SocketService();
  StaffUser? _user;
  bool _isLoading = true;
  Map<String, dynamic> _stats = {
    'activeOrders': 0,
    'completedOrders': 0,
    'pendingBills': 0,
  };

  bool _isShopOpen = true;

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
      if (mounted) {
        setState(() {
          _user = user;
          _stats = stats;
          _isShopOpen = user?.isShopOpen ?? true;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleShopStatus(bool value) async {
    final previousStatus = _isShopOpen;
    setState(() => _isShopOpen = value);
    try {
      await _authService.updateProfile({'isShopOpen': value});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(value ? 'Shop is now Open' : 'Shop is now Closed'),
          ),
        );
      }
    } catch (e) {
      setState(() => _isShopOpen = previousStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update shop status')),
        );
      }
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
      title: 'Merchant Dashboard',
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
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Manage your service center orders and status.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 24),
              // Shop Status Card
              Card(
                elevation: 0,
                color: _isShopOpen
                    ? (isDark
                          ? AppColors.success.withValues(alpha: 0.1)
                          : AppColors.success.withValues(alpha: 0.05))
                    : (isDark
                          ? AppColors.error.withValues(alpha: 0.1)
                          : AppColors.error.withValues(alpha: 0.05)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: _isShopOpen
                        ? (isDark
                              ? AppColors.success.withValues(alpha: 0.2)
                              : AppColors.success.withValues(alpha: 0.1))
                        : (isDark
                              ? AppColors.error.withValues(alpha: 0.2)
                              : AppColors.error.withValues(alpha: 0.1)),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        _isShopOpen ? Icons.store : Icons.store_outlined,
                        color: _isShopOpen
                            ? AppColors.success
                            : AppColors.error,
                        size: 32,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Shop Status: ${_isShopOpen ? 'Open' : 'Closed'}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _isShopOpen
                                    ? (isDark
                                          ? AppColors.success
                                          : AppColors.success)
                                    : (isDark
                                          ? AppColors.error
                                          : AppColors.error),
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              _isShopOpen
                                  ? 'Visible to customers'
                                  : 'Hidden from customers',
                              style: TextStyle(
                                color: _isShopOpen
                                    ? (isDark
                                          ? AppColors.success.withValues(
                                              alpha: 0.7,
                                            )
                                          : AppColors.success.withValues(
                                              alpha: 0.8,
                                            ))
                                    : (isDark
                                          ? AppColors.error.withValues(
                                              alpha: 0.7,
                                            )
                                          : AppColors.error.withValues(
                                              alpha: 0.8,
                                            )),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _isShopOpen,
                        onChanged: _toggleShopStatus,
                        activeThumbColor: AppColors.success,
                        activeTrackColor: AppColors.success.withValues(
                          alpha: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  _buildStatCard(
                    context,
                    title: 'Active Orders',
                    value: _stats['activeOrders'].toString(),
                    icon: Icons.pending_actions,
                    color: AppColors.primaryBlue,
                    isDark: isDark,
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    context,
                    title: 'Completed',
                    value: _stats['completedOrders'].toString(),
                    icon: Icons.check_circle_outline,
                    color: AppColors.success,
                    isDark: isDark,
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    context,
                    title: 'Pending Bills',
                    value: _stats['pendingBills'].toString(),
                    icon: Icons.receipt_long,
                    color: AppColors.warning,
                    isDark: isDark,
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                'Quick Actions',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 16),
              _buildActionCard(
                context,
                title: 'View Active Orders',
                subtitle: 'Manage and update order status',
                icon: Icons.assignment,
                onTap: () => Navigator.pushNamed(context, '/merchant-orders'),
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
    bool isFullWidth = false,
  }) {
    final card = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? color.withValues(alpha: 0.1)
            : color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark
              ? color.withValues(alpha: 0.2)
              : color.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 16),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: isDark
                  ? color.withValues(alpha: 0.9)
                  : color.withValues(alpha: 0.8),
            ),
          ),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark
                  ? color.withValues(alpha: 0.8)
                  : color.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );

    if (isFullWidth) return card;
    return Expanded(child: card);
  }

  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      elevation: 0,
      color: isDark ? AppColors.backgroundSecondary : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppColors.borderColor : Colors.grey[200]!,
        ),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.primaryPurple.withValues(alpha: 0.1)
                : Colors.deepPurple.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: isDark ? AppColors.primaryPurple : Colors.deepPurple,
          ),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
      ),
    );
  }
}
