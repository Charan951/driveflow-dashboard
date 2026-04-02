import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../models/booking.dart';
import '../models/message.dart';
import '../services/socket_service.dart';
import '../state/auth_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/env.dart';

class ChatPage extends StatefulWidget {
  final Booking booking;

  const ChatPage({super.key, required this.booking});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Message> _messages = [];
  final ApiClient _api = ApiClient();
  late SocketService _socketService;
  late String _bookingId;

  @override
  void initState() {
    super.initState();
    _bookingId = widget.booking.id;
    _socketService = SocketService();

    _setupSocketListeners();

    // Join room and request existing messages
    _socketService.joinRoom('booking_$_bookingId');
    _socketService.emit('getMessages', {'bookingId': _bookingId});
  }

  void _setupSocketListeners() {
    _socketService.on('receiveMessage', _handleReceiveMessage);
    _socketService.on('loadMessages', _handleLoadMessages);
    _socketService.on('newApproval', _handleNewApproval);
  }

  void _handleNewApproval(dynamic data) {
    if (!mounted) return;
    // When a new approval is received via socket, request messages again to get the approval message
    _socketService.emit('getMessages', {'bookingId': _bookingId});
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('New approval request received')),
    );
  }

  void _handleReceiveMessage(dynamic data) {
    if (!mounted) return;
    if (data != null && data is Map) {
      final message = Message.fromJson(Map<String, dynamic>.from(data));
      if (message.bookingId == _bookingId) {
        setState(() {
          // Check if message already exists (optimistic update)
          final index = _messages.indexWhere((m) => m.id == message.id);
          if (index != -1) {
            _messages[index] = message;
          } else {
            _messages.add(message);
          }
        });
        _scrollToBottom();
      }
    }
  }

  void _handleLoadMessages(dynamic data) {
    if (!mounted) return;
    if (data != null && data is List) {
      final List<Message> loadedMessages = data
          .map((m) => Message.fromJson(Map<String, dynamic>.from(m)))
          .toList();
      setState(() {
        _messages.clear();
        _messages.addAll(loadedMessages);
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    // Emit message to socket
    _socketService.emit('sendMessage', {'bookingId': _bookingId, 'text': text});

    // Optimistically add message
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final newMessage = Message(
      id: tempId,
      bookingId: _bookingId,
      sender: MessageSender(
        id: user.id,
        name: user.name,
        role: user.role ?? 'customer',
      ),
      text: text,
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages.add(newMessage);
    });

    _messageController.clear();
    _scrollToBottom();
  }

  @override
  void dispose() {
    _socketService.off('receiveMessage', _handleReceiveMessage);
    _socketService.off('loadMessages', _handleLoadMessages);
    _socketService.off('newApproval', _handleNewApproval);
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _handleApprovalAction(String approvalId, String status) async {
    try {
      final response = await _api.putJson(
        '/approvals/$approvalId',
        body: {'status': status},
      );
      if (response != null) {
        // Reload messages to update UI
        _socketService.emit('getMessages', {'bookingId': _bookingId});
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Request ${status.toLowerCase()} successfully'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to $status request: $e')),
        );
      }
    }
  }

  String? _resolveImageUrl(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return '${Env.baseUrl}$raw';
    return '${Env.baseUrl}/$raw';
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Service Chat',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              'Order #${widget.booking.orderNumber ?? widget.booking.id.substring(widget.booking.id.length - 6).toUpperCase()}',
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.message_outlined,
                          size: 64,
                          color: Colors.grey.withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Start a conversation',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isSelf = message.sender.id == user?.id;

                      return _buildMessageBubble(message, isSelf, isDark);
                    },
                  ),
          ),
          _buildMessageInput(isDark),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Message message, bool isSelf, bool isDark) {
    return Align(
      alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: isSelf
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.8,
            ),
            decoration: BoxDecoration(
              color: isSelf
                  ? const Color(0xFF2563EB)
                  : (isDark ? const Color(0xFF1E293B) : Colors.white),
              borderRadius: BorderRadius.circular(20).copyWith(
                bottomRight: isSelf
                    ? const Radius.circular(4)
                    : const Radius.circular(20),
                bottomLeft: isSelf
                    ? const Radius.circular(20)
                    : const Radius.circular(4),
              ),
              boxShadow: [
                if (!isSelf)
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
              ],
              border: !isSelf
                  ? Border.all(
                      color: isDark
                          ? Colors.grey.shade800
                          : Colors.grey.shade200,
                    )
                  : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!isSelf)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFF22C55E),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          message.sender.name,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDark
                                ? Colors.grey.shade400
                                : Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  message.text,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: isSelf
                        ? Colors.white
                        : (isDark ? Colors.white : const Color(0xFF0F172A)),
                  ),
                ),
                if (message.type == 'approval' && message.approval != null)
                  _buildApprovalCard(message.approval!, isSelf, isDark),
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '${message.createdAt.hour}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(
                      fontSize: 10,
                      color: isSelf
                          ? Colors.white.withValues(alpha: 0.6)
                          : Colors.grey.shade500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApprovalCard(ApprovalInfo approval, bool isSelf, bool isDark) {
    final bool isPending = approval.status == 'pending';
    final bool isApproved = approval.status == 'approved';
    final String? imageUrl = _resolveImageUrl(approval.image);
    final user = context.read<AuthProvider>().user;

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.black26 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPending
              ? Colors.amber.withValues(alpha: 0.5)
              : (isApproved
                    ? Colors.green.withValues(alpha: 0.5)
                    : Colors.red.withValues(alpha: 0.5)),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (imageUrl != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.contain,
                  width: double.infinity,
                  height: 130, // Smaller fixed height
                  placeholder: (context, url) => Container(
                    height: 130,
                    color: isDark ? Colors.black45 : Colors.grey.shade100,
                    child: const Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                  errorWidget: (context, url, error) => Container(
                    height: 100,
                    color: isDark ? Colors.black45 : Colors.grey.shade100,
                    child: const Icon(Icons.broken_image, color: Colors.grey),
                  ),
                ),
              ),
            ),
          Text(
            approval.partName ?? 'Additional Part',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(
            'Amount: ₹${approval.amount}',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
          const SizedBox(height: 12),
          if (isPending &&
              !isSelf &&
              user?.role == 'customer' &&
              approval.approvalId != null)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () =>
                        _handleApprovalAction(approval.approvalId!, 'Approved'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Approve',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () =>
                        _handleApprovalAction(approval.approvalId!, 'Rejected'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Reject',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            )
          else
            Row(
              children: [
                Icon(
                  isApproved ? Icons.check_circle : Icons.cancel,
                  size: 14,
                  color: isApproved ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 4),
                Text(
                  approval.status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isApproved ? Colors.green : Colors.red,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildMessageInput(bool isDark) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        8,
        16,
        8 + MediaQuery.of(context).viewPadding.bottom,
      ),
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
              ),
              maxLines: null,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _sendMessage,
            icon: const Icon(Icons.send),
            color: const Color(0xFF2563EB),
          ),
        ],
      ),
    );
  }
}
