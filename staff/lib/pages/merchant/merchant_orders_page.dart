import 'package:flutter/material.dart';
import '../../models/booking.dart';
import '../../services/booking_service.dart';
import '../../services/socket_service.dart';
import '../../widgets/merchant/merchant_nav.dart';
import '../../core/app_colors.dart';

class MerchantOrdersPage extends StatefulWidget {
  const MerchantOrdersPage({super.key});

  @override
  State<MerchantOrdersPage> createState() => _MerchantOrdersPageState();
}

class _MerchantOrdersPageState extends State<MerchantOrdersPage> {
  final BookingService _service = BookingService();
  final SocketService _socketService = SocketService();
  List<BookingSummary> _bookings = [];
  bool _isLoading = true;
  String _filter = 'active';
  bool _appliedInitialArgs = false;

  @override
  void initState() {
    super.initState();
    _load();
    _socketService.addListener(_onSocketUpdate);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_appliedInitialArgs) return;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      final initialFilter = args['filter']?.toString();
      if (initialFilter == 'active' ||
          initialFilter == 'completed' ||
          initialFilter == 'all') {
        _filter = initialFilter!;
      }
    }
    _appliedInitialArgs = true;
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
        event.contains('sync:booking')) {
      if (_isLoading) return;
      _load();
    }
  }

  Future<void> _load() async {
    // Only show full loading if we have no bookings yet
    final shouldShowFullLoading = _bookings.isEmpty;

    if (shouldShowFullLoading) {
      if (mounted) setState(() => _isLoading = true);
    }

    try {
      final data = await _service.getMyBookings();
      if (mounted) {
        setState(() {
          _bookings = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to load orders')),
          );
        }
      }
    }
  }

  List<BookingSummary> get _filteredBookings {
    final activeStatuses = [
      'CREATED',
      'ASSIGNED',
      'ACCEPTED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'VEHICLE_AT_MERCHANT',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
    ];

    if (_filter == 'active') {
      return _bookings.where((b) => activeStatuses.contains(b.status)).toList();
    } else if (_filter == 'completed') {
      return _bookings.where((b) => b.status == 'DELIVERED').toList();
    }
    return _bookings;
  }

  @override
  Widget build(BuildContext context) {
    return MerchantScaffold(
      title: 'Service Orders',
      body: Column(
        children: [
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _FilterChip(
                  label: 'Active',
                  selected: _filter == 'active',
                  onSelected: (v) => setState(() => _filter = 'active'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Completed',
                  selected: _filter == 'completed',
                  onSelected: (v) => setState(() => _filter = 'completed'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'All',
                  selected: _filter == 'all',
                  onSelected: (v) => setState(() => _filter = 'all'),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredBookings.isEmpty
                  ? const Center(child: Text('No orders found'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _filteredBookings.length,
                      itemBuilder: (context, index) {
                        final booking = _filteredBookings[index];
                        return _OrderCard(
                          booking: booking,
                          onTap: () {
                            Navigator.of(context).pushNamed(
                              '/merchant-order-detail',
                              arguments: booking.id,
                            );
                          },
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      selectedColor: isDark
          ? AppColors.primaryBlue.withValues(alpha: 0.2)
          : AppColors.primaryPurple.withValues(alpha: 0.1),
      checkmarkColor: isDark ? AppColors.primaryBlue : AppColors.primaryPurple,
      labelStyle: TextStyle(
        color: selected
            ? (isDark ? AppColors.primaryBlue : AppColors.primaryPurple)
            : (isDark ? AppColors.textSecondary : AppColors.textSecondaryLight),
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final BookingSummary booking;
  final VoidCallback onTap;

  const _OrderCard({required this.booking, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order #${booking.orderNumber ?? booking.id.substring(booking.id.length - 6).toUpperCase()}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark
                              ? AppColors.textMuted
                              : AppColors.textMutedLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        booking.serviceName ?? 'General Service',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: isDark
                              ? AppColors.textPrimary
                              : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                  _StatusBadge(
                    status: booking.status,
                    services: booking.services,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                booking.vehicleName ?? 'Unknown Vehicle',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark
                      ? AppColors.textSecondary
                      : AppColors.textSecondaryLight,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 16,
                        color: isDark
                            ? AppColors.textMuted
                            : AppColors.textMutedLight,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        booking.date != null
                            ? DateTime.parse(
                                booking.date!,
                              ).toLocal().toString().split(' ')[0]
                            : 'N/A',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark
                              ? AppColors.textMuted
                              : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                  Icon(
                    Icons.chevron_right,
                    color: isDark
                        ? AppColors.textMuted
                        : AppColors.textMutedLight,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  final List<dynamic>? services;

  const _StatusBadge({required this.status, this.services});

  @override
  Widget build(BuildContext context) {
    Color color = Colors.grey;
    switch (status) {
      case 'CREATED':
      case 'ASSIGNED':
        color = AppColors.primaryBlue;
        break;
      case 'ACCEPTED':
      case 'REACHED_CUSTOMER':
      case 'VEHICLE_PICKED':
        color = AppColors.warning;
        break;
      case 'REACHED_MERCHANT':
      case 'VEHICLE_AT_MERCHANT':
      case 'SERVICE_STARTED':
        color = AppColors.primaryBlue;
        break;
      case 'SERVICE_COMPLETED':
        color = Colors.indigo;
        break;
      case 'OUT_FOR_DELIVERY':
        color = Colors.teal;
        break;
      case 'DELIVERED':
      case 'COMPLETED':
        color = AppColors.success;
        break;
      case 'CANCELLED':
        color = AppColors.error;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        BookingDetail.getStatusLabel(status, services: services),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
