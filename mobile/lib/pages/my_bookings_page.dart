import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_colors.dart';
import '../core/app_spacing.dart';
import '../core/api_client.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../services/socket_service.dart';
import '../state/auth_provider.dart';
import '../widgets/customer_drawer.dart';

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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });

    // Listen to socket updates for real-time refresh
    final socket = context.read<SocketService>();
    socket.addListener(_onSocketUpdate);
  }

  @override
  void dispose() {
    // Remove listener
    try {
      final socket = context.read<SocketService>();
      socket.removeListener(_onSocketUpdate);
    } catch (_) {
      // Might fail if context is no longer available or Provider not found
    }
    super.dispose();
  }

  void _onSocketUpdate() {
    final event = context.read<SocketService>().value;
    if (event == null) return;

    if ((event.contains('sync:booking') ||
            event.contains('sync:user') ||
            event.contains('sync:vehicle') ||
            event == 'booking_updated' ||
            event == 'booking_created' ||
            event == 'booking_cancelled') &&
        mounted) {
      _load();
    }
  }

  Future<void> _load() async {
    if (!mounted) return;

    // Only show full loading if we have no bookings yet
    final shouldShowFullLoading = _bookings.isEmpty;

    setState(() {
      _loading = shouldShowFullLoading;
      _error = null;
    });

    try {
      final items = await _service.listMyBookings(forceRefresh: true);
      items.sort((a, b) {
        // Primary: Created At (descending) - Most recently created first
        final ca = _parseDate(a.createdAt ?? '') ?? DateTime(1900);
        final cb = _parseDate(b.createdAt ?? '') ?? DateTime(1900);
        final cmp = cb.compareTo(ca);
        if (cmp != 0) return cmp;

        // Secondary: Service Date (descending)
        final da = _parseDate(a.date) ?? DateTime(1900);
        final db = _parseDate(b.date) ?? DateTime(1900);
        final cmpDate = db.compareTo(da);
        if (cmpDate != 0) return cmpDate;

        // Fallback: ID (descending)
        return b.id.compareTo(a.id);
      });
      if (mounted) setState(() => _bookings = items);
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        if (!mounted) return;
        final auth = context.read<AuthProvider>();
        await auth.logout();
        if (mounted) {
          Navigator.of(
            context,
          ).pushNamedAndRemoveUntil('/login', (route) => false);
        }
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
        return 'Assigned';
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
      case 'SERVICE_STARTED':
      case 'SERVICE_IN_PROGRESS':
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Service is completed.';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Vehicle Delivered';
      case 'COMPLETED':
        return 'Service Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'CREATED':
      case 'ASSIGNED':
        return AppColors.primaryBlue;
      case 'ACCEPTED':
      case 'REACHED_CUSTOMER':
        return AppColors.primaryBlueSoft;
      case 'VEHICLE_PICKED':
      case 'REACHED_MERCHANT':
      case 'VEHICLE_AT_MERCHANT':
      case 'SERVICE_STARTED':
      case 'SERVICE_IN_PROGRESS':
        return AppColors.primaryBlue;
      case 'SERVICE_COMPLETED':
      case 'OUT_FOR_DELIVERY':
        return AppColors.warning;
      case 'DELIVERED':
      case 'COMPLETED':
        return AppColors.success;
      case 'CANCELLED':
        return AppColors.error;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: Navigator.of(context).canPop(),
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/customer', (route) => false);
      },
      child: Scaffold(
        backgroundColor: isDark
            ? AppColors.backgroundPrimary
            : AppColors.backgroundPrimaryLight,
        drawer: const CustomerDrawer(currentRouteName: '/bookings'),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          automaticallyImplyLeading: false,
          titleSpacing: 0,
          title: Row(
            children: [
              Builder(
                builder: (context) => Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.28)
                          : Colors.black.withValues(alpha: 0.16),
                      width: 1.0,
                    ),
                  ),
                  child: IconButton(
                    icon: Icon(
                      Icons.menu,
                      color: isDark ? Colors.white : AppColors.textPrimaryLight,
                    ),
                    tooltip: 'Menu',
                    onPressed: () => Scaffold.of(context).openDrawer(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'My Bookings',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: isDark
                      ? AppColors.textPrimary
                      : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              onPressed: _load,
              icon: Icon(
                Icons.refresh,
                color: isDark
                    ? AppColors.textPrimary
                    : AppColors.textPrimaryLight,
              ),
              tooltip: 'Refresh',
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: const [
                    Padding(
                      padding: EdgeInsets.only(top: 32),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ],
                )
              : _error != null
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: AppSpacing.edgeInsetsAllDefault,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.section),
                      child: Column(
                        children: [
                          Text(
                            'Failed to load bookings',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: isDark
                                      ? AppColors.textPrimary
                                      : AppColors.textPrimaryLight,
                                ),
                          ),
                          AppSpacing.verticalSmall,
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: isDark
                                      ? AppColors.textSecondary
                                      : AppColors.textSecondaryLight,
                                ),
                          ),
                          AppSpacing.verticalMedium,
                          OutlinedButton(
                            onPressed: _load,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : _bookings.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: AppSpacing.edgeInsetsAllDefault,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.section),
                      child: Center(
                        child: Text(
                          'No bookings yet',
                          style: TextStyle(
                            color: isDark
                                ? AppColors.textSecondary
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                      ),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: AppSpacing.edgeInsetsAllDefault,
                  itemCount: _bookings.length,
                  separatorBuilder: (context, _) => AppSpacing.verticalMedium,
                  itemBuilder: (context, index) {
                    final b = _bookings[index];
                    final primaryService = b.services.isNotEmpty
                        ? b.services.first
                        : null;
                    return _BookingCard(
                      id: b.id,
                      orderNumber: b.orderNumber,
                      dateTimeLabel: _formatDateTime(context, b.date),
                      title: primaryService?.name ?? 'Service',
                      categoryLabel: primaryService?.category,
                      subtitle: b.vehicle != null
                          ? '${b.vehicle!.make} ${b.vehicle!.model}${b.vehicle!.variant != null && b.vehicle!.variant!.isNotEmpty ? ' ${b.vehicle!.variant}' : ''} • ${b.vehicle!.licensePlate}'
                          : null,
                      extra: b.services.length > 1
                          ? '+${b.services.length - 1} more'
                          : null,
                      amount: b.totalAmount,
                      statusLabel: _statusLabel(b.status),
                      statusColor: _statusColor(b.status),
                      onTap: () => Navigator.pushNamed(
                        context,
                        '/track',
                        arguments: b.id,
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

class _BookingCard extends StatefulWidget {
  final String id;
  final int? orderNumber;
  final String dateTimeLabel;
  final String title;
  final String? categoryLabel;
  final String? subtitle;
  final String? extra;
  final num amount;
  final String statusLabel;
  final Color statusColor;
  final VoidCallback onTap;

  const _BookingCard({
    required this.id,
    this.orderNumber,
    required this.dateTimeLabel,
    required this.title,
    required this.amount,
    required this.statusLabel,
    required this.statusColor,
    required this.onTap,
    this.categoryLabel,
    this.subtitle,
    this.extra,
  });

  @override
  State<_BookingCard> createState() => _BookingCardState();
}

class _BookingCardState extends State<_BookingCard> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final neutralChipColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.05);
    final isRateable = widget.statusLabel == 'Delivered';

    IconData iconForTitle(String title) {
      final v = title.toLowerCase();
      if (v.contains('wash') || v.contains('polish') || v.contains('detail')) {
        return Icons.local_car_wash_outlined;
      }
      if (v.contains('battery') || v.contains('tire') || v.contains('tyre')) {
        return Icons.battery_charging_full_outlined;
      }
      if (v.contains('engine') || v.contains('repair')) {
        return Icons.settings_suggest_outlined;
      }
      if (v.contains('insurance') || v.contains('essentials')) {
        return Icons.shield_outlined;
      }
      return Icons.miscellaneous_services_outlined;
    }

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
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
              color: isDark
                  ? Colors.black.withValues(alpha: 0.4)
                  : Colors.black.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.04)
                            : Colors.black.withValues(alpha: 0.03),
                        border: Border.all(
                          color: isDark
                              ? AppColors.borderColor
                              : AppColors.borderColorLight,
                        ),
                      ),
                      child: Icon(
                        iconForTitle(widget.title),
                        color: isDark
                            ? AppColors.textSecondary
                            : AppColors.textSecondaryLight,
                        size: 22,
                      ),
                    ),
                    AppSpacing.horizontalMedium,
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Booking #${widget.orderNumber ?? widget.id}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: isDark
                                      ? AppColors.textPrimary
                                      : AppColors.textPrimaryLight,
                                ),
                          ),
                          if (widget.categoryLabel != null &&
                              widget.categoryLabel!.trim().isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.small,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(999),
                                  color: neutralChipColor,
                                ),
                                child: Text(
                                  widget.categoryLabel!.toUpperCase(),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.labelSmall
                                      ?.copyWith(
                                        color: isDark
                                            ? AppColors.textSecondary
                                            : AppColors.textSecondaryLight,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.6,
                                      ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        gradient: LinearGradient(
                          colors: [
                            widget.statusColor.withValues(alpha: 0.25),
                            Color.lerp(
                              widget.statusColor,
                              Colors.white,
                              0.18,
                            )!.withValues(alpha: 0.32),
                          ],
                          begin: const Alignment(-1, 0),
                          end: const Alignment(1, 0),
                        ),
                      ),
                      child: Text(
                        widget.statusLabel,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                AppSpacing.verticalSmall,
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 16,
                      color: isDark
                          ? AppColors.textSecondary
                          : AppColors.textSecondaryLight,
                    ),
                    AppSpacing.horizontalSmall,
                    Text(
                      widget.dateTimeLabel,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isDark
                            ? AppColors.textSecondary
                            : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
                AppSpacing.verticalSmall,
                Text(
                  widget.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark
                        ? AppColors.textPrimary
                        : AppColors.textPrimaryLight,
                  ),
                ),
                if (widget.subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    widget.subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isDark
                          ? AppColors.textSecondary
                          : AppColors.textSecondaryLight,
                    ),
                  ),
                ],
                if (widget.extra != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    widget.extra!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isDark
                          ? AppColors.textMuted
                          : AppColors.textMutedLight,
                    ),
                  ),
                ],
                AppSpacing.verticalSmall,
                Row(
                  children: [
                    Text(
                      '₹${widget.amount}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: isDark
                            ? AppColors.textPrimary
                            : AppColors.textPrimaryLight,
                      ),
                    ),
                    const Spacer(),
                    if (isRateable)
                      Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.amber,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.star, size: 14, color: Colors.black87),
                              SizedBox(width: 4),
                              Text(
                                'Rate Now',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    Icon(
                      Icons.chevron_right,
                      color: isDark
                          ? AppColors.textSecondary
                          : AppColors.textSecondaryLight,
                    ),
                  ],
                ),
              ],
            ),
      ),
    );
  }
}
