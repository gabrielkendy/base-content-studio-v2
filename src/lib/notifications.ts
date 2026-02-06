// Notification Service
// Triggers emails and in-app notifications for various events

import { sendEmail } from './email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.contentstudio.com'

interface UserInfo {
  id: string
  email: string
  name?: string
}

interface ContentInfo {
  id: string
  title: string
  clientName?: string
  clientId?: string
  scheduledDate?: string
  type?: string
}

interface OrgInfo {
  id: string
  name: string
}

// ============ AUTH EVENTS ============

export async function notifyWelcome(user: UserInfo, org?: OrgInfo) {
  await sendEmail({
    to: user.email,
    type: 'welcome',
    data: {
      name: user.name,
      orgName: org?.name,
    },
  })
}

export async function notifyTeamInvite(
  inviteeEmail: string,
  inviter: UserInfo,
  org: OrgInfo,
  role: string,
  inviteToken: string
) {
  await sendEmail({
    to: inviteeEmail,
    type: 'team_invite',
    data: {
      inviterName: inviter.name,
      orgName: org.name,
      role,
      inviteUrl: `${APP_URL}/auth/invite?token=${inviteToken}`,
    },
  })
}

// ============ CONTENT EVENTS ============

export async function notifyNewContent(
  recipients: UserInfo[],
  content: ContentInfo,
  creator: UserInfo,
  org: OrgInfo
) {
  const emails = recipients.map(r => ({
    to: r.email,
    type: 'new_content' as const,
    data: {
      title: content.title,
      clientName: content.clientName,
      type: content.type,
      scheduledDate: content.scheduledDate,
      creatorName: creator.name,
      viewUrl: `${APP_URL}/workflow?content=${content.id}`,
      orgName: org.name,
    },
  }))

  await Promise.all(emails.map(sendEmail))
}

export async function notifyApprovalRequest(
  approver: UserInfo,
  content: ContentInfo,
  org: OrgInfo,
  approvalToken?: string
) {
  const approvalUrl = approvalToken 
    ? `${APP_URL}/aprovacao?token=${approvalToken}`
    : `${APP_URL}/aprovacao?content=${content.id}`

  await sendEmail({
    to: approver.email,
    type: 'approval_request',
    data: {
      recipientName: approver.name,
      title: content.title,
      clientName: content.clientName,
      scheduledDate: content.scheduledDate,
      approvalUrl,
      orgName: org.name,
    },
  })
}

export async function notifyApprovalResponse(
  teamMembers: UserInfo[],
  content: ContentInfo,
  approver: UserInfo,
  approved: boolean,
  comment?: string,
  org?: OrgInfo
) {
  const emails = teamMembers.map(member => ({
    to: member.email,
    type: 'approval_response' as const,
    data: {
      title: content.title,
      clientName: content.clientName,
      approverName: approver.name,
      approved,
      comment,
      viewUrl: `${APP_URL}/workflow?content=${content.id}`,
      orgName: org?.name,
    },
  }))

  await Promise.all(emails.map(sendEmail))
}

export async function notifyContentPublished(
  recipients: UserInfo[],
  content: ContentInfo,
  channels: string[],
  postUrl?: string,
  org?: OrgInfo
) {
  const emails = recipients.map(r => ({
    to: r.email,
    type: 'content_published' as const,
    data: {
      title: content.title,
      clientName: content.clientName,
      channels,
      postUrl,
      orgName: org?.name,
    },
  }))

  await Promise.all(emails.map(sendEmail))
}

export async function notifyDeadlineReminder(
  recipients: UserInfo[],
  content: ContentInfo,
  deadline: string,
  org?: OrgInfo
) {
  const emails = recipients.map(r => ({
    to: r.email,
    type: 'deadline_reminder' as const,
    data: {
      title: content.title,
      clientName: content.clientName,
      deadline,
      viewUrl: `${APP_URL}/workflow?content=${content.id}`,
      orgName: org?.name,
    },
  }))

  await Promise.all(emails.map(sendEmail))
}

// ============ CHAT EVENTS ============

export async function notifyChatMessage(
  recipient: UserInfo,
  sender: UserInfo,
  message: string,
  contentId?: string,
  org?: OrgInfo
) {
  await sendEmail({
    to: recipient.email,
    type: 'chat_message',
    data: {
      senderName: sender.name,
      message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
      timestamp: new Date().toLocaleString('pt-BR'),
      chatUrl: contentId 
        ? `${APP_URL}/workflow?content=${contentId}&chat=true`
        : `${APP_URL}/chat`,
      orgName: org?.name,
    },
  })
}

// ============ BILLING EVENTS ============

export async function notifyTrialEnding(user: UserInfo, daysLeft: number, org?: OrgInfo) {
  await sendEmail({
    to: user.email,
    type: 'trial_ending',
    data: {
      name: user.name,
      daysLeft,
      orgName: org?.name,
    },
  })
}

export async function notifyTrialExpired(user: UserInfo, org?: OrgInfo) {
  await sendEmail({
    to: user.email,
    type: 'trial_expired',
    data: {
      name: user.name,
      orgName: org?.name,
    },
  })
}

export async function notifyPaymentFailed(user: UserInfo, daysUntilSuspension: number = 7) {
  await sendEmail({
    to: user.email,
    type: 'payment_failed',
    data: {
      name: user.name,
      daysUntilSuspension,
    },
  })
}

export async function notifySubscriptionCanceled(user: UserInfo, accessUntil: string) {
  await sendEmail({
    to: user.email,
    type: 'subscription_canceled',
    data: {
      name: user.name,
      accessUntil,
    },
  })
}

// ============ WEEKLY DIGEST ============

export async function notifyWeeklyDigest(
  user: UserInfo,
  stats: {
    weekRange: string
    totalCreated: number
    totalApproved: number
    totalPublished: number
    totalPending: number
  },
  org?: OrgInfo
) {
  await sendEmail({
    to: user.email,
    type: 'weekly_digest',
    data: {
      ...stats,
      orgName: org?.name,
    },
  })
}
