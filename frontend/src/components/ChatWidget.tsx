import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Plus } from 'lucide-react';
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
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isEnabled = ['SERVICE_STARTED', 'CAR_WASH_STARTED', 'INSTALLATION', 'On Hold'].includes(status);

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
        const index = prev.findIndex(m => m._id === message._id);
        if (index !== -1) {
          const newMessages = [...prev];
          newMessages[index] = message;
          return newMessages;
        }
        return [...prev, message];
      });
    };

    const handleLoadMessages = (loadedMessages: any) => {
      setMessages(loadedMessages);
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
                height: isMinimized ? '60px' : '450px'
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300",
                "w-[350px] sm:w-[400px]"
              )}
            >
              {/* Header */}
              <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <h3 className="font-semibold text-sm">Service Chat</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1 hover:bg-primary-foreground/10 rounded-lg transition-colors"
                  >
                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-primary-foreground/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">Start a conversation with the {user?.role === 'customer' ? 'merchant' : 'customer'}.</p>
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
                              "max-w-[80%] p-3 rounded-xl",
                              isSelf
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border text-foreground rounded-bl-sm"
                            )}>
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                              {msg.type === 'approval' && msg.approval && (
                                <div className={cn(
                                  "mt-3 p-3 rounded-xl border-2 transition-all",
                                  msg.approval.status === 'pending' 
                                    ? "bg-yellow-500/10 border-yellow-500/30" 
                                    : msg.approval.status === 'approved'
                                      ? "bg-green-500/10 border-green-500/30"
                                      : "bg-red-500/10 border-red-500/30"
                                )}>
                                  {msg.approval.image && (
                                  <img src={msg.approval.image} alt={msg.approval.partName} className="rounded-lg my-2" />
                                )}
                                <p className="font-bold text-sm mb-1">{msg.approval.partName}</p>
                                  <p className="text-xs opacity-80 mb-3">Amount: ₹{msg.approval.amount}</p>
                                  
                                  {msg.approval.status === 'pending' && !isSelf && user?.role === 'customer' && (
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleApprove(msg.approval!.approvalId)}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => handleReject(msg.approval!.approvalId)}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}

                                  {msg.approval.status !== 'pending' && (
                                    <div className={cn(
                                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                                      msg.approval.status === 'approved' ? "text-green-600" : "text-red-600"
                                    )}>
                                      <div className={cn("w-1.5 h-1.5 rounded-full", msg.approval.status === 'approved' ? "bg-green-600" : "bg-red-600")} />
                                      {msg.approval.status}
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="text-[9px] mt-1 opacity-50 text-right">
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
                    className="p-4 bg-card border-t border-border flex items-center gap-2"
                  >
                    {user?.role === 'merchant' && (
                      <button 
                        type="button"
                        onClick={() => setIsPartModalOpen(true)}
                        className="p-2 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-muted border-none rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      <Send className="w-4 h-4" />
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
          {!isOpen && messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {messages.length}
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default ChatWidget;
