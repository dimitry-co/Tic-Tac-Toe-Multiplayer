import express from 'express';                  // Import Express to serve files
import http from 'http';                        // HTTP module for creating the server
import { Server } from 'socket.io';             // Import Socket.IO for real-time communication
import path from 'path';                        // Module to handle file paths

const app = express();                          // Initialize Express app (an instance to handle HTTP routes and middleware) 
const server = http.createServer(app)           // Create an HTTP server with express. (app as the request handler. this ties express to the HTTP server)
const io = new Server(server);                  // Initializes a Socket.IO server and attaches it to the HTTP server (Enabling WebSocket and real-time communication features alongside the HTTP handling)

const PORT = process.env.PORT || 3000;          // Define the server port

// Serve static files from the 'public' directory (index.html, sript.js, styles.css)
app.use(express.static(path.resolve('public')));

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Variables to manage game state
let players = [];
let gameState = Array(9).fill(null);
let startingPlayer = 'X';
let currentPlayer = startingPlayer;

// Check for winner or draw
function checkGameEnd() {
    const winningCombo = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (const combo of winningCombo) {             // Check all winning combinations
        const [a, b, c] = combo;
        if (gameState[a] !== null &&
            gameState[a] === gameState[b] &&
            gameState[a] === gameState[c]) {
            io.emit('game-ended', {                 // Notify all clients of winner
                winner: gameState[a], 
                winningCombo: combo,
                gameState
             });
            return true;                            // Game Ended with a winner 
        }
    }
    if (!gameState.includes(null)) {                // Check for draw
        io.emit('game-ended', {                    
             winner: null,
             gameState
             });
        return true;                                // Game ended with a draw                              
    }
    return false;                                   // Game is still ongoing
}

// When a client connects
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add player if there are fewer than 2
    if (players.length < 2) {
        players.push(socket.id);
        socket.emit('player-assigned', players.length === 1 ? 'X' : 'O');     // send to the specific client the player character 'X' or 'O' (using socket.emit)
    } else {
        socket.emit('game-full');                                             // Notify if the game is full to the specific client (using socket)
    }

    // Broadcast game state when a cell is played
    socket.on('cell-played', ({ index, player }) => {
        // Check if it's the correct player's turn and the selected cell is empty
        if (currentPlayer === player && !gameState[index]) {
            gameState[index] = player;                                           // Update the game state with the player's move
            if (!checkGameEnd()) {                                               // Check for winner or draw 
                currentPlayer = player === 'X' ? 'O' : 'X';                      // switch to other player
                io.emit('update-board', { gameState, currentPlayer });           // Notify all clients by broadcasting the updated board and current player
            }

        }
    });

    // Reset the game
    socket.on('reset-game', () => {
        gameState = Array(9).fill(null);
        startingPlayer = startingPlayer === 'X' ? 'O' : 'X';                // Alternate the starting player after every reset
        currentPlayer = startingPlayer;

        // Reassign player symbols to connected players
        players.forEach((player, index) => {
            const symbol = index === 0 ? 'X' : 'O';                          // Loop the players array and assign X to first player and O to second
            io.to(player).emit('player-assigned', symbol);                   // Emit player symbol's to specific clients
        });
        io.emit('reset-game', { currentPlayer });                                               // Notify all clients to reset the
    });


    // Handle disconnect
    socket.on('player-disconnect', () => {
        console.log('User disconnected: ', socket.id);
        players = players.filter(player => player !== socket.id);           // Remove player that disconnected
        io.emit('player-disconnected');
    });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


//      Notes on socket.io:
//      - socket: Individual client communication.
//      - io: Broadcast to all connected clients.