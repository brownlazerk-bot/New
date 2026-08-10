import React, { useState } from 'react';
import { Send, MessageSquare, Check, X, ShieldAlert, FileText, CheckCircle } from 'lucide-react';
import { ReportFormat, WhatsAppRecipient, DeliveryMethod } from '../types';
import { loadWhatsAppRecipients } from '../lib/storage';
import { sendAdHocReportToWhatsApp } from '../lib/whatsappService';

interface ManualReportSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  defaultFormat?: ReportFormat;
  darkMode?: boolean;
}

export const ManualReportSendModal: React.FC<ManualReportSendModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  defaultFormat = 'PDF',
  darkMode = false
}) => {
  const [recipients] = useState<WhatsAppRecipient[]>(() => loadWhatsAppRecipients().filter(r => r.active));
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>(() => 
    recipients.slice(0, 2).map(r => r.id)
  );
  const [format, setFormat] = useState<ReportFormat>(defaultFormat);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>(['WhatsApp']);
  const [customNotes, setCustomNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleMethod = (method: DeliveryMethod) => {
    setDeliveryMethods(prev => 
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleSend = async () => {
    if (selectedRecipientIds.length === 0) {
      alert('Please select at least one WhatsApp recipient.');
      return;
    }

    setSending(true);

    const fullMessage = `🏨 SKY VIEW RESORT\n📅 ${reportTitle}\nDate: ${new Date().toISOString().split('T')[0]}\nFormat: ${format}\n${customNotes ? `Notes: ${customNotes}\n` : ''}Attached is the generated report.`;

    await sendAdHocReportToWhatsApp(reportTitle, format, selectedRecipientIds, fullMessage);

    setSending(false);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-emerald-50/50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Send Report to WhatsApp</h3>
              <p className="text-xs text-slate-500">{reportTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-emerald-600">Report Sent Successfully!</h4>
            <p className="text-xs text-slate-500">Delivered via WhatsApp API to {selectedRecipientIds.length} recipient(s).</p>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Recipient Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Select WhatsApp Recipients ({selectedRecipientIds.length} selected)
              </label>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {recipients.map((recipient) => {
                  const isSelected = selectedRecipientIds.includes(recipient.id);
                  return (
                    <div 
                      key={recipient.id}
                      onClick={() => toggleRecipient(recipient.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' 
                          : darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{recipient.fullName}</p>
                        <p className="text-xs text-slate-500">{recipient.phoneNumber} • {recipient.position}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Methods */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Delivery Channel
              </label>
              <div className="flex space-x-3">
                {(['WhatsApp', 'Email', 'SMS'] as DeliveryMethod[]).map((method) => {
                  const active = deliveryMethods.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => toggleMethod(method)}
                      className={`flex-1 py-2 px-3 text-xs font-medium rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                        active 
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600' 
                          : darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{method}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Attachment Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['PDF', 'Excel', 'CSV', 'Summary Text'] as ReportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition-all ${
                      format === fmt 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold' 
                        : darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Custom Message / Remarks (Optional)
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Add custom remarks or context for executive review..."
                rows={2}
                className={`w-full p-3 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 text-xs font-medium rounded-xl border ${
                  darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || selectedRecipientIds.length === 0}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                {sending ? (
                  <span>Sending via WhatsApp...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
