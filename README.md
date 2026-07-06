# Glassmorphic Invitation Creator & RSVP Manager

A premium, responsive Single Page Application (SPA) where hosts can design custom digital invitations and manage guest RSVP lists in real time. 

Built in accordance with **Clean Architecture** boundaries and **SOLID Principles** using modern ES6+ JavaScript, Vanilla CSS, and HTML5.

---

## 🌐 Production Deployments & Console Links

*   **Live Website (Netlify)**: [https://premium-event-invite.netlify.app/](https://premium-event-invite.netlify.app/)
*   **GitHub Repository**: [https://github.com/wasimakhtar8808/invitation-creator](https://github.com/wasimakhtar8808/invitation-creator)

### 🔥 Backend Configuration (Firebase)
*   **Google Account Owner**: `ghosistate@gmail.com`
*   **Firebase Project Console**: [invitation-creator-rsvp Dashboard](https://console.firebase.google.com/u/0/project/invitation-creator-rsvp/overview)
*   **Pricing Plan**: **Spark Plan (100% Free)** — No credit card details or billing required.
*   **Active Services**:
    *   **Cloud Firestore Database**: Configured in Test Mode (allowing immediate public guest RSVP reads and writes).
    *   **Cloud Storage**: Used for binary banner image uploads.

---

## ✨ Features & Integrations

1.  **Aesthetic Themes**:
    *   🌸 *Romantic Wedding*: Elegant script style (*Playfair Display*), rose gold highlights, and cherry blossom animations.
    *   ⚡ *Party Neon*: Dark background, glowing text shadow lights (*Syncopate*), and cyber border animations.
    *   🏢 *Formal Corporate*: Structured blue/charcoal palette, clean lines (*Outfit*), and deep layout card shadows.
    *   🍼 *Baby Shower*: Rounded pastels, cloud details, and bubble animations (*Comfortaa*).
2.  **Premium Media Uploader**:
    *   Allows hosts to upload images from their device during invitation creation.
    *   **Firebase Storage**: Uploads binaries directly to Firestore Cloud Storage and returns the public link.
    *   **Offline Fallback**: If Cloud Storage is not configured, the repository catches the error and converts the file to a Base64 data URL string, storing it locally.
3.  **Toglable Plus-Ones (Additional Guests)**:
    *   Hosts have a checkbox to allow/disallow additional guests.
    *   If **Disabled**: The RSVP form hides the "Additional Guests" number picker, defaults the guest count to `0` behind the scenes, and expands the dietary preference box to occupy the full grid.
4.  **Bulletproof Google Maps**:
    *   If a host pastes a standard Google Maps share link, the validator parses and converts it to a free embed query (`https://maps.google.com/maps?q=...&output=embed`).
    *   If the link field is empty, the renderer automatically searches for the event's address and city. A functional interactive map is **always** displayed to the invitee.
5.  **WhatsApp Guest Notification**:
    *   After a guest submits an RSVP, they are presented with a button to open a pre-composed WhatsApp message to alert the host (including attendance status, additional guest count, dietary requests, and wishes notes).
6.  **Strict Phone Validation**:
    *   Host mobile contacts are automatically checked in the entity and validator layer to ensure they consist of **between 7 and 15 digits** after formatting.

---

## 📁 Architecture Layout

```
├── domain/                  # Enterprise Business Rules (Pure JS)
│   ├── entities.js          # Event, Guest, RSVP models & digit validations
│   └── interfaces.js        # Abstract repository contracts (DIP/LSP)
│
├── usecases/                # Core Workflows (Interactors)
│   ├── eventUsecases.js     # CreateEvent, GetEventDetails, GetAllEvents
│   └── rsvpUsecases.js      # SubmitRSVP, GetEventRSVPs, GetRSVPStatistics
│
├── adapters/                # Interface Bridges
│   ├── repositories.js      # Concrete LocalStorage database repository
│   ├── firebaseRepositories.js # Concrete Cloud Firestore & Storage repository
│   ├── presenters.js        # Countdown, date formatting, and WhatsApp url generator
│   └── validators.js        # Form validation and Google Maps link converter
│
├── ui/                      # Delivery Framework (HTML / CSS / DOM)
│   ├── themes.js            # Extensible themes schema (OCP)
│   └── renderer.js          # DOM builder templates & action listeners
│
├── index.html               # SPA Entrypoint
├── styles.css               # Design system classes, margins, and animations
├── app.js                   # App bootstrapping router & dynamic Firebase initializer
└── tests.js                 # Automated unit and integration test runner
```

---

## ⚙️ Running Locally

### 1. Host the Static Files
Since the application runs modular ES6 javascript (`import`/`export`), browsers block local files via `file:///` protocols. You must run a static server:

*   **With Node.js / npx**:
    ```bash
    npx http-server -p 8080
    ```
*   **With Python**:
    ```bash
    python -m http.server 8080
    ```
*   **With PowerShell**:
    ```powershell
    powershell -ExecutionPolicy Bypass -File server.ps1
    ```

Once running, navigate to [http://localhost:8080](http://localhost:8080).

### 2. Live Verification
To execute the automated unit and integration tests, open the app with the `?test=true` parameter in the URL: [http://localhost:8080/?test=true](http://localhost:8080/?test=true).
- The test runner will verify entity validation constraints, repository read/write speed, and rsvp statistics calculations.
