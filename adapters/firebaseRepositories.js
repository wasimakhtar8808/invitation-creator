import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { IEventRepository, IRSVPRepository } from '../domain/interfaces.js';
import { Event, Guest, RSVP } from '../domain/entities.js';

// Singleton Firebase App and DB manager
let dbInstance = null;
let appInstance = null;

function getDb(firebaseConfig) {
  if (!dbInstance) {
    if (getApps().length === 0) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApp();
    }
    dbInstance = getFirestore(appInstance);
  }
  return dbInstance;
}

function getAppInstance(firebaseConfig) {
  if (!appInstance) {
    getDb(firebaseConfig);
  }
  return appInstance;
}

export class FirebaseEventRepository extends IEventRepository {
  constructor(firebaseConfig) {
    super();
    this.firebaseConfig = firebaseConfig;
    this.db = getDb(firebaseConfig);
    this.collectionName = 'events';
  }

  async save(event) {
    const data = {
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
    await setDoc(doc(this.db, this.collectionName, event.id), data);
    return event;
  }

  async findById(id) {
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return new Event(docSnap.data());
  }

  async findAll() {
    const querySnapshot = await getDocs(collection(this.db, this.collectionName));
    const events = [];
    querySnapshot.forEach((docSnap) => {
      events.push(new Event(docSnap.data()));
    });
    return events;
  }

  async uploadFile(file) {
    try {
      const app = getAppInstance(this.firebaseConfig);
      const storage = getStorage(app);
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (e) {
      console.warn("Firebase Storage upload failed, falling back to local Base64 URL:", e);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }
}

export class FirebaseRSVPRepository extends IRSVPRepository {
  constructor(firebaseConfig) {
    super();
    this.db = getDb(firebaseConfig);
    this.rsvpsCol = 'rsvps';
    this.guestsCol = 'guests';
  }

  async saveRSVP(rsvp) {
    // Check if RSVP for this guest + event already exists to prevent duplicate entries
    const q = query(
      collection(this.db, this.rsvpsCol),
      where("eventId", "==", rsvp.eventId),
      where("guestId", "==", rsvp.guestId)
    );
    const snap = await getDocs(q);
    
    let targetId = rsvp.id;
    if (!snap.empty) {
      targetId = snap.docs[0].id;
    }

    const data = {
      id: targetId,
      guestId: rsvp.guestId,
      eventId: rsvp.eventId,
      attendance: rsvp.attendance,
      additionalGuests: rsvp.additionalGuests,
      dietary: rsvp.dietary,
      congratsNote: rsvp.congratsNote,
      timestamp: rsvp.timestamp
    };

    await setDoc(doc(this.db, this.rsvpsCol, targetId), data);
    return new RSVP(data);
  }

  async findRSVPsByEventId(eventId) {
    const q = query(collection(this.db, this.rsvpsCol), where("eventId", "==", eventId));
    const snap = await getDocs(q);
    const rsvps = [];
    snap.forEach((docSnap) => {
      rsvps.push(new RSVP(docSnap.data()));
    });
    return rsvps;
  }

  async saveGuest(guest) {
    const data = {
      id: guest.id,
      name: guest.name,
      eventId: guest.eventId
    };
    await setDoc(doc(this.db, this.guestsCol, guest.id), data);
    return guest;
  }

  async findGuestById(guestId) {
    const docRef = doc(this.db, this.guestsCol, guestId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return new Guest(docSnap.data());
  }

  async findGuestByEventAndName(eventId, guestName) {
    const q = query(
      collection(this.db, this.guestsCol),
      where("eventId", "==", eventId),
      where("name", "==", guestName.trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return new Guest(snap.docs[0].data());
  }

  async clearForEvent(eventId) {
    // 1. Delete matching RSVPs
    const rsvpQuery = query(collection(this.db, this.rsvpsCol), where("eventId", "==", eventId));
    const rsvpSnap = await getDocs(rsvpQuery);
    const rsvpPromises = [];
    rsvpSnap.forEach((docSnap) => {
      rsvpPromises.push(deleteDoc(docSnap.ref));
    });

    // 2. Delete matching Guests
    const guestQuery = query(collection(this.db, this.guestsCol), where("eventId", "==", eventId));
    const guestSnap = await getDocs(guestQuery);
    const guestPromises = [];
    guestSnap.forEach((docSnap) => {
      guestPromises.push(deleteDoc(docSnap.ref));
    });

    await Promise.all([...rsvpPromises, ...guestPromises]);
  }
}
