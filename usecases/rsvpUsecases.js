import { Guest, RSVP } from '../domain/entities.js';

export class SubmitRSVP {
  constructor(rsvpRepository) {
    this.rsvpRepository = rsvpRepository;
  }

  async execute({ name, eventId, attendance, additionalGuests, dietary, congratsNote }) {
    if (!name || !name.trim()) {
      throw new Error('Guest name is required.');
    }
    if (!eventId) {
      throw new Error('Event ID is required.');
    }

    // 1. Check if Guest already exists for this event and name
    let guest = await this.rsvpRepository.findGuestByEventAndName(eventId, name.trim());
    if (!guest) {
      guest = new Guest({ name: name.trim(), eventId });
      const guestValidation = guest.validate();
      if (!guestValidation.isValid) {
        throw new Error(`Guest validation failed: ${guestValidation.errors.join(' ')}`);
      }
      await this.rsvpRepository.saveGuest(guest);
    }

    // 2. Create RSVP
    // If guest already had an RSVP, we might overwrite or create a new one. We can check and update/save.
    const rsvp = new RSVP({
      guestId: guest.id,
      eventId,
      attendance,
      additionalGuests,
      dietary,
      congratsNote
    });

    const rsvpValidation = rsvp.validate();
    if (!rsvpValidation.isValid) {
      throw new Error(`RSVP validation failed: ${rsvpValidation.errors.join(' ')}`);
    }

    await this.rsvpRepository.saveRSVP(rsvp);
    return { guest, rsvp };
  }
}

export class GetEventRSVPs {
  constructor(rsvpRepository) {
    this.rsvpRepository = rsvpRepository;
  }

  async execute(eventId) {
    if (!eventId) {
      throw new Error('Event ID is required.');
    }

    const rsvps = await this.rsvpRepository.findRSVPsByEventId(eventId);
    
    // For each RSVP, fetch guest name to enrich data
    const enrichedRSVPs = [];
    for (const rsvp of rsvps) {
      const guest = await this.rsvpRepository.findGuestById(rsvp.guestId);
      enrichedRSVPs.push({
        ...rsvp,
        guestName: guest ? guest.name : 'Unknown Guest'
      });
    }

    // Sort by timestamp descending
    return enrichedRSVPs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

export class GetRSVPStatistics {
  constructor(rsvpRepository) {
    this.rsvpRepository = rsvpRepository;
  }

  async execute(eventId) {
    const rsvps = await this.rsvpRepository.findRSVPsByEventId(eventId);
    
    let totalResponses = rsvps.length;
    let attendingRSVPs = 0;
    let totalAttendingGuests = 0; // Host + additional guests
    let declinedRSVPs = 0;

    const dietaryBreakdown = {
      'Veg': 0,
      'Non-Veg': 0,
      'Gluten-free': 0,
      'None': 0
    };

    for (const rsvp of rsvps) {
      if (rsvp.attendance === 'yes') {
        attendingRSVPs++;
        const partySize = 1 + (rsvp.additionalGuests || 0);
        totalAttendingGuests += partySize;

        // Attribute dietary preference to the whole party for simplicity,
        // or just the main guest. Let's attribute to the party or main guest.
        // Let's count by main guests who requested it.
        const diet = rsvp.dietary || 'None';
        if (dietaryBreakdown.hasOwnProperty(diet)) {
          dietaryBreakdown[diet] += partySize;
        } else {
          dietaryBreakdown['None'] += partySize;
        }
      } else {
        declinedRSVPs++;
      }
    }

    return {
      totalResponses,
      attendingRSVPs,
      totalAttendingGuests,
      declinedRSVPs,
      dietaryBreakdown
    };
  }
}
