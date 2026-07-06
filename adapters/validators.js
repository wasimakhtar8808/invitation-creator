/**
 * Validation adapters and utility parsers for UI form inputs.
 */

export function parseGoogleMapsLink(input) {
  if (!input) return '';
  
  const trimmed = input.trim();
  
  // 1. If it's a full iframe HTML tag, extract the src URL
  if (trimmed.startsWith('<iframe') || trimmed.includes('src=')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
  }
  
  // 2. Otherwise return the trimmed string (could be an address, a short link, or raw embed URL)
  return trimmed;
}

export function validateEventForm({
  title,
  dateTime,
  endTime,
  locationCity,
  locationAddress,
  locationMapLink,
  hostPhone
}) {
  const errors = {};
  
  if (!title || !title.trim()) {
    errors.title = 'Event title is required.';
  }
  
  if (!dateTime) {
    errors.dateTime = 'Start date and time is required.';
  }
  
  if (dateTime && endTime) {
    if (new Date(dateTime) > new Date(endTime)) {
      errors.endTime = 'End date and time must be after the start date.';
    }
  }
  
  if (!locationCity || !locationCity.trim()) {
    errors.locationCity = 'City is required.';
  }
  
  if (!locationAddress || !locationAddress.trim()) {
    errors.locationAddress = 'Venue address is required.';
  }
  
  if (!hostPhone || !hostPhone.trim()) {
    errors.hostPhone = 'Host WhatsApp phone number is required.';
  } else {
    const cleanPhone = hostPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      errors.hostPhone = 'Phone number must be between 7 and 15 digits.';
    }
  }

  if (locationMapLink && locationMapLink.trim()) {
    const embedUrl = parseGoogleMapsLink(locationMapLink);
    if (!embedUrl.startsWith('http://') && !embedUrl.startsWith('https://')) {
      errors.locationMapLink = 'Invalid link format. Must start with http:// or https://, or be a Google Maps iframe embed code.';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateRSVPForm({ name, attendance, additionalGuests }) {
  const errors = {};
  
  if (!name || !name.trim()) {
    errors.name = 'Please enter your name.';
  }
  
  if (attendance !== 'yes' && attendance !== 'no') {
    errors.attendance = 'Please indicate your attendance.';
  }
  
  const additional = parseInt(additionalGuests, 10);
  if (attendance === 'yes' && (isNaN(additional) || additional < 0)) {
    errors.additionalGuests = 'Please enter a valid number of additional guests (0 or more).';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
