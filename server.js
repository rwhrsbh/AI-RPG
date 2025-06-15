// Node.js сервер для мультиплеєрної DnD гри
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

// Створюємо HTTP сервер
const server = http.createServer();

// Створюємо WebSocket сервер
const wss = new WebSocket.Server({ server, maxPayload: 500 * 1024 * 1024 });

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
            const actions = Array.from(this.currentActions.entries());
            
            // Формуємо об'єкт з діями гравців
            const playerActions = {};
            const playerCharacteristics = {};
            
            actions.forEach(([playerId, action]) => {
                const player = this.players.get(playerId);
                if (player) {
                    playerActions[playerId] = {
                        action: action,
                        playerName: player.name,
                        character: player.character
                    };
                    
                    // Збираємо характеристики гравця
                    if (player.character) {
                        playerCharacteristics[playerId] = {
                            name: player.character.name || player.name,
                            class: player.character.class,
                            level: player.character.level || 1,
                            health: player.character.health,
                            maxHealth: player.character.maxHealth,
                            mana: player.character.mana,
                            maxMana: player.character.maxMana,
                            experience: player.character.experience || 0,
                            perks: player.character.perks || []
                        };
                    }
                }
            });
            
            // Відправляємо всі дії хосту для обробки через ШІ
            const hostPlayer = this.players.get(this.hostId);
            if (hostPlayer && hostPlayer.socket.readyState === WebSocket.OPEN) {
                hostPlayer.socket.send(JSON.stringify({
                    type: 'all_actions_received',
                    playerActions: playerActions,
                    playerCharacteristics: playerCharacteristics,
                    gameState: this.gameState
                }));
                console.log('Відправлено всі дії хосту для обробки через ШІ');
            }
            
            // Очищуємо дії для наступного ходу
            this.currentActions.clear();
            
        } catch (error) {
            console.error('Помилка обробки дій:', error);
            this.broadcastError('Помилка обробки дій гравців');
        }
    }

    // Обробка відповіді від ШІ, отриманої від хоста
    processAIResponse(aiResponse) {
        try {
            // Оновлюємо стан гри
            if (aiResponse.gameState) {
                this.gameState = { ...this.gameState, ...aiResponse.gameState };
            }
            
            // Відправляємо результат всім гравцям
            this.broadcastTurnResults(aiResponse);
            
            console.log('Обробка відповіді ШІ завершена, результат відправлено всім гравцям');
            
        } catch (error) {
            console.error('Помилка обробки відповіді ШІ:', error);
            this.broadcastError('Помилка обробки відповіді ШІ');
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
            
        case 'ai_response':
            handleAIResponse(playerId, message);
            break;
            
        case 'character_created':
            handleCharacterCreated(playerId, message);
            break;
            
        case 'initial_story':
            handleInitialStory(playerId, message);
            break;
            
        case 'image_share':
            handleImageShare(playerId, message);
            break;
            
        case 'kick_player':
            handleKickPlayer(playerId, message);
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
        playerId: playerId, // ИСПРАВЛЕНИЕ: Добавляем playerId в ответ
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
    
    console.log(`Гравець ${playerId} (${message.playerName}) приєднався до лобі ${message.code}`);
    
    // Спочатку відправляємо новому гравцю підтвердження приєднання
    player.socket.send(JSON.stringify({
        type: 'lobby_joined',
        code: message.code,
        playerId: playerId, // ИСПРАВЛЕНИЕ: Добавляем playerId в ответ
        players: lobby.getPlayersArray()
    }));
    
    // Потім повідомляємо всіх гравців про нового учасника
    lobby.broadcastToAll({
        type: 'player_joined',
        joiningPlayerId: playerId, // ИСПРАВЛЕНИЕ: Добавляем ID присоединяющегося игрока
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

// Обробка відповіді ШІ від хоста
function handleAIResponse(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Тільки хост може відправляти відповіді ШІ'
        }));
        return;
    }
    
    console.log(`Отримано відповідь ШІ від хоста ${playerId}`);
    
    // Обробляємо відповідь ШІ
    lobby.processAIResponse(message.aiResponse);
}

// Обробка створення персонажа
function handleCharacterCreated(playerId, message) {
    console.log(`ОТЛАДКА: Получено сообщение character_created от playerId: ${playerId}`);
    console.log(`ОТЛАДКА: Сообщение содержит playerId: ${message.playerId}`);
    console.log(`ОТЛАДКА: Персонаж: ${message.character?.name}`);
    
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Лобі не знайдено'
        }));
        return;
    }
    
    // Зберігаємо персонажа гравця
    const playerInLobby = lobby.players.get(playerId);
    if (playerInLobby) {
        playerInLobby.character = message.character;
        console.log(`Гравець ${playerId} створив персонажа: ${message.character.name}`);
        
        // Повідомляємо всіх про створення персонажа
        lobby.broadcastToAll({
            type: 'character_created',
            playerId: playerId,
            character: message.character,
            players: lobby.getPlayersArray()
        });
        
        // Перевіряємо, чи всі гравці створили персонажів
        const playersWithCharacters = Array.from(lobby.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            hasCharacter: !!p.character
        }));
        console.log('Стан персонажів:', playersWithCharacters);
        
        const allPlayersReady = Array.from(lobby.players.values()).every(p => p.character);
        console.log('Всі гравці готові:', allPlayersReady, 'Всього гравців:', lobby.players.size);
        
        if (allPlayersReady) {
            console.log('Відправляємо повідомлення про готовність усіх персонажів');
            lobby.broadcastToAll({
                type: 'all_characters_ready',
                players: lobby.getPlayersArray()
            });
        }
    }
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

// Обробка початкової історії від хоста
function handleInitialStory(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Тільки хост може відправляти початкову історію'
        }));
        return;
    }
    
    console.log(`Отримано початкову історію від хоста ${playerId}`);
    
    // Зберігаємо початкову історію в стані гри
    if (!lobby.gameState) {
        lobby.gameState = {};
    }
    lobby.gameState.initialStory = message.storyData;
    
    // Відправляємо початкову історію всім гравцям в лобі
    lobby.broadcastToAll({
        type: 'initial_story_received',
        storyData: message.storyData,
        gameState: lobby.gameState
    });
    
    console.log(`Початкова історія відправлена всім гравцям в лобі ${lobby.code}`);
}

// Обробка поділення зображенням від хоста
function handleImageShare(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Тільки хост може ділитися зображеннями'
        }));
        return;
    }
    
    console.log(`Отримано зображення від хоста ${playerId} для поділення`);
    
    // Відправляємо зображення всім гравцям в лобі (крім хоста)
    lobby.players.forEach((lobbyPlayer, lobbyPlayerId) => {
        if (lobbyPlayerId !== playerId && lobbyPlayer.socket.readyState === WebSocket.OPEN) {
            lobbyPlayer.socket.send(JSON.stringify({
                type: 'image_shared',
                imageUrl: message.imageUrl
            }));
        }
    });
    
    console.log(`Зображення відправлено всім гравцям в лобі ${lobby.code} (крім хоста)`);
}

// Обробка кика гравця хостом
function handleKickPlayer(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Тільки хост може кикати гравців'
        }));
        return;
    }
    
    const kickedPlayerId = message.playerId;
    const kickedPlayer = lobby.players.get(kickedPlayerId);
    
    if (!kickedPlayer) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Гравець не знайдений'
        }));
        return;
    }
    
    console.log(`Хост ${playerId} кикає гравця ${kickedPlayerId}`);
    
    // Повідомляємо кикнутого гравця
    if (kickedPlayer.socket.readyState === WebSocket.OPEN) {
        kickedPlayer.socket.send(JSON.stringify({
            type: 'player_kicked',
            kickedPlayerId: kickedPlayerId,
            message: 'Вас виключили з лобі'
        }));
        kickedPlayer.socket.close();
    }
    
    // Видаляємо гравця з лобі
    lobby.removePlayer(kickedPlayerId);
    
    // Видаляємо з глобального списку
    players.delete(kickedPlayerId);
    
    // Повідомляємо всіх інших гравців про кик
    lobby.broadcastToAll({
        type: 'player_kicked',
        kickedPlayerId: kickedPlayerId,
        players: lobby.getPlayersArray()
    });
    
    console.log(`Гравець ${kickedPlayerId} кикнутий з лобі ${lobby.code}`);
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