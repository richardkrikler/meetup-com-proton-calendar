document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('meetupEventInfos', (item) => {
        document.getElementById('meetupEventInfos').innerHTML = JSON.stringify(item.meetupEventInfos, null, 2);
    });
});
