import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../models/booking.dart';
import '../models/message.dart';
import '../services/socket_service.dart';
import '../state/auth_provider.dart';
import '../core/app_colors.dart';

const carzziGreetingMessage = '''Hi 👋 Hope you're doing well!
Welcome to Carzzi Support Chat  🚗
Through this chat, you can easily communicate with your assigned merchant regarding your requests. You will also receive updates here about the approval or rejection of parts submitted.
If you have any questions, need assistance, or want to follow up on a request, feel free to message here anytime — we're here to help you!
Thank you for choosing Carzzi 🙌''';

class ChatPage extends StatefulWidget {
  final Booking booking;

  const ChatPage({super.key, required this.booking});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  late final TextEditingController _messageController;
  late final ScrollController _scrollController;
  final List<Message> _messages = [];
  final ApiClient _api = ApiClient();
  late final SocketService _socketService;
  late final String _bookingId;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _bookingId = widget.booking.id;
    _messageController = TextEditingController();
    _scrollController = ScrollController();
    _socketService = SocketService();
    _setupSocketListeners();
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
          final index = _messages.indexWhere((m) => m.id == message.id);
          if (index != -1) {
            _messages[index] = message;
          } else {
            final tempIndex = _messages.indexWhere(
              (m) =>
                  m.id.startsWith('temp_') &&
                  m.text == message.text &&
                  m.sender.id == message.sender.id,
            );
            if (tempIndex != -1) {
              _messages[tempIndex] = message;
            } else {
              _messages.add(message);
            }
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
      final greetingTime = widget.booking.createdAt != null
          ? DateTime.tryParse(widget.booking.createdAt!) ?? DateTime.now()
          : DateTime.now();

      setState(() {
        _messages.clear();
        _messages.add(
          Message(
            id: 'system_greeting',
            bookingId: _bookingId,
            sender: const MessageSender(
              id: 'carzzi-system-user',
              name: 'Carzzi',
              role: 'system',
            ),
            text: carzziGreetingMessage,
            createdAt: greetingTime,
          ),
        );
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
    if (text.isEmpty || _isSending) return;

    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    _isSending = true;
    _socketService.emit('sendMessage', {'bookingId': _bookingId, 'text': text});

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
    _isSending = false;
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
      await _api.putJson('/approvals/$approvalId', body: {'status': status});
      _socketService.emit('getMessages', {'bookingId': _bookingId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Request ${status.toLowerCase()} successfully'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to $status request: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Container(
      color: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _messages.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final message = _messages[index];
                        final isSelf = message.sender.id == user?.id;
                        return _buildMessageBubble(message, isSelf);
                      },
                    ),
            ),
            _buildMessageInput(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primaryPurple.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.support_agent, color: AppColors.primaryPurple),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Support Chat',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.black,
                  ),
                ),
                Text(
                  'Order #${(widget.booking.orderNumber?.toString() ?? widget.booking.id.substring(widget.booking.id.length - 6)).toUpperCase()}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 64,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          const Text('No messages yet', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Message message, bool isSelf) {
    final isSystemMessage = message.sender.role == 'system';

    if (isSystemMessage) {
      return _buildSystemMessage(message);
    }

    return Align(
      alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: isSelf
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          if (!isSelf && message.sender.name != 'Carzzi')
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 4),
              child: Text(
                message.sender.name,
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ),
          Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            decoration: BoxDecoration(
              color: isSelf ? AppColors.primaryPurple : const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: isSelf ? const Radius.circular(16) : Radius.zero,
                bottomRight: isSelf ? Radius.zero : const Radius.circular(16),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  message.text,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: isSelf ? Colors.white : Colors.black87,
                  ),
                ),
                if (message.type == 'approval' && message.approval != null)
                  _buildApprovalCard(message.approval!, isSelf),
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

  Widget _buildSystemMessage(Message message) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryPurple.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.primaryPurple.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                size: 16,
                color: AppColors.primaryPurple,
              ),
              const SizedBox(width: 8),
              Text(
                message.sender.name,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryPurple,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(message.text, style: const TextStyle(fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildApprovalCard(ApprovalInfo approval, bool isSelf) {
    final isPending = approval.status == 'pending';
    final bool isApproved = approval.status == 'approved';

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPending
              ? Colors.orange.withValues(alpha: 0.5)
              : (isApproved
                    ? Colors.green.withValues(alpha: 0.5)
                    : Colors.red.withValues(alpha: 0.5)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isPending
                    ? Icons.pending_actions
                    : (isApproved ? Icons.check_circle : Icons.cancel),
                color: isPending
                    ? Colors.orange
                    : (isApproved ? Colors.green : Colors.red),
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                'Part Approval - ${approval.status.toUpperCase()}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: isPending
                      ? Colors.orange
                      : (isApproved ? Colors.green : Colors.red),
                ),
              ),
            ],
          ),
          if (approval.partName != null) ...[
            const SizedBox(height: 8),
            Text(
              'Part: ${approval.partName}',
              style: const TextStyle(fontSize: 12),
            ),
          ],
          if (approval.amount != null) ...[
            const SizedBox(height: 4),
            Text(
              'Price: ₹${approval.amount}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ],
          if (isPending && !isSelf) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _handleApprovalAction(
                      approval.approvalId ?? '',
                      'rejected',
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                    ),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _handleApprovalAction(
                      approval.approvalId ?? '',
                      'approved',
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        8,
        8,
        8,
        MediaQuery.of(context).padding.bottom + 8,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                hintStyle: TextStyle(color: Colors.grey.shade500),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: const BoxDecoration(
              color: AppColors.primaryPurple,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: _sendMessage,
            ),
          ),
        ],
      ),
    );
  }
}
