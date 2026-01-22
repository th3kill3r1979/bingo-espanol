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

// Reset game
function resetGame() {
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

    // Check if this session already has a card
    let serialNumber = gameState.playerSessions.get(socket.id);
    let card;

    if (serialNumber && gameState.cards.has(serialNumber)) {
      // Return existing card
      card = gameState.cards.get(serialNumber);
      // Update name if provided
      if (data?.playerName) {
        card.playerName = playerName;
      }
    } else {
      // Generate new card
      card = generateSpanishBingoCard();
      card.playerName = playerName; // Add player name to card
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

  // Handle game reset
  socket.on('reset-game', () => {
    resetGame();
    io.emit('game-reset', {
      gameId: gameState.gameId,
      qrCodeUrl: gameState.qrCodeUrl
    });
  });

  // Handle card validation
  socket.on('validate-card', (data) => {
    const validation = validateCard(data.serialNumber);
    if (validation) {
      socket.emit('card-validated', validation);
    } else {
      socket.emit('error', { message: 'Card not found!' });
    }
  });

  // Handle line winner announcement
  socket.on('announce-line', (data) => {
    io.emit('winner-line', {
      playerName: data.playerName,
      serialNumber: data.serialNumber,
      lines: data.lines
    });
  });

  // Handle bingo winner announcement
  socket.on('announce-bingo', (data) => {
    io.emit('winner-bingo', {
      playerName: data.playerName,
      serialNumber: data.serialNumber
    });
  });

  // Send current game state to newly connected clients
  socket.emit('game-state', {
    gameId: gameState.gameId,
    drawnBalls: gameState.drawnBalls,
    qrCodeUrl: gameState.qrCodeUrl
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Keep the card in memory even after disconnect
    // Player can reconnect and get the same card
  });
});

// Initialize QR code on server start
const playerUrl = `${BASE_URL}/player`;
QRCode.toDataURL(playerUrl, (err, url) => {
  if (!err) {
    gameState.qrCodeUrl = url;
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🎰 Bingo Server running on ${BASE_URL}`);
  console.log(`📱 Player URL: ${BASE_URL}/player`);
  console.log(`🖥️  Moderator Panel: ${BASE_URL}/moderator`);
  console.log(`📺 Public Display: ${BASE_URL}/display`);
});
