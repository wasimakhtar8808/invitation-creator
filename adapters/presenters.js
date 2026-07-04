/**
 * Presenter logic to format data for UI consumption.
 */

export function formatEventDate(dateTimeStr, timezone) {
  if (!dateTimeStr) return '';
  try {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    // Since JavaScript Date will parse and adjust, let's format it.
    // If timezone is custom, we can supply it to standard options
    const date = new Date(dateTimeStr);
    
    // Attempt to use user's timezone if not specified, otherwise map it
    const localeOpts = { ...options };
    if (timezone && timezone !== 'UTC') {
      try {
        localeOpts.timeZone = timezone;
      } catch (e) {
        console.warn(`Timezone '${timezone}' not recognized by browser, defaulting.`);
      }
    }
    
    return date.toLocaleDateString(undefined, localeOpts);
  } catch (e) {
    return dateTimeStr;
  }
}

export function calculateCountdown(dateTimeStr) {
  if (!dateTimeStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  
  const eventTime = new Date(dateTimeStr).getTime();
  const now = Date.now();
  const diff = eventTime - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, isPast: false };
}

export function composeWhatsAppMessage({
  hostPhone,
  eventTitle,
  guestName,
  attendance,
  additionalGuests,
  dietary,
  congratsNote
}) {
  if (!hostPhone) return null;
  
  // Clean phone number (leave only digits and + prefix)
  const cleanPhone = hostPhone.replace(/[^0-9+]/g, '');
  
  const isAttending = attendance === 'yes';
  const attendingText = isAttending 
    ? `🎉 YES, I am attending!` 
    : `😔 No, unfortunately I cannot attend.`;
    
  let text = `Hi! I just responded to your invitation for *${eventTitle}*.\n\n`;
  text += `*Guest:* ${guestName}\n`;
  text += `*Attendance:* ${attendingText}\n`;
  
  if (isAttending) {
    text += `*Additional Guests:* +${additionalGuests}\n`;
    text += `*Dietary Preference:* ${dietary}\n`;
  }
  
  if (congratsNote && congratsNote.trim()) {
    text += `*Note:* "${congratsNote.trim()}"\n`;
  }
  
  text += `\nSent via Invitation Creator Manager.`;
  
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(text)}`;
}
