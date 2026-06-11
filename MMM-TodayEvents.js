Module.register("MMM-TodayEvents", {
  defaults: {
    title: "TODAY",
    maxEvents: 10,
    timeFormat: "h:mma",
    theme: "dark",                          // "dark" | "light"
  },

  start() {
    this.events = [];
    this.loaded = false;
  },

  getStyles() {
    return ["MMM-TodayEvents.css"];
  },

  // Listens for the frontend broadcast from MMM-CalendarGrid
  notificationReceived(notification, payload) {
    if (notification === "CALENDAR_EVENTS") {
      this.events = payload;
      this.loaded = true;
      this.updateDom(300);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-te-wrapper";
    wrapper.classList.add("mmm-te-theme-" + (this.config.theme === "light" ? "light" : "dark"));

    if (!this.loaded) {
      wrapper.innerHTML = '<div class="mmm-te-loading">...</div>';
      return wrapper;
    }

    // Header
    const header = document.createElement("div");
    header.className = "mmm-te-header";
    header.textContent = this.config.title;
    wrapper.appendChild(header);

    const now = new Date();
    const todayEvents = this.getTodayEvents(now);

    if (todayEvents.length === 0) {
      const empty = document.createElement("div");
      empty.className = "mmm-te-empty";
      empty.textContent = "No events today";
      wrapper.appendChild(empty);
      return wrapper;
    }

    const list = document.createElement("div");
    list.className = "mmm-te-list";

    todayEvents.slice(0, this.config.maxEvents).forEach((event) => {
      list.appendChild(this.buildEventRow(event));
    });

    wrapper.appendChild(list);
    return wrapper;
  },

  getTodayEvents(now) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return this.events.filter((ev) => {
      const start = new Date(ev.start);
      const end   = new Date(ev.end);
      return start <= dayEnd && end >= dayStart;
    });
  },

  buildEventRow(event) {
    const row = document.createElement("div");
    row.className = "mmm-te-event";
    row.style.borderLeftColor = event.color;

    const time = document.createElement("div");
    time.className = "mmm-te-time";
    if (event.allDay) {
      time.textContent = "All day";
    } else {
      time.textContent = this.formatTime(new Date(event.start));
    }

    const title = document.createElement("div");
    title.className = "mmm-te-title";
    title.textContent = event.title;

    row.appendChild(time);
    row.appendChild(title);
    return row;
  },

  formatTime(date) {
    let h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, "0")}${ampm}`;
  },
});
