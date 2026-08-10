import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Trash2, X, ExternalLink } from 'lucide-react';
import { NotificationItem } from '../types';
import { loadNotifications, saveNotifications } from '../lib/storage';

interface InAppNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNotificationCenter: () => void;
  darkMode?: boolean;
}

export const InAppNotificationDrawer: React.FC<InAppNotificationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenNotificationCenter,
  darkMode = false
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNotifications(loadNotifications());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, status: 'Read' as const }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className={`w-full max-w-sm h-full shadow-2xl flex flex-col justify-between transition-all ${
        darkMode ? 'bg-slate-900 border-l border-slate-800 text-slate-100' : 'bg-white border-l border-slate-200 text-slate-800'
      }`}>
        {/* Drawer Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Notifications</h3>
              <p className="text-[10px] text-slate-400">{unreadCount} unread messages</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={markAllRead}
              title="Mark all as read"
              className="p-1.5 text-xs text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg dark:hover:bg-slate-800"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  notif.status === 'Unread'
                    ? darkMode ? 'bg-indigo-950/30 border-indigo-800' : 'bg-indigo-50/50 border-indigo-200 font-medium'
                    : darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-[10px] rounded-md font-bold text-slate-600 dark:text-slate-300">
                    {notif.category}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h4 className="font-bold mt-1 text-sm">{notif.title}</h4>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">{notif.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className={`p-4 border-t text-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <button
            onClick={() => {
              onClose();
              onOpenNotificationCenter();
            }}
            className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 hover:bg-indigo-700 shadow-md"
          >
            <span>Open Notification Center</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
