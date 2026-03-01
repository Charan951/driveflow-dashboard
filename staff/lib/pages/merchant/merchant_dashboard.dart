import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/booking_service.dart';
import '../../services/socket_service.dart';
import '../../models/user.dart';

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
    // If we're already loading, skip
    if (_isLoading) return;
    _init(); // Refresh data on socket event
  }

  Future<void> _init() async {
    // Only show full loading if it's the first time
    final shouldShowFullLoading = _user == null;

    if (shouldShowFullLoading) {
      if (mounted) setState(() => _isLoading = true);
    }

    try {
      final user = await _authService.getCurrentUser();
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

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Merchant Dashboard'),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
        ],
      ),
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
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Manage your service center orders and status.',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
              ),
              const SizedBox(height: 24),
              // Shop Status Card
              Card(
                elevation: 0,
                color: _isShopOpen ? Colors.green[50] : Colors.red[50],
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: _isShopOpen ? Colors.green[100]! : Colors.red[100]!,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        _isShopOpen ? Icons.store : Icons.store_outlined,
                        color: _isShopOpen ? Colors.green : Colors.red,
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
                                    ? Colors.green[800]
                                    : Colors.red[800],
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              _isShopOpen
                                  ? 'Visible to customers'
                                  : 'Hidden from customers',
                              style: TextStyle(
                                color: _isShopOpen
                                    ? Colors.green[600]
                                    : Colors.red[600],
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _isShopOpen,
                        onChanged: _toggleShopStatus,
                        activeThumbColor: Colors.green,
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
                    color: Colors.blue,
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    context,
                    title: 'Completed',
                    value: _stats['completedOrders'].toString(),
                    icon: Icons.check_circle_outline,
                    color: Colors.green,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildStatCard(
                context,
                title: 'Pending Bills',
                value: _stats['pendingBills'].toString(),
                icon: Icons.receipt_long,
                color: Colors.orange,
                fullWidth: true,
              ),
              const SizedBox(height: 32),
              Text(
                'Quick Actions',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.list_alt, color: Colors.deepPurple),
                title: const Text('View All Orders'),
                subtitle: const Text('Manage active and past service requests'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).pushNamed('/merchant-orders');
                },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey[200]!),
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(
                  Icons.inventory_2_outlined,
                  color: Colors.deepPurple,
                ),
                title: const Text('Inventory / Stock'),
                subtitle: const Text(
                  'Check and update spare parts availability',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // TODO: Navigate to Stock
                },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey[200]!),
                ),
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
    bool fullWidth = false,
  }) {
    final card = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color.withValues(alpha: 0.8),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );

    if (fullWidth) {
      return SizedBox(width: double.infinity, child: card);
    }
    return Expanded(child: card);
  }
}
