import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MessageSquare, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { toast } from 'react-hot-toast';

interface TicketMessage {
  sender: {
    _id: string;
    name?: string;
  };
  message: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  subject: string;
  status: string;
  user: {
    _id: string;
    name: string;
  };
  messages: TicketMessage[];
  createdAt: string;
}

const AdminSupportPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await ticketService.getAllTickets();
      setTickets(data);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await ticketService.updateTicketStatus(ticketId, newStatus);
      toast.success(`Ticket status updated to ${newStatus}`);
      fetchTickets();
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const updatedTicket = await ticketService.addMessage(selectedTicket._id, replyMessage);
      toast.success('Reply sent');
      setReplyMessage('');
      // Refresh selected ticket messages
      const refreshedTicket = await ticketService.getTicketById(selectedTicket._id);
      setSelectedTicket(refreshedTicket);
      fetchTickets(); // Refresh list to update counts/status
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket._id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Ticket List (Left Panel) */}
      <div className={`w-full ${selectedTicket ? 'md:w-1/3 hidden md:block' : 'w-full'} flex flex-col space-y-4`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 p-2 rounded-lg text-center">
                <span className="text-blue-600 font-bold text-lg">{stats.open}</span>
                <p className="text-xs text-blue-600">Open</p>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg text-center">
                <span className="text-yellow-600 font-bold text-lg">{stats.inProgress}</span>
                <p className="text-xs text-yellow-600">In Progress</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg text-center">
                <span className="text-green-600 font-bold text-lg">{stats.resolved}</span>
                <p className="text-xs text-green-600">Resolved</p>
            </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search tickets..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
            </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {filteredTickets.map(ticket => (
                <div 
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicket?._id === ticket._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {ticket.priority}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-medium text-gray-800 truncate">{ticket.subject}</h4>
                    <p className="text-sm text-gray-500 truncate">{ticket.messages[0]?.message}</p>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500 flex items-center">
                            <User size={12} className="mr-1"/> {ticket.user?.name}
                        </span>
                        <span className={`text-xs font-medium ${
                            ticket.status === 'Open' ? 'text-blue-600' :
                            ticket.status === 'Resolved' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                            {ticket.status}
                        </span>
                    </div>
                </div>
            ))}
             {filteredTickets.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    No tickets found.
                </div>
            )}
        </div>
      </div>

      {/* Ticket Detail (Right Panel) */}
      <div className={`w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col ${!selectedTicket ? 'hidden md:flex justify-center items-center' : ''}`}>
        {!selectedTicket ? (
            <div className="text-center text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view details</p>
            </div>
        ) : (
            <>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <h2 className="text-xl font-bold text-gray-800">{selectedTicket.subject}</h2>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">#{selectedTicket._id.slice(-6)}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center"><User size={16} className="mr-1"/> {selectedTicket.user?.name}</span>
                            <span className="flex items-center"><Clock size={16} className="mr-1"/> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                            <span>Category: {selectedTicket.category}</span>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <select
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedTicket.status}
                            onChange={(e) => handleStatusUpdate(selectedTicket._id, e.target.value)}
                        >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {selectedTicket.messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender._id === selectedTicket.user._id ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-xl p-4 ${
                                msg.sender._id === selectedTicket.user._id 
                                    ? 'bg-gray-100 text-gray-800 rounded-tl-none' 
                                    : 'bg-blue-600 text-white rounded-tr-none'
                            }`}>
                                <p className="text-sm">{msg.message}</p>
                                <div className={`text-xs mt-2 ${
                                    msg.sender._id === selectedTicket.user._id ? 'text-gray-400' : 'text-blue-100'
                                }`}>
                                    {new Date(msg.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reply Box */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Type your reply..."
                            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                        />
                        <button
                            onClick={handleSendReply}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default AdminSupportPage;
