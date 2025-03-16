function onReady() {

    setTimeout(async () => {

        const addEventToCalendarICalLink = document.querySelector('a[data-event-label="add-event-to-calendar-ical"]');

        const addEventToCalendarProtonLink = addEventToCalendarICalLink.cloneNode(true);
        addEventToCalendarProtonLink.href = '#';
        addEventToCalendarProtonLink.target = '_blank';
        addEventToCalendarProtonLink.innerHTML = 'Proton Calendar';
        addEventToCalendarProtonLink.setAttribute('data-event-label', 'add-event-to-calendar-proton');
        addEventToCalendarProtonLink.addEventListener('click', async (e) => {
            e.preventDefault();

            const meetupEventICalFile = await fetch(addEventToCalendarICalLink.href);
            const meetupEventICal = await meetupEventICalFile.text();
            const meetupEventParsed = parseICalData(meetupEventICal);
            const meetupEventInfos = extractEventInfo(meetupEventParsed);

            if (meetupEventInfos.length <= 0) {
                return;
            }

            chrome.storage.local.set({
                meetupEventInfos: meetupEventInfos[0]
            });

            window.open('https://calendar.proton.me/u/0/');
        })

        addEventToCalendarICalLink.parentElement.prepend(addEventToCalendarProtonLink);

    }, 2000)

}

if (document.readyState !== "loading") {
    onReady(); // Or setTimeout(onReady, 0); if you want it consistently async
} else {
    document.addEventListener("DOMContentLoaded", onReady);
}


/**
 * Parses iCal data from a string and returns structured JavaScript objects
 * @param {string} icalData - The iCal data as a string
 * @return {Object} Parsed calendar data with events
 */
function parseICalData(icalData) {
    // Remove line folding (lines that start with a space or tab are part of the previous line)
    const unfoldedData = icalData.replace(/\r\n[ \t]|\n[ \t]/g, '');
    const lines = unfoldedData.split(/\r\n|\n/);

    const calendar = {
        properties: {},
        events: [],
        timezones: []
    };

    let currentObject = null;
    let currentType = null;
    let currentTimezone = null;
    let currentTimezonePart = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines
        if (!line.trim()) continue;

        // Check for begin/end markers
        if (line.startsWith('BEGIN:')) {
            const objectType = line.substring(6);

            if (objectType === 'VCALENDAR') {
                currentType = 'calendar';
                currentObject = calendar;
            } else if (objectType === 'VEVENT') {
                currentType = 'event';
                currentObject = {properties: {}};
                calendar.events.push(currentObject);
            } else if (objectType === 'VTIMEZONE') {
                currentType = 'timezone';
                currentTimezone = {tzid: '', components: []};
                calendar.timezones.push(currentTimezone);
            } else if (objectType === 'STANDARD' || objectType === 'DAYLIGHT') {
                currentTimezonePart = {type: objectType, properties: {}};
                currentTimezone.components.push(currentTimezonePart);
            }
            continue;
        }

        if (line.startsWith('END:')) {
            const objectType = line.substring(4);

            if (objectType === 'VCALENDAR') {
                currentType = null;
                currentObject = null;
            } else if (objectType === 'VEVENT') {
                currentType = 'calendar';
                currentObject = calendar;
            } else if (objectType === 'VTIMEZONE') {
                currentType = 'calendar';
                currentTimezone = null;
            } else if (objectType === 'STANDARD' || objectType === 'DAYLIGHT') {
                currentTimezonePart = null;
            }
            continue;
        }

        // Parse properties
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            let key = line.substring(0, colonIndex);
            const value = line.substring(colonIndex + 1);

            // Handle parameters (e.g., DTSTART;TZID=Europe/Vienna)
            const params = {};
            if (key.includes(';')) {
                const parts = key.split(';');
                key = parts[0];

                for (let j = 1; j < parts.length; j++) {
                    const paramPart = parts[j];
                    const equalIndex = paramPart.indexOf('=');

                    if (equalIndex > 0) {
                        const paramName = paramPart.substring(0, equalIndex);
                        const paramValue = paramPart.substring(equalIndex + 1);
                        params[paramName] = paramValue;
                    }
                }
            }

            // Store the property depending on the current context
            if (currentTimezonePart) {
                if (Object.keys(params).length > 0) {
                    currentTimezonePart.properties[key] = {value, params};
                } else {
                    currentTimezonePart.properties[key] = value;
                }
            } else if (currentTimezone) {
                if (key === 'TZID') {
                    currentTimezone.tzid = value;
                } else {
                    currentTimezone[key.toLowerCase()] = value;
                }
            } else if (currentType === 'event') {
                if (Object.keys(params).length > 0) {
                    currentObject.properties[key] = {value, params};
                } else {
                    currentObject.properties[key] = value;
                }
            } else if (currentType === 'calendar') {
                calendar.properties[key] = value;
            }
        }
    }

    return calendar;
}

/**
 * Helper function to format iCal datetime values
 * @param {string} dateTimeString - iCal datetime string
 * @param {string} tzid - Optional timezone ID
 * @return {Date} JavaScript Date object
 */
function formatICalDateTime(dateTimeString, tzid) {
    // Basic formatting for dates like: 20250326T170000
    if (dateTimeString.includes('T')) {
        const year = dateTimeString.substring(0, 4);
        const month = dateTimeString.substring(4, 6);
        const day = dateTimeString.substring(6, 8);
        const hour = dateTimeString.substring(9, 11);
        const minute = dateTimeString.substring(11, 13);
        const second = dateTimeString.substring(13, 15);

        // Note: This creates a date in the local timezone
        // For proper timezone handling, you would need a library like Luxon or moment-timezone
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    }

    return dateTimeString;
}

// Example usage
const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Meetup//Meetup Calendar 1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
NAME:GDG Vienna
X-WR-CALNAME:GDG Vienna
BEGIN:VTIMEZONE
TZID:Europe/Vienna
TZURL:http://tzurl.org/zoneinfo-outlook/Europe/Vienna
X-LIC-LOCATION:Europe/Vienna
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:event_305130359@meetup.com
SEQUENCE:1
DTSTAMP:20250315T223902Z
DTSTART;TZID=Europe/Vienna:20250326T170000
DTEND;TZID=Europe/Vienna:20250326T183000
SUMMARY:Testing Tools for Accessibility Enhancement Part II
DESCRIPTION:GDG Vienna\\nAccessibility Tools\\n\\nPart 2 of Automated testing...
URL;VALUE=URI:https://www.meetup.com/gdg-vienna/events/305130359/
STATUS:CONFIRMED
CREATED:20241217T150835Z
LAST-MODIFIED:20241217T150835Z
CLASS:PUBLIC
END:VEVENT
X-ORIGINAL-URL:https://www.meetup.com/GDG-Vienna/events/ical/GDG+Vienna.ic
 s
X-WR-CALNAME:GDG Vienna
END:VCALENDAR`;

// const parsedCalendar = parseICalData(icalData);
// console.log(JSON.stringify(parsedCalendar, null, 2));

// Example to extract just the essential event information
function extractEventInfo(calendar) {
    return calendar.events.map(event => {
        const props = event.properties;
        return {
            summary: props.SUMMARY,
            description: props.DESCRIPTION,
            start: props.DTSTART.value,
            end: props.DTEND.value,
            location: props.LOCATION,
            url: props.URL && props.URL.value ? props.URL.value : props.URL
        };
    });
}

// const eventInfo = extractEventInfo(parsedCalendar);
// console.log(eventInfo);