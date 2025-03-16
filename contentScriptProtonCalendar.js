let trialCounter = 3;

function onReady() {

    setTimeout(async () => {

        const protonNewEventButton = document.querySelector('button[data-testid="calendar-view:new-event-button"]');

        if (!protonNewEventButton) {
            if (trialCounter > 0) {
                trialCounter--;
                onReady();
            }
            return;
        }

        addOutlineAnimation();
        protonNewEventButton.classList.add('outline-animated');

        protonNewEventButton.addEventListener('click', () => {
            protonNewEventButton.classList.remove('outline-animated');

            chrome.storage.local.get('meetupEventInfos', function (item) {
                if (!item.meetupEventInfos) {
                    return;
                }

                const eventEntryFormFieldIds = {
                    title: 'event-title-input',
                    location: 'event-location-input',
                    description: 'event-description-input',
                    startDate: 'event-date-input',
                    endDate: 'event-endDate',
                    startTime: 'event-startTime',
                    endTime: 'event-endTime'
                };

                setTimeout(() => {
                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.title, '[Meetup] ' + item.meetupEventInfos.summary);
                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.location, item.meetupEventInfos.url);
                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.description, item.meetupEventInfos.description.replaceAll('\\n', "\n"));

                    const startDate = convertDateStringToDateObject(item.meetupEventInfos.start);
                    const endDate = convertDateStringToDateObject(item.meetupEventInfos.end);

                    const dateFormatter = new Intl.DateTimeFormat('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    });

                    const timeFormatter = new Intl.DateTimeFormat('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });

                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.startDate, dateFormatter.format(startDate));
                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.endDate, dateFormatter.format(endDate));
                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.startTime, timeFormatter.format(startDate));
                    updateEventEntryFormFieldValue(eventEntryFormFieldIds.endTime, timeFormatter.format(endDate));

                    setTimeout(() => {
                        chrome.storage.local.remove('meetupEventInfos');
                    }, 2000)
                }, 1000);

            });
        })

    }, 2000)

}

if (document.referrer === 'https://www.meetup.com/') {
    if (document.readyState !== "loading") {
        onReady(); // Or setTimeout(onReady, 0); if you want it consistently async
    } else {
        document.addEventListener("DOMContentLoaded", onReady);
    }
}

function updateEventEntryFormFieldValue(elementId, value) {
    const fieldElement = document.getElementById(elementId);
    fieldElement.value = value;

    fieldElement.setSelectionRange(0, 0); // Reset cursor position
    ['input', 'change', 'blur', 'focusout'].forEach(eventType => {
        fieldElement.dispatchEvent(new Event(eventType, { bubbles: true, composed: true }));
    });
}

function convertDateStringToDateObject(dateString) {
    const formattedString = dateString.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
        "$1-$2-$3T$4:$5:$6"
    );
    return new Date(formattedString);
}

function addOutlineAnimation() {
    const styleElement = document.createElement('style');

    styleElement.textContent = `
    .outline-animated {
      outline: 5px solid red;
      outline-offset: 4px;
      animation: pulse-outline 1s infinite alternate ease-in-out;
    }
    
    @keyframes pulse-outline {
      0% {
        outline-offset: 4px;
      }
      100% {
        outline-offset: 7px;
      }
    }
  `;

    // Append the style element to the document head
    document.head.appendChild(styleElement);
}
