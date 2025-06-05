import { AvailableDate } from './types';

/**
 * Generate available dates for booking (next 7 business days)
 * @returns Array of available dates with formatted strings
 */
export const getAvailableDates = (): AvailableDate[] => {
  const dates: AvailableDate[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 14; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      dates.push({
        date,
        formatted: date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      });
    }
    
    // Stop after we have 7 business days
    if (dates.length >= 7) break;
  }
  
  return dates;
};

/**
 * Get service-specific primary color
 * @param serviceType The type of service
 * @returns Hex color code
 */
export const getServiceColor = (serviceType: string | undefined): string => {
  switch (serviceType) {
    case 'Digital Marketing':
      return '#8E44AD';
    case 'Overseas Business':
      return '#2E86AB';
    case 'Enterprise':
      return '#F18F01';
    case 'Healthcare':
      return '#C73E1D';
    case 'Startups':
      return '#4CAF50';
    default:
      return '#6C3483';
  }
};

/**
 * Validate email format
 * @param email Email address to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Mock function to check availability with Google Calendar
 * In a real implementation, this would call your API that interfaces with Google Calendar
 * @param date Date to check availability for
 * @param timeSlots Array of time slots
 * @returns Promise resolving to filtered available time slots
 */
export const checkAvailability = async (date: string, timeSlots: Array<{time: string, label: string}>): Promise<Array<{time: string, label: string}>> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate some slots being unavailable (random for demo purposes)
  return timeSlots.filter(() => Math.random() > 0.3);
};

/**
 * Format booking data for submission to API
 * @param formData Form data from the booking form
 * @param serviceData Service data from the modal
 * @param meetingTypeName Name of the meeting type
 * @param duration Duration of the meeting in minutes
 * @returns Formatted booking data object
 */
export const formatBookingData = (
  formData: any, 
  serviceData: any, 
  meetingTypeName: string, 
  duration: number
) => {
  return {
    ...formData,
    meetingTypeName,
    duration,
    serviceType: serviceData?.serviceType || '',
    serviceName: serviceData?.serviceName || '',
    formType: 'Calendar Booking',
    source: serviceData?.source || 'Website',
    pageUrl: serviceData?.pageUrl || '/contact',
    subject: `${serviceData?.serviceName || 'Service'} Calendar Booking`,
    message: `Meeting Type: ${meetingTypeName}\nDate: ${formData.date}\nTime: ${formData.time}\nNotes: ${formData.notes}`,
  };
};
