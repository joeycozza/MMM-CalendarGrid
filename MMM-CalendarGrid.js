Module.register("MMM-CalendarGrid", {
  defaults: {
    calendars: [],
    updateInterval: 30 * 60 * 1000,
    maxEventsPerDay: 5,
    startOnMonday: false,
    showOtherMonthDays: true,
    view: "month",                          // month | week | 3day | 5day | agenda | 2week | rotate
    rotateViews: ["week", "3day", "agenda"],
    rotateInterval: 20 * 1000,
    agendaDays: 7,
    maxEventsAgenda: 50,
  },

  start() {
    this.events = [];
    this.loaded = false;
    this.rotateIndex = 0;
    this.rotateTimer = null;
    this.sendSocketNotification("GET_CALENDAR_EVENTS", {
      calendars: this.config.calendars,
      updateInterval: this.config.updateInterval,
    });
    this.setupRotation();
  },

  // Cycle the active view on a timer when view === "rotate".
  // Created once from start() (never from getDom) so re-renders can't stack intervals.
  setupRotation() {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
    if (this.config.view !== "rotate") return;
    const views = this.config.rotateViews;
    if (!Array.isArray(views) || views.length < 2) return;
    this.rotateTimer = setInterval(() => {
      this.rotateIndex = (this.rotateIndex + 1) % views.length;
      this.updateDom(300);
    }, this.config.rotateInterval);
  },

  stop() {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
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
    const view = this.getActiveView();
    wrapper.classList.add("mmm-cg-" + view); // CSS hook — always a leaf view, never "rotate"

    switch (view) {
      case "week":   this.renderWeek(wrapper, now);   break;
      case "3day":   this.render3Day(wrapper, now);   break;
      case "5day":   this.render5Day(wrapper, now);   break;
      case "agenda": this.renderAgenda(wrapper, now); break;
      case "2week":  this.render2Week(wrapper, now);  break;
      default:       this.renderMonth(wrapper, now);  break; // "month"
    }
    return wrapper;
  },

  // Resolve the view to render now. When rotating, pick from rotateViews by index.
  getActiveView() {
    if (this.config.view !== "rotate") return this.config.view;
    const v = this.config.rotateViews;
    if (!Array.isArray(v) || v.length === 0) return "month";
    return v[this.rotateIndex % v.length];
  },

  monthName(i) {
    return ["January","February","March","April","May","June",
            "July","August","September","October","November","December"][i];
  },

  // Shared day-of-week label row (month/week/2week), honoring startOnMonday.
  buildDayLabels() {
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
    return dayLabels;
  },

  // ── Month ──────────────────────────────────────────────────────────────
  renderMonth(wrapper, now) {
    const year = now.getFullYear();
    const month = now.getMonth();

    const header = document.createElement("div");
    header.className = "mmm-cg-header";
    header.textContent = `${this.monthName(month)} ${year}`;
    wrapper.appendChild(header);

    wrapper.appendChild(this.buildDayLabels());

    const grid = document.createElement("div");
    grid.className = "mmm-cg-grid";
    this.buildCells(year, month).forEach((cell) => {
      grid.appendChild(this.buildDayCell(cell, now));
    });
    wrapper.appendChild(grid);
  },

  // ── Week / 2-week ──────────────────────────────────────────────────────
  startOfWeek(now) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight today
    let dow = d.getDay(); // 0=Sun
    if (this.config.startOnMonday) dow = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - dow);
    return d;
  },

  // n sequential Date objects starting at `start` (date arithmetic rolls over months/years).
  sequentialDates(start, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return out;
  },

  buildDayCells(dates, now) {
    return dates.map((date) => this.buildDayCell({ date, currentMonth: true }, now));
  },

  formatDayMonth(date) {
    return `${this.monthName(date.getMonth()).slice(0, 3)} ${date.getDate()}`;
  },

  formatWeekRange(start, end) {
    if (start.getMonth() === end.getMonth()) {
      return `${this.formatDayMonth(start)} – ${end.getDate()}`;
    }
    return `${this.formatDayMonth(start)} – ${this.formatDayMonth(end)}`;
  },

  renderWeekSpan(wrapper, now, numDays) {
    const start = this.startOfWeek(now);
    const dates = this.sequentialDates(start, numDays);

    const header = document.createElement("div");
    header.className = "mmm-cg-header";
    header.textContent = this.formatWeekRange(start, dates[dates.length - 1]);
    wrapper.appendChild(header);

    wrapper.appendChild(this.buildDayLabels());

    const grid = document.createElement("div");
    grid.className = "mmm-cg-grid";
    this.buildDayCells(dates, now).forEach((cell) => grid.appendChild(cell));
    wrapper.appendChild(grid);
  },

  renderWeek(wrapper, now) {
    this.renderWeekSpan(wrapper, now, 7);
  },

  render2Week(wrapper, now) {
    this.renderWeekSpan(wrapper, now, 14);
  },

  // ── Day cards (3-day / 5-day) ──────────────────────────────────────────
  // Renders one big card per day offset. -1/0/1 get Yesterday/Today/Tomorrow
  // labels; other offsets use the weekday name.
  renderDayCards(wrapper, now, offsets) {
    const grid = document.createElement("div");
    grid.className = "mmm-cg-card-grid";

    const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    offsets.forEach((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      let label;
      if (offset === -1) label = "Yesterday";
      else if (offset === 0) label = "Today";
      else if (offset === 1) label = "Tomorrow";
      else label = weekday[date.getDay()];
      grid.appendChild(this.build3DayCard(date, label, now));
    });

    wrapper.appendChild(grid);
  },

  render3Day(wrapper, now) {
    this.renderDayCards(wrapper, now, [-1, 0, 1]);
  },

  render5Day(wrapper, now) {
    this.renderDayCards(wrapper, now, [-1, 0, 1, 2, 3]);
  },

  build3DayCard(date, label, now) {
    const card = document.createElement("div");
    card.className = "mmm-cg-card";

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date.getTime() === startOfToday.getTime()) card.classList.add("today");
    else if (date < startOfToday) card.classList.add("past");

    const header = document.createElement("div");
    header.className = "mmm-cg-card-header";
    header.textContent = `${label} · ${this.formatDayMonth(date)}`;
    card.appendChild(header);

    const dayEvents = this.getEventsForDay(date);
    const maxShow = this.config.maxEventsPerDay;
    const visible = dayEvents.slice(0, maxShow);
    const overflow = dayEvents.length - visible.length;

    visible.forEach((event) => card.appendChild(this.buildEventRow(event, true)));

    if (overflow > 0) {
      const more = document.createElement("div");
      more.className = "mmm-cg-more";
      more.textContent = `+${overflow} more`;
      card.appendChild(more);
    }

    return card;
  },

  // Large time+title row, shared by 3day/5day cards and the agenda list.
  // `filled` makes the row a solid color block with auto-contrast text (cards);
  // otherwise it gets a colored left bar (agenda).
  buildEventRow(event, filled) {
    const row = document.createElement("div");
    row.className = "mmm-cg-card-event";
    if (filled) {
      row.classList.add("filled");
      row.style.backgroundColor = event.color;
      row.style.color = this.getContrastText(event.color);
    } else {
      row.style.borderLeftColor = event.color;
    }

    const time = document.createElement("div");
    time.className = "mmm-cg-card-time";
    time.textContent = event.allDay ? "All day" : this.formatTime(new Date(event.start));

    const title = document.createElement("div");
    title.className = "mmm-cg-card-title";
    title.textContent = event.title;

    row.appendChild(time);
    row.appendChild(title);
    return row;
  },

  // ── Agenda (next N days, grouped) ──────────────────────────────────────
  renderAgenda(wrapper, now) {
    const header = document.createElement("div");
    header.className = "mmm-cg-header";
    header.textContent = "Agenda";
    wrapper.appendChild(header);

    wrapper.appendChild(this.buildAgendaList(now));
  },

  buildAgendaList(now) {
    const list = document.createElement("div");
    list.className = "mmm-cg-agenda-list";

    const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    let shown = 0;
    const cap = this.config.maxEventsAgenda;

    for (let i = 0; i < this.config.agendaDays && shown < cap; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dayEvents = this.getEventsForDay(date);
      if (dayEvents.length === 0) continue;

      const dayBlock = document.createElement("div");
      dayBlock.className = "mmm-cg-agenda-day";

      const dateHeader = document.createElement("div");
      dateHeader.className = "mmm-cg-agenda-date";
      let labelPrefix = "";
      if (i === 0) labelPrefix = "Today · ";
      else if (i === 1) labelPrefix = "Tomorrow · ";
      dateHeader.textContent = `${labelPrefix}${weekday[date.getDay()]} ${this.formatDayMonth(date)}`;
      dayBlock.appendChild(dateHeader);

      for (const event of dayEvents) {
        if (shown >= cap) break;
        dayBlock.appendChild(this.buildEventRow(event));
        shown++;
      }

      list.appendChild(dayBlock);
    }

    if (shown === 0) {
      const empty = document.createElement("div");
      empty.className = "mmm-cg-empty";
      empty.textContent = "No upcoming events";
      list.appendChild(empty);
    }

    return list;
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

    // Solid fill with auto-contrast text so pills read as scannable chips
    pill.style.backgroundColor = event.color;
    pill.style.color = this.getContrastText(event.color);

    const text = document.createElement("span");
    text.className = "mmm-cg-pill-text";

    if (!event.allDay) {
      const time = document.createElement("span");
      time.className = "mmm-cg-pill-time";
      time.textContent = this.formatTime(new Date(event.start)) + " · ";
      text.appendChild(time);
    }
    text.appendChild(document.createTextNode(event.title));
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

  // Pick black or white text for legibility against a solid hex fill (YIQ luminance).
  getContrastText(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq > 140 ? "#1a1a1a" : "#ffffff";
  },
});
