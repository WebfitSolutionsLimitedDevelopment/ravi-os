export type GoogleAccountRole = 'personal' | 'career' | 'media' | 'family' | 'other'

export type GoogleConnection = {
  id: string
  email: string
  role: GoogleAccountRole
  gmailEnabled: boolean
  calendarEnabled: boolean
}

export type InboxClassification = 'action' | 'waiting' | 'career' | 'personal' | 'finance' | 'calendar' | 'fyi'

export type NormalizedInboxItem = {
  sourceAccountId: string
  sourceMessageId: string
  subject: string
  sender: string
  receivedAt: string
  classification: InboxClassification
  confidence: number
  requiresHumanReview: boolean
}

export type NormalizedCalendarItem = {
  sourceAccountId: string
  sourceCalendarId: string
  sourceEventId: string
  iCalUid?: string
  title: string
  startsAt: string
  endsAt: string
  timezone: string
  location?: string
}

/**
 * Phase 3 policy:
 * - Gmail starts read-only.
 * - Calendar starts read-only.
 * - Tokens must stay server-side and never be exposed to browser code.
 * - Every connected Google account has an explicit Ravi OS role.
 * - AI classification may suggest an action but cannot execute high-risk actions automatically.
 */
export const GOOGLE_INTEGRATION_POLICY = {
  gmailScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  calendarScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  defaultTimezone: 'Pacific/Auckland',
  humanApprovalRequiredForWrites: true,
} as const
