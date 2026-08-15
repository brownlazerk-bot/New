import React from 'react';
import { AlertTriangle, Clock, Zap, X, ChevronRight } from 'lucide-react';
import { Subscription } from '../types';
import { evaluateSubscriptionMetrics } from '../lib/storage';

interface SubscriptionReminderBannerProps {
  subscription?: Subscription | null;
  onOpenRenew: () => void;
  onDismiss?: () => void;
}

export const SubscriptionReminderBanner: React.FC<SubscriptionReminderBannerProps> = ({
  subscription,
  onOpenRenew,
  onDismiss
}) => {
  if (!subscription) return null;

  const metrics = evaluateSubscriptionMetrics(subscription);

  // If status is active with more than 7 days remaining, don't show intrusive banner
  if (metrics.status === 'ACTIVE' && metrics.warningLevel === 'none') {
    return null;
  }

  const isUrgent = metrics.warningLevel === '1day' || metrics.warningLevel === 'expired';
  const isWarning = metrics.warningLevel === '3days';

  return (
    <div className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-between gap-3 text-xs transition-all shadow-md ${
      isUrgent
        ? 'bg-rose-950/80 border border-rose-600/60 text-rose-200'
        : isWarning
        ? 'bg-amber-950/80 border border-amber-500/60 text-amber-200'
        : 'bg-blue-950/80 border border-blue-500/60 text-blue-200'
    }`}>
      <div className="flex items-center gap-2.5">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <div>
          <span className="font-bold">
            {metrics.status === 'GRACE_PERIOD' ? '⚠️ Grace Period Active: ' : '📅 Subscription Notice: '}
          </span>
          <span>{metrics.message}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenRenew}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs shadow transition ${
            isUrgent
              ? 'bg-rose-500 hover:bg-rose-400 text-white'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Renew for 100,000 RWF</span>
        </button>

        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
