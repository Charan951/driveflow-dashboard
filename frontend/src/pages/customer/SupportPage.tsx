import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Clock, AlertCircle } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import Timeline from '@/components/Timeline';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socket';

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description?: string;
  messages: {
    sender: { _id: string, name: string, role: string };
    role?: string; // Fallback role field on message
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
}

const SupportPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    fetchTickets();
    
    // Connect socket and listen for updates
    socketService.connect();
    
    const handleUpdate = (data: Ticket) => {
      setTickets(prev => prev.map(t => t._id === data._id ? data : t));
    };

    socketService.on('ticketUpdated', handleUpdate);

    return () => {
      socketService.off('ticketUpdated', handleUpdate);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const data = await ticketService.getMyTickets();
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    setIsSubmitting(true);
    try {
      await ticketService.createTicket({
        subject,
        message: description,
        category: 'General',
        priority: 'Medium'
      });
      toast.success('Support ticket created!');
      setSubject('');
      setDescription('');
      fetchTickets();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      await ticketService.addMessage(ticketId, replyText);
      toast.success('Reply sent!');
      setReplyText('');
      fetchTickets(); // Refresh to see new message
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handleTicketSelect = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    try {
      const fullTicket = await ticketService.getTicketById(ticketId);
      setTickets(prev => prev.map(t => t._id === ticketId ? fullTicket : t));
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Support</h1>

      {/* Create Ticket */}
      {!selectedTicketId && (
        <motion.form 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          onSubmit={handleSubmit} 
          className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Create Ticket
          </h2>
          <input 
            type="text" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
            placeholder="Subject" 
            required 
            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" 
          />
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Describe your issue..." 
            rows={4} 
            required 
            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
          />
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <Send className="w-5 h-5" /> Submit Ticket
              </>
            )}
          </button>
        </motion.form>
      )}

      {/* Existing Tickets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{selectedTicketId ? 'Ticket Details' : 'Your Tickets'}</h2>
          {selectedTicketId && (
            <button 
              onClick={() => setSelectedTicketId(null)}
              className="text-sm text-primary hover:underline font-medium"
            >
              Back to all tickets
            </button>
          )}
        </div>

        {tickets.length > 0 ? (
          tickets
            .filter(t => !selectedTicketId || t._id === selectedTicketId)
            .map((ticket) => (
              <motion.div 
                key={ticket._id} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className={`bg-card rounded-2xl border border-border overflow-hidden transition-all ${!selectedTicketId ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' : 'shadow-sm'}`}
                onClick={() => !selectedTicketId && handleTicketSelect(ticket._id)}
              >
                {/* Ticket Header */}
                <div className="p-5 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">#{ticket._id.slice(-6)}</p>
                      <h3 className="font-bold text-lg">{ticket.subject}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      ticket.status === 'Open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                      ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className={`p-5 space-y-4 ${selectedTicketId ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                  {(selectedTicketId ? ticket.messages : [ticket.messages[0]]).map((msg, i) => {
                    const messageRole = msg.role || msg.sender?.role;
                    const isAdmin = messageRole === 'admin';
                    const isStaff = messageRole === 'staff';
                    const isSelf = msg.sender?._id === currentUser?._id;
                    
                    return (
                      <div key={i} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                          isSelf
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : isAdmin 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-tl-none border border-blue-200 dark:border-blue-800' 
                              : isStaff
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 rounded-tl-none border border-orange-200 dark:border-orange-800'
                                : 'bg-muted text-foreground rounded-tl-none border border-border'
                        }`}>
                          <p className="whitespace-pre-wrap font-medium">{msg.message}</p>
                          <div className={`text-[10px] mt-2 flex items-center gap-1 opacity-70 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(msg.createdAt).toLocaleString()}
                            {isAdmin && <span className={`ml-1 font-bold ${isSelf ? 'bg-white/10' : 'bg-blue-500/10'} px-1.5 rounded ${isSelf ? 'text-primary-foreground' : 'text-blue-600 dark:text-blue-400'}`}>Support Team</span>}
                            {isStaff && <span className={`ml-1 font-bold ${isSelf ? 'bg-white/10' : 'bg-orange-500/10'} px-1.5 rounded ${isSelf ? 'text-primary-foreground' : 'text-orange-600 dark:text-orange-400'}`}>Staff</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {!selectedTicketId && ticket.messages.length > 1 && (
                    <p className="text-xs text-primary font-medium text-center pt-2 italic">
                      + {ticket.messages.length - 1} more messages. Click to view conversation.
                    </p>
                  )}
                </div>

                {/* Reply Section */}
                {selectedTicketId && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
                  <div className="p-5 border-t border-border bg-muted/10">
                    <div className="flex gap-3">
                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        rows={2}
                        className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                      />
                      <button 
                        onClick={() => handleReply(ticket._id)}
                        disabled={isReplying || !replyText.trim()}
                        className="px-6 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                      >
                        {isReplying ? <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}
                
                {!selectedTicketId && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 border-t border-border pt-3">
                      <Clock className="w-3 h-3" />
                      Last updated: {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </motion.div>
            ))
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No tickets yet</h3>
            <p className="text-muted-foreground">Submit a ticket if you need help with your booking or payment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
