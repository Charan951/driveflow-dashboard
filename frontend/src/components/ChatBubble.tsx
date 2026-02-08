import React from 'react';
import { motion } from 'framer-motion';
import { Check, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: string;
  sender: 'customer' | 'merchant' | 'staff';
  timestamp: string;
  type?: 'text' | 'image' | 'approval';
  imageUrl?: string;
  caption?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  amount?: number;
  onApprove?: () => void;
  onReject?: () => void;
  isCurrentUser?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  sender,
  timestamp,
  type = 'text',
  imageUrl,
  caption,
  approvalStatus,
  amount,
  onApprove,
  onReject,
  isCurrentUser = false,
}) => {
  const isSelf = isCurrentUser || sender === 'customer';

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn('flex mb-4', isSelf ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl p-3',
          isSelf
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border rounded-bl-sm'
        )}
      >
        {type === 'image' && (
          <div className="mb-2">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Shared image"
                className="rounded-xl max-w-full h-auto"
              />
            ) : (
              <div className="w-48 h-32 bg-muted rounded-xl flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {caption && (
              <p className={cn('text-sm mt-2', isSelf ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {caption}
              </p>
            )}
          </div>
        )}

        {type === 'text' && (
          <p className={cn('text-sm', isSelf ? 'text-primary-foreground' : 'text-foreground')}>
            {message}
          </p>
        )}

        {type === 'approval' && (
          <div className="space-y-3">
            <p className={cn('text-sm', isSelf ? 'text-primary-foreground' : 'text-foreground')}>
              {message}
            </p>
            {amount !== undefined && (
              <div className={cn('p-3 rounded-xl', isSelf ? 'bg-primary-foreground/10' : 'bg-muted')}>
                <p className={cn('text-lg font-bold', isSelf ? 'text-primary-foreground' : 'text-primary')}>
                  ${amount}
                </p>
              </div>
            )}
            {approvalStatus === 'pending' && !isSelf && (
              <div className="flex gap-2">
                <button
                  onClick={onApprove}
                  className="flex-1 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={onReject}
                  className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
            {approvalStatus === 'approved' && (
              <div className="flex items-center gap-2 text-success">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Approved</span>
              </div>
            )}
          </div>
        )}

        <p
          className={cn(
            'text-[10px] mt-2',
            isSelf ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}
        >
          {formatTime(timestamp)}
        </p>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
