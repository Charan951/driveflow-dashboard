import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/app_colors.dart';
import '../services/notification_service.dart';

class NotificationsPage extends StatefulWidget {
  final bool isMerchant;

  const NotificationsPage({super.key, this.isMerchant = false});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final NotificationService _notificationService = NotificationService();
  bool _loading = true;
  List<NotificationItem> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await _notificationService.listMyNotifications();
      if (!mounted) return;
      setState(() => _items = items);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load notifications')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openNotification(NotificationItem item) async {
    try {
      if (!item.isRead) {
        await _notificationService.markAsRead(item.id);
      }
    } catch (_) {}

    if (!mounted) return;
    final orderId = item.orderId ?? item.bookingId;
    if (orderId == null || orderId.isEmpty) return;

    final targetRoute = widget.isMerchant ? '/merchant-order-detail' : '/order';
    Navigator.pushNamed(context, targetRoute, arguments: orderId);
  }

  Future<void> _clearAllNotifications() async {
    if (_items.isEmpty) return;
    final shouldClear =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Clear all notifications?'),
            content: const Text('This will remove all notifications.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Clear All'),
              ),
            ],
          ),
        ) ??
        false;

    if (!shouldClear) return;
    try {
      await _notificationService.clearAll();
      if (!mounted) return;
      setState(() => _items = []);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('All notifications cleared')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to clear notifications')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: _items.isEmpty ? null : _clearAllNotifications,
            child: const Text('Clear All'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
          ? Center(
              child: Text(
                'No notifications yet',
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: _items.length,
                separatorBuilder: (_, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = _items[index];
                  final hasOrder = (item.orderId ?? item.bookingId)?.isNotEmpty == true;
                  return InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: hasOrder ? () => _openNotification(item) : null,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.backgroundSecondary : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: item.isRead
                              ? (isDark
                                    ? AppColors.borderColor
                                    : const Color(0xFFE5E7EB))
                              : (isDark
                                    ? AppColors.primaryPurple.withValues(alpha: 0.5)
                                    : const Color(0xFFC7D2FE)),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(top: 6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: item.isRead
                                  ? (isDark ? Colors.grey[600] : Colors.grey[400])
                                  : AppColors.primaryPurple,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title.isEmpty ? 'Notification' : item.title,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  item.message,
                                  style: TextStyle(
                                    color: isDark
                                        ? Colors.grey[300]
                                        : const Color(0xFF374151),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  DateFormat('dd MMM, hh:mm a').format(item.createdAt),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark
                                        ? Colors.grey[500]
                                        : const Color(0xFF6B7280),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (hasOrder)
                            Icon(
                              Icons.chevron_right_rounded,
                              color: isDark ? Colors.grey[500] : Colors.grey[400],
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
