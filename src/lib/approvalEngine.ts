import { 
  ApprovalModule, 
  ApprovalRule, 
  ApprovalRequest, 
  AppUser 
} from '../types';
import { 
  loadApprovalRules, 
  loadApprovalRequests, 
  saveApprovalRequests, 
  addApprovalRequestRecord 
} from './storage';
import { notifyApprovalRequestCreated } from './notificationEngine';

export interface RuleCheckResult {
  requiresApproval: boolean;
  matchedRule?: ApprovalRule;
}

export function checkTransactionRequiresApproval(
  module: ApprovalModule,
  amountOrValue: number,
  conditionField: string = 'amount'
): RuleCheckResult {
  const rules = loadApprovalRules();
  const activeRules = rules.filter(r => r.module === module && r.enabled);

  for (const rule of activeRules) {
    if (rule.operator === 'any_change') {
      return { requiresApproval: true, matchedRule: rule };
    }

    const numericThreshold = typeof rule.thresholdValue === 'number' 
      ? rule.thresholdValue 
      : parseFloat(String(rule.thresholdValue)) || 0;

    if (rule.operator === '>' && amountOrValue > numericThreshold) {
      return { requiresApproval: true, matchedRule: rule };
    }
    if (rule.operator === '>=' && amountOrValue >= numericThreshold) {
      return { requiresApproval: true, matchedRule: rule };
    }
    if (rule.operator === '<' && amountOrValue < numericThreshold) {
      return { requiresApproval: true, matchedRule: rule };
    }
    if (rule.operator === '<=' && amountOrValue <= numericThreshold) {
      return { requiresApproval: true, matchedRule: rule };
    }
    if (rule.operator === '==' && amountOrValue === numericThreshold) {
      return { requiresApproval: true, matchedRule: rule };
    }
  }

  return { requiresApproval: false };
}

export function submitApprovalRequest(
  module: ApprovalModule,
  title: string,
  amount: number | undefined,
  reason: string,
  requestedBy: string,
  requestedByRole: string,
  details?: Record<string, any>,
  attachments?: string[]
): ApprovalRequest {
  const check = checkTransactionRequiresApproval(module, amount || 0);
  const matchedRule = check.matchedRule;

  const defaultLevels = matchedRule?.approvalLevels && matchedRule.approvalLevels.length > 0
    ? matchedRule.approvalLevels.map(lvl => ({ level: lvl, status: 'Pending' as const }))
    : [{ level: 'Level 2 (Manager)' as const, status: 'Pending' as const }];

  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].substring(0, 5);

  const req = addApprovalRequestRecord({
    module,
    title,
    requestedBy,
    requestedByRole,
    date,
    time,
    amount,
    reason,
    details,
    attachments,
    status: 'Pending',
    currentLevelIndex: 0,
    levels: defaultLevels,
    history: [
      {
        action: 'Request Submitted',
        actor: requestedBy,
        actorRole: requestedByRole,
        timestamp: now.toISOString(),
        notes: reason
      }
    ]
  });

  // Trigger real-time alert to WhatsApp & In-App for approvers
  notifyApprovalRequestCreated(req);

  return req;
}

export function processApprovalDecision(
  requestId: string,
  decision: 'Approve' | 'Reject' | 'Request Changes' | 'Forward',
  actorUser: AppUser,
  notes?: string
): ApprovalRequest | null {
  const requests = loadApprovalRequests();
  const req = requests.find(r => r.id === requestId);
  if (!req) return null;

  const now = new Date().toISOString();
  const currentIdx = req.currentLevelIndex;

  if (decision === 'Reject') {
    req.status = 'Rejected';
    if (req.levels[currentIdx]) {
      req.levels[currentIdx].status = 'Rejected';
      req.levels[currentIdx].approverName = actorUser.fullName;
      req.levels[currentIdx].approverRole = actorUser.role;
      req.levels[currentIdx].decisionNotes = notes;
      req.levels[currentIdx].decidedAt = now;
    }
    req.history.push({
      action: 'Rejected',
      actor: actorUser.fullName,
      actorRole: actorUser.role,
      timestamp: now,
      notes
    });
  } else if (decision === 'Request Changes') {
    req.status = 'Changes Requested';
    if (req.levels[currentIdx]) {
      req.levels[currentIdx].status = 'Changes Requested';
      req.levels[currentIdx].approverName = actorUser.fullName;
      req.levels[currentIdx].approverRole = actorUser.role;
      req.levels[currentIdx].decisionNotes = notes;
      req.levels[currentIdx].decidedAt = now;
    }
    req.history.push({
      action: 'Requested Changes',
      actor: actorUser.fullName,
      actorRole: actorUser.role,
      timestamp: now,
      notes
    });
  } else if (decision === 'Forward') {
    req.status = 'Forwarded';
    req.history.push({
      action: 'Forwarded Request',
      actor: actorUser.fullName,
      actorRole: actorUser.role,
      timestamp: now,
      notes
    });
  } else if (decision === 'Approve') {
    if (req.levels[currentIdx]) {
      req.levels[currentIdx].status = 'Approved';
      req.levels[currentIdx].approverName = actorUser.fullName;
      req.levels[currentIdx].approverRole = actorUser.role;
      req.levels[currentIdx].decisionNotes = notes;
      req.levels[currentIdx].decidedAt = now;
    }

    if (currentIdx + 1 < req.levels.length) {
      req.currentLevelIndex = currentIdx + 1;
      req.status = 'Pending';
      req.history.push({
        action: `Approved at ${req.levels[currentIdx].level} - Advanced to ${req.levels[currentIdx + 1].level}`,
        actor: actorUser.fullName,
        actorRole: actorUser.role,
        timestamp: now,
        notes
      });
    } else {
      req.status = 'Approved';
      req.history.push({
        action: 'Final Approval Completed',
        actor: actorUser.fullName,
        actorRole: actorUser.role,
        timestamp: now,
        notes
      });
    }
  }

  req.updatedAt = now;

  const updatedRequests = requests.map(r => r.id === req.id ? req : r);
  saveApprovalRequests(updatedRequests);

  return req;
}
