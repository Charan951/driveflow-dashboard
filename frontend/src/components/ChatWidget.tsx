import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Plus, AlertTriangle } from 'lucide-react';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { updateApprovalStatus } from '@/services/approvalService';
import { toast } from 'sonner';
import AddPartModal from './merchant/AddPartModal';

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
  approval?: {
    partName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    approvalId: string;
    image?: string;
  };
  createdAt: string;
}

interface ChatWidgetProps {
  bookingId: string;
  status: string;
  onUpdate?: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ bookingId, status, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
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

  const isEnabled = [
    'ASSIGNED',
    'ACCEPTED',
    'REACHED_CUSTOMER',
    'VEHICLE_PICKED',
    'REACHED_MERCHANT',
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'OUT_FOR_DELIVERY',
    'CAR_WASH_STARTED',
    'CAR_WASH_COMPLETED',
    'STAFF_REACHED_MERCHANT',
    'PICKUP_BATTERY_TIRE',
    'INSTALLATION',
    'DELIVERY',
    'On Hold'
  ].includes(status);

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
    
    socketService.emit('getMessages', { bookingId });

    const handleReceiveMessage = (message: any) => {
      setMessages((prev) => {
        // 1. Check if we already have this message (by real ID)
        const existingIndex = prev.findIndex(m => m._id === message._id);
        if (existingIndex !== -1) {
          const newMessages = [...prev];
          newMessages[existingIndex] = message;
          return newMessages;
        }

        // 2. Check if this is a message we sent (matching text and sender) to replace temp
        const tempIndex = prev.findIndex(m => 
          m._id.startsWith('temp_') && 
          m.text === message.text && 
          m.sender._id === message.sender._id
        );

        if (tempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[tempIndex] = message;
          return newMessages;
        }

        // Only increment unread if not self and chat is closed or minimized
        const isSelf = message.sender._id === user?._id;
        if (!isSelf && (!isOpenRef.current || isMinimizedRef.current)) {
          setUnreadCount(prev => prev + 1);
        }

        return [...prev, message];
      });
    };

    const handleLoadMessages = (loadedMessages: any) => {
      setMessages(loadedMessages);
      // When messages are first loaded, if chat is closed/minimized, set total as unread
      if (!isOpenRef.current || isMinimizedRef.current) {
        setUnreadCount(loadedMessages.length);
      }
    };

    socketService.on('receiveMessage', handleReceiveMessage);
    socketService.on('loadMessages', handleLoadMessages);

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

  if (!isEnabled) return null;

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
                height: isMinimized ? '50px' : '420px'
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300",
                "w-[300px] sm:w-[340px]"
              )}
            >
              {/* Header */}
              <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                    )} />
                    {isConnected && (
                      <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                    )}
                  </div>
                  <h3 className="font-bold text-xs tracking-tight">Service Chat</h3>
                  {!isConnected && <span className="text-[8px] font-medium opacity-80 uppercase tracking-widest">(Offline)</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6 opacity-40" />
                        </div>
                        <p className="text-[11px] font-medium">Start a conversation with the {user?.role === 'customer' ? 'merchant' : 'customer'}.</p>
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
                              "max-w-[85%] p-2.5 rounded-xl shadow-sm",
                              isSelf
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                            )}>
                              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
                              <p className="text-[8px] mt-1 opacity-40 text-right font-medium">
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
                    className="p-3 bg-card border-t border-border flex items-center gap-2"
                  >
                    {user?.role === 'merchant' && (
                      <button 
                        type="button"
                        onClick={() => setIsPartModalOpen(true)}
                        className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type message..."
                      className="flex-1 bg-muted/50 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20"
                    >
                      <Send className="w-3.5 h-3.5" />
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
            <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center border-2 border-background animate-pulse shadow-sm">
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default ChatWidget;
