# Glassmorphic Invitation Creator & RSVP Manager

A premium, responsive Single Page Application (SPA) where users can create, customize, and share digital invitations for events (weddings, birthday parties, corporate events, and baby showers) and track guest RSVPs in real time.

Built strictly in accordance with **Clean Architecture** guidelines and **SOLID Principles** using modern ES6+ JavaScript, Vanilla CSS, and HTML5.

---

## 🎨 Visual Aesthetics & Themes

The application features a sleek glassmorphic user interface (`backdrop-filter: blur()`) with soft background glows, responsive grid templates, and dynamic float-animations. 

Following the **Open/Closed Principle (OCP)**, the theme engine maps configurations dynamically to four pre-built aesthetic themes:
*   🌸 **Romantic Wedding**: Rose gold highlights, elegant serif font (*Playfair Display*), and falling sakura blossom animations.
*   ⚡ **Party Neon**: Deep dark mode, neon borders, glowing shadows, sans-serif typography (*Syncopate*), and floating glowing emojis.
*   🏢 **Formal Corporate**: Professional steel blue tones, clean typography (*Outfit*), deep shadows, and geometric shapes.
*   🍼 **Baby Shower**: Soft pastel blue/pink gradients, rounded buttons, playful font (*Comfortaa*), and floating bubble animations.

---

## 📁 Architecture & Directory Structure

The codebase is organized into clean architectural layers, keeping business rules independent of databases, framework choices, and presentation layouts:

```
├── domain/                  # Enterprise/Core Business Rules
│   ├── entities.js          # Event, Guest, and RSVP models & core validations
│   └── interfaces.js        # Abstract boundaries (DIP/LSP repositories)
│
├── usecases/                # Application Business Rules (Interactors)
│   ├── eventUsecases.js     # CreateEvent, GetEventDetails, GetAllEvents
│   └── rsvpUsecases.js      # SubmitRSVP, GetEventRSVPs, GetRSVPStatistics
│
├── adapters/                # Interface Adapters
│   ├── repositories.js      # Concrete LocalStorage-backed DB implementation
│   ├── presenters.js        # Countdown, date formatting, and WhatsApp url generator
│   └── validators.js        # UI form validators & Maps embed URL extractor
│
├── ui/                      # Frameworks & UI Layer (Web/External)
│   ├── themes.js            # Extensible theme structures & Theme Engine
│   └── renderer.js          # DOM rendering templates & action listeners
│
├── index.html               # SPA Entrypoint
├── styles.css               # Core design tokens, layouts, & animations
├── app.js                   # Application bootstrap, seeder, & router
├── tests.js                 # Browser-based automated integration test suite
└── .gitignore               # Ignored system & config files
```

---

## 🚀 Getting Started

### 1. Serve the App Locally
Because the app relies on ES6 modules, the browser blocks imports over local `file:///` paths due to CORS. You must run a local server:

*   **Option A: Node.js (npx)**
    ```bash
    npx http-server -p 8080
    ```
*   **Option B: Python**
    ```bash
    python -m http.server 8080
    ```
*   **Option C: PowerShell**
    ```powershell
    # Execute the scratch script provided in local artifacts:
    powershell -ExecutionPolicy Bypass -File server.ps1
    ```

Once running, navigate to [http://localhost:8080](http://localhost:8080).

### 2. Live Seeding
On your first load, the app automatically populates the database with demonstration data:
1.  **Emma & Liam's Wedding** (Romantic theme, location map embed, and mock RSVPs).
2.  **Max's Neon Cyber Party** (Party theme, location maps, and pre-recorded guest RSVPs).

---

## 🧪 Validation & Automated Testing

The project has a built-in automated test suite that runs directly in your browser.
*   **To run the tests**: Open [http://localhost:8080/?test=true](http://localhost:8080/?test=true) in your browser.
*   **Results**: A success/failure notification will banner the page, and the developer console will print full diagnostic logs verifying entity schemas, repository storage cycles, and statistics math.
