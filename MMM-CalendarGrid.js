Module.register("MMM-CalendarGrid", {
  defaults: {
    calendars: [],
    updateInterval: 30 * 60 * 1000,
    maxEventsPerDay: 5,
    startOnMonday: false,
    showOtherMonthDays: true,
  },

  start() {
    this.events = [];
    this.loaded = false;
    this.sendSocketNotification("GET_CALENDAR_EVENTS", {
      calendars: this.config.calendars,
      updateInterval: this.config.updateInterval,
    });
  },

  getStyles() {
    return ["MMM-CalendarGrid.css"];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CALENDAR_EVENTS") {
      this.events = payload;
      this.loaded = true;
      this.updateDom(300);
      this.sendNotification("CALENDAR_EVENTS", payload);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-cg-wrapper";

    if (!this.loaded) {
      wrapper.innerHTML = '<div class="mmm-cg-loading">Loading calendar...</div>';
      return wrapper;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Month/year header
    const header = document.createElement("div");
    header.className = "mmm-cg-header";
    const monthNames = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
    header.textContent = `${monthNames[month]} ${year}`;
    wrapper.appendChild(header);

    // Day-of-week labels
    const dayLabels = document.createElement("div");
    dayLabels.className = "mmm-cg-day-labels";
    const days = this.config.startOnMonday
      ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
      : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    days.forEach((d) => {
      const label = document.createElement("div");
      label.className = "mmm-cg-day-label";
      label.textContent = d;
      dayLabels.appendChild(label);
    });
    wrapper.appendChild(dayLabels);

    // Build grid of day cells
    const grid = document.createElement("div");
    grid.className = "mmm-cg-grid";

    const cells = this.buildCells(year, month);
    cells.forEach((cell) => {
      grid.appendChild(this.buildDayCell(cell, now));
    });

    wrapper.appendChild(grid);
    return wrapper;
  },

  buildCells(year, month) {
    const cells = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Leading days from prev month
    let startDow = firstDay.getDay(); // 0=Sun
    if (this.config.startOnMonday) {
      startDow = startDow === 0 ? 6 : startDow - 1;
    }
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, currentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ date: new Date(year, month, d), currentMonth: true });
    }

    // Trailing days from next month to complete the last row
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({ date: new Date(year, month + 1, d), currentMonth: false });
      }
    }

    return cells;
  },

  buildDayCell(cell, now) {
    const { date, currentMonth } = cell;
    const el = document.createElement("div");
    el.className = "mmm-cg-cell";
    if (!currentMonth) el.classList.add("other-month");

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isToday) el.classList.add("today");

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (currentMonth && date < startOfToday) el.classList.add("past");

    // Date number
    const dateNum = document.createElement("div");
    dateNum.className = "mmm-cg-date-num";
    dateNum.textContent = date.getDate();
    el.appendChild(dateNum);

    // Events for this day
    if (!currentMonth && !this.config.showOtherMonthDays) {
      return el;
    }

    const dayEvents = this.getEventsForDay(date);
    const maxShow = this.config.maxEventsPerDay;
    const visible = dayEvents.slice(0, maxShow);
    const overflow = dayEvents.length - visible.length;

    visible.forEach((event) => {
      el.appendChild(this.buildEventPill(event));
    });

    if (overflow > 0) {
      const more = document.createElement("div");
      more.className = "mmm-cg-more";
      more.textContent = `+${overflow} more`;
      el.appendChild(more);
    }

    return el;
  },

  getEventsForDay(date) {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const dayEnd   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    return this.events.filter((ev) => {
      const start = new Date(ev.start);
      const end   = new Date(ev.end);
      return start <= dayEnd && end >= dayStart;
    });
  },

  buildEventPill(event) {
    const pill = document.createElement("div");
    pill.className = "mmm-cg-pill";
    if (event.allDay) pill.classList.add("all-day");

    // Left color bar
    pill.style.borderLeftColor = event.color;
    pill.style.backgroundColor = this.hexToRgba(event.color, 0.18);

    const start = new Date(event.start);
    let label = "";
    if (!event.allDay) {
      label = this.formatTime(start) + " · ";
    }

    const text = document.createElement("span");
    text.className = "mmm-cg-pill-text";
    text.textContent = label + event.title;
    pill.appendChild(text);

    return pill;
  },

  formatTime(date) {
    let h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, "0")}${ampm}`;
  },

  hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },
});
