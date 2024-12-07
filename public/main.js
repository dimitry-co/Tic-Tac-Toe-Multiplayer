import { io } from './socket.io/socket.io.esm.min.js';

const socket = io(); // Connect to the server using Socket.IO

const ticTacToe = {
    board: document.getElementById('board'),
    winnerDiv: document.getElementById('winner'),
    restartButton: document.getElementById('restart'),
    statusDisplay: document.querySelector('.game--status'),

    gameState: Array(9).fill(null),
    currentPlayer: 'X',
    playerSymbol: null,                                                                    // Player assigned by the server
    gameActive: true,
    winningCombos: [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ],

    currentPlayerTurn: function () {
        this.statusDisplay.innerHTML = 
            this.currentPlayer === this.playerSymbol ? 
            "It's Your turn!" : 
            `It's ${this.currentPlayer}'s turn`;
    },
    winningMessage: function () {
        this.statusDisplay.innerHTML = 
            this.currentPlayer === this.playerSymbol ? 
            "You have won! :p" : 
            `You Lost... Player ${this.currentPlayer} has won!`;
    },
    drawMessage: function () {
        this.statusDisplay.innerHTML = `It's a draw!`;
    },
    playerAssignedMessage: function () {
        if (this.playerSymbol === null) return;                                             // Exit if playerSymbol is not assigned yet

        this.statusDisplay.innerHTML = 
            this.currentPlayer === this.playerSymbol ? 
            `You are Player ${this.currentPlayer}. It's your turn!` : 
            `Your are Player ${this.playerSymbol}. It's player ${this.currentPlayer}'s turn`;
    },

    // Dynamically create the board (9 cells for the 3x3 grid)
    createBoard() {
        this.board.classList.remove('game-ended');                                          // Remove the 'game-ended' class from the board if it was added
        this.board.innerHTML = '';                                                          // Clear the board container. Remove dynamically created cells
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');                                     // create a new div element for each cell
            cell.classList.add('cell');                                                     // add 'cell' class for css styling
            cell.dataset.index = i;                                                         // Assign a unique index to each cell using a data attribute
            cell.addEventListener('click', (event) => this.handleCellClick(event));         // Add click event listener to each cell
            this.board.appendChild(cell);                                                   // Append the cell to the board
        }
    },

    // Update the board UI based on game state, by modifying the text content and CSS classes of the board cells
    updateUI() {
        Array.from(this.board.children).forEach((cell, index) => {                          // cell: current element in the iteration, Index: the position of the current cell in the Array. this.board.children gives a live HTMLCollection of all direct child elements of this.board. Array.from converts the HTMLCollection into an array, which allows use forEach
            cell.textContent = this.gameState[index]                                        // update cell content Based on game state
            cell.classList.toggle('taken', this.gameState[index] !== null);                 // Mark taken cells (add or removes 'taken' class based on whether the cell is occupied)
        });
        this.currentPlayerTurn();                            // Update player turn display
    },

    handleCellClick(event) {
        const clickedCell = event.target;                                                   // Get the clicked cell element
        const clickedCellIndex = parseInt(clickedCell.dataset.index, 10);                   // retrieve cell index from data-index attribute, and convert to a number

        // Prevent moves If:  1.the cell is taken  2.the game is inactive  3.it's not client's turn
        if (this.gameState[clickedCellIndex] ||
            !this.gameActive ||
            this.currentPlayer !== this.playerSymbol) return;

        // Emit the move to the server
        socket.emit('cell-played', { index: clickedCellIndex, player: this.playerSymbol });
    },

    // Reset the game state
    resetGame() {
        this.gameState = Array(9).fill(null);                                               // Reset game state
        this.gameActive = true;                                                       // reset current player to starting player 
        this.createBoard();                                                                 // Dynamically recreate the board
        this.playerAssignedMessage();                                        // Update the status display
    },

    // Initializes the game and sets up Socket.IO listeners
    initialize() {
        this.createBoard();                                                                 // Dynamically create the board on load
        this.restartButton.addEventListener('click', () => {                                  // Add click listener to the reset button
            socket.emit('reset-game');                                                      // Notify the server to reset the game
        })
    },
};

// Ensure initialization happens only after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    ticTacToe.initialize(); // Initialize the game
});

// Assign the player symbol when connected
socket.on('player-assigned', (symbol) => {
    ticTacToe.playerSymbol = symbol;
    ticTacToe.playerAssignedMessage();
});

socket.on('game-full', () => {
    console.log('The game is full. Try again later.');
    ticTacToe.statusDisplay.innerHTML = 'The Game is full. Try again later.';
});

// Update the board when a move is made
socket.on('update-board', ({ gameState, currentPlayer }) => {
    ticTacToe.gameState = gameState;
    ticTacToe.currentPlayer = currentPlayer;
    ticTacToe.updateUI();
});

// Handle Game end (winner or draw)
socket.on('game-ended', ({ winner, winningCombo, gameState }) => {
    ticTacToe.gameState = gameState;                                                        // Update local game state
    ticTacToe.updateUI();                                                                   // update the board to reflect the final move

    ticTacToe.gameActive = false;                                                           // Deactivate the game locally
    ticTacToe.board.classList.add('game-end');                                              // Add class to disable hover
    if (winner) {
        // Highlight winning cells
        winningCombo.forEach(index => {                                                     // iterate over the indices in the winning combination
            const cell = ticTacToe.board.querySelector(`[data-index='${index}']`);          // select the cell corresponding to the current index
            cell.classList.add('winning');                                                  // Add 'winning' class to highlight the cell
        });
        ticTacToe.winningMessage();
    } else {
        // Handle draw case
        ticTacToe.drawMessage();
    }
});

// Handle game Reset
socket.on('reset-game', ({ currentPlayer }) => {
    ticTacToe.currentPlayer = currentPlayer;
    ticTacToe.resetGame();
});

// Notify when a player has disconnected
socket.on('player-disconnected', () => {
    console.log('A player has disconnected.');
    ticTacToe.statusDisplay.innerHTML = 'A player hasa disconnected. Waiting for reconnection..';
});