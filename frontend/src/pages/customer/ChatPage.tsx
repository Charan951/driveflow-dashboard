import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MessageCircle } from 'lucide-react';

const ChatPage: React.FC = () => {
  const { id } = useParams();
  const shortId = id ? id.slice(-6).toUpperCase() : '';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-card border-b border-border">
        <Link to={`/track/${id}`} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">Service Chat</h1>
          <p className="text-sm text-muted-foreground">
            Order #{shortId || id}
          </p>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/30">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Chat Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          We are currently working on this feature. You will be able to chat directly with your service provider here soon.
        </p>
        <div className="mt-8 p-4 bg-card rounded-xl border border-border max-w-sm">
          <p className="text-sm font-medium">For immediate assistance, please contact support.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
