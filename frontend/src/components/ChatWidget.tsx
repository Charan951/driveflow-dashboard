import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Plus, AlertTriangle } from 'lucide-react';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { updateApprovalStatus } from '@/services/approvalService';
import { toast } from 'sonner';
import AddPartModal from './merchant/AddPartModal';
import { useLocation } from 'react-router-dom';

const CARZZI_GREETING_MESSAGE = `Hi 👋 Hope you’re doing well! 
Welcome to Carzzi Support Chat  🚗 
Through this chat, you can easily communicate with your assigned merchant regarding your requests. You will also receive updates here about the approval or rejection of parts  submitted. 
If you have any questions, need assistance, or want to follow up on a request, feel free to message here anytime — we’re here to help you! 
Thank you for choosing Carzzi 🙌`;

// This should ideally come from a config or backend, but for now, we'll use a placeholder
const CARZZI_SENDER_ID = 'carzzi-system-user'; 
const CARZZI_SENDER_NAME = 'Carzzi';
const CARZZI_SENDER_ROLE = 'system';

interface Message {
  _id: string;
  bookingId: string;
  sender: {
    _id: string;
    name: string;
    role: string;
  };
  text: string;
  type?: 'text' | 'approval';
  recipientRole?: 'all' | 'customer' | 'merchant';
  approval?: {
    partName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    approvalId: string;
    image?: string;
  };
  createdAt: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
}

interface ChatWidgetProps {
  bookingId: string;
  status: string;
  onUpdate?: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ bookingId, status, onUpdate }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [hasSentGreeting, setHasSentGreeting] = useState(false);
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use refs to track isOpen and isMinimized for socket callbacks
  const isOpenRef = useRef(isOpen);
  const isMinimizedRef = useRef(isMinimized);

  useEffect(() => {
    isOpenRef.current = isOpen;
    isMinimizedRef.current = isMinimized;
    
    // Reset unread count when chat is opened and not minimized
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const handleStatus = () => setIsConnected(socketService.isConnected());
    socketService.on('connect', handleStatus);
    socketService.on('disconnect', handleStatus);
    // Initial check
    handleStatus();
    
    return () => {
      socketService.off('connect', handleStatus);
      socketService.off('disconnect', handleStatus);
    };
  }, []);

  const isEnabled = ![
    'CREATED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
  ].includes(status);
  const isAdminOrStaffDashboard =
    location.pathname === '/dashboard' &&
    (user?.role === 'admin' || user?.role === 'staff');

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!isEnabled) {
      setIsOpen(false);
      return;
    }

    socketService.connect();
    socketService.joinRoom(`booking_${bookingId}`);
    
    const handleReceiveMessage = (message: any) => {
        // Filter out messages not meant for the current user's role
        const role = user?.role;
        const msgRecipientRole = message.recipientRole;

        if (msgRecipientRole === 'customer') {
          if (role === 'merchant' || role === 'staff') {
            return;
          }
        } else if (msgRecipientRole === 'merchant') {
          if (role === 'customer') {
            return;
          }
        }

        setMessages((prev) => {
        // 1. Check if we already have this message (by real ID)
        const existingIndex = prev.findIndex(m => m._id === message._id);
        if (existingIndex !== -1) {
          const newMessages = [...prev];
          newMessages[existingIndex] = message;
          return newMessages;
        }

        // 2. Check if this is a message we sent (matching text and sender) to replace temp
        const tempIndex = prev.findIndex(m => {
          const isTemp = m._id.startsWith('temp_');
          const textMatches = m.text.trim() === message.text.trim();
          const senderMatches = String(m.sender._id) === String(message.sender._id);
          return isTemp && textMatches && senderMatches;
        });

        if (tempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[tempIndex] = message;
          return newMessages;
        }

        // Only increment unread if not self and chat is closed or minimized
        const isSelf = String(message.sender._id) === String(user?._id);
        if (!isSelf && (!isOpenRef.current || isMinimizedRef.current)) {
          setUnreadCount(prev => prev + 1);
        }

        return [...prev, message];
      });
    };

    const handleLoadMessages = (loadedMessages: any[]) => {
      const role = user?.role;
      const filteredMessages = loadedMessages.filter((msg: any) => {
        if (msg.recipientRole === 'customer') {
          return role !== 'merchant' && role !== 'staff';
        }
        if (msg.recipientRole === 'merchant') {
          return role !== 'customer';
        }
        return true;
      });

      setMessages(filteredMessages);
      // When messages are first loaded, if chat is closed/minimized, set total as unread
      if (!isOpenRef.current || isMinimizedRef.current) {
        setUnreadCount(filteredMessages.length);
      }
    };

    socketService.on('receiveMessage', handleReceiveMessage);
    socketService.on('loadMessages', handleLoadMessages);

    // Emit after listeners are attached
    socketService.emit('getMessages', { bookingId });

    return () => {
      socketService.off('receiveMessage', handleReceiveMessage);
      socketService.off('loadMessages', handleLoadMessages);
    };
  }, [bookingId, isEnabled]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Multiple attempts to scroll to ensure it works after animation and image loads
      const timer1 = setTimeout(scrollToBottom, 100);
      const timer2 = setTimeout(scrollToBottom, 300);
      const timer3 = setTimeout(scrollToBottom, 600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen, isMinimized, messages]);

  if (!isEnabled || isAdminOrStaffDashboard) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socketService.emit('sendMessage', {
      bookingId,
      text: inputText,
    });

    // Optimistically add the message to the UI
    const tempId = `temp_${Date.now()}`;
    const newMessage: Message = {
      _id: tempId,
      bookingId,
      sender: {
        _id: user!._id,
        name: user!.name,
        role: user!.role,
      },
      text: inputText,
      createdAt: new Date().toISOString(),
      senderId: user!._id,
      senderName: user!.name,
      senderRole: user!.role,
    };
    setMessages((prev) => [...prev, newMessage]);

    setInputText('');
  };

  const handleApprove = async (approvalId: string) => {
    try {
      await updateApprovalStatus(approvalId, 'Approved');
      toast.success('Part approved');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to approve part');
    }
  };

  const handleReject = async (approvalId: string) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return;
    try {
      await updateApprovalStatus(approvalId, 'Rejected', reason || undefined);
      toast.success('Part rejected');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to reject part');
    }
  };

  return (
    <>
      {isPartModalOpen && (
        <AddPartModal 
          bookingId={bookingId} 
          onClose={() => setIsPartModalOpen(false)} 
          onUpdate={() => {
            if (onUpdate) onUpdate();
          }}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{
                opacity: 1, 
                scale: 1, 
                y: 0,
                height: isMinimized ? '44px' : '400px'
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 transition-all duration-300",
                "w-[280px] sm:w-[320px]"
              )}
            >
              {/* Header */}
              <div className="px-3 py-2 bg-primary text-primary-foreground flex items-center justify-between shadow-sm min-h-[44px] relative w-full">
                {/* Left side: Connection status */}
                <div className="flex items-center gap-2 relative z-10">
                  <div className="relative">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                    )} />
                    {isConnected && (
                      <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                    )}
                  </div>
                  {!isConnected && <span className="text-[8px] font-medium opacity-80 uppercase tracking-widest">(Offline)</span>}
                </div>

                {/* Center: Service Chat title */}
                <h3 className="font-bold text-xs tracking-tight absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  Service Chat
                </h3>

                {/* Right side: Placeholder for balance */}
                <div className="w-8 h-8 relative z-10" />
              </div>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <div 
                    ref={scrollRef}
                    className="flex-1 w-full overflow-y-auto p-2.5 space-y-2.5 bg-muted/20"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground/60">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-2">
                          <MessageSquare className="w-5 h-5 opacity-40" />
                        </div>
                        <p className="text-[10px] font-medium">Start a conversation.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isSelf = msg.sender._id === user?._id;
                        return (
                          <div
                            key={msg._id}
                            className={cn("flex", isSelf ? "justify-end" : "justify-start")}
                          >
                            <div className={cn(
                              "max-w-[75%] p-2 rounded-xl shadow-sm",
                              isSelf
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                            )}>
                              {!isSelf && (msg.sender.role === 'system' || msg.sender.role === 'merchant' || msg.sender.role === 'admin') && (
                                <p className="text-[8px] font-bold mb-0.5 opacity-70 uppercase tracking-tight">
                                  {msg.sender.role === 'admin' ? 'Carzii' : msg.sender.name}
                                </p>
                              )}
                              <p className="text-[11.5px] leading-tight whitespace-pre-wrap">{msg.text}</p>
                              {msg.type === 'approval' && msg.approval && (
                                <div className={cn(
                                  "mt-2 p-2.5 rounded-lg border transition-all",
                                  msg.approval.status === 'pending' 
                                    ? "bg-yellow-500/5 border-yellow-500/20" 
                                    : msg.approval.status === 'approved'
                                      ? "bg-green-500/5 border-green-500/20"
                                      : "bg-red-500/5 border-red-500/20"
                                )}>
                                  {msg.approval.image && (
                                  <img src={msg.approval.image} alt={msg.approval.partName} className="rounded-md my-1.5 w-full object-cover max-h-32" />
                                )}
                                <p className="font-bold text-xs mb-0.5">{msg.approval.partName}</p>
                                  <p className="text-[10px] opacity-70 mb-2.5 font-medium">Amount: ₹{msg.approval.amount}</p>
                                  
                                  {msg.approval.status === 'pending' && !isSelf && user?.role === 'customer' && (
                                    <div className="flex gap-1.5">
                                      <button 
                                        onClick={() => handleApprove(msg.approval!.approvalId)}
                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-bold transition-colors shadow-sm"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => handleReject(msg.approval!.approvalId)}
                                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-colors shadow-sm"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}

                                  {msg.approval.status !== 'pending' && (
                                    <div className={cn(
                                      "flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest",
                                      msg.approval.status === 'approved' ? "text-green-600" : "text-red-600"
                                    )}>
                                      <div className={cn("w-1.5 h-1.5 rounded-full", msg.approval.status === 'approved' ? "bg-green-600" : "bg-red-600")} />
                                      {msg.approval.status}
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className={cn("text-[8px] mt-1 opacity-40 font-medium", isSelf ? "text-right" : "text-left")}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form 
                    onSubmit={handleSendMessage}
                    className="w-full p-2 bg-card border-t border-border flex items-center gap-1.5"
                  >
                    {user?.role === 'merchant' && (
                      <button 
                        type="button"
                        onClick={() => setIsPartModalOpen(true)}
                        className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type message..."
                      className="flex-1 bg-muted/50 border-none rounded-lg px-2.5 py-1.5 text-[11px] focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
            isOpen ? "bg-destructive text-destructive-foreground rotate-90" : "bg-primary text-primary-foreground"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {unreadCount}
            </span>
          )}
          {isOpen && isMinimized && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {unreadCount}
            </span>
          )}
          {!isConnected && !isOpen && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center border-2 border-background animate-pulse shadow-sm">
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default ChatWidget;
