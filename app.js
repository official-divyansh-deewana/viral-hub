// CONFIGURATION: Replace with your raw GitHub url for videos.json
const DATA_SOURCE_URL = "https://raw.githubusercontent.com/YourGitHubUsername/YourRepoName/main/videos.json";

let videos = [];
let favorites = JSON.parse(localStorage.getItem('vh_favorites')) || [];
let historyList = JSON.parse(localStorage.getItem('vh_history')) || [];
let activeTab = 'all'; 
let currentVideo = null;
let playbackSpeed = 1.0;

// DOM Elements
const mainVideo = document.getElementById('mainVideo');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressFill = document.getElementById('progressFill');
const progressContainer = document.getElementById('progressContainer');
const timeDisplay = document.getElementById('timeDisplay');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const speedBtn = document.getElementById('speedBtn');
const playOverlay = document.getElementById('playOverlay');

window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderSkeletons();
    fetchVideos();
    setupPlayerListeners();
});

// Theme logic
function initTheme() {
    const savedTheme = localStorage.getItem('vh_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('vh_theme', newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const icon = document.getElementById('themeToggle').querySelector('i');
    icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// Fetch Video metadata from GitHub database
async function fetchVideos() {
    try {
        const response = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Could not fetch the video database file.');
        videos = await response.json();
        renderVideos(videos);
    } catch (err) {
        renderError(err.message);
    }
}

// Rendering UI states
function renderSkeletons() {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = Array(8).fill().map(() => `<div class="skeleton-card"></div>`).join('');
}

function renderError(message) {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = `
        <div class="error-container">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>Connection Error</h3>
            <p>${message}</p>
            <button class="retry-btn" onclick="fetchVideos()">Retry Connections</button>
        </div>
    `;
}

function renderVideos(items) {
    const grid = document.getElementById('videoGrid');
    if (items.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding: 4rem; color: var(--text-secondary); width: 100%; grid-column: 1/-1;">No records found.</div>`;
        return;
    }

    // Sort by latest timestamp
    const sorted = [...items].sort((a,b) => b.timestamp - a.timestamp);

    grid.innerHTML = sorted.map(video => {
        const isFav = favorites.includes(video.id);
        const readableDate = new Date(video.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
        return `
            <div class="video-card" onclick="openVideoPlayer('${video.id}')">
                <div class="thumbnail-container">
                    <img src="${video.thumbnailUrl}" alt="${escapeHtml(video.title)}" loading="lazy">
                    <span class="duration-tag">${video.duration || 'Video'}</span>
                </div>
                <div class="card-details">
                    <h3 class="card-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</h3>
                    <div class="card-meta">
                        <span>${readableDate}</span>
                        <div class="card-actions" onclick="event.stopPropagation()">
                            <button class="action-icon-btn ${isFav ? 'active-fav' : ''}" onclick="toggleFavorite('${video.id}', this)">
                                <i class="fa-solid fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Switching View States
function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'all') {
        document.getElementById('tabAll').classList.add('active');
        document.getElementById('sectionTitle').innerText = "Latest Videos";
        renderVideos(videos);
    } else if (tabName === 'favorites') {
        document.getElementById('tabFav').classList.add('active');
        document.getElementById('sectionTitle').innerText = "Favorite Videos";
        const favVideos = videos.filter(v => favorites.includes(v.id));
        renderVideos(favVideos);
    } else if (tabName === 'history') {
        document.getElementById('tabHist').classList.add('active');
        document.getElementById('sectionTitle').innerText = "Recently Viewed";
        const histVideos = historyList.map(id => videos.find(v => v.id === id)).filter(Boolean);
        renderVideos(histVideos);
    }
    showGridView();
}

function showGridView() {
    document.getElementById('playerView').classList.remove('active-view');
    document.getElementById('gridView').classList.add('active-view');
    document.getElementById('backBtn').classList.remove('visible');
    mainVideo.pause();
}

function openVideoPlayer(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    currentVideo = video;
    document.getElementById('gridView').classList.remove('active-view');
    document.getElementById('playerView').classList.add('active-view');
    document.getElementById('backBtn').classList.add('visible');

    mainVideo.src = video.videoUrl;
    document.getElementById('playerTitle').innerText = video.title;
    
    addToHistory(video.id);
    updatePlayerFavBtn(video.id);

    mainVideo.playbackRate = 1.0;
    playbackSpeed = 1.0;
    speedBtn.querySelector('span').innerText = '1.0x';

    mainVideo.play().catch(() => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Favorites Operations
function toggleFavorite(id, btnElement) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
        if (btnElement) btnElement.classList.remove('active-fav');
    } else {
        favorites.push(id);
        if (btnElement) btnElement.classList.add('active-fav');
    }
    localStorage.setItem('vh_favorites', JSON.stringify(favorites));
    
    if (activeTab === 'favorites') {
        const favVideos = videos.filter(v => favorites.includes(v.id));
        renderVideos(favVideos);
    }
    if (currentVideo && currentVideo.id === id) {
        updatePlayerFavBtn(id);
    }
}

function updatePlayerFavBtn(id) {
    const btn = document.getElementById('playerFavBtn');
    const isFav = favorites.includes(id);
    btn.innerHTML = isFav 
        ? `<i class="fa-solid fa-heart" style="color:#e91e63;"></i> Saved to Favorites` 
        : `<i class="fa-regular fa-heart"></i> Add to Favorites`;
    
    btn.onclick = () => toggleFavorite(id);
}

// History Operations
function addToHistory(id) {
    historyList = historyList.filter(item => item !== id);
    historyList.unshift(id);
    if (historyList.length > 24) historyList.pop();
    localStorage.setItem('vh_history', JSON.stringify(historyList));
}

// Search Operations
function filterVideos() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    let subset = videos;

    if (activeTab === 'favorites') {
        subset = videos.filter(v => favorites.includes(v.id));
    } else if (activeTab === 'history') {
        subset = historyList.map(id => videos.find(v => v.id === id)).filter(Boolean);
    }

    const filtered = subset.filter(v => v.title.toLowerCase().includes(query));
    renderVideos(filtered);
}

function resetFilters() {
    document.getElementById('searchInput').value = "";
    renderVideos(videos);
}

// HTML5 Media Player Custom Interactions
function setupPlayerListeners() {
    mainVideo.addEventListener('play', () => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });

    mainVideo.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    mainVideo.addEventListener('timeupdate', () => {
        if (mainVideo.duration) {
            const pct = (mainVideo.currentTime / mainVideo.duration) * 100;
            progressFill.style.width = `${pct}%`;
            timeDisplay.innerText = `${formatTime(mainVideo.currentTime)} / ${formatTime(mainVideo.duration)}`;
        }
    });

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        mainVideo.currentTime = (clickX / rect.width) * mainVideo.duration;
    });

    volumeSlider.addEventListener('input', (e) => {
        mainVideo.volume = e.target.value;
        mainVideo.muted = (e.target.value == 0);
        updateVolumeIcon();
    });

    mainVideo.addEventListener('click', () => {
        togglePlay();
        triggerPlayAnimation();
    });
}

function togglePlay() {
    if (mainVideo.paused) {
        mainVideo.play();
    } else {
        mainVideo.pause();
    }
}

function triggerPlayAnimation() {
    playOverlay.classList.remove('animate');
    void playOverlay.offsetWidth;
    const icon = playOverlay.querySelector('i');
    icon.className = mainVideo.paused ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    playOverlay.classList.add('animate');
}

function toggleMute() {
    mainVideo.muted = !mainVideo.muted;
    if (mainVideo.muted) {
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
        volumeSlider.value = 0;
    } else {
        volumeSlider.value = mainVideo.volume || 1;
        updateVolumeIcon();
    }
}

function updateVolumeIcon() {
    if (mainVideo.muted || mainVideo.volume === 0) {
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-mute"></i>';
    } else if (mainVideo.volume < 0.5) {
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
}

function cycleSpeed() {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    let index = speeds.indexOf(playbackSpeed);
    playbackSpeed = speeds[(index + 1) % speeds.length];
    mainVideo.playbackRate = playbackSpeed;
    speedBtn.querySelector('span').innerText = `${playbackSpeed}x`;
}

function toggleFullscreen() {
    const container = document.getElementById('playerContainer');
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error("Fullscreen error: ", err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Utility Helpers
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
