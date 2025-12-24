let player;
let allSongs = [];
let timeline = [];
let currentSong = null;
let lives = 3;
let points = 0;
let timelineSortable;
let handSortable;

// --- INICIALIZACIÓN ---
async function initGame() {
    // 1. Cargar datos
    const response = await fetch('songs.json');
    allSongs = await response.json();
    
    // 2. Preparar UI
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // 3. Inicializar Drag & Drop
    initSortables();

    // 4. Poner primera carta gratis
    const firstSong = getRandomSong();
    firstSong.revealed = true;
    timeline.push(firstSong);
    renderTimeline();

    // 5. Empezar ronda
    nextRound();
}

// Configuración de YouTube API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0', width: '0',
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1 }
    });
}

function getRandomSong() {
    if (allSongs.length === 0) return null;
    const index = Math.floor(Math.random() * allSongs.length);
    return allSongs.splice(index, 1)[0];
}

// --- LÓGICA DE RONDA ---
function nextRound() {
    currentSong = getRandomSong();
    
    if (!currentSong) {
        alert("¡Has completado todas las canciones!");
        return gameOver();
    }

    // Renderizar carta en la mano (zona inferior)
    const handList = document.getElementById('hand-list');
    handList.innerHTML = createCardHTML(currentSong, false); // false = año oculto

    // Reproducir audio
    if (player && player.loadVideoById) {
        player.loadVideoById({
            videoId: currentSong.id,
            startSeconds: currentSong.offset || 0
        });
    }

    document.getElementById('instruction-text').innerText = "Escucha y arrastra la carta arriba:";
    document.getElementById('btn-check').disabled = false;
}

// --- DRAG & DROP (SortableJS) ---
function initSortables() {
    const timelineEl = document.getElementById('timeline-list');
    const handEl = document.getElementById('hand-list');

    // Lista Principal (Timeline)
    timelineSortable = new Sortable(timelineEl, {
        group: 'shared', // Permite recibir elementos de 'hand'
        animation: 150,
        disabled: false // Se puede reordenar? No, solo insertar.
    });

    // Mano del Jugador
    handSortable = new Sortable(handEl, {
        group: 'shared',
        animation: 150,
        sort: false // No se puede reordenar dentro de la mano
    });
}

// --- VERIFICACIÓN ---
function checkAnswer() {
    const timelineEl = document.getElementById('timeline-list');
    const cards = Array.from(timelineEl.children);
    
    // Buscar dónde puso el usuario la carta (la que tiene clase 'playing')
    const userIndex = cards.findIndex(card => card.classList.contains('playing'));

    if (userIndex === -1) {
        alert("Debes arrastrar la carta a la línea de tiempo primero.");
        return;
    }

    // Detener música
    player.stopVideo();

    // Lógica Matemática: ¿Es correcto el orden?
    // Obtenemos los años de las cartas vecinas
    let prevYear = -Infinity;
    let nextYear = Infinity;

    // Miramos la carta anterior (si existe)
    if (userIndex > 0) {
        prevYear = parseInt(cards[userIndex - 1].dataset.year);
    }
    // Miramos la carta siguiente (si existe)
    if (userIndex < cards.length - 1) {
        nextYear = parseInt(cards[userIndex + 1].dataset.year);
    }

    const actualYear = currentSong.year;
    const isCorrect = actualYear >= prevYear && actualYear <= nextYear;

    // Actualizar UI visualmente
    const playedCard = cards[userIndex];
    playedCard.classList.remove('playing');
    playedCard.querySelector('.card-year').classList.remove('hidden-year');
    playedCard.querySelector('.card-year').innerText = actualYear;

    if (isCorrect) {
        playedCard.classList.add('correct');
        points++;
        document.getElementById('points').innerText = points;
        
        // Actualizar array lógico timeline
        timeline.splice(userIndex, 0, currentSong);
        
        setTimeout(() => {
            playedCard.classList.remove('correct');
            nextRound();
        }, 1500);
    } else {
        playedCard.classList.add('wrong');
        lives--;
        document.getElementById('lives').innerText = lives;
        
        alert(`¡Fallo! Era de ${actualYear}. La carta se descarta.`);
        
        // Eliminar carta del DOM visualmente porque falló
        playedCard.remove();

        if (lives <= 0) {
            gameOver();
        } else {
            nextRound();
        }
    }
}

// --- UTILIDADES ---
function createCardHTML(song, revealed) {
    // Clase 'playing' para identificar la carta activa
    const activeClass = !revealed ? 'playing' : ''; 
    const yearDisplay = revealed ? song.year : '????';
    const hiddenClass = !revealed ? 'hidden-year' : '';

    return `
        <div class="card ${activeClass}" data-year="${song.year}">
            <div class="card-info">
                <div class="card-title">${song.title}</div>
                <div class="card-artist">${song.artist}</div>
            </div>
            <div class="card-year ${hiddenClass}">${yearDisplay}</div>
        </div>
    `;
}

function renderTimeline() {
    const list = document.getElementById('timeline-list');
    list.innerHTML = timeline.map(song => createCardHTML(song, true)).join('');
}

function replayAudio() {
    if(player && player.getPlayerState() !== 1) {
        player.playVideo();
    }
}

function gameOver() {
    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('final-score').innerText = points;
}