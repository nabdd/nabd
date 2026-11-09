export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

/** Donor types that can give red cells to a recipient type. */
export const CAN_RECEIVE_FROM: Record<BloodType, BloodType[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
}

export const COMPONENTS = ['Whole blood', 'Platelets', 'Plasma', 'Red cells'] as const
export const URGENCIES = ['urgent', '24h', 'week'] as const
export type Urgency = (typeof URGENCIES)[number]
