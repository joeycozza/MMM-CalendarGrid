const NodeHelper = require("node_helper");
const ical = require("node-ical");

module.exports = NodeHelper.create({
  start() {
    this.calendars = [];
    this.updateInterval = null;
    this.fetchTimer = null;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GET_CALENDAR_EVENTS") {
      this.calendars = payload.calendars || [];
      this.updateInterval = payload.updateInterval || 30 * 60 * 1000;

      // Clear any existing timer before starting a new one
      if (this.fetchTimer) {
        clearInterval(this.fetchTimer);
      }

      this.fetchAllCalendars();
      this.fetchTimer = setInterval(() => {
        this.fetchAllCalendars();
      }, this.updateInterval);
    }
  },

  async fetchAllCalendars() {
    const now = new Date();
    // Fetch events covering prev month through next month for smooth navigation
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const allEvents = [];

    const fetchPromises = this.calendars.map(async (cal) => {
      try {
        const rawData = await ical.async.fromURL(cal.url);
        const events = this.parseEvents(rawData, cal, windowStart, windowEnd);
        allEvents.push(...events);
      } catch (err) {
        console.error(`[MMM-CalendarGrid] Failed to fetch ${cal.url}:`, err.message);
      }
    });

    await Promise.all(fetchPromises);

    // Sort all events by start time
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    this.sendSocketNotification("CALENDAR_EVENTS", allEvents);
  },

  parseEvents(rawData, cal, windowStart, windowEnd) {
    const events = [];

    for (const key of Object.keys(rawData)) {
      const event = rawData[key];
      if (event.type !== "VEVENT") continue;

      // Handle recurring events
      if (event.rrule) {
        try {
          const occurrences = event.rrule.between(windowStart, windowEnd, true);
          for (const occurrenceStart of occurrences) {
            const duration = event.end
              ? new Date(event.end) - new Date(event.start)
              : 0;
            const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

            // Check for EXDATE exclusions
            if (event.exdate) {
              const excluded = Object.values(event.exdate).some((exDate) => {
                const ex = new Date(exDate);
                return ex.toDateString() === occurrenceStart.toDateString();
              });
              if (excluded) continue;
            }

            events.push(this.normalizeEvent(event, occurrenceStart, occurrenceEnd, cal));
          }
        } catch (e) {
          // Fall back to treating as a single event if rrule expansion fails
          events.push(this.normalizeEvent(event, new Date(event.start), new Date(event.end), cal));
        }
      } else {
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : start;

        // Skip events outside window
        if (end < windowStart || start > windowEnd) continue;

        events.push(this.normalizeEvent(event, start, end, cal));
      }
    }

    return events;
  },

  normalizeEvent(event, start, end, cal) {
    const allDay =
      event.start.dateOnly === true ||
      (typeof event.start === "object" && event.start.dateOnly) ||
      (!event.start.getHours && !event.start.getMinutes);

    return {
      id: event.uid || `${cal.name}-${start.toISOString()}`,
      title: event.summary || "(No title)",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: !!allDay,
      color: cal.color || "#888888",
      calendarName: cal.name || "",
    };
  },
});
