import { 
  WhatsAppSettings, 
  WhatsAppRecipient, 
  ReportDeliveryRule, 
  ReportDeliveryHistory, 
  ReportFormat 
} from '../types';
import { 
  loadWhatsAppSettings, 
  loadWhatsAppRecipients, 
  loadReportHistory, 
  addReportHistoryRecord, 
  saveReportRules, 
  loadReportRules 
} from './storage';

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  recipientPhone: string,
  messageText: string,
  attachmentName?: string
): Promise<SendMessageResult> {
  const settings = loadWhatsAppSettings();
  if (!settings.enabled) {
    return { success: false, error: 'WhatsApp Integration is disabled in Settings.' };
  }

  // Simulate calling WhatsApp Business API Endpoint
  try {
    // In production, this posts to Facebook Graph API: https://graph.facebook.com/v18.0/{phoneNumberId}/messages
    await new Promise((resolve) => setTimeout(resolve, 600)); // simulate network latency
    const mockId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
    return { success: true, messageId: mockId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to WhatsApp API.' };
  }
}

export function compileReportSummaryText(
  reportType: string,
  templateText?: string,
  customData?: Record<string, any>
): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const defaultData: Record<string, string> = {
    date: dateStr,
    sales: (customData?.sales ?? '1,850,000').toLocaleString(),
    expenses: (customData?.expenses ?? '240,000').toLocaleString(),
    profit: (customData?.profit ?? '1,610,000').toLocaleString(),
    low_stock_count: String(customData?.lowStockCount ?? 3),
    total_value: (customData?.totalValue ?? '14,250,000').toLocaleString()
  };

  let template = templateText || `🏨 SKY VIEW RESORT
📅 {{report_type}}
Date: {{date}}
Sales: {{sales}} RWF
Expenses: {{expenses}} RWF
Profit: {{profit}} RWF
Attached is the generated report file.`;

  template = template.replace('{{report_type}}', reportType);

  Object.entries(defaultData).forEach(([key, val]) => {
    template = template.replaceAll(`{{${key}}}`, val);
  });

  return template;
}

export async function dispatchReportRuleManually(
  rule: ReportDeliveryRule,
  selectedRecipientIds?: string[]
): Promise<ReportDeliveryHistory[]> {
  const allRecipients = loadWhatsAppRecipients();
  const targetIds = selectedRecipientIds && selectedRecipientIds.length > 0 
    ? selectedRecipientIds 
    : rule.recipientIds;
  
  const recipients = allRecipients.filter(r => targetIds.includes(r.id) && r.active);
  const results: ReportDeliveryHistory[] = [];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const extMap: Record<ReportFormat, string> = {
    'PDF': 'pdf',
    'Excel': 'xlsx',
    'CSV': 'csv',
    'Image': 'png',
    'Summary Text': 'txt'
  };

  const fileExt = extMap[rule.format] || 'pdf';
  const cleanReportName = rule.reportType.replace(/[^a-zA-Z0-9]/g, '_');
  const attachmentName = `${cleanReportName}_${dateStr}.${fileExt}`;

  const messageText = compileReportSummaryText(rule.reportType, rule.customTemplate);

  for (const recipient of recipients) {
    if (rule.deliveryMethods.includes('WhatsApp')) {
      const apiResult = await sendWhatsAppMessage(recipient.phoneNumber, messageText, attachmentName);
      
      const record = addReportHistoryRecord({
        ruleId: rule.id,
        reportName: rule.reportType,
        recipientName: recipient.fullName,
        whatsappNumber: recipient.phoneNumber,
        deliveryMethod: 'WhatsApp',
        date: dateStr,
        time: timeStr,
        status: apiResult.success ? 'Delivered' : 'Failed',
        retryCount: apiResult.success ? 0 : 1,
        errorMessage: apiResult.error,
        attachmentName,
        format: rule.format,
        messagePreview: messageText.substring(0, 100) + '...'
      });

      results.push(record);
    }
  }

  // Update rule lastRun timestamp
  const rules = loadReportRules();
  const updatedRules = rules.map(r => r.id === rule.id ? { ...r, lastRun: now.toISOString() } : r);
  saveReportRules(updatedRules);

  return results;
}

export async function sendAdHocReportToWhatsApp(
  reportType: string,
  format: ReportFormat,
  recipientIds: string[],
  customMessage?: string
): Promise<ReportDeliveryHistory[]> {
  const allRecipients = loadWhatsAppRecipients();
  const recipients = allRecipients.filter(r => recipientIds.includes(r.id));
  const results: ReportDeliveryHistory[] = [];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const extMap: Record<ReportFormat, string> = {
    'PDF': 'pdf',
    'Excel': 'xlsx',
    'CSV': 'csv',
    'Image': 'png',
    'Summary Text': 'txt'
  };

  const attachmentName = `${reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.${extMap[format] || 'pdf'}`;
  const messageText = customMessage || compileReportSummaryText(reportType);

  for (const recipient of recipients) {
    const apiResult = await sendWhatsAppMessage(recipient.phoneNumber, messageText, attachmentName);

    const record = addReportHistoryRecord({
      reportName: reportType,
      recipientName: recipient.fullName,
      whatsappNumber: recipient.phoneNumber,
      deliveryMethod: 'WhatsApp',
      date: dateStr,
      time: timeStr,
      status: apiResult.success ? 'Delivered' : 'Failed',
      retryCount: apiResult.success ? 0 : 1,
      errorMessage: apiResult.error,
      attachmentName,
      format,
      messagePreview: messageText.substring(0, 120)
    });

    results.push(record);
  }

  return results;
}
