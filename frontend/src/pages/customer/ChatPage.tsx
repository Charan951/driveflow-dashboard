import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MessageCircle } from 'lucide-react';

const ChatPage: React.FC = () => {
  const { id } = useParams();
  const shortId = id ? id.slice(-6).toUpperCase() : '';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 p-4 bg-card border-b border-border">
        <Link to={`/track/${id}`} className="p-2 hover:bg-muted rounded-xl transition-colors flex-shrink-0">
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">Service Chat</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Order #{shortId || id}
          </p>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-muted/30">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6">
          <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Chat Coming Soon</h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md">
          We are currently working on this feature. You will be able to chat directly with your service provider here soon.
        </p>
        <div className="mt-6 sm:mt-8 p-4 bg-card rounded-xl border border-border max-w-sm w-full">
          <p className="text-xs sm:text-sm font-medium">For immediate assistance, please contact support.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;