import React, { useState } from 'react';
import { Send, Image as ImageIcon, Video } from 'lucide-react';

interface ChatPanelProps {
  bookingId: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ bookingId }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Admin', text: 'Please check the brake pads carefully.', time: '10:00 AM' },
    { id: 2, sender: 'Me', text: 'Sure, will do.', time: '10:05 AM' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'Me',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setNewMessage('');
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Communication Panel</h3>
        <p className="text-xs text-muted-foreground">Chat with Admin & Service Manager</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.sender === 'Me' 
                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                : 'bg-muted text-foreground rounded-tl-none'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.sender === 'Me' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <ImageIcon className="w-5 h-5" />
          </button>
          <button type="button" className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 bg-muted/50 border-none rounded-full px-4 py-2 focus:ring-1 focus:ring-primary"
          />
          <button 
            type="submit" 
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
