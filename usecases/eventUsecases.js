import { Event } from '../domain/entities.js';

export class CreateEvent {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(eventData) {
    const event = new Event(eventData);
    const validation = event.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(' ')}`);
    }
    await this.eventRepository.save(event);
    return event;
  }
}

export class GetEventDetails {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId) {
    if (!eventId) {
      throw new Error('Event ID is required.');
    }
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found.');
    }
    return event;
  }
}

export class GetAllEvents {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute() {
    return await this.eventRepository.findAll();
  }
}
