// Initialize map
var map = L.map('map').setView([20.5937, 78.9629], 5); // Centered on India

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// SocketIO connection
const socket = io();  // Assumes SocketIO is served by the backend

// Audio recording setup
let mediaRecorder;
let audioChunks = [];

// Start recording
document.getElementById('start').addEventListener('click', () => {
    console.log('Start button clicked');
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioChunks = [];
                console.log('Recording stopped, sending audio to server');
                sendAudioToServer(audioBlob);
            };

            console.log('Recording started');
        })
        .catch(error => console.error('Error accessing microphone:', error));
});

// Stop recording
document.getElementById('stop').addEventListener('click', () => {
    console.log('Stop button clicked');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('Recording stopped');
    }
});

// Send the recorded audio to the backend via /upload
function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio_data', audioBlob);  // Match the key in your Flask code

    fetch('/upload', {  // Sends the request to your existing /upload endpoint
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "File transcribed successfully") {
            console.log('Transcription request sent successfully');
        } else {
            console.error('Transcription failed:', data.message);
        }
    })
    .catch(error => console.error('Error uploading audio:', error));
};

// Handle transcription results from SocketIO
socket.on('transcription', data => {
    const command = data.text.toLowerCase();
    handleCommand(command);
});

// Handle the commands received from transcription
function handleCommand(command) {
    console.log(`Recognized command: ${command}`);
    if (command.includes('navigate to')) {
        const location = command.replace('navigate to', '').trim();
        navigateToLocation(location);
    } else if (command.includes('show weather of')) {
        const location = command.replace('show weather of', '').trim();
        showWeather(location);
    } else if (command.includes('zoom in')) {
        map.zoomIn();
    } else if (command.includes('zoom out')) {
        map.zoomOut();
    } else if (command.includes('move left')) {
        moveMap('left');
    } else if (command.includes('move right')) {
        moveMap('right');
    } else if (command.includes('show') && command.includes('near me')) {
        const poi = command.replace('show', '').replace('near me', '').trim();
        findNearby(poi);
    }
}

// Functions for navigating, showing weather, etc.
function navigateToLocation(location) {
    console.log(`Navigating to: ${location}`);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const latLng = [data[0].lat, data[0].lon];
                map.setView(latLng, 13);
                L.marker(latLng).addTo(map)
                    .bindPopup(`<b>${location}</b>`)
                    .openPopup();
            } else {
                alert('Location not found.');
            }
        })
        .catch(error => console.error('Error:', error));
}

function showWeather(location) {
    console.log(`Fetching weather for: ${location}`);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                console.log(lat);
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=a4d8fd4e63897cc4ad7704722c1299a7&units=metric`)
                    .then(response => response.json())
                    .then(weatherData => {
                        const weather = weatherData.weather[0].description;
                        const temperature = weatherData.main.temp;
                        alert(`Weather in ${location}: ${weather}, ${temperature}°C`);
                    })
                    .catch(error => console.error('Error:', error));
            } else {
                alert('Location not found.');
            }
        })
        .catch(error => console.error('Error:', error));
}

function moveMap(direction) {
    const offset = 0.1;
    const center = map.getCenter();
    let lat = center.lat;
    let lng = center.lng;

    if (direction === 'left') {
        lng -= offset;
    } else if (direction === 'right') {
        lng += offset;
    }
    
    map.setView([lat, lng], map.getZoom());
}

function findNearby(poi) {
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        console.log(`Finding ${poi} near [${latitude}, ${longitude}]`);
        const radius = 10000; // 10 km radius
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="${poi}"](around:${radius},${latitude},${longitude});out;`;

        fetch(overpassUrl)
            .then(response => response.json())
            .then(data => {
                if (data.elements.length > 0) {
                    data.elements.forEach(place => {
                        const latLng = [place.lat, place.lon];
                        L.marker(latLng).addTo(map)
                            .bindPopup(`<b>${place.tags.name || poi}</b>`)
                            .openPopup();
                    });
                } else {
                    alert(`No ${poi} found within 10 km of your location.`);
                }
            })
            .catch(error => console.error('Error:', error));
    }, error => {
        console.error('Geolocation error:', error);
    });
}
