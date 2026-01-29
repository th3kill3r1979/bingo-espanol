const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Serve static files
app.use(express.static('public'));

// Game state (volatile memory)
let gameState = {
  gameId: generateGameId(),
  drawnBalls: [],
  cards: new Map(), // serialNumber -> card data
  playerSessions: new Map(), // socketId -> serialNumber
  qrCodeUrl: ''
};

// Generate unique game ID
function generateGameId() {
  return `GAME-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate Spanish Bingo Card
function generateSpanishBingoCard() {
  // Generate simple 4-digit serial number
  const serialNumber = String(Math.floor(1000 + Math.random() * 9000));
  const matrix = Array(3).fill(null).map(() => Array(9).fill(null));
  const usedNumbers = new Set();

  // Column ranges: [1-9], [10-19], [20-29], ..., [80-90]
  const columnRanges = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90]
  ];

  // For each row, we need exactly 5 numbers and 4 empty spaces
  for (let row = 0; row < 3; row++) {
    // Decide which 5 columns will have numbers (4 will be empty)
    const columnsWithNumbers = [];
    const allColumns = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    // Randomly select 5 columns for this row
    while (columnsWithNumbers.length < 5) {
      const randomCol = allColumns[Math.floor(Math.random() * allColumns.length)];
      if (!columnsWithNumbers.includes(randomCol)) {
        columnsWithNumbers.push(randomCol);
      }
    }

    columnsWithNumbers.sort((a, b) => a - b);

    // Fill the selected columns with numbers
    for (const col of columnsWithNumbers) {
      const [min, max] = columnRanges[col];
      let number;

      // Generate a unique number for this column
      do {
        number = Math.floor(Math.random() * (max - min + 1)) + min;
      } while (usedNumbers.has(number));

      usedNumbers.add(number);
      matrix[row][col] = number;
    }
  }

  // Ensure each column has at least one number across all rows
  for (let col = 0; col < 9; col++) {
    const columnHasNumber = matrix.some(row => row[col] !== null);
    if (!columnHasNumber) {
      // Find a row that has less than 5 numbers or can swap
      for (let row = 0; row < 3; row++) {
        const rowNumbers = matrix[row].filter(n => n !== null).length;
        if (rowNumbers < 5) {
          const [min, max] = columnRanges[col];
          let number;
          do {
            number = Math.floor(Math.random() * (max - min + 1)) + min;
          } while (usedNumbers.has(number));

          usedNumbers.add(number);
          matrix[row][col] = number;
          break;
        }
      }
    }
  }

  // Sort numbers in each column (top to bottom)
  for (let col = 0; col < 9; col++) {
    const columnNumbers = [];
    for (let row = 0; row < 3; row++) {
      if (matrix[row][col] !== null) {
        columnNumbers.push(matrix[row][col]);
      }
    }
    columnNumbers.sort((a, b) => a - b);

    let numIndex = 0;
    for (let row = 0; row < 3; row++) {
      if (matrix[row][col] !== null) {
        matrix[row][col] = columnNumbers[numIndex++];
      }
    }
  }

  const numbers = Array.from(usedNumbers);

  return {
    serialNumber,
    matrix,
    numbers
  };
}

// Draw a random ball (1-90)
function drawBall() {
  const availableBalls = [];
  for (let i = 1; i <= 90; i++) {
    if (!gameState.drawnBalls.includes(i)) {
      availableBalls.push(i);
    }
  }

  if (availableBalls.length === 0) {
    return null; // All balls drawn
  }

  const randomIndex = Math.floor(Math.random() * availableBalls.length);
  const ball = availableBalls[randomIndex];
  gameState.drawnBalls.push(ball);

  return ball;
}

// Validate card by serial number
function validateCard(serialNumber) {
  const card = gameState.cards.get(serialNumber);
  if (!card) {
    return null;
  }

  // Create a validation result with highlighted matches
  const validation = {
    serialNumber: card.serialNumber,
    playerName: card.playerName || 'Jugador',
    matrix: card.matrix,
    matches: [],
    lines: [],
    hasBingo: false
  };

  // Check which numbers on the card have been drawn
  const rowMatches = [0, 0, 0]; // Count matches per row

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const number = card.matrix[row][col];
      if (number !== null && gameState.drawnBalls.includes(number)) {
        validation.matches.push({ row, col, number });
        rowMatches[row]++;
      }
    }
  }

  // Check for lines (all 5 numbers in a row marked)
  for (let row = 0; row < 3; row++) {
    if (rowMatches[row] === 5) {
      validation.lines.push(row);
    }
  }

  // Check for bingo (all 15 numbers marked)
  if (validation.matches.length === 15) {
    validation.hasBingo = true;
  }

  return validation;
}

// --- Bingo Game Functions ---
function resetBingoGame() {
  gameState = {
    gameId: generateGameId(),
    drawnBalls: [],
    cards: new Map(),
    playerSessions: new Map(),
    qrCodeUrl: ''
  };

  // Generate new QR code
  const playerUrl = `${BASE_URL}/player`;
  QRCode.toDataURL(playerUrl, (err, url) => {
    if (!err) {
      gameState.qrCodeUrl = url;
    }
  });
}

// --- UNO Game State ---
let unoState = {
  deck: [],
  discardPile: [],
  players: [], // { id, name, hand: [] }
  currentPlayerIndex: 0,
  direction: 1, // 1 for clockwise, -1 for counter-clockwise
  status: 'waiting', // waiting, playing, ended
  winner: null,
  wildColor: null,
  qrCodeUrl: ''
};

function createUnoDeck() {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];
  let deck = [];

  for (const color of colors) {
    for (const value of values) {
      deck.push({ color, value });
      if (value !== '0') deck.push({ color, value }); // Two of each except 0
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'Wild' });
    deck.push({ color: 'wild', value: '+4' });
  }

  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function resetUnoGame(keepPlayers = false) {
  const players = keepPlayers ? unoState.players.map(p => ({ ...p, hand: [] })) : [];

  unoState = {
    deck: createUnoDeck(),
    discardPile: [],
    players: players,
    currentPlayerIndex: 0,
    direction: 1,
    status: 'waiting',
    winner: null,
    wildColor: null,
    qrCodeUrl: unoState.qrCodeUrl
  };

  // Generate QR code for UNO
  const playerUrl = `${BASE_URL}/unoplayer`;
  QRCode.toDataURL(playerUrl, (err, url) => {
    if (!err) {
      unoState.qrCodeUrl = url;
      sendUnoStateUpdate();
    }
  });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/unogame', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uno', 'display.html'));
});

app.get('/unoplayer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uno', 'player.html'));
});

app.get('/moderator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'moderator.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/qr', (req, res) => {
  if (gameState.qrCodeUrl) {
    res.send(`<img src="${gameState.qrCodeUrl}" alt="QR Code" />`);
  } else {
    res.send('QR Code not available');
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle player requesting a card
  socket.on('request-card', (data) => {
    const playerName = data?.playerName || 'Jugador';
    const requestedSerial = data?.serialNumber;
    const requestedGameId = data?.gameId;

    let card;

    // 1. Try to recover by serial number if game matches
    if (requestedSerial && requestedGameId === gameState.gameId) {
      if (gameState.cards.has(requestedSerial)) {
        card = gameState.cards.get(requestedSerial);
        // Update name if it changed
        if (data?.playerName) {
          card.playerName = playerName;
        }
        gameState.playerSessions.set(socket.id, card.serialNumber);
      }
    }

    // 2. Fallback to existing session by socket.id (unlikely after refresh)
    if (!card) {
      let serialNumber = gameState.playerSessions.get(socket.id);
      if (serialNumber && gameState.cards.has(serialNumber)) {
        card = gameState.cards.get(serialNumber);
      }
    }

    // 3. Generate new card if nothing recovered
    if (!card) {
      card = generateSpanishBingoCard();
      card.playerName = playerName;
      gameState.cards.set(card.serialNumber, card);
      gameState.playerSessions.set(socket.id, card.serialNumber);
    }

    socket.emit('card-assigned', {
      gameId: gameState.gameId,
      card: card
    });
  });

  // Handle moderator drawing a ball
  socket.on('draw-ball', () => {
    const ball = drawBall();
    if (ball !== null) {
      io.emit('ball-drawn', {
        ball,
        drawnBalls: gameState.drawnBalls
      });
    } else {
      socket.emit('error', { message: 'All balls have been drawn!' });
    }
  });

  // --- UNO Event Handlers ---
  socket.on('uno-join', (data) => {
    const playerName = data?.playerName || 'Jugador UNO';
    const player = {
      id: socket.id,
      name: playerName,
      hand: []
    };

    // Check if player already joined
    const existingPlayer = unoState.players.find(p => p.id === socket.id);
    if (existingPlayer) {
    } else {
      unoState.players.push(player);
    }

    sendUnoStateUpdate();
    socket.emit('uno-your-hand', player.hand);
  });

  socket.on('uno-state-request', () => {
    sendUnoStateUpdate();
  });

  socket.on('uno-start', () => {
    if (unoState.players.length < 2) {
      return socket.emit('error', { message: 'Se necesitan al menos 2 jugadores.' });
    }

    resetUnoGame(true);
    unoState.status = 'playing';

    // Deal cards (7 each)
    unoState.players.forEach(p => {
      p.hand = unoState.deck.splice(0, 7);
    });

    // Initial discard
    let initialCard = unoState.deck.pop();
    while (initialCard.color === 'wild') {
      unoState.deck.unshift(initialCard);
      initialCard = unoState.deck.pop();
    }
    unoState.discardPile.push(initialCard);

    io.emit('uno-game-started', {
      topCard: initialCard,
      currentPlayer: unoState.players[unoState.currentPlayerIndex].name
    });

    unoState.players.forEach(p => {
      io.to(p.id).emit('uno-your-hand', p.hand);
    });

    sendUnoStateUpdate();
  });

  socket.on('uno-play-card', (data) => {
    const player = unoState.players.find(p => p.id === socket.id);
    if (!player || unoState.players[unoState.currentPlayerIndex].id !== socket.id) {
      return socket.emit('error', { message: 'No es tu turno.' });
    }

    const cardIndex = data.cardIndex;
    const card = player.hand[cardIndex];
    const topCard = unoState.discardPile[unoState.discardPile.length - 1];

    // Check if card matches
    const isColorMatch = card.color === topCard.color || card.color === unoState.wildColor;
    const isValueMatch = card.value === topCard.value;
    const isWild = card.color === 'wild';

    if (!isColorMatch && !isValueMatch && !isWild) {
      return socket.emit('error', { message: 'La carta no coincide con el color o valor.' });
    }

    // Play card
    player.hand.splice(cardIndex, 1);
    unoState.discardPile.push(card);
    unoState.wildColor = null;

    // Handle special cards
    if (card.value === 'Skip') {
      nextTurn();
    } else if (card.value === 'Reverse') {
      unoState.direction *= -1;
      if (unoState.players.length === 2) nextTurn();
    } else if (card.value === '+2') {
      nextTurn();
      const nextPlayer = unoState.players[unoState.currentPlayerIndex];
      nextPlayer.hand.push(...unoState.deck.splice(0, 2));
      io.to(nextPlayer.id).emit('uno-your-hand', nextPlayer.hand);
    } else if (card.value === '+4') {
      nextTurn();
      const nextPlayer = unoState.players[unoState.currentPlayerIndex];
      nextPlayer.hand.push(...unoState.deck.splice(0, 4));
      io.to(nextPlayer.id).emit('uno-your-hand', nextPlayer.hand);
    }

    // Check for win
    if (player.hand.length === 0) {
      unoState.status = 'ended';
      unoState.winner = player.name;
      io.emit('uno-game-over', { winner: player.name });
    } else {
      if (!isWild) nextTurn();
      // If wild, wait for uno-wild-color
    }

    socket.emit('uno-your-hand', player.hand);
    sendUnoStateUpdate();
  });

  socket.on('uno-draw-card', () => {
    const player = unoState.players.find(p => p.id === socket.id);
    if (!player || unoState.players[unoState.currentPlayerIndex].id !== socket.id) {
      return socket.emit('error', { message: 'No es tu turno.' });
    }

    if (unoState.deck.length === 0) {
      const topCard = unoState.discardPile.pop();
      unoState.deck = shuffle([...unoState.discardPile]);
      unoState.discardPile = [topCard];
    }

    player.hand.push(unoState.deck.pop());
    socket.emit('uno-your-hand', player.hand);
    nextTurn();
    sendUnoStateUpdate();
  });

  socket.on('uno-wild-color', (data) => {
    unoState.wildColor = data.color;
    nextTurn();
    sendUnoStateUpdate();
  });

  function nextTurn() {
    unoState.currentPlayerIndex = (unoState.currentPlayerIndex + unoState.direction + unoState.players.length) % unoState.players.length;
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove from UNO players if not started
    if (unoState.status === 'waiting') {
      unoState.players = unoState.players.filter(p => p.id !== socket.id);
      sendUnoStateUpdate();
    }
  });
});

function sendUnoStateUpdate() {
  io.emit('uno-state-update', {
    players: unoState.players.map(p => ({ id: p.id, name: p.name, cardCount: p.hand.length })),
    status: unoState.status,
    currentPlayer: unoState.players[unoState.currentPlayerIndex]?.name,
    topCard: unoState.discardPile[unoState.discardPile.length - 1],
    wildColor: unoState.wildColor,
    qrCodeUrl: unoState.qrCodeUrl
  });
}


// Initialize QR code on server start
const playerUrl = `${BASE_URL}/player`;
QRCode.toDataURL(playerUrl, (err, url) => {
  if (!err) {
    gameState.qrCodeUrl = url;
  }
});

// Start server
// Initialize games
resetBingoGame();
resetUnoGame();

server.listen(PORT, () => {
  console.log(`🎰 Bingo Server running on ${BASE_URL}`);
  console.log(`📱 Player URL: ${BASE_URL}/player`);
  console.log(`🖥️  Moderator Panel: ${BASE_URL}/moderator`);
  console.log(`📺 Public Display: ${BASE_URL}/display`);
});
