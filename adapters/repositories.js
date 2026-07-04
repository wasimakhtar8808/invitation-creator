import { IEventRepository, IRSVPRepository } from '../domain/interfaces.js';
import { Event, Guest, RSVP } from '../domain/entities.js';

export class LocalStorageEventRepository extends IEventRepository {
  constructor() {
    super();
    this.storageKey = 'invitation_events';
  }

  _getRawEvents() {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : {};
  }

  _setRawEvents(eventsObj) {
    localStorage.setItem(this.storageKey, JSON.stringify(eventsObj));
  }

  async save(event) {
    const events = this._getRawEvents();
    events[event.id] = {
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      dateTime: event.dateTime,
      endTime: event.endTime,
      timezone: event.timezone,
      locationCity: event.locationCity,
      locationAddress: event.locationAddress,
      locationMapLink: event.locationMapLink,
      mediaUrl: event.mediaUrl,
      hostPhone: event.hostPhone,
      theme: event.theme
    };
    this._setRawEvents(events);
    return event;
  }

  async findById(id) {
    const events = this._getRawEvents();
    const data = events[id];
    if (!data) return null;
    return new Event(data);
  }

  async findAll() {
    const events = this._getRawEvents();
    return Object.values(events).map(data => new Event(data));
  }
}

export class LocalStorageRSVPRepository extends IRSVPRepository {
  constructor() {
    super();
    this.rsvpsKey = 'invitation_rsvps';
    this.guestsKey = 'invitation_guests';
  }

  _getRawRSVPs() {
    const raw = localStorage.getItem(this.rsvpsKey);
    return raw ? JSON.parse(raw) : {};
  }

  _setRawRSVPs(rsvpsObj) {
    localStorage.setItem(this.rsvpsKey, JSON.stringify(rsvpsObj));
  }

  _getRawGuests() {
    const raw = localStorage.getItem(this.guestsKey);
    return raw ? JSON.parse(raw) : {};
  }

  _setRawGuests(guestsObj) {
    localStorage.setItem(this.guestsKey, JSON.stringify(guestsObj));
  }

  async saveRSVP(rsvp) {
    const rsvps = this._getRawRSVPs();
    
    // Check if guest already has an RSVP for this event to avoid duplicates
    // If guestId + eventId matches, we update the existing RSVP record
    let matchId = rsvp.id;
    for (const id in rsvps) {
      if (rsvps[id].eventId === rsvp.eventId && rsvps[id].guestId === rsvp.guestId) {
        matchId = id;
        break;
      }
    }

    rsvps[matchId] = {
      id: matchId,
      guestId: rsvp.guestId,
      eventId: rsvp.eventId,
      attendance: rsvp.attendance,
      additionalGuests: rsvp.additionalGuests,
      dietary: rsvp.dietary,
      congratsNote: rsvp.congratsNote,
      timestamp: rsvp.timestamp
    };
    this._setRawRSVPs(rsvps);
    return new RSVP(rsvps[matchId]);
  }

  async findRSVPsByEventId(eventId) {
    const rsvps = this._getRawRSVPs();
    return Object.values(rsvps)
      .filter(data => data.eventId === eventId)
      .map(data => new RSVP(data));
  }

  async saveGuest(guest) {
    const guests = this._getRawGuests();
    guests[guest.id] = {
      id: guest.id,
      name: guest.name,
      eventId: guest.eventId
    };
    this._setRawGuests(guests);
    return guest;
  }

  async findGuestById(guestId) {
    const guests = this._getRawGuests();
    const data = guests[guestId];
    if (!data) return null;
    return new Guest(data);
  }

  async findGuestByEventAndName(eventId, guestName) {
    const guests = this._getRawGuests();
    const lowerName = guestName.toLowerCase();
    const match = Object.values(guests).find(
      data => data.eventId === eventId && data.name.toLowerCase() === lowerName
    );
    if (!match) return null;
    return new Guest(match);
  }
}
