// Node.js сервер для мультиплеєрної DnD гри
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

// Створюємо HTTP сервер
const server = http.createServer();

// Створюємо WebSocket сервер
const wss = new WebSocket.Server({ server });

// Зберігання лобі та гравців
const lobbies = new Map();
const players = new Map();

class Lobby {
    constructor(code, hostId) {
        this.code = code;
        this.hostId = hostId;
        this.players = new Map();
        this.gameState = null;
        this.currentActions = new Map();
        this.isGameStarted = false;
        this.createdAt = Date.now();
    }

    addPlayer(playerId, playerData) {
        this.players.set(playerId, {
            id: playerId,
            name: playerData.name || `Гравець ${this.players.size + 1}`,
            status: 'online',
            socket: playerData.socket,
            character: playerData.character || null,
            lastAction: null,
            joinedAt: Date.now()
        });
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    getPlayersArray() {
        return Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            status: player.status,
            character: player.character
        }));
    }

    setPlayerAction(playerId, action) {
        this.currentActions.set(playerId, action);
        
        // Перевіряємо, чи всі гравці зробили дії
        if (this.currentActions.size === this.players.size) {
            this.processAllActions();
        }
    }

    async processAllActions() {
        try {
            // Збираємо всі дії
            const actions = Array.from(this.currentActions.values());
            
            // Формуємо запит до ШІ з усіма діями
            const combinedPrompt = this.buildCombinedPrompt(actions);
            
            // Тут буде виклик до API ШІ (наприклад, OpenAI)
            // Поки що симулюємо відповідь
            const aiResponse = await this.simulateAIResponse(combinedPrompt);
            
            // Обробляємо результат та оновлюємо стан гри
            this.updateGameState(aiResponse);
            
            // Відправляємо результат всім гравцям
            this.broadcastTurnResults(aiResponse);
            
            // Очищуємо дії для наступного ходу
            this.currentActions.clear();
            
        } catch (error) {
            console.error('Помилка обробки дій:', error);
            this.broadcastError('Помилка обробки дій гравців');
        }
    }

    buildCombinedPrompt(actions) {
        let prompt = 'Наступні гравці виконують дії одночасно:\n\n';
        
        actions.forEach((action, index) => {
            const player = Array.from(this.players.values())[index];
            prompt += `${player.name}: ${action}\n`;
        });
        
        prompt += '\nОпишіть результат цих дій та їх взаємодію між собою.';
        
        return prompt;
    }

    async simulateAIResponse(prompt) {
        // Симуляція відповіді ШІ
        // В реальній реалізації тут буде виклик до OpenAI API
        return {
            storyText: 'Гравці виконали свої дії. Результат буде залежати від реальної інтеграції з ШІ.',
            consequences: [],
            gameState: this.gameState
        };
    }

    updateGameState(aiResponse) {
        // Оновлюємо стан гри на основі відповіді ШІ
        if (aiResponse.gameState) {
            this.gameState = { ...this.gameState, ...aiResponse.gameState };
        }
    }

    broadcastTurnResults(results) {
        const message = {
            type: 'turn_complete',
            results: results
        };
        
        this.players.forEach(player => {
            if (player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(JSON.stringify(message));
            }
        });
    }

    broadcastToAll(message) {
        this.players.forEach(player => {
            if (player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(JSON.stringify(message));
            }
        });
    }

    broadcastError(errorMessage) {
        const message = {
            type: 'error',
            message: errorMessage
        };
        this.broadcastToAll(message);
    }

    setPlayerStatus(playerId, status) {
        const player = this.players.get(playerId);
        if (player) {
            player.status = status;
        }
    }
}

// Генерація унікального ID
function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// Генерація коду лобі
function generateLobbyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Очищення старих лобі (старіше 2 годин)
function cleanupOldLobbies() {
    const now = Date.now();
    const maxAge = 5 * 60 * 60 * 1000; // 2 години
    
    lobbies.forEach((lobby, code) => {
        if (now - lobby.createdAt > maxAge) {
            console.log(`Видалення старого лобі: ${code}`);
            lobbies.delete(code);
        }
    });
}

// Запускаємо очищення кожні 30 хвилин
setInterval(cleanupOldLobbies, 30 * 60 * 1000);

// Обробка WebSocket з'єднань
wss.on('connection', (ws) => {
    const playerId = generateId();
    players.set(playerId, { socket: ws, lobbyCode: null });
    
    console.log(`Новий гравець підключився: ${playerId}`);
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(playerId, message);
        } catch (error) {
            console.error('Помилка парсингу повідомлення:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Невірний формат повідомлення'
            }));
        }
    });
    
    ws.on('close', () => {
        handlePlayerDisconnect(playerId);
    });
    
    ws.on('error', (error) => {
        console.error(`Помилка WebSocket для гравця ${playerId}:`, error);
    });
});

// Обробка повідомлень від клієнтів
function handleMessage(playerId, message) {
    const player = players.get(playerId);
    if (!player) return;
    
    switch (message.type) {
        case 'create_lobby':
            handleCreateLobby(playerId, message);
            break;
            
        case 'join_lobby':
            handleJoinLobby(playerId, message);
            break;
            
        case 'start_game':
            handleStartGame(playerId, message);
            break;
            
        case 'player_action':
            handlePlayerAction(playerId, message);
            break;
            
        case 'leave_lobby':
            handleLeaveLobby(playerId);
            break;
            
        default:
            console.log(`Невідомий тип повідомлення: ${message.type}`);
    }
}

// Створення лобі
function handleCreateLobby(playerId, message) {
    const player = players.get(playerId);
    let lobbyCode = message.code;
    
    // Перевіряємо, чи код вже існує
    if (lobbies.has(lobbyCode)) {
        lobbyCode = generateLobbyCode();
    }
    
    const lobby = new Lobby(lobbyCode, playerId);
    lobby.addPlayer(playerId, {
        socket: player.socket,
        name: message.playerName || `Хост`
    });
    
    lobbies.set(lobbyCode, lobby);
    player.lobbyCode = lobbyCode;
    
    console.log(`Створено лобі: ${lobbyCode}`);
    
    player.socket.send(JSON.stringify({
        type: 'lobby_created',
        code: lobbyCode,
        players: lobby.getPlayersArray()
    }));
}

// Приєднання до лобі
function handleJoinLobby(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(message.code);
    
    if (!lobby) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Лобі не знайдено'
        }));
        return;
    }
    
    if (lobby.players.size >= 4) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Лобі переповнене'
        }));
        return;
    }
    
    if (lobby.isGameStarted) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Гра вже розпочата'
        }));
        return;
    }
    
    lobby.addPlayer(playerId, {
        socket: player.socket,
        name: message.playerName || `Гравець ${lobby.players.size + 1}`
    });
    
    player.lobbyCode = message.code;
    
    console.log(`Гравець ${playerId} приєднався до лобі ${message.code}`);
    
    // Повідомляємо всіх гравців про нового учасника
    lobby.broadcastToAll({
        type: 'player_joined',
        players: lobby.getPlayersArray()
    });
}

// Початок гри
function handleStartGame(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Тільки хост може розпочати гру'
        }));
        return;
    }
    
    if (lobby.players.size < 2) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Потрібно мінімум 2 гравці для початку гри'
        }));
        return;
    }
    
    lobby.isGameStarted = true;
    lobby.gameState = message.gameState || {};
    
    console.log(`Гра розпочата в лобі ${player.lobbyCode}`);
    
    lobby.broadcastToAll({
        type: 'game_started',
        gameState: lobby.gameState,
        players: lobby.getPlayersArray()
    });
}

// Обробка дії гравця
function handlePlayerAction(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || !lobby.isGameStarted) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Гра не розпочата'
        }));
        return;
    }
    
    console.log(`Отримано дію від гравця ${playerId}: ${message.action}`);
    
    lobby.setPlayerAction(playerId, message.action);
    
    // Повідомляємо всіх про отримання дії
    lobby.broadcastToAll({
        type: 'action_received',
        actions: Object.fromEntries(lobby.currentActions),
        players: lobby.getPlayersArray()
    });
}

// Покинути лобі
function handleLeaveLobby(playerId) {
    const player = players.get(playerId);
    if (!player.lobbyCode) return;
    
    const lobby = lobbies.get(player.lobbyCode);
    if (!lobby) return;
    
    lobby.removePlayer(playerId);
    player.lobbyCode = null;
    
    console.log(`Гравець ${playerId} покинув лобі`);
    
    // Якщо лобі порожнє, видаляємо його
    if (lobby.players.size === 0) {
        lobbies.delete(lobby.code);
        console.log(`Лобі ${lobby.code} видалено`);
    } else {
        // Якщо хост покинув лобі, призначаємо нового хоста
        if (lobby.hostId === playerId) {
            const newHost = lobby.players.values().next().value;
            lobby.hostId = newHost.id;
            console.log(`Новий хост лобі ${lobby.code}: ${newHost.id}`);
        }
        
        // Повідомляємо інших гравців
        lobby.broadcastToAll({
            type: 'player_left',
            players: lobby.getPlayersArray()
        });
    }
}

// Обробка відключення гравця
function handlePlayerDisconnect(playerId) {
    console.log(`Гравець відключився: ${playerId}`);
    
    const player = players.get(playerId);
    if (player && player.lobbyCode) {
        const lobby = lobbies.get(player.lobbyCode);
        if (lobby) {
            lobby.setPlayerStatus(playerId, 'offline');
            
            // Повідомляємо інших гравців про відключення
            lobby.broadcastToAll({
                type: 'player_disconnected',
                playerId: playerId,
                players: lobby.getPlayersArray()
            });
        }
    }
    
    players.delete(playerId);
}

// Запуск сервера
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🎮 Мультиплеєрний сервер DnD запущено на порту ${PORT}`);
    console.log(`📡 WebSocket сервер готовий до підключень`);
    console.log(`🔗 Підключайтеся через: ws://localhost:${PORT}`);
});

// Обробка сигналів завершення
process.on('SIGINT', () => {
    console.log('\n🛑 Зупинка сервера...');
    
    // Повідомляємо всіх клієнтів про зупинку
    players.forEach(player => {
        if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify({
                type: 'server_shutdown',
                message: 'Сервер зупиняється'
            }));
            player.socket.close();
        }
    });
    
    server.close(() => {
        console.log('✅ Сервер зупинено');
        process.exit(0);
    });
});

// Експорт для тестування
module.exports = { server, wss, lobbies, players };