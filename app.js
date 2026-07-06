import { InvitationAppRenderer } from './ui/renderer.js';

// ==========================================================================
// 🌐 FIREBASE CONFIGURATION
// ==========================================================================
// To connect your application to your live Firebase Cloud Firestore:
// 1. Go to Firebase Console -> Project Settings -> General.
// 2. Under 'Your apps', click the Web App (</>) and copy the firebaseConfig object.
// 3. Paste the config object below.
// Example:
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC9_ouQcOFlMyQIWNnclsVozoU5ACVIlkc",
  authDomain: "invitation-creator-rsvp.firebaseapp.com",
  projectId: "invitation-creator-rsvp",
  storageBucket: "invitation-creator-rsvp.firebasestorage.app",
  messagingSenderId: "10325981406",
  appId: "1:10325981406:web:5da6c3afc97ca329a16a4f"
};

// Global repositories and renderer instances
let eventRepo;
let rsvpRepo;
let renderer;

// Seed default data if database is empty (Premium User Experience)
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
      const newGuest = {
        id: 'demo-gt-' + Math.random().toString(36).substr(2, 5),
        name: g.name,
        eventId: weddingId
      };
      await rsvpRepo.saveGuest(newGuest);

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

// Global Router POP State trigger
window.addEventListener('popstate', async () => {
  if (renderer) {
    await renderer.route();
  }
});

// App Startup Orchestrator (IIFE)
(async () => {
  // 1. Dynamic Repository instantiation (Firebase vs LocalStorage)
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
    console.log('Firebase Config detected. Initializing Cloud Firestore repositories...');
    try {
      const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

      let app;
      if (getApps().length === 0) {
        app = initializeApp(FIREBASE_CONFIG);
      } else {
        app = getApp();
      }

      window.firebaseAuthInstance = getAuth(app);

      const { FirebaseEventRepository, FirebaseRSVPRepository } = await import('./adapters/firebaseRepositories.js');
      eventRepo = new FirebaseEventRepository(FIREBASE_CONFIG);
      rsvpRepo = new FirebaseRSVPRepository(FIREBASE_CONFIG);
    } catch (err) {
      console.error('Failed to load Firebase repository, falling back to LocalStorage:', err);
      const { LocalStorageEventRepository, LocalStorageRSVPRepository } = await import('./adapters/repositories.js');
      eventRepo = new LocalStorageEventRepository();
      rsvpRepo = new LocalStorageRSVPRepository();
    }
  } else {
    console.log('No Firebase Config found. Operating in LocalStorage fallback mode...');
    const { LocalStorageEventRepository, LocalStorageRSVPRepository } = await import('./adapters/repositories.js');
    eventRepo = new LocalStorageEventRepository();
    rsvpRepo = new LocalStorageRSVPRepository();
  }

  // 2. Initialize renderer instance
  const appContainer = document.getElementById('app');
  renderer = new InvitationAppRenderer(appContainer, eventRepo, rsvpRepo);

  // 3. Register Custom decoupled event listeners
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
      prompt('Copy this invitation link:', url);
    }
  });

  document.addEventListener('clear-rsvps', async (e) => {
    const eventId = e.detail;
    if (confirm('Are you sure you want to clear all RSVPs for this event? This action cannot be undone.')) {
      try {
        await rsvpRepo.clearForEvent(eventId);
        renderer.showToast('🗑️ RSVPs cleared successfully!');
        await renderer.renderDashboard();
      } catch (err) {
        alert(`Error clearing RSVPs: ${err.message}`);
      }
    }
  });

  // 4. Seed databases if empty
  // await seedDefaultData();

  // 5. Trigger routing
  if (window.firebaseAuthInstance) {
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    onAuthStateChanged(window.firebaseAuthInstance, async (user) => {
      renderer.setCurrentUser(user);
      await renderer.route();
    });
  } else {
    await renderer.route();
  }
})();
