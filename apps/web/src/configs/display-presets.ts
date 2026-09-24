import { activeCatalog, statusCatalog } from './statuses'

export const appDisplayPresets = {
  active: { renderer: 'chip', props: { options: activeCatalog } },
  statusCode: { renderer: 'chip', props: { options: statusCatalog } },
  createdAt: { format: 'datetime' },
  updatedAt: { format: 'datetime' },
  publishedAt: { format: 'datetime' },
  date: { format: 'date' },
  startDate: { format: 'date' },
  endDate: { format: 'date' },
  updatedBy: { read: (record: { relUpdatedBy?: string | null }) => record.relUpdatedBy ?? null },
  createdBy: { read: (record: { relCreatedBy?: string | null }) => record.relCreatedBy ?? null },
  approvalDescription: { renderer: 'html' },
  verificationDescription: { renderer: 'html' },
  submissionDescription: { renderer: 'html' },
  arrayApprovalAttachment: { renderer: 'file' },
  arrayVerificationAttachment: { renderer: 'file' },
  arraySubmissionAttachment: { renderer: 'file' },
  arrayClauses: { renderer: 'array-clauses' },
} as const
