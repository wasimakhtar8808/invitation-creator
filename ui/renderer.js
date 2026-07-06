import { CreateEvent, GetEventDetails, GetAllEvents } from '../usecases/eventUsecases.js';
import { SubmitRSVP, GetEventRSVPs, GetRSVPStatistics } from '../usecases/rsvpUsecases.js';
import { formatEventDate, calculateCountdown, composeWhatsAppMessage } from '../adapters/presenters.js';
import { validateEventForm, validateRSVPForm, parseGoogleMapsLink } from '../adapters/validators.js';
import { ThemeEngine, THEMES } from './themes.js';

export class InvitationAppRenderer {
  constructor(appContainer, eventRepository, rsvpRepository) {
    this.container = appContainer;
    this.eventRepo = eventRepository;
    this.rsvpRepo = rsvpRepository;

    // Instantiate usecases
    this.createEventUseCase = new CreateEvent(this.eventRepo);
    this.getEventDetailsUseCase = new GetEventDetails(this.eventRepo);
    this.getAllEventsUseCase = new GetAllEvents(this.eventRepo);

    this.submitRSVPUseCase = new SubmitRSVP(this.rsvpRepo);
    this.getEventRSVPsUseCase = new GetEventRSVPs(this.rsvpRepo);
    this.getRSVPStatisticsUseCase = new GetRSVPStatistics(this.rsvpRepo);

    this.countdownInterval = null;
    this.selectedTheme = 'romantic-wedding';
    this.activeDashboardEventId = null; // Currently selected event for RSVP stats
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * Main router function to decide what to show
   */
  async route() {
    // Clear any active timers
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');

    if (inviteId) {
      // 1. Show Guest Invitation View
      try {
        await this.renderGuestInvitation(inviteId);
      } catch (err) {
        console.error(err);
        this.renderErrorPage('Invitation not found or could not be loaded.');
      }
    } else {
      // 2. Show Creator Dashboard (redirect to login if Firebase Auth is active but user is logged out)
      const isFirebaseEnabled = typeof window.firebaseAuthInstance !== 'undefined';
      if (isFirebaseEnabled && !this.currentUser) {
        await this.renderLogin();
      } else {
        await this.renderDashboard();
      }
    }
  }

  /**
   * Render error page
   */
  renderErrorPage(message) {
    this.container.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="glass-card max-w-md w-full text-center p-8 border border-white/20 shadow-2xl rounded-2xl">
          <div class="text-6xl mb-4">⚠️</div>
          <h2 class="text-2xl font-bold mb-4" style="font-family: var(--font-title); color: var(--text-primary)">Oops!</h2>
          <p class="mb-6" style="color: var(--text-secondary)">${message}</p>
          <a href="${window.location.pathname}" class="btn btn-primary inline-block">Go to Dashboard</a>
        </div>
      </div>
    `;
  }

  /**
   * ----------------------------------------------------
   * CREATOR DASHBOARD VIEW
   * ----------------------------------------------------
   */
  async renderDashboard() {
    // Set corporate/clean styling defaults for dashboard
    ThemeEngine.apply('formal-corporate', this.container);

    const events = await this.getAllEventsUseCase.execute(this.currentUser?.uid);

    // Choose active event for statistics (default to first event if not set)
    if (!this.activeDashboardEventId && events.length > 0) {
      this.activeDashboardEventId = events[0].id;
    }

    // Load statistics if there's an active event
    let stats = null;
    let rsvpList = [];
    let activeEvent = null;

    if (this.activeDashboardEventId) {
      activeEvent = events.find(e => e.id === this.activeDashboardEventId);
      if (activeEvent) {
        stats = await this.getRSVPStatisticsUseCase.execute(this.activeDashboardEventId);
        rsvpList = await this.getEventRSVPsUseCase.execute(this.activeDashboardEventId);
      }
    }

    this.container.innerHTML = `
      <div class="dashboard-wrapper min-h-screen p-4 md:p-8">
        <header class="dashboard-header max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900" style="font-family: var(--font-title)">
              ✉️ Digital Invitation Creator
            </h1>
            <p class="text-slate-600">Design gorgeous glassmorphic invitations and manage RSVPs in real time.</p>
          </div>
          <div class="flex items-center gap-3">
            ${this.currentUser ? `
              <div class="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700">
                ${this.currentUser.photoURL ? `<img src="${this.currentUser.photoURL}" class="w-5 h-5 rounded-full">` : '👤'}
                <span>${this.currentUser.displayName || this.currentUser.email}</span>
              </div>
              <button id="auth-signout-btn" class="text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 px-3 py-1.5 rounded-full transition-all">Sign Out</button>
            ` : `
              <span class="text-sm font-semibold px-3 py-1 bg-slate-200 text-slate-800 rounded-full">Local Mode</span>
            `}
          </div>
        </header>

        <main class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Left side: Form for invitation creation -->
          <div class="lg:col-span-5">
            <div class="glass-card p-6 rounded-2xl border border-white/40 shadow-xl bg-white/40 backdrop-blur-md">
              <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                ✨ Create Invitation
              </h2>
              <form id="create-event-form" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Event Theme</label>
                    <select id="event-theme" class="form-input">
                      ${Object.values(THEMES).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                  </div>
                  <div class="flex items-center" style="padding-top: 1.25rem;">
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" id="event-plus-ones" checked class="accent-indigo-600 w-4 h-4">
                      <span class="text-xs font-semibold text-slate-700">Allow guests to bring plus-ones (Additional guests)</span>
                    </label>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Event Type</label>
                    <select id="event-type" class="form-input">
                      <option value="marriage">💍 Wedding</option>
                      <option value="birthday">🎂 Birthday</option>
                      <option value="party">🎉 Party</option>
                      <option value="corporate">🏢 Corporate</option>
                      <option value="babyshower">🍼 Baby Shower</option>
                      <option value="custom">✨ Custom</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Event Title</label>
                    <input type="text" id="event-title" class="form-input" placeholder="e.g. Wedding of John & Jane" required>
                    <span class="error-msg text-red-500 text-xs hidden" id="err-title"></span>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description / Short Quote</label>
                  <textarea id="event-description" class="form-input h-20 resize-none" placeholder="Add a lovely invitation quote or details..."></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Start Date & Time</label>
                    <input type="datetime-local" id="event-date" class="form-input" required>
                    <span class="error-msg text-red-500 text-xs hidden" id="err-dateTime"></span>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Timezone</label>
                    <select id="event-timezone" class="form-input">
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">EST</option>
                      <option value="Europe/London">GMT</option>
                      <option value="Asia/Kolkata" selected>IST</option>
                      <option value="Asia/Tokyo">JST</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">End Date & Time (Optional)</label>
                  <input type="datetime-local" id="event-end-date" class="form-input">
                  <span class="error-msg text-red-500 text-xs hidden" id="err-endTime"></span>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">City</label>
                    <input type="text" id="event-city" class="form-input" placeholder="e.g. London" required>
                    <span class="error-msg text-red-500 text-xs hidden" id="err-locationCity"></span>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Address / Venue</label>
                    <input type="text" id="event-address" class="form-input" placeholder="e.g. Grand Plaza Hall" required>
                    <span class="error-msg text-red-500 text-xs hidden" id="err-locationAddress"></span>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Google Maps Embed Link (&lt;iframe&gt; or URL)</label>
                  <input type="text" id="event-map" class="form-input" placeholder="Paste the embed code or share link">
                  <span class="error-msg text-red-500 text-xs hidden" id="err-locationMapLink"></span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Banner Image URL</label>
                    <input type="url" id="event-media" class="form-input" placeholder="https://images.unsplash.com/...">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Or Upload Image File</label>
                    <input type="file" id="event-media-file" accept="image/*" class="form-input">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Host Contact (WhatsApp)</label>
                    <input type="text" id="event-phone" class="form-input" placeholder="e.g. +447123456789" required>
                    <span class="error-msg text-red-500 text-xs hidden" id="err-hostPhone"></span>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary w-full py-3 mt-2 shadow-lg transition-transform active:scale-[0.98]">
                  🚀 Create & Generate Link
                </button>
              </form>
            </div>
          </div>

          <!-- Right side: Invitations list & active analytics -->
          <div class="lg:col-span-7 space-y-8">
            <!-- Active Invitations Manager -->
            <div class="glass-card p-6 rounded-2xl border border-white/40 shadow-xl bg-white/40 backdrop-blur-md">
              <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                📂 Active Invitations (${events.length})
              </h2>
              
              ${events.length === 0 ? `
                <div class="text-center py-8 text-slate-500">
                  <div class="text-4xl mb-2">✉️</div>
                  <p>No invitations created yet. Create one on the left!</p>
                </div>
              ` : `
                <div class="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1">
                  ${events.map(ev => {
      const isSelected = ev.id === this.activeDashboardEventId;
      const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${ev.id}`;
      return `
                      <div class="p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${isSelected
          ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/5'
          : 'border-slate-200 bg-white/50 hover:bg-white/80'
        }" data-event-id="${ev.id}">
                        <div class="flex-1 min-w-0" onclick="document.dispatchEvent(new CustomEvent('switch-event', {detail: '${ev.id}'}))">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-slate-800 truncate">${ev.title}</span>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">${ev.type}</span>
                          </div>
                          <p class="text-xs text-slate-500 mt-1">🗓️ ${formatEventDate(ev.dateTime, ev.timezone)}</p>
                        </div>
                        <div class="flex items-center gap-2 self-end md:self-auto">
                          <button class="btn-icon bg-indigo-100 text-indigo-700 hover:bg-indigo-200" 
                            title="Copy Invitation Link" 
                            onclick="event.stopPropagation(); document.dispatchEvent(new CustomEvent('copy-link', {detail: '${inviteUrl}'}))">
                            🔗
                          </button>
                          <a href="${inviteUrl}" target="_blank" class="btn-icon bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="Preview Invitation">
                            👁️
                          </a>
                        </div>
                      </div>
                    `;
    }).join('')}
                </div>
              `}
            </div>

            <!-- RSVP Analytics Dashboard -->
            ${activeEvent ? `
              <div class="glass-card p-6 rounded-2xl border border-white/40 shadow-xl bg-white/40 backdrop-blur-md">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 border-b border-slate-200/50 pb-4">
                  <div>
                    <h2 class="text-xl font-bold text-slate-800">
                      📊 RSVP Summary for: <span class="text-indigo-600">${activeEvent.title}</span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Quickly track guest counts and accommodations.</p>
                  </div>
                  <button onclick="document.dispatchEvent(new CustomEvent('clear-rsvps', {detail: '${activeEvent.id}'}))" 
                          class="text-xs text-red-500 hover:underline">Clear RSVPs</button>
                </div>

                <!-- Numbers Row -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div class="stat-card p-4 rounded-xl bg-white/60 border border-slate-100 text-center">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total RSVPs</span>
                    <span class="text-2xl font-black text-slate-800">${stats.totalResponses}</span>
                  </div>
                  <div class="stat-card p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span class="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Attending Parties</span>
                    <span class="text-2xl font-black text-emerald-600">${stats.attendingRSVPs}</span>
                  </div>
                  <div class="stat-card p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                    <span class="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">Total Guests</span>
                    <span class="text-2xl font-black text-indigo-600">${stats.totalAttendingGuests}</span>
                  </div>
                  <div class="stat-card p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span class="text-xs font-semibold text-rose-700 uppercase tracking-wider block">Declined</span>
                    <span class="text-2xl font-black text-rose-600">${stats.declinedRSVPs}</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <!-- Dietary Preferences Bar Charts -->
                  <div class="md:col-span-5 space-y-3">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600">Dietary Needs (Attending)</h3>
                    <div class="space-y-2 bg-white/40 p-4 rounded-xl border border-slate-100">
                      ${Object.entries(stats.dietaryBreakdown).map(([diet, count]) => {
      const pct = stats.totalAttendingGuests > 0 ? (count / stats.totalAttendingGuests) * 100 : 0;
      return `
                          <div class="space-y-1">
                            <div class="flex justify-between text-xs font-semibold text-slate-700">
                              <span>${diet}</span>
                              <span>${count} guests (${Math.round(pct)}%)</span>
                            </div>
                            <div class="w-full bg-slate-200/50 rounded-full h-2">
                              <div class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                            </div>
                          </div>
                        `;
    }).join('')}
                    </div>
                  </div>

                  <!-- Guest Responses & Congratulations scrolling list -->
                  <div class="md:col-span-7 space-y-3">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600">Guest Responses & Wishes</h3>
                    <div class="max-h-56 overflow-y-auto space-y-2 pr-1">
                      ${rsvpList.length === 0 ? `
                        <p class="text-xs text-slate-500 text-center py-8">Waiting for guest submissions...</p>
                      ` : rsvpList.map(item => `
                        <div class="p-3 rounded-xl bg-white/60 border border-slate-100 flex flex-col gap-1.5 shadow-sm">
                          <div class="flex justify-between items-start gap-2">
                            <div>
                              <span class="text-xs font-extrabold text-slate-800">${item.guestName}</span>
                              <span class="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                ${item.attendance === 'yes' ? `Attending (+${item.additionalGuests})` : 'Declined'}
                              </span>
                            </div>
                            <span class="text-[9px] text-slate-400">${new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                          ${item.congratsNote ? `
                            <p class="text-xs text-slate-600 italic bg-slate-50/50 p-2 rounded border border-slate-100">
                              "${item.congratsNote}"
                            </p>
                          ` : ''}
                          ${item.attendance === 'yes' ? `
                            <div class="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>🥑 Dietary: <strong>${item.dietary}</strong></span>
                            </div>
                          ` : ''}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="glass-card p-8 rounded-2xl border border-white/40 shadow-xl bg-white/40 backdrop-blur-md text-center text-slate-500">
                <p>Create your first event to access the RSVP dashboard and custom guest views.</p>
              </div>
            `}
          </div>
        </main>
      </div>
    `;

    this.setupDashboardListeners();
  }

  setupDashboardListeners() {
    const form = this.container.querySelector('#create-event-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Hide all error messages
        this.container.querySelectorAll('.error-msg').forEach(el => el.classList.add('hidden'));

        let mediaUrl = this.container.querySelector('#event-media').value;
        const fileInput = this.container.querySelector('#event-media-file');

        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          this.showToast('📤 Uploading image...');
          try {
            mediaUrl = await this.eventRepo.uploadFile(file);
          } catch (uploadErr) {
            console.error('File upload failed:', uploadErr);
          }
        }

        const eventData = {
          theme: this.container.querySelector('#event-theme').value,
          type: this.container.querySelector('#event-type').value,
          title: this.container.querySelector('#event-title').value,
          description: this.container.querySelector('#event-description').value,
          dateTime: this.container.querySelector('#event-date').value,
          endTime: this.container.querySelector('#event-end-date').value,
          timezone: this.container.querySelector('#event-timezone').value,
          locationCity: this.container.querySelector('#event-city').value,
          locationAddress: this.container.querySelector('#event-address').value,
          locationMapLink: this.container.querySelector('#event-map').value,
          mediaUrl: mediaUrl,
          hostPhone: this.container.querySelector('#event-phone').value,
          allowPlusOnes: this.container.querySelector('#event-plus-ones').checked,
          userId: this.currentUser?.uid || ''
        };

        // Form level validation
        const valResult = validateEventForm(eventData);
        if (!valResult.isValid) {
          Object.entries(valResult.errors).forEach(([field, msg]) => {
            const errEl = this.container.querySelector(`#err-${field}`);
            if (errEl) {
              errEl.innerText = msg;
              errEl.classList.remove('hidden');
            }
          });
          return;
        }

        try {
          // Parse map link if valid
          if (eventData.locationMapLink) {
            eventData.locationMapLink = parseGoogleMapsLink(eventData.locationMapLink);
          }

          const event = await this.createEventUseCase.execute(eventData);
          this.activeDashboardEventId = event.id;

          this.showToast('🎉 Invitation created successfully!');

          // Re-render dashboard
          await this.renderDashboard();
        } catch (err) {
          alert(`Error creating event: ${err.message}`);
        }
      });
    }

    const signOutBtn = this.container.querySelector('#auth-signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        try {
          const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
          const auth = window.firebaseAuthInstance;
          await signOut(auth);
        } catch (err) {
          console.error(err);
          alert('Sign out failed');
        }
      });
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce';
    toast.innerHTML = `<span>⚡</span> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * ----------------------------------------------------
   * INTERACTIVE GUEST INVITATION VIEW
   * ----------------------------------------------------
   */
  async renderGuestInvitation(eventId) {
    const event = await this.getEventDetailsUseCase.execute(eventId);

    // Apply event's custom theme variables and background animations
    ThemeEngine.apply(event.theme, this.container);

    const formattedDate = formatEventDate(event.dateTime, event.timezone);
    const formattedEndDate = event.endTime ? formatEventDate(event.endTime, event.timezone) : '';

    // Format map URL to ensure it is always embeddable (fixes blank/refused map display)
    let mapUrl = event.locationMapLink;
    if (!mapUrl || (!mapUrl.includes('google.com/maps/embed') && !mapUrl.includes('output=embed'))) {
      const searchQuery = mapUrl || `${event.locationAddress}, ${event.locationCity}`;
      mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&output=embed`;
    }

    // Choose fallback event banner image based on type
    let bannerUrl = event.mediaUrl;
    if (!bannerUrl) {
      const typeBanners = {
        marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
        birthday: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop',
        party: 'https://images.unsplash.com/photo-1496337589254-7e19d01eae44?q=80&w=1200&auto=format&fit=crop',
        corporate: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
        babyshower: 'https://images.unsplash.com/photo-1520182205149-1e5e4e7329b4?q=80&w=1200&auto=format&fit=crop',
        custom: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200&auto=format&fit=crop'
      };
      bannerUrl = typeBanners[event.type] || typeBanners.custom;
    }

    this.container.innerHTML = `
      <div class="guest-view-wrapper min-h-screen py-8 px-4 flex flex-col items-center justify-start select-none-floating">
        <article class="glass-card max-w-2xl w-full border border-white/20 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 relative">
          
          <!-- Decorative theme container glow -->
          <div class="glow-overlay select-none pointer-events-none"></div>

          <!-- Banner Image -->
          <figure class="relative h-64 sm:h-80 w-full overflow-hidden">
            <img src="${bannerUrl}" alt="${event.title}" class="w-full h-full object-cover select-none">
            <div class="absolute inset-0 bg-gradient-to-t from-[var(--glass-bg)] via-black/10 to-transparent"></div>
            <span class="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/40 text-xs font-bold px-3 py-1.5 rounded-full capitalize" style="color: var(--text-primary)">
              ${event.type}
            </span>
          </figure>

          <!-- Invitation details -->
          <div class="p-6 sm:p-8 space-y-6">
            <header class="text-center space-y-2">
              <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight" style="font-family: var(--font-title); color: var(--text-primary); text-shadow: 0 2px 10px var(--glow-color);">
                ${event.title}
              </h1>
              ${event.description ? `
                <p class="text-sm italic font-medium max-w-md mx-auto" style="color: var(--text-secondary)">
                  "${event.description}"
                </p>
              ` : ''}
            </header>

            <hr class="border-t border-[var(--text-secondary)]/15">

            <!-- Countdown Timer Container -->
            <section class="text-center">
              <h2 class="text-xs uppercase tracking-wider font-extrabold mb-3" style="color: var(--text-secondary)">
                ⏳ Time Remaining
              </h2>
              <div id="countdown-display" class="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm mx-auto">
                <div class="time-block p-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
                  <span id="cd-days" class="text-xl sm:text-3xl font-black block" style="color: var(--text-primary)">00</span>
                  <span class="text-[9px] uppercase font-bold text-slate-500" style="color: var(--text-secondary)">Days</span>
                </div>
                <div class="time-block p-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
                  <span id="cd-hours" class="text-xl sm:text-3xl font-black block" style="color: var(--text-primary)">00</span>
                  <span class="text-[9px] uppercase font-bold text-slate-500" style="color: var(--text-secondary)">Hours</span>
                </div>
                <div class="time-block p-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
                  <span id="cd-minutes" class="text-xl sm:text-3xl font-black block" style="color: var(--text-primary)">00</span>
                  <span class="text-[9px] uppercase font-bold text-slate-500" style="color: var(--text-secondary)">Mins</span>
                </div>
                <div class="time-block p-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
                  <span id="cd-seconds" class="text-xl sm:text-3xl font-black block" style="color: var(--text-primary)">00</span>
                  <span class="text-[9px] uppercase font-bold text-slate-500" style="color: var(--text-secondary)">Secs</span>
                </div>
              </div>
            </section>

            <!-- Date & Location details -->
            <section class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div class="space-y-2">
                <h3 class="text-xs uppercase tracking-wider font-extrabold" style="color: var(--text-secondary)">
                  📅 When
                </h3>
                <p class="font-bold" style="color: var(--text-primary)">
                  ${formattedDate}
                </p>
                ${formattedEndDate ? `
                  <p class="text-xs" style="color: var(--text-secondary)">
                    Ends: ${formattedEndDate}
                  </p>
                ` : ''}
              </div>
              <div class="space-y-2">
                <h3 class="text-xs uppercase tracking-wider font-extrabold" style="color: var(--text-secondary)">
                  📍 Where
                </h3>
                <p class="font-bold" style="color: var(--text-primary)">
                  ${event.locationAddress}, ${event.locationCity}
                </p>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.locationAddress}, ${event.locationCity}`)}" 
                   target="_blank" 
                   class="inline-block text-xs underline font-bold mt-1" 
                   style="color: var(--accent-color)">
                  Get Directions 🗺️
                </a>
              </div>
            </section>

            <!-- Google Maps Embed Container -->
            <div class="w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-white/30 shadow-lg relative">
              <iframe src="${mapUrl}" class="w-full h-full border-0" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>

            <hr class="border-t border-[var(--text-secondary)]/15">

            <!-- Interactive RSVP Form Section -->
            <section id="rsvp-section" class="space-y-4">
              <h2 class="text-lg font-black text-center" style="font-family: var(--font-title); color: var(--text-primary)">
                💌 RSVP to Event
              </h2>
              
              <form id="rsvp-form" class="space-y-4">
                <div>
                  <label class="block text-xs font-bold uppercase mb-1" style="color: var(--text-secondary)">Your Full Name</label>
                  <input type="text" id="rsvp-name" class="form-input bg-white/20 border-white/30" placeholder="e.g. Alice Smith" required>
                  <span class="error-msg text-red-500 text-xs hidden" id="err-rsvp-name"></span>
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase mb-1.5" style="color: var(--text-secondary)">Will you be attending?</label>
                  <div class="grid grid-cols-2 gap-4">
                    <label class="p-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                      <input type="radio" name="attendance" value="yes" checked class="accent-indigo-600">
                      <span class="text-xs font-bold" style="color: var(--text-primary)">🎉 Attending</span>
                    </label>
                    <label class="p-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                      <input type="radio" name="attendance" value="no" class="accent-indigo-600">
                      <span class="text-xs font-bold" style="color: var(--text-primary)">😔 Declining</span>
                    </label>
                  </div>
                </div>

                <div id="rsvp-attending-details" class="space-y-4 animate-fade-in">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${event.allowPlusOnes ? `
                      <div>
                        <label class="block text-xs font-bold uppercase mb-1" style="color: var(--text-secondary)">Additional Guests</label>
                        <input type="number" id="rsvp-guests" class="form-input bg-white/20 border-white/30" value="0" min="0" max="20">
                        <span class="error-msg text-red-500 text-xs hidden" id="err-rsvp-guests"></span>
                      </div>
                    ` : `
                      <input type="hidden" id="rsvp-guests" value="0">
                    `}
                    <div class="${event.allowPlusOnes ? '' : 'sm:col-span-2'}">
                      <label class="block text-xs font-bold uppercase mb-1" style="color: var(--text-secondary)">Dietary Preference</label>
                      <select id="rsvp-dietary" class="form-input bg-white/20 border-white/30 text-xs">
                        <option value="None" selected>None</option>
                        <option value="Veg">🥑 Vegetarian</option>
                        <option value="Non-Veg">🥩 Non-Vegetarian</option>
                        <option value="Gluten-free">🌾 Gluten-Free</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase mb-1" style="color: var(--text-secondary)">Congratulatory Message / Note</label>
                  <textarea id="rsvp-note" class="form-input bg-white/20 border-white/30 h-20 resize-none text-xs" placeholder="Write a sweet note to the host..."></textarea>
                </div>

                <button type="submit" class="btn w-full py-3.5 mt-2 font-bold shadow-xl transition-all duration-300 active:scale-[0.98] btn-primary">
                  Confirm RSVP & Notify Host
                </button>
              </form>
            </section>
            
          </div>
        </article>
      </div>
    `;

    // Start timer calculations immediately
    this.startCountdown(event.dateTime);

    // Bind listeners
    this.setupGuestListeners(event);
  }

  startCountdown(dateTimeStr) {
    const update = () => {
      const remaining = calculateCountdown(dateTimeStr);

      const d = this.container.querySelector('#cd-days');
      const h = this.container.querySelector('#cd-hours');
      const m = this.container.querySelector('#cd-minutes');
      const s = this.container.querySelector('#cd-seconds');

      if (d && h && m && s) {
        d.innerText = String(remaining.days).padStart(2, '0');
        h.innerText = String(remaining.hours).padStart(2, '0');
        m.innerText = String(remaining.minutes).padStart(2, '0');
        s.innerText = String(remaining.seconds).padStart(2, '0');
      }

      if (remaining.isPast) {
        clearInterval(this.countdownInterval);
      }
    };

    update();
    this.countdownInterval = setInterval(update, 1000);
  }

  setupGuestListeners(event) {
    const rsvpForm = this.container.querySelector('#rsvp-form');
    if (!rsvpForm) return;

    // Toggle details sub-panel based on Yes/No radio click
    const radioButtons = rsvpForm.querySelectorAll('input[name="attendance"]');
    const detailsPanel = rsvpForm.querySelector('#rsvp-attending-details');

    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'no') {
          detailsPanel.classList.add('hidden');
        } else {
          detailsPanel.classList.remove('hidden');
        }
      });
    });

    // Form submission
    rsvpForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear error states
      this.container.querySelectorAll('.error-msg').forEach(el => el.classList.add('hidden'));

      const rsvpData = {
        name: rsvpForm.querySelector('#rsvp-name').value,
        attendance: rsvpForm.querySelector('input[name="attendance"]:checked').value,
        additionalGuests: rsvpForm.querySelector('#rsvp-guests').value,
        dietary: rsvpForm.querySelector('#rsvp-dietary').value,
        congratsNote: rsvpForm.querySelector('#rsvp-note').value,
        eventId: event.id
      };

      const valResult = validateRSVPForm(rsvpData);
      if (!valResult.isValid) {
        Object.entries(valResult.errors).forEach(([field, msg]) => {
          const errEl = this.container.querySelector(`#err-rsvp-${field}`);
          if (errEl) {
            errEl.innerText = msg;
            errEl.classList.remove('hidden');
          }
        });
        return;
      }

      try {
        const { rsvp } = await this.submitRSVPUseCase.execute(rsvpData);

        // Success panel render
        this.renderRSVPSuccess(event, rsvpData);
      } catch (err) {
        alert(`Error submitting RSVP: ${err.message}`);
      }
    });
  }

  renderRSVPSuccess(event, rsvpData) {
    const rsvpSection = this.container.querySelector('#rsvp-section');
    if (!rsvpSection) return;

    // Generate pre-filled WhatsApp link
    const waUrl = composeWhatsAppMessage({
      hostPhone: event.hostPhone,
      eventTitle: event.title,
      guestName: rsvpData.name,
      attendance: rsvpData.attendance,
      additionalGuests: rsvpData.additionalGuests,
      dietary: rsvpData.dietary,
      congratsNote: rsvpData.congratsNote
    });

    rsvpSection.classList.add('animate-fade-in');
    rsvpSection.innerHTML = `
      <div class="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-4">
        <div class="text-5xl">💌</div>
        <h3 class="text-xl font-bold" style="color: var(--text-primary)">RSVP Submitted Successfully!</h3>
        <p class="text-xs" style="color: var(--text-secondary)">
          Thank you, ${rsvpData.name}! Your response has been recorded.
        </p>
        
        ${waUrl ? `
          <div class="space-y-2 pt-2">
            <p class="text-[11px] text-slate-500">Would you like to send a pre-composed confirmation message to the host over WhatsApp?</p>
            <a href="${waUrl}" target="_blank" class="btn btn-primary inline-flex items-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-lg active:scale-95 transition-all">
              <span>💬</span> Send WhatsApp Notification
            </a>
          </div>
        ` : ''}

        <div class="pt-4 border-t border-[var(--text-secondary)]/10">
          <a href="${window.location.pathname}" class="text-xs underline hover:opacity-80" style="color: var(--accent-color)">
            Go to Dashboard
          </a>
        </div>
      </div>
    `;
  }

  async renderLogin() {
    ThemeEngine.apply('formal-corporate', this.container);
    this.container.innerHTML = `
      <div class="guest-view-wrapper min-h-screen py-12 px-4 flex items-center justify-center select-none-floating bg-slate-50">
        <div class="glass-card max-w-md w-full border border-white/40 shadow-2xl rounded-3xl p-8 space-y-6 bg-white/40 backdrop-blur-md relative overflow-hidden">
          <div class="glow-overlay select-none pointer-events-none"></div>
          
          <header class="text-center space-y-2">
            <h1 class="text-3xl font-extrabold tracking-tight text-slate-800" style="font-family: var(--font-title)">
              ✨ Invitation Portal
            </h1>
            <p class="text-xs font-semibold text-slate-600">Securely build and manage your digital RSVP cards</p>
          </header>

          <hr class="border-t border-slate-700/10">

          <div class="space-y-4">
            <!-- Google Sign In Button -->
            <button id="google-login-btn" class="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 border border-slate-200 rounded-xl shadow-md transition-all active:scale-[0.98]">
              <svg class="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.83 21.56,11.41 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.9,0.6 -2.07,0.97 -3.3,0.97 -2.34,0 -4.33,-1.58 -5.04,-3.71H2.88v2.66C4.38,18.77 7.91,20.62 12,20.62z" fill="#34A853" />
                  <path d="M6.96,13.13c-0.18,-0.54 -0.29,-1.11 -0.29,-1.7 0,-0.59 0.11,-1.16 0.29,-1.7V7.07H2.88C2.28,8.27 1.94,9.63 1.94,11.07s0.34,2.8 0.94,4V12.4H6.96z" fill="#FBBC05" />
                  <path d="M12,5.2c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,2.56 14.42,1.76 12,1.76c-4.09,0 -7.62,1.85 -9.12,4.83l3.36,2.66C6.96,6.78 8.95,5.2 12,5.2z" fill="#EA4335" />
                </g>
              </svg>
              <span>Sign In with Google</span>
            </button>

            <div class="flex items-center justify-between text-[10px] text-slate-400 my-2">
              <span class="w-1/3 border-b border-slate-200"></span>
              <span class="uppercase font-bold">or use email</span>
              <span class="w-1/3 border-b border-slate-200"></span>
            </div>

            <!-- Email & Password Form -->
            <form id="email-login-form" class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input type="email" id="login-email" class="form-input text-xs" placeholder="name@example.com" required>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input type="password" id="login-password" class="form-input text-xs" placeholder="••••••••" required>
              </div>
              
              <div class="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span id="auth-toggle-msg">Don't have an account?</span>
                <button type="button" id="auth-toggle-btn" class="text-indigo-600 hover:underline font-bold">Register here</button>
              </div>

              <span id="login-error" class="error-msg text-red-500 text-xs hidden block text-center"></span>

              <button type="submit" id="auth-submit-btn" class="w-full btn btn-primary py-3 font-bold shadow-md transition-all active:scale-[0.98]">
                🔑 Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.setupLoginListeners();
  }

  setupLoginListeners() {
    const googleBtn = this.container.querySelector('#google-login-btn');
    const form = this.container.querySelector('#email-login-form');
    const toggleBtn = this.container.querySelector('#auth-toggle-btn');
    const toggleMsg = this.container.querySelector('#auth-toggle-msg');
    const submitBtn = this.container.querySelector('#auth-submit-btn');
    const errorEl = this.container.querySelector('#login-error');
    
    let isRegisterMode = false;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
          toggleMsg.innerText = 'Already have an account?';
          toggleBtn.innerText = 'Sign In here';
          submitBtn.innerText = '📝 Register Account';
        } else {
          toggleMsg.innerText = "Don't have an account?";
          toggleBtn.innerText = 'Register here';
          submitBtn.innerText = '🔑 Sign In';
        }
        if (errorEl) errorEl.classList.add('hidden');
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        try {
          if (errorEl) errorEl.classList.add('hidden');
          const { signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
          const auth = window.firebaseAuthInstance;
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (err) {
          console.error(err);
          if (errorEl) {
            errorEl.innerText = `Google sign-in failed: ${err.message.replace('Firebase: ', '')}`;
            errorEl.classList.remove('hidden');
          }
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = this.container.querySelector('#login-email').value;
        const password = this.container.querySelector('#login-password').value;
        if (errorEl) errorEl.classList.add('hidden');
        
        try {
          const auth = window.firebaseAuthInstance;
          if (isRegisterMode) {
            const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
            await createUserWithEmailAndPassword(auth, email, password);
          } else {
            const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
            await signInWithEmailAndPassword(auth, email, password);
          }
        } catch (err) {
          console.error(err);
          if (errorEl) {
            errorEl.innerText = err.message.replace('Firebase: ', '');
            errorEl.classList.remove('hidden');
          }
        }
      });
    }
  }
}
