import type { BloodType } from '@/lib/blood'

export type Urgency = 'urgent' | '24h' | 'week'

export interface BloodRequest {
  id: string
  type: BloodType
  component: string
  units: number
  urgency: Urgency
  notified: number
  canDonate: number
  arrived: number
  created: string
  status: 'open' | 'fulfilled' | 'expired'
  hospital: string
  place: string
}

export const requests: BloodRequest[] = [
  { id: 'r1', type: 'O-', component: 'Whole blood', units: 3, urgency: 'urgent', notified: 27, canDonate: 6, arrived: 1, created: '8 min ago', status: 'open', hospital: 'AUBMC', place: 'Beirut' },
  { id: 'r2', type: 'A+', component: 'Platelets', units: 2, urgency: '24h', notified: 41, canDonate: 12, arrived: 0, created: '31 min ago', status: 'open', hospital: 'Hôtel-Dieu', place: 'Achrafieh' },
  { id: 'r3', type: 'AB-', component: 'Plasma', units: 1, urgency: 'urgent', notified: 44, canDonate: 1, arrived: 0, created: '2 h ago', status: 'open', hospital: 'AUBMC', place: 'Beirut' },
  { id: 'r4', type: 'B+', component: 'Whole blood', units: 1, urgency: 'week', notified: 18, canDonate: 5, arrived: 1, created: 'Yesterday', status: 'fulfilled', hospital: 'Rafic Hariri Hospital', place: 'Baabda' },
  { id: 'r5', type: 'O+', component: 'Whole blood', units: 2, urgency: '24h', notified: 33, canDonate: 9, arrived: 2, created: '3 days ago', status: 'fulfilled', hospital: 'AUBMC', place: 'Beirut' },
  { id: 'r6', type: 'A-', component: 'Platelets', units: 1, urgency: 'week', notified: 12, canDonate: 0, arrived: 0, created: '6 days ago', status: 'expired', hospital: 'AUBMC', place: 'Beirut' },
]

export interface MatchDonor {
  id: string
  name: string
  phone: string
  type: BloodType
  distance: number
  last: string
  responses: string
  tone: 'green' | 'amber' | 'grey'
  eligible: string
  eligibleTone: 'green' | 'amber'
  selected: boolean
}

export const matchDonors: MatchDonor[] = [
  { id: 'm1', name: 'Rami H.', phone: '+961 70 ••• 456', type: 'O-', distance: 1.2, last: 'Jul 2026', responses: '4 / 5 yes', tone: 'green', eligible: 'Eligible', eligibleTone: 'green', selected: true },
  { id: 'm2', name: 'Nour K.', phone: '+961 3 ••• 812', type: 'O-', distance: 2.8, last: 'Never', responses: 'New', tone: 'grey', eligible: 'Eligible', eligibleTone: 'green', selected: true },
  { id: 'm3', name: 'Jad A.', phone: '+961 71 ••• 097', type: 'O+', distance: 3.4, last: 'Aug 2026', responses: '2 / 2 yes', tone: 'green', eligible: 'Eligible', eligibleTone: 'green', selected: true },
  { id: 'm4', name: 'Maya S.', phone: '+961 76 ••• 330', type: 'O-', distance: 4.1, last: 'Sep 2026', responses: '1 / 3 yes', tone: 'amber', eligible: 'Eligible in 12 d', eligibleTone: 'amber', selected: false },
  { id: 'm5', name: 'Karim F.', phone: '+961 81 ••• 544', type: 'O+', distance: 5.9, last: 'May 2026', responses: '3 / 3 yes', tone: 'green', eligible: 'Eligible', eligibleTone: 'green', selected: true },
  { id: 'm6', name: 'Lara T.', phone: '+961 70 ••• 218', type: 'O-', distance: 7.3, last: 'Never', responses: 'New', tone: 'grey', eligible: 'Eligible', eligibleTone: 'green', selected: true },
]

export type ResponseStatus = 'donated' | 'enroute' | 'confirmed' | 'later'
export interface DonorResponse {
  id: string
  name: string
  type: BloodType
  replied: string
  eta: string
  status: ResponseStatus
}
export const responses: DonorResponse[] = [
  { id: 'p1', name: 'Rami H.', type: 'O-', replied: '3 min after send', eta: 'Arrived 10:42', status: 'donated' },
  { id: 'p2', name: 'Nour K.', type: 'O-', replied: '5 min', eta: 'On the way, about 15 min', status: 'enroute' },
  { id: 'p3', name: 'Karim F.', type: 'O+', replied: '8 min', eta: 'Coming at 13:00', status: 'confirmed' },
  { id: 'p4', name: 'Lara T.', type: 'O-', replied: '11 min', eta: 'Coming at 14:30', status: 'confirmed' },
  { id: 'p5', name: 'Jad A.', type: 'O+', replied: '14 min', eta: 'Tomorrow 09:00', status: 'later' },
  { id: 'p6', name: 'Hadi M.', type: 'O+', replied: '19 min', eta: 'Asked for directions', status: 'confirmed' },
]

export const activity = [
  { tone: 'ok', text: 'Rami H. donated, 1 unit recorded', time: '10:42' },
  { tone: 'info', text: 'Nour K. replied "On my way"', time: '10:31' },
  { tone: 'warn', text: 'Hadi M. asked "Which entrance?"', time: '10:28', flag: 'Needs reply' },
  { tone: 'mute', text: '9 donors replied "Not this time"', time: '10:12 to 10:40' },
  { tone: 'wa', text: 'Broadcast sent to 27 donors via WhatsApp', time: '10:09' },
] as const

export interface Donor {
  id: string
  name: string
  phone: string
  type: BloodType
  area: string
  last: string
  eligible: string
  eligibleTone: 'green' | 'amber'
  rate: string
  status: 'Active' | 'En route' | 'Paused 30d' | 'Opted out'
}
export const donors: Donor[] = [
  { id: 'd1', name: 'Rami Haddad', phone: '+961 70 123 456', type: 'O-', area: 'Hamra', last: '2 Nov 2026', eligible: '28 Dec', eligibleTone: 'amber', rate: '80% (4/5)', status: 'Active' },
  { id: 'd2', name: 'Nour Khalil', phone: '+961 3 456 812', type: 'O-', area: 'Achrafieh', last: 'Never', eligible: 'Now', eligibleTone: 'green', rate: 'New', status: 'En route' },
  { id: 'd3', name: 'Lara Tannous', phone: '+961 70 991 218', type: 'O-', area: 'Jounieh', last: 'Never', eligible: 'Now', eligibleTone: 'green', rate: 'New', status: 'Active' },
  { id: 'd4', name: 'Maya Saad', phone: '+961 76 220 330', type: 'O-', area: 'Baabda', last: '21 Sep 2026', eligible: '16 Nov', eligibleTone: 'amber', rate: '33% (1/3)', status: 'Active' },
  { id: 'd5', name: 'Omar Bitar', phone: '+961 71 500 702', type: 'O-', area: 'Tripoli', last: '5 Mar 2026', eligible: 'Now', eligibleTone: 'green', rate: '50% (2/4)', status: 'Paused 30d' },
  { id: 'd6', name: 'Sara Ghanem', phone: '+961 81 310 611', type: 'O-', area: 'Saida', last: '14 Jun 2026', eligible: 'Now', eligibleTone: 'green', rate: '100% (2/2)', status: 'Active' },
  { id: 'd7', name: 'Youssef Aoun', phone: '+961 3 777 141', type: 'O-', area: 'Dekwaneh', last: '30 Oct 2026', eligible: '25 Dec', eligibleTone: 'amber', rate: '60% (3/5)', status: 'Opted out' },
  { id: 'd8', name: 'Tala Mansour', phone: '+961 78 404 925', type: 'A+', area: 'Verdun', last: '2 Aug 2026', eligible: 'Now', eligibleTone: 'green', rate: '75% (3/4)', status: 'Active' },
  { id: 'd9', name: 'Georges Nasr', phone: '+961 3 215 660', type: 'B+', area: 'Zalka', last: '11 Jan 2026', eligible: 'Now', eligibleTone: 'green', rate: '40% (2/5)', status: 'Active' },
  { id: 'd10', name: 'Dana Fakhoury', phone: '+961 71 882 047', type: 'AB+', area: 'Mar Mikhael', last: 'Never', eligible: 'Now', eligibleTone: 'green', rate: 'New', status: 'Active' },
]

export const typeCounts: Record<string, number> = {
  'A+': 2104, 'A-': 312, 'B+': 1430, 'B-': 198, 'O+': 3290, 'O-': 611, 'AB+': 388, 'AB-': 87,
}

export const history = [
  { place: 'Hôtel-Dieu de France', what: 'Whole blood, 1 unit', date: '12 Jul 2026' },
  { place: 'Rafic Hariri Hospital', what: 'Whole blood, 1 unit', date: '3 Apr 2026' },
  { place: 'LAU Blood Drive', what: 'Whole blood, 1 unit', date: '18 Jan 2026' },
]

export const cities = ['Beirut', 'Jounieh', 'Tripoli', 'Saida', 'Tyre', 'Zahle', 'Baabda', 'Byblos', 'Nabatieh']
