/**
 * Domain Entities and Validation Rules
 */

export class Event {
  constructor({
    id,
    type,
    title,
    description,
    dateTime,
    endTime,
    timezone,
    locationCity,
    locationAddress,
    locationMapLink,
    mediaUrl,
    hostPhone,
    theme
  }) {
    this.id = id || this._generateUUID();
    this.type = type || 'custom'; // marriage, birthday, party, corporate, babyshower, custom
    this.title = title || '';
    this.description = description || '';
    this.dateTime = dateTime || '';
    this.endTime = endTime || '';
    this.timezone = timezone || 'UTC';
    this.locationCity = locationCity || '';
    this.locationAddress = locationAddress || '';
    this.locationMapLink = locationMapLink || '';
    this.mediaUrl = mediaUrl || '';
    this.hostPhone = hostPhone || '';
    this.theme = theme || 'romantic-wedding';
  }

  validate() {
    const errors = [];
    if (!this.title.trim()) {
      errors.push('Event title is required.');
    }
    if (!this.dateTime) {
      errors.push('Event start date and time are required.');
    }
    if (this.dateTime && this.endTime) {
      if (new Date(this.dateTime) > new Date(this.endTime)) {
        errors.push('End date/time must be after the start date/time.');
      }
    }
    if (!this.locationCity.trim()) {
      errors.push('Location city is required.');
    }
    if (!this.locationAddress.trim()) {
      errors.push('Location address is required.');
    }
    if (!this.hostPhone.trim()) {
      errors.push('Host contact phone number is required.');
    } else {
      const cleanPhone = this.hostPhone.replace(/[\s()+-]/g, '');
      if (cleanPhone.length < 5 || isNaN(cleanPhone)) {
        errors.push('Host contact phone number must be a valid phone number.');
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _generateUUID() {
    return 'ev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

export class Guest {
  constructor({ id, name, eventId }) {
    this.id = id || this._generateUUID();
    this.name = name || '';
    this.eventId = eventId || '';
  }

  validate() {
    const errors = [];
    if (!this.name.trim()) {
      errors.push('Guest name is required.');
    }
    if (!this.eventId) {
      errors.push('Associated event ID is required.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _generateUUID() {
    return 'gt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

export class RSVP {
  constructor({
    id,
    guestId,
    eventId,
    attendance, // 'yes' or 'no'
    additionalGuests, // number
    dietary, // 'Veg', 'Non-Veg', 'Gluten-free', 'None'
    congratsNote,
    timestamp
  }) {
    this.id = id || this._generateUUID();
    this.guestId = guestId || '';
    this.eventId = eventId || '';
    this.attendance = attendance || 'yes';
    this.additionalGuests = parseInt(additionalGuests, 10) || 0;
    this.dietary = dietary || 'None';
    this.congratsNote = congratsNote || '';
    this.timestamp = timestamp || new Date().toISOString();
  }

  validate() {
    const errors = [];
    if (!this.guestId) {
      errors.push('Guest reference is required for RSVP.');
    }
    if (!this.eventId) {
      errors.push('Event reference is required for RSVP.');
    }
    if (this.attendance !== 'yes' && this.attendance !== 'no') {
      errors.push('Attendance must be either "yes" or "no".');
    }
    if (this.additionalGuests < 0) {
      errors.push('Number of additional guests cannot be negative.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _generateUUID() {
    return 'rs_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}
