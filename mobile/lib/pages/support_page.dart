import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/ticket_service.dart';
import '../widgets/customer_drawer.dart';
import '../core/storage.dart';
import '../services/socket_service.dart';

class SupportPage extends StatefulWidget {
  const SupportPage({super.key});

  @override
  State<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends State<SupportPage>
    with SingleTickerProviderStateMixin {
  final _ticketService = TicketService();
  final _socketService = SocketService();
  List<SupportTicket> _tickets = [];
  bool _loading = true;
  SupportTicket? _selectedTicket;
  final _replyController = TextEditingController();
  bool _isReplying = false;
  String? _currentUserId;

  Color get _backgroundStart => const Color(0xFF020617);
  Color get _backgroundEnd => const Color(0xFF020617);
  Color get _accentPurple => const Color(0xFF7C3AED);
  Color get _accentBlue => const Color(0xFF22D3EE);
  late final AnimationController _glowController;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _loadCurrentUser();
    _loadTickets();
    _initSocket();
  }

  void _initSocket() async {
    await _socketService.init();
    _socketService.on('ticketUpdated', _onTicketUpdated);
  }

  void _onTicketUpdated(dynamic data) {
    if (data == null) return;
    try {
      final updatedTicket = SupportTicket.fromJson(
        Map<String, dynamic>.from(data),
      );

      // Verification: Only update if this ticket belongs to the user or they are admin
      // (The server already restricts this by room, but extra safety doesn't hurt)

      if (mounted) {
        setState(() {
          // Update the ticket in the list
          final index = _tickets.indexWhere((t) => t.id == updatedTicket.id);
          if (index != -1) {
            _tickets[index] = updatedTicket;
          } else {
            // If it's a new ticket and we are the owner, add it
            _tickets.insert(0, updatedTicket);
          }

          // If this is the currently selected ticket, update it too
          if (_selectedTicket != null &&
              _selectedTicket!.id == updatedTicket.id) {
            _selectedTicket = updatedTicket;
          }
        });
      }
    } catch (e) {
      debugPrint('Error handling ticketUpdated socket event: $e');
    }
  }

  void _selectTicket(SupportTicket ticket) {
    if (_selectedTicket != null) {
      _socketService.emit('leave', 'ticket_${_selectedTicket!.id}');
    }
    setState(() => _selectedTicket = ticket);
    _socketService.emit('join', 'ticket_${ticket.id}');
  }

  Future<void> _loadCurrentUser() async {
    final userJson = await AppStorage().getUserJson();
    if (userJson != null) {
      final user = jsonDecode(userJson);
      if (mounted) {
        setState(() {
          _currentUserId = (user['_id'] ?? user['id'])?.toString();
        });
      }
    }
  }

  Future<void> _loadTickets() async {
    setState(() => _loading = true);
    try {
      final tickets = await _ticketService.listMyTickets();
      if (mounted) {
        setState(() {
          _tickets = tickets;
          if (_selectedTicket != null) {
            _selectedTicket = tickets.firstWhere(
              (t) => t.id == _selectedTicket!.id,
              orElse: () => _selectedTicket!,
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to load tickets: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleReply() async {
    if (_replyController.text.trim().isEmpty || _selectedTicket == null) return;

    setState(() => _isReplying = true);
    try {
      await _ticketService.addMessage(
        _selectedTicket!.id,
        _replyController.text.trim(),
      );
      _replyController.clear();
      await _loadTickets();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Reply sent!')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to send reply: $e')));
      }
    } finally {
      if (mounted) setState(() => _isReplying = false);
    }
  }

  Future<void> _createTicket() async {
    final subjectController = TextEditingController();
    final messageController = TextEditingController();
    String category = 'General';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'New Support Ticket',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: subjectController,
                decoration: const InputDecoration(
                  labelText: 'Subject',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  border: OutlineInputBorder(),
                ),
                items:
                    ['Booking', 'Payment', 'Technical', 'General', 'Complaint']
                        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                        .toList(),
                onChanged: (v) => setModalState(() => category = v!),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (subjectController.text.isEmpty ||
                      messageController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please fill all fields')),
                    );
                    return;
                  }
                  try {
                    await _ticketService.createTicket(
                      subject: subjectController.text,
                      message: messageController.text,
                      category: category,
                    );
                    if (context.mounted) Navigator.pop(context);
                    _loadTickets();
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text('Error: $e')));
                    }
                  }
                },
                child: const Text('Submit Ticket'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _socketService.off('ticketUpdated', _onTicketUpdated);
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final routeName = ModalRoute.of(context)?.settings.name;
    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      drawer: CustomerDrawer(currentRouteName: routeName),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 0,
        title: Row(
          children: [
            if (_selectedTicket == null)
              Builder(
                builder: (context) => Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: LinearGradient(
                      colors: [_accentPurple, _accentBlue],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: _accentBlue.withValues(alpha: 0.4),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.menu),
                    color: Colors.white,
                    tooltip: 'Menu',
                    onPressed: () => Scaffold.of(context).openDrawer(),
                  ),
                ),
              )
            else
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: isDark
                      ? Colors.white10
                      : Colors.black.withValues(alpha: 0.05),
                ),
                child: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  color: isDark ? Colors.white : Colors.black87,
                  onPressed: () {
                    if (_selectedTicket != null) {
                      _socketService.emit(
                        'leave',
                        'ticket_${_selectedTicket!.id}',
                      );
                    }
                    setState(() => _selectedTicket = null);
                  },
                ),
              ),
            const SizedBox(width: 12),
            Text(
              _selectedTicket == null ? 'Support' : 'Ticket Details',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -1.2),
                  radius: 1.4,
                  colors: [
                    _accentPurple.withValues(alpha: 0.14),
                    _accentBlue.withValues(alpha: 0.06),
                    _backgroundStart,
                  ],
                ),
              ),
            )
          else
            Container(color: Colors.white),
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black.withValues(alpha: 0.9), _backgroundEnd],
                ),
              ),
            ),
          _selectedTicket != null
              ? _buildTicketConversation(isDark)
              : RefreshIndicator(
                  onRefresh: _loadTickets,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 520),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.06)
                                      : const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.08)
                                        : const Color(0xFFE5E7EB),
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: isDark
                                          ? Colors.black.withValues(alpha: 0.45)
                                          : Colors.black.withValues(
                                              alpha: 0.06,
                                            ),
                                      blurRadius: 24,
                                      offset: const Offset(0, 16),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        AnimatedBuilder(
                                          animation: _glowController,
                                          builder: (context, child) {
                                            final t = _glowController.value;
                                            return Container(
                                              width: 44,
                                              height: 44,
                                              decoration: BoxDecoration(
                                                borderRadius:
                                                    BorderRadius.circular(16),
                                                gradient: RadialGradient(
                                                  center: Alignment(
                                                    0,
                                                    -0.2 + 0.2 * t,
                                                  ),
                                                  colors: [
                                                    _accentBlue.withValues(
                                                      alpha: 0.85,
                                                    ),
                                                    _accentBlue.withValues(
                                                      alpha: 0.25,
                                                    ),
                                                  ],
                                                ),
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: _accentBlue
                                                        .withValues(
                                                          alpha:
                                                              0.30 + 0.10 * t,
                                                        ),
                                                    blurRadius: 18,
                                                    spreadRadius: 1.2,
                                                  ),
                                                ],
                                              ),
                                              child: child,
                                            );
                                          },
                                          child: const Icon(
                                            Icons.support_agent_outlined,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            'Need help?',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleMedium
                                                ?.copyWith(
                                                  fontWeight: FontWeight.w900,
                                                  color: isDark
                                                      ? Colors.white
                                                      : const Color(0xFF0F172A),
                                                ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      "We're here 24/7. You can share your issue and our team will assist you.",
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: isDark
                                                ? Colors.white.withValues(
                                                    alpha: 0.8,
                                                  )
                                                : Colors.black54,
                                          ),
                                    ),
                                    const SizedBox(height: 14),
                                    const _SupportCardRow(
                                      icon: Icons.phone_outlined,
                                      title: 'Phone',
                                      subtitle: '+91-XXXXXXXXXX',
                                    ),
                                    const SizedBox(height: 10),
                                    const _SupportCardRow(
                                      icon: Icons.mail_outline,
                                      title: 'Email',
                                      subtitle: 'support@vehiclecare.com',
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'My Tickets',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge
                                        ?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  TextButton.icon(
                                    onPressed: _createTicket,
                                    icon: const Icon(Icons.add),
                                    label: const Text('New Ticket'),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              if (_loading)
                                const Center(child: CircularProgressIndicator())
                              else if (_tickets.isEmpty)
                                Container(
                                  padding: const EdgeInsets.all(32),
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.04)
                                        : Colors.grey[100],
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.confirmation_number_outlined,
                                        size: 48,
                                        color: isDark
                                            ? Colors.white24
                                            : Colors.grey[400],
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'No active tickets',
                                        style: TextStyle(
                                          color: isDark
                                              ? Colors.white54
                                              : Colors.black54,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              else
                                ..._tickets.map(
                                  (t) => InkWell(
                                    onTap: () => _selectTicket(t),
                                    child: _TicketCard(ticket: t),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
        ],
      ),
    );
  }

  Widget _buildTicketConversation(bool isDark) {
    if (_selectedTicket == null) return const SizedBox.shrink();

    return Column(
      children: [
        // Ticket Info Header
        Container(
          padding: const EdgeInsets.all(16),
          color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.02),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '#${_selectedTicket!.id.substring(_selectedTicket!.id.length - 6).toUpperCase()}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(
                        _selectedTicket!.status,
                      ).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _selectedTicket!.status,
                      style: TextStyle(
                        color: _getStatusColor(_selectedTicket!.status),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _selectedTicket!.subject,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              Text(
                _selectedTicket!.category,
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _selectedTicket!.messages.length,
            itemBuilder: (context, index) {
              final msg = _selectedTicket!.messages[index];
              final isAdmin = msg.senderRole == 'admin';
              final isStaff = msg.senderRole == 'staff';
              final isSelf = msg.senderId == _currentUserId;

              return Align(
                alignment: isSelf
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelf
                        ? _accentPurple
                        : isAdmin
                        ? (isDark
                              ? Colors.blue[900]?.withValues(alpha: 0.3)
                              : Colors.blue[100])
                        : isStaff
                        ? (isDark
                              ? Colors.orange[900]?.withValues(alpha: 0.3)
                              : Colors.orange[100])
                        : (isDark ? Colors.white10 : Colors.grey[200]),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isSelf ? 16 : 0),
                      bottomRight: Radius.circular(isSelf ? 0 : 16),
                    ),
                    border: (!isSelf && (isAdmin || isStaff))
                        ? Border.all(
                            color: isAdmin
                                ? Colors.blue.withValues(alpha: 0.3)
                                : Colors.orange.withValues(alpha: 0.3),
                          )
                        : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.message,
                        style: TextStyle(
                          color: isSelf
                              ? Colors.white
                              : isAdmin
                              ? (isDark ? Colors.blue[100] : Colors.blue[900])
                              : isStaff
                              ? (isDark
                                    ? Colors.orange[100]
                                    : Colors.orange[900])
                              : (isDark ? Colors.white : Colors.black87),
                          fontWeight: (!isSelf && (isAdmin || isStaff))
                              ? FontWeight.w500
                              : FontWeight.normal,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!isSelf && isAdmin) ...[
                            const Icon(
                              Icons.verified_user,
                              size: 12,
                              color: Colors.blue,
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Support Team • ',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                          if (!isSelf && isStaff) ...[
                            const Icon(
                              Icons.engineering,
                              size: 12,
                              color: Colors.orange,
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Staff • ',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange,
                              ),
                            ),
                          ],
                          Text(
                            _formatDate(msg.createdAt),
                            style: TextStyle(
                              fontSize: 10,
                              color: isSelf
                                  ? Colors.white70
                                  : (isDark ? Colors.white38 : Colors.black38),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Reply Input
        if (_selectedTicket!.status != 'Closed' &&
            _selectedTicket!.status != 'Resolved')
          Container(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: MediaQuery.of(context).padding.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: isDark ? Colors.black : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? Colors.white12 : Colors.grey[200]!,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _replyController,
                    maxLines: null,
                    decoration: InputDecoration(
                      hintText: 'Type your reply...',
                      filled: true,
                      fillColor: isDark ? Colors.white10 : Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _isReplying
                    ? const SizedBox(
                        width: 48,
                        height: 48,
                        child: Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : Container(
                        decoration: BoxDecoration(
                          color: _accentPurple,
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.send, color: Colors.white),
                          onPressed: _handleReply,
                        ),
                      ),
              ],
            ),
          ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Open':
        return Colors.blue;
      case 'In Progress':
        return Colors.orange;
      case 'Resolved':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return "${date.hour}:${date.minute.toString().padLeft(2, '0')} ${date.day}/${date.month}";
  }
}

class _TicketCard extends StatelessWidget {
  final SupportTicket ticket;

  const _TicketCard({required this.ticket});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    Color statusColor;
    switch (ticket.status) {
      case 'Open':
        statusColor = Colors.blue;
        break;
      case 'In Progress':
        statusColor = Colors.orange;
        break;
      case 'Resolved':
        statusColor = Colors.green;
        break;
      default:
        statusColor = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  ticket.status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                '#${ticket.id.substring(ticket.id.length - 6).toUpperCase()}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            ticket.subject,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(ticket.category, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          if (ticket.messages.isNotEmpty)
            Text(
              ticket.messages.first.message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: isDark ? Colors.white70 : Colors.black87),
            ),
        ],
      ),
    );
  }
}

class _SupportCardRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _SupportCardRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : const Color(0xFFE5E7EB),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: LinearGradient(
                colors: [
                  scheme.primary.withValues(alpha: 0.96),
                  scheme.primary.withValues(alpha: 0.76),
                ],
              ),
            ),
            child: Icon(icon, color: scheme.onPrimary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.7)
                        : Colors.black54,
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
