import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Clock } from 'lucide-react';
import { supportTickets } from '@/services/dummyData';
import Timeline from '@/components/Timeline';
import { toast } from 'sonner';

const SupportPage: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Support ticket created!');
    setSubject('');
    setDescription('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Support</h1>

      {/* Create Ticket */}
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Create Ticket
        </h2>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required className="w-full px-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue..." rows={4} required className="w-full px-4 py-4 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90">
          <Send className="w-5 h-5" /> Submit Ticket
        </button>
      </motion.form>

      {/* Existing Tickets */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Your Tickets</h2>
        {supportTickets.map((ticket) => (
          <motion.div key={ticket.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">#{ticket.id}</p>
                <h3 className="font-semibold">{ticket.subject}</h3>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.status === 'open' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {ticket.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{ticket.description}</p>
            <div className="space-y-2">
              {ticket.updates.map((update, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{update.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SupportPage;
