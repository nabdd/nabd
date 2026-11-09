/** Shapes returned by the Nest API (server/src). */

export type Urgency = 'urgent' | '24h' | 'week'
export type RequestStatus = 'open' | 'fulfilled' | 'expired'

export interface Hospital {
  id: number
  name: string
  email?: string
  city: string
}

export interface RequestItem {
  id: number
  bloodType: string
  component: string
  units: number
  urgency: Urgency
  status: RequestStatus
  notified: number
  canDonate: number
  arrived: number
  createdAt: string
  hospital: string
}
export interface RequestList {
  counts: { open: number; fulfilled: number; expired: number }
  items: RequestItem[]
}

export interface Dashboard {
  openRequests: number
  urgentOpen: number
  notifiedToday: number
  confirmedToday: number
  responseRateToday: number
  avgFirstReplyMin: number | null
}

export interface PreviewDonor {
  id: number
  name: string
  phone: string
  bloodType: string
  distanceKm: number
  lastDonation: string | null
  eligibleInDays: number
  responses: { yes: number; total: number }
  selected: boolean
}
export interface Preview {
  total: number
  defaultSelected: number
  counts: { exact: number; compatible: number; previouslyResponded: number; within5km: number }
  donors: PreviewDonor[]
}

export type ResponseStatus = 'confirmed' | 'enroute' | 'donated' | 'later'
export interface RequestDetail {
  request: {
    id: number
    bloodType: string
    includeCompatible: boolean
    component: string
    units: number
    urgency: Urgency
    status: RequestStatus
    patientRef: string | null
    note: string | null
    radiusKm: number
    createdAt: string
  }
  stats: { sent: number; canDonate: number; declined: number; pending: number; collected: number; responseRate: number }
  responses: { id: number; name: string; fullName: string; phone: string; bloodType: string; status: ResponseStatus; eta: string | null; receptionCode: string | null; repliedAfterMin: number | null }[]
  activity: { kind: string; text: string; flag: string | null; at: string }[]
  expandable: number
}

export interface DirectoryDonor {
  id: number
  name: string
  phone: string
  contactRevealed: boolean
  bloodType: string
  city: string
  lastDonation: string | null
  eligibleInDays: number
  responseRate: { yes: number; total: number } | null
  status: 'active' | 'paused' | 'opted_out'
}
export interface DonorList {
  total: number
  page: number
  pageSize: number
  items: DirectoryDonor[]
}
export interface DonorStats {
  total: number
  available: number
  byType: Record<string, number>
}
