/**
 * Abstract interfaces representing the storage boundaries (DIP/LSP compliance).
 * In ES6, we throw a NotImplementedError to enforce overrides in concrete adapters.
 */

class NotImplementedError extends Error {
  constructor(methodName) {
    super(`Method '${methodName}' must be implemented.`);
    this.name = 'NotImplementedError';
  }
}

export class IEventRepository {
  save(event) {
    throw new NotImplementedError('save');
  }

  findById(id) {
    throw new NotImplementedError('findById');
  }

  findAll() {
    throw new NotImplementedError('findAll');
  }
}

export class IRSVPRepository {
  saveRSVP(rsvp) {
    throw new NotImplementedError('saveRSVP');
  }

  findRSVPsByEventId(eventId) {
    throw new NotImplementedError('findRSVPsByEventId');
  }

  saveGuest(guest) {
    throw new NotImplementedError('saveGuest');
  }

  findGuestById(guestId) {
    throw new NotImplementedError('findGuestById');
  }

  findGuestByEventAndName(eventId, guestName) {
    throw new NotImplementedError('findGuestByEventAndName');
  }
}
