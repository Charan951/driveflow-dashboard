import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Clock, AlertCircle } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import Timeline from '@/components/Timeline';
import { toast } from 'sonner';

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description?: string; // Sometimes used in UI, but backend uses messages[0] usually
  messages: {
    sender: string | { _id: string, name: string };
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
}

const SupportPage: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const data = await ticketService.getAllTickets();
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
        category: 'General', // Default
        priority: 'Medium'   // Default
      });
      toast.success('Support ticket created!');
      setSubject('');
      setDescription('');
      fetchTickets(); // Refresh list
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
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
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Support</h1>

      {/* Create Ticket */}
      <motion.form 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        onSubmit={handleSubmit} 
        className="bg-card rounded-2xl border border-border p-6 space-y-4"
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
          className="w-full px-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" 
        />
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Describe your issue..." 
          rows={4} 
          required 
          className="w-full px-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
        />
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : (
            <>
              <Send className="w-5 h-5" /> Submit Ticket
            </>
          )}
        </button>
      </motion.form>

      {/* Existing Tickets */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Your Tickets</h2>
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <motion.div 
              key={ticket._id} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-card rounded-2xl border border-border p-4 mb-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">#{ticket._id.slice(-6).toUpperCase()}</p>
                  <h3 className="font-semibold">{ticket.subject}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ticket.status === 'Open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                  ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {ticket.status}
                </span>
              </div>
              
              {/* Show first message as description if available */}
              {ticket.messages.length > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  {ticket.messages[0].message}
                </p>
              )}

              <div className="space-y-2">
                {ticket.messages.slice(1).map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{msg.message.substring(0, 50)}{msg.message.length > 50 ? '...' : ''}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-2">
                    Updated: {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No tickets yet</h3>
            <p className="text-muted-foreground">Submit a ticket if you need help.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
