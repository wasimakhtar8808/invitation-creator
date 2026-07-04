import { LocalStorageEventRepository, LocalStorageRSVPRepository } from './adapters/repositories.js';
import { InvitationAppRenderer } from './ui/renderer.js';

// 1. Instantiate concrete repository dependencies
const eventRepo = new LocalStorageEventRepository();
const rsvpRepo = new LocalStorageRSVPRepository();

// 2. Seed default data if storage is empty (Premium User Experience)
async function seedDefaultData() {
  const existingEvents = await eventRepo.findAll();
  if (existingEvents.length === 0) {
    console.log('Seeding initial demonstration data...');
    
    // Seed 1: Wedding Event
    const weddingDate = new Date();
    weddingDate.setDate(weddingDate.getDate() + 45); // 45 days from now
    weddingDate.setHours(16, 0, 0, 0);

    const weddingEnd = new Date(weddingDate);
    weddingEnd.setHours(23, 30, 0, 0);

    const weddingId = 'demo-wedding-123';
    await eventRepo.save({
      id: weddingId,
      type: 'marriage',
      title: 'Emma & Liam\'s Romantic Wedding',
      description: 'Join us as we write the next chapter of our love story under the sunset. Your presence is our greatest gift.',
      dateTime: weddingDate.toISOString().slice(0, 16),
      endTime: weddingEnd.toISOString().slice(0, 16),
      timezone: 'Asia/Kolkata',
      locationCity: 'Florence',
      locationAddress: 'Villa Cora, Viale Machiavelli 18',
      locationMapLink: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2881.5647571343714!2d11.248386376846174!3d43.7610996454045!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x132a514d13543d3b%3A0xeab5b00c9e6cd52!2sVilla%20Cora!5e0!3m2!1sen!2sin!4v1719945000000!5m2!1sen!2sin',
      mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
      hostPhone: '+39055228791',
      theme: 'romantic-wedding'
    });

    // Seed 2: Tech Neon Birthday
    const bdayDate = new Date();
    bdayDate.setDate(bdayDate.getDate() + 10);
    bdayDate.setHours(21, 0, 0, 0);

    const bdayId = 'demo-birthday-456';
    await eventRepo.save({
      id: bdayId,
      type: 'party',
      title: 'Neon Cyber Party: Max\'s 25th',
      description: 'Leveling up! Lasers, synthwave beats, and glowing drinks. Dress code: Neon reflective.',
      dateTime: bdayDate.toISOString().slice(0, 16),
      endTime: '',
      timezone: 'America/New_York',
      locationCity: 'Brooklyn',
      locationAddress: 'House of Yes, 2 Wyckoff Ave',
      locationMapLink: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.8454271810574!2d-73.92557672343743!3d40.70158223838421!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25c05d76c66cf%3A0xb3bf4bd9049e6f21!2sHouse%20of%20Yes!5e0!3m2!1sen!2sin!4v1719946000000!5m2!1sen!2sin',
      mediaUrl: 'https://images.unsplash.com/photo-1496337589254-7e19d01eae44?q=80&w=1200&auto=format&fit=crop',
      hostPhone: '+17183839300',
      theme: 'party-neon'
    });

    // Seed RSVPs for Wedding
    const guests = [
      { name: 'Sophia Martinez', attendance: 'yes', additional: 1, dietary: 'Veg', note: 'Can\'t wait to see you both walk down the aisle!' },
      { name: 'Oliver Smith', attendance: 'yes', additional: 0, dietary: 'Gluten-free', note: 'So happy for you Emma & Liam! ❤️' },
      { name: 'James Carter', attendance: 'no', additional: 0, dietary: 'None', note: 'Sorry, I will be traveling. Sending lots of love!' },
      { name: 'Amelia Johnson', attendance: 'yes', additional: 2, dietary: 'Non-Veg', note: 'Bringing the whole family! Congratulations!' }
    ];

    for (const g of guests) {
      // Create guest
      const newGuest = {
        id: 'demo-gt-' + Math.random().toString(36).substr(2, 5),
        name: g.name,
        eventId: weddingId
      };
      await rsvpRepo.saveGuest(newGuest);

      // Create RSVP
      await rsvpRepo.saveRSVP({
        id: 'demo-rs-' + Math.random().toString(36).substr(2, 5),
        guestId: newGuest.id,
        eventId: weddingId,
        attendance: g.attendance,
        additionalGuests: g.additional,
        dietary: g.dietary,
        congratsNote: g.note,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
      });
    }

    // Seed RSVPs for Neon Party
    const neonGuests = [
      { name: 'Lucas Davis', attendance: 'yes', additional: 1, dietary: 'None', note: 'Synthwave playlist ready ⚡' },
      { name: 'Mia Wong', attendance: 'yes', additional: 0, dietary: 'Veg', note: 'Neon goggles purchased!' }
    ];

    for (const g of neonGuests) {
      const newGuest = {
        id: 'demo-gt-' + Math.random().toString(36).substr(2, 5),
        name: g.name,
        eventId: bdayId
      };
      await rsvpRepo.saveGuest(newGuest);

      await rsvpRepo.saveRSVP({
        id: 'demo-rs-' + Math.random().toString(36).substr(2, 5),
        guestId: newGuest.id,
        eventId: bdayId,
        attendance: g.attendance,
        additionalGuests: g.additional,
        dietary: g.dietary,
        congratsNote: g.note,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// 3. Initialize renderer
const appContainer = document.getElementById('app');
const renderer = new InvitationAppRenderer(appContainer, eventRepo, rsvpRepo);

// 4. Register Custom Application Event Handlers (Loose Coupling)
document.addEventListener('switch-event', async (e) => {
  renderer.activeDashboardEventId = e.detail;
  await renderer.renderDashboard();
});

document.addEventListener('copy-link', async (e) => {
  const url = e.detail;
  try {
    await navigator.clipboard.writeText(url);
    renderer.showToast('📋 Invitation link copied to clipboard!');
  } catch (err) {
    // Fallback if clipboard isn't supported/blocked
    prompt('Copy this invitation link:', url);
  }
});

document.addEventListener('clear-rsvps', async (e) => {
  const eventId = e.detail;
  if (confirm('Are you sure you want to clear all RSVPs for this event? This action cannot be undone.')) {
    // Delete RSVPs and associated guests for the event
    const rsvps = localStorage.getItem('invitation_rsvps');
    if (rsvps) {
      const parsed = JSON.parse(rsvps);
      const filtered = Object.keys(parsed)
        .filter(key => parsed[key].eventId !== eventId)
        .reduce((obj, key) => {
          obj[key] = parsed[key];
          return obj;
        }, {});
      localStorage.setItem('invitation_rsvps', JSON.stringify(filtered));
    }
    
    const guests = localStorage.getItem('invitation_guests');
    if (guests) {
      const parsed = JSON.parse(guests);
      const filtered = Object.keys(parsed)
        .filter(key => parsed[key].eventId !== eventId)
        .reduce((obj, key) => {
          obj[key] = parsed[key];
          return obj;
        }, {});
      localStorage.setItem('invitation_guests', JSON.stringify(filtered));
    }

    renderer.showToast('🗑️ RSVPs cleared successfully!');
    await renderer.renderDashboard();
  }
});

// Detect browser back/forward buttons or hash changes
window.addEventListener('popstate', async () => {
  await renderer.route();
});

// 5. Run setup and bootstrap router
(async () => {
  await seedDefaultData();
  await renderer.route();
})();
