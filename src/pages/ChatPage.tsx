import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Send, Image, Paperclip, MoreVertical } from 'lucide-react';
import { orders, chatMessages } from '@/services/dummyData';
import ChatBubble from '@/components/ChatBubble';

interface Message {
  id: string;
  orderId: string;
  sender: 'customer' | 'merchant' | 'staff';
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'approval';
  caption?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  amount?: number;
}

const ChatPage: React.FC = () => {
  const { id } = useParams();
  const order = orders.find(o => o.id === id) || orders[0];
  const [messages, setMessages] = useState<Message[]>(
    chatMessages.filter(m => m.orderId === id || m.orderId === 'ORD-001') as Message[]
  );
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      orderId: order.id,
      sender: 'customer',
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleApprove = (messageId: string) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, approvalStatus: 'approved' as const } : m
    ));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-card border-b border-border">
        <Link to={`/track/${order.id}`} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">{order.merchant.name}</h1>
          <p className="text-sm text-muted-foreground">Order #{order.id}</p>
        </div>
        <button className="p-2 hover:bg-muted rounded-xl transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/30">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message.message}
            sender={message.sender}
            timestamp={message.timestamp}
            type={message.type}
            imageUrl={message.type === 'image' ? message.message : undefined}
            caption={message.caption}
            approvalStatus={message.approvalStatus}
            amount={message.amount}
            onApprove={() => handleApprove(message.id)}
            onReject={() => {}}
            isCurrentUser={message.sender === 'customer'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-muted rounded-xl transition-colors">
            <Image className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-xl transition-colors">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
