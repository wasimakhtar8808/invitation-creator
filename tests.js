import { LocalStorageEventRepository, LocalStorageRSVPRepository } from './adapters/repositories.js';
import { CreateEvent, GetEventDetails } from './usecases/eventUsecases.js';
import { SubmitRSVP, GetRSVPStatistics } from './usecases/rsvpUsecases.js';
import { Event } from './domain/entities.js';

class Assert {
  static equals(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`Assertion failed: Expected '${expected}' but got '${actual}'. ${message}`);
    }
  }

  static true(value, message = '') {
    if (value !== true) {
      throw new Error(`Assertion failed: Expected true but got '${value}'. ${message}`);
    }
  }

  static false(value, message = '') {
    if (value !== false) {
      throw new Error(`Assertion failed: Expected false but got '${value}'. ${message}`);
    }
  }
}

export async function runIntegrationTests() {
  console.group('%c🚀 Running Application Integration Tests', 'font-weight: bold; font-size: 14px; color: #4f46e5;');
  
  const eventRepo = new LocalStorageEventRepository();
  const rsvpRepo = new LocalStorageRSVPRepository();
  
  let passes = 0;
  let fails = 0;

  const testCases = [
    {
      name: '1. Event Entity Validation Rules',
      fn: async () => {
        // Test invalid event (empty title)
        const invalidEvent = new Event({
          title: '',
          dateTime: '2026-07-05T12:00',
          locationCity: 'New York',
          locationAddress: '5th Ave',
          hostPhone: 'invalid-phone'
        });
        const val1 = invalidEvent.validate();
        Assert.false(val1.isValid, 'Event with empty title should be invalid');
        Assert.true(val1.errors.includes('Event title is required.'), 'Should report missing title error');
        Assert.true(val1.errors.includes('Host contact phone number must be a valid phone number.'), 'Should report phone error');

        // Test valid event
        const validEvent = new Event({
          title: 'Valid Wedding',
          dateTime: '2026-07-05T12:00',
          locationCity: 'New York',
          locationAddress: '5th Ave',
          hostPhone: '+12125550199'
        });
        const val2 = validEvent.validate();
        Assert.true(val2.isValid, `Event should be valid, but got errors: ${val2.errors.join(', ')}`);
      }
    },
    {
      name: '2. LocalStorage Event Repository Save & Retrieve',
      fn: async () => {
        const createEvent = new CreateEvent(eventRepo);
        const getEvent = new GetEventDetails(eventRepo);

        const testEvent = {
          id: 'test-event-' + Date.now(),
          type: 'party',
          title: 'Unit Test Party',
          dateTime: '2026-08-01T20:00',
          locationCity: 'San Francisco',
          locationAddress: '101 Market St',
          hostPhone: '+14155552671',
          theme: 'party-neon'
        };

        const created = await createEvent.execute(testEvent);
        Assert.equals(created.title, testEvent.title);
        
        const retrieved = await getEvent.execute(created.id);
        Assert.equals(retrieved.title, testEvent.title);
        Assert.equals(retrieved.locationCity, testEvent.locationCity);
        Assert.equals(retrieved.theme, testEvent.theme);
      }
    },
    {
      name: '3. RSVP Submission & Statistics Calculations',
      fn: async () => {
        const eventId = 'test-rsvp-event-' + Date.now();
        const submitRSVP = new SubmitRSVP(rsvpRepo);
        const getStats = new GetRSVPStatistics(rsvpRepo);

        // Submit RSVP 1: Attending, 2 extra guests, Veg
        await submitRSVP.execute({
          name: 'Test Guest A',
          eventId,
          attendance: 'yes',
          additionalGuests: 2,
          dietary: 'Veg',
          congratsNote: 'Congrats!'
        });

        // Submit RSVP 2: Attending, 0 extra guests, Gluten-free
        await submitRSVP.execute({
          name: 'Test Guest B',
          eventId,
          attendance: 'yes',
          additionalGuests: 0,
          dietary: 'Gluten-free',
          congratsNote: 'Super excited!'
        });

        // Submit RSVP 3: Declined
        await submitRSVP.execute({
          name: 'Test Guest C',
          eventId,
          attendance: 'no',
          additionalGuests: 0,
          dietary: 'None',
          congratsNote: 'Sorry!'
        });

        const stats = await getStats.execute(eventId);

        // Asserts
        Assert.equals(stats.totalResponses, 3, 'Total responses should be 3');
        Assert.equals(stats.attendingRSVPs, 2, 'Attending RSVPs count should be 2');
        Assert.equals(stats.declinedRSVPs, 1, 'Declined RSVPs count should be 1');
        // Total attending: (1 + 2) from Guest A + (1 + 0) from Guest B = 4
        Assert.equals(stats.totalAttendingGuests, 4, 'Total attending guests count should be 4');
        
        // Dietary: Veg = 3 (Guest A + 2 additional), Gluten-free = 1 (Guest B), None = 0
        Assert.equals(stats.dietaryBreakdown['Veg'], 3, 'Veg dietary count should sum to 3');
        Assert.equals(stats.dietaryBreakdown['Gluten-free'], 1, 'Gluten-free dietary count should sum to 1');
      }
    }
  ];

  for (const tc of testCases) {
    try {
      await tc.fn();
      console.log(`%c✔ PASS: ${tc.name}`, 'color: #059669; font-weight: 500;');
      passes++;
    } catch (err) {
      console.error(`%c✘ FAIL: ${tc.name}`, 'color: #dc2626; font-weight: bold;');
      console.error(err);
      fails++;
    }
  }

  console.groupEnd();
  
  console.log(
    `%cTests Complete: ${passes} passed, ${fails} failed.`,
    `font-weight: bold; color: ${fails === 0 ? '#059669' : '#dc2626'};`
  );

  return { passes, fails };
}

// Auto-run if query param is set
if (new URLSearchParams(window.location.search).get('test') === 'true') {
  runIntegrationTests().then(({ fails }) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed top-4 left-4 z-50 p-4 rounded-xl border font-bold text-xs shadow-2xl transition-all';
    if (fails === 0) {
      alertDiv.className += ' bg-emerald-500 text-white border-emerald-600';
      alertDiv.innerHTML = '✨ Integration Tests Passed! Check Dev Console.';
    } else {
      alertDiv.className += ' bg-red-500 text-white border-red-600';
      alertDiv.innerHTML = '🚨 Integration Tests Failed! Check Dev Console.';
    }
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
  });
}
