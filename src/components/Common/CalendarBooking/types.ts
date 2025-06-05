import { ServiceContactModalData } from '@/hooks/useServiceContactModal';

// Meeting types definition
export const meetingTypes = [
  { id: 'initial-consultation', name: 'Initial Consultation', duration: 30 },
  { id: 'strategy-session', name: 'Strategy Session', duration: 45 },
  { id: 'project-discussion', name: 'Project Discussion', duration: 60 },
];

// Time slots definition
export const timeSlots = [
  { time: '09:00', label: '9:00 AM' },
  { time: '09:30', label: '9:30 AM' },
  { time: '10:00', label: '10:00 AM' },
  { time: '10:30', label: '10:30 AM' },
  { time: '11:00', label: '11:00 AM' },
  { time: '11:30', label: '11:30 AM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '13:30', label: '1:30 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '14:30', label: '2:30 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '15:30', label: '3:30 PM' },
  { time: '16:00', label: '4:00 PM' },
  { time: '16:30', label: '4:30 PM' },
];

// Form data interface
export interface FormData {
  meetingType: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

// Form validation errors interface
export interface FormErrors {
  meetingType?: string;
  date?: string;
  time?: string;
  name?: string;
  email?: string;
}

// Props for the calendar booking modal
export interface CalendarBookingModalProps {
  open: boolean;
  onClose: () => void;
  serviceData: ServiceContactModalData | null;
}

// Props for the booking steps components
export interface BookingStepProps {
  formData: FormData;
  errors: FormErrors;
  handleInputChange: (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: keyof FormData) => (event: any) => void;
  handleTimeSelect: (time: string) => void;
  primaryColor: string;
  serviceData: ServiceContactModalData | null;
  availableDates: Array<{date: Date; formatted: string}>;
  availableTimeSlots: typeof timeSlots;
}

// Date type for available dates
export interface AvailableDate {
  date: Date;
  formatted: string;
}
