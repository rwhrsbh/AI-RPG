// Node.js сервер для мультиплеєрної DnD гри
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

// Створюємо HTTP сервер
const server = http.createServer();

// Створюємо WebSocket сервер
const wss = new WebSocket.Server({ server, maxPayload: 456 * 1024 * 1024 });

// Зберігання лобі та гравців
const lobbies = new Map();
const players = new Map();

// Таймеры ожидания переподключения хостов
const hostReconnectionTimers = new Map();

class Lobby {
    constructor(code, hostId) {
        this.code = code;
        this.hostId = hostId;
        this.players = new Map();
        this.gameState = null;
        this.currentActions = new Map();
        this.isGameStarted = false;
        this.createdAt = Date.now();
        // Добавляем хранение последней сцены для переподключений
        this.lastScene = null;
        this.lastResults = null;
        // Добавляем хранение данных загруженной игры
        this.loadedGameData = null;
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
        
        // ИСПРАВЛЕНИЕ: Проверяем только онлайн игроков вместо всех игроков
        const onlinePlayersCount = Array.from(this.players.values()).filter(p => p.status === 'online').length;
        console.log(`📊 Действие от ${playerId}: ${this.currentActions.size}/${onlinePlayersCount} онлайн игроков сделали действия`);
        
        if (this.currentActions.size === onlinePlayersCount) {
            console.log(`✅ Все онлайн игроки сделали действия, запускаем обработку`);
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
            // Відправляємо результат всім гравцям (без gameState - он больше не нужен)
            this.broadcastTurnResults(aiResponse);
            
            console.log('Обробка відповіді ШІ завершена, результат відправлено всім гравцям');
            
        } catch (error) {
            console.error('Помилка обробки відповіді ШІ:', error);
            this.broadcastError('Помилка обробки відповіді ШІ');
        }
    }

    broadcastTurnResults(results) {
        // Сохраняем последние результаты для переподключений
        this.lastResults = results;
        
        this.players.forEach((player, playerId) => {
            if (player.socket.readyState === WebSocket.OPEN) {
                // Отправляем результаты без фильтрации - gameState больше не передается
                const message = {
                    type: 'turn_complete',
                    results: results
                };
                
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

// Очищення старих лобі (старіше 5 годин)
function cleanupOldLobbies() {
    const now = Date.now();
    const maxAge = 5 * 60 * 60 * 1000; // 5 годин
    
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
    // Временный ID до получения постоянного ID от клиента
    const tempId = generateId();
    players.set(tempId, { socket: ws, lobbyCode: null, isTemporary: true });
    
    // Отслеживаем актуальный ID для этого соединения
    let currentPlayerId = tempId;
    
    console.log(`Новое временное подключение: ${tempId}`);
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const result = handleMessage(currentPlayerId, message, ws);
            
            // Если ID был обновлен, сохраняем новый ID
            if (result && result.newPlayerId) {
                currentPlayerId = result.newPlayerId;
            }
        } catch (error) {
            console.error('Помилка парсингу повідомлення:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Невірний формат повідомлення'
            }));
        }
    });
    
    ws.on('close', () => {
        handlePlayerDisconnect(currentPlayerId);
    });
    
    ws.on('error', (error) => {
        console.error(`Помилка WebSocket для гравця ${currentPlayerId}:`, error);
    });
});

// Обробка повідомлень від клієнтів
function handleMessage(currentPlayerId, message, ws) {
    // Получаем игрока по текущему ID
    let player = players.get(currentPlayerId);
    let actualPlayerId = currentPlayerId;
    let playerIdChanged = false;
    
    // Если это сообщение с постоянным ID, обновляем маппинг
    if (message.playerId && player && player.isTemporary) {
        actualPlayerId = message.playerId;
        console.log(`Обновляем временный ID ${currentPlayerId} на постоянный ${actualPlayerId}`);
        
        // Перемещаем игрока на постоянный ID
        players.delete(currentPlayerId);
        players.set(actualPlayerId, { 
            socket: ws, 
            lobbyCode: player.lobbyCode,
            isTemporary: false 
        });
        player = players.get(actualPlayerId);
        playerIdChanged = true;
    }
    
    if (!player) return;
    
    switch (message.type) {
        case 'create_lobby':
            handleCreateLobby(actualPlayerId, message);
            break;
            
        case 'join_lobby':
            handleJoinLobby(actualPlayerId, message);
            break;
            
        case 'start_game':
            handleStartGame(actualPlayerId, message);
            break;
            
        case 'start_loaded_game':
            handleStartLoadedGame(actualPlayerId, message);
            break;
            
        case 'player_action':
            handlePlayerAction(actualPlayerId, message);
            break;
            
        case 'leave_lobby':
            handleLeaveLobby(actualPlayerId);
            break;
            
        case 'reconnect_host':
            handleHostReconnect(actualPlayerId, message);
            break;
            
        case 'ai_response':
            handleAIResponse(actualPlayerId, message);
            break;
            
        case 'character_created':
            handleCharacterCreated(actualPlayerId, message);
            break;
            
        case 'initial_story':
            handleInitialStory(actualPlayerId, message);
            break;
            
        case 'image_share':
            handleImageShare(actualPlayerId, message);
            break;
            
        case 'kick_player':
            handleKickPlayer(actualPlayerId, message);
            break;
            
        case 'ping':
            handlePing(actualPlayerId, message);
            break;
            
        case 'reset_turn_state':
            handleResetTurnState(actualPlayerId, message);
            break;
            
        case 'ai_error':
            handleAIError(actualPlayerId, message);
            break;
            
        case 'take_over_character':
            const takeOverResult = handleTakeOverCharacter(actualPlayerId, message);
            if (takeOverResult && takeOverResult.newPlayerId) {
                actualPlayerId = takeOverResult.newPlayerId;
                playerIdChanged = true;
            }
            break;
            
        case 'create_recovery_lobby':
            handleCreateRecoveryLobby(actualPlayerId, message);
            break;
            
        case 'set_loaded_game_data':
            handleSetLoadedGameData(actualPlayerId, message);
            break;
            
        default:
            console.log(`Невідомий тип повідомлення: ${message.type}`);
    }
    
    // Возвращаем информацию об изменении ID
    return playerIdChanged ? { newPlayerId: actualPlayerId } : null;
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
    
    // Проверяем, есть ли загруженные данные игры
    console.log('🔍 Проверка загруженных данных для лобби:', message.code, 'loadedGameData:', !!lobby.loadedGameData);
    if (lobby.loadedGameData) {
        console.log('📋 Игрок присоединяется к лобби с загруженной игрой');
        console.log('👥 Доступные персонажи:', Object.keys(lobby.loadedGameData.playersData || {}));
        
        // Проверяем, есть ли персонаж для этого игрока в сохранении
        const playerDataFromSave = lobby.loadedGameData.playersData[playerId];
        const isHostPlayer = lobby.hostId === playerId;
        
        console.log(`🔍 Игрок ${playerId}: есть в сохранении: ${!!playerDataFromSave}, является хостом: ${isHostPlayer}`);
        
        if (playerDataFromSave && !isHostPlayer) {
            // У игрока есть персонаж в сохранении - автоматически назначаем его
            console.log(`🎭 Автоматически назначаем персонажа ${playerDataFromSave.character.name} игроку ${playerId}`);
            
            lobby.addPlayer(playerId, {
                socket: player.socket,
                name: message.playerName || playerDataFromSave.character.name,
                status: 'online',
                character: playerDataFromSave.character
            });
            
            player.lobbyCode = message.code;
            
            // Уведомляем игрока о назначении персонажа
            player.socket.send(JSON.stringify({
                type: 'character_assigned',
                character: playerDataFromSave.character,
                playerId: playerId,
                message: `Добро пожаловать обратно, ${playerDataFromSave.character.name}!`
            }));
            
        } else if (!isHostPlayer) {
            // У игрока нет персонажа в сохранении - показываем выбор
            console.log(`📋 Показываем выбор персонажей игроку ${playerId}`);
            
            lobby.addPlayer(playerId, {
                socket: player.socket,
                name: message.playerName || `Гравець ${lobby.players.size + 1}`,
                status: 'selecting_character'
            });
            
            player.lobbyCode = message.code;
            
            // Отправляем доступные персонажи (исключая хоста и уже занятых)
            const availableCharacters = {};
            Object.entries(lobby.loadedGameData.playersData || {}).forEach(([originalPlayerId, playerData]) => {
                // Исключаем хоста и уже присоединившихся игроков
                const isOccupied = lobby.players.has(originalPlayerId) && lobby.players.get(originalPlayerId).status === 'online';
                if (originalPlayerId !== lobby.hostId && !isOccupied) {
                    availableCharacters[originalPlayerId] = playerData;
                }
            });
            
            player.socket.send(JSON.stringify({
                type: 'loaded_game_characters_available',
                characters: availableCharacters,
                hostCharacter: lobby.loadedGameData.hostCharacter,
                lastStory: lobby.loadedGameData.lastStory,
                lastImage: lobby.loadedGameData.lastImage
            }));
        }
        
        console.log(`Гравець ${playerId} (${message.playerName}) приєднався до лобі з загруженою грою ${message.code}`);
        
        // Уведомляем всех игроков (включая хоста) о новом игроке
        lobby.players.forEach((lobbyPlayer, lobbyPlayerId) => {
            if (lobbyPlayer.socket.readyState === 1) {
                lobbyPlayer.socket.send(JSON.stringify({
                    type: 'player_joined',
                    joiningPlayerId: playerId,
                    players: lobby.getPlayersArray()
                }));
            }
        });
        
        return;
    } else {
        console.log('⏳ Лобби пока без загруженных данных игры, игрок будет ждать');
    }
    
    if (lobby.isGameStarted) {
        // Если игра началась, предлагаем выбор отключенных персонажей
        const offlineCharacters = Array.from(lobby.players.values()).filter(p => p.status === 'offline' && p.character);
        
        if (offlineCharacters.length === 0) {
            player.socket.send(JSON.stringify({
                type: 'error',
                message: 'Игра уже началась и нет доступных персонажей для подключения'
            }));
            return;
        }
        
        // Отправляем список доступных персонажей
        player.socket.send(JSON.stringify({
            type: 'character_selection_required',
            lobbyCode: message.code,
            availableCharacters: offlineCharacters.map(p => ({
                id: p.id,
                name: p.name,
                character: p.character
            }))
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
    
    // Для НОВЫХ игр - считаем всех игроков (персонажи создаются после старта)
    // Для ЗАГРУЖЕННЫХ игр - считаем только игроков с персонажами
    if (lobby.loadedGameData) {
        // Логика для загруженных игр
        const playersWithCharacters = Array.from(lobby.players.values()).filter(p => p.character);
        console.log(`🎮 Проверка готовности ЗАГРУЖЕННОЙ игры: всего игроков ${lobby.players.size}, с персонажами ${playersWithCharacters.length}`);
        console.log(`👥 Игроки с персонажами:`, playersWithCharacters.map(p => `${p.name} (${p.character?.name})`));
        
        if (playersWithCharacters.length < 2) {
            player.socket.send(JSON.stringify({
                type: 'error',
                message: `Для загруженной игры нужно минимум 2 игрока с персонажами. Сейчас готовы: ${playersWithCharacters.length}`
            }));
            return;
        }
    } else {
        // Логика для новых игр
        console.log(`🎮 Проверка готовности НОВОЙ игры: всего игроков ${lobby.players.size}`);
        console.log(`👥 Все игроки:`, Array.from(lobby.players.values()).map(p => p.name));
        
        if (lobby.players.size < 2) {
            player.socket.send(JSON.stringify({
                type: 'error',
                message: `Потрібно мінімум 2 гравці. Зараз в лобі: ${lobby.players.size}`
            }));
            return;
        }
    }
    
    lobby.isGameStarted = true;
    
    console.log(`Гра розпочата в лобі ${player.lobbyCode}`);
    console.log(`Кількість гравців у лобі: ${lobby.players.size}`);
    
    const gameStartMessage = {
        type: 'game_started',
        language: message.language || 'uk',
        isMultiplayer: true,
        hostApiKey: message.hostApiKey,
        shortResponses: message.shortResponses || false,
        players: lobby.getPlayersArray()
    };
    
    console.log(`Відправляємо game_started всім гравцям:`, gameStartMessage);
    lobby.broadcastToAll(gameStartMessage);
}

// Обробка начала загруженной игры
function handleStartLoadedGame(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Тільки хост може розпочати гру'
        }));
        return;
    }
    
    if (!lobby.loadedGameData) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Дані завантаженої гри не знайдено'
        }));
        return;
    }
    
    // Для загруженной игры не нужна проверка на минимум игроков - хост может играть один
    lobby.isGameStarted = true;
    
    console.log(`🔄 Загруженная игра запущена в лобби ${player.lobbyCode}`);
    console.log(`👥 Игроков в лобби: ${lobby.players.size}`);
    
    // Отправляем специальное сообщение о начале загруженной игры
    const loadedGameStartMessage = {
        type: 'loaded_game_started',
        language: message.language || 'uk',
        isLoadedGame: true,
        hostApiKey: message.hostApiKey,
        shortResponses: message.shortResponses || false,
        players: lobby.getPlayersArray(),
        gameData: lobby.loadedGameData
    };
    
    console.log(`📤 Отправляем loaded_game_started всем игрокам (${lobby.players.size} игроков)`);
    lobby.players.forEach((player, playerId) => {
        console.log(`  🔸 Отправка игроку ${playerId} (${player.name}): статус ${player.status}`);
    });
    lobby.broadcastToAll(loadedGameStartMessage);
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
        // Повідомляємо інших гравців про вихід
        lobby.broadcastToAll({
            type: 'player_left',
            leavingPlayerId: playerId,
            players: lobby.getPlayersArray()
        });
        
        // Якщо хост покинув лобі, закриваємо лобі (оскільки не можна передавати хост)
        if (lobby.hostId === playerId) {
            console.log(`🚨 Хост ${playerId} покинув лобі ${lobby.code}, закриваємо лобі`);
            
            // Уведомляємо всех о закрытии лобби
            lobby.broadcastToAll({
                type: 'lobby_closed_host_left',
                message: 'Хост покинув лобі. Лобі закрито.',
                leavingHostId: playerId
            });
            
            // Закрываем все соединения в лобби
            lobby.players.forEach((player, pId) => {
                if (pId !== playerId && player.socket && player.socket.readyState === WebSocket.OPEN) {
                    player.socket.close();
                }
                // Удаляем игрока из глобального списка
                if (pId !== playerId) {
                    players.delete(pId);
                }
            });
            
            // Удаляем лобби
            lobbies.delete(lobby.code);
            console.log(`🗑️ Лобі ${lobby.code} видалено через вихід хоста`);
        }
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

// Обробка пінгу від клієнта
function handlePing(playerId, message) {
    const player = players.get(playerId);
    if (!player || !player.socket || player.socket.readyState !== WebSocket.OPEN) {
        console.warn(`⚠️ Не удалось отправить понг игроку ${playerId}: игрок не найден или соединение закрыто`);
        return;
    }
    
    // Отвечаем понгом на пинг
    player.socket.send(JSON.stringify({
        type: 'pong',
        timestamp: message.timestamp || Date.now()
    }));
    
    console.log(`📡 Отправлен понг игроку ${playerId}`);
}

// Обработка сброса состояния хода
function handleResetTurnState(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Только хост может сбрасывать состояние хода'
        }));
        return;
    }
    
    console.log(`🔄 Хост ${playerId} сбрасывает состояние хода в лобби ${lobby.code}`);
    
    // Очищаем все ожидающие действия
    lobby.currentActions.clear();
    
    // Уведомляем всех игроков о сбросе состояния
    lobby.broadcastToAll({
        type: 'turn_state_reset',
        message: 'Состояние хода сброшено, можете выполнить новые действия'
    });
}

// Обработка ошибки AI
function handleAIError(playerId, message) {
    const player = players.get(playerId);
    const lobby = lobbies.get(player.lobbyCode);
    
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Только хост может отправлять уведомления об ошибках AI'
        }));
        return;
    }
    
    console.log(`❌ Ошибка AI в лобби ${lobby.code}: ${message.message}`);
    
    // Очищаем состояние действий
    lobby.currentActions.clear();
    
    // Уведомляем всех игроков об ошибке
    lobby.broadcastToAll({
        type: 'ai_error_notification',
        message: message.message
    });
}

// Обработка взятия управления отключенным персонажем
function handleTakeOverCharacter(newPlayerId, message) {
    const newPlayer = players.get(newPlayerId);
    
    if (!newPlayer || !newPlayer.lobbyCode) {
        newPlayer?.socket.send(JSON.stringify({
            type: 'error',
            message: 'Игрок не в лобби'
        }));
        return;
    }
    
    const lobby = lobbies.get(newPlayer.lobbyCode);
    
    if (!lobby) {
        newPlayer.socket.send(JSON.stringify({
            type: 'error',
            message: 'Лобі не знайдено'
        }));
        return;
    }
    
    const targetPlayerId = message.originalPlayerId;
    console.log(`🎯 Попытка взять персонажа с ID: ${targetPlayerId}`);
    console.log(`👥 Все игроки в лобби:`, Array.from(lobby.players.entries()).map(([id, player]) => `${id}: ${player.name} (${player.status})`));
    
    // Проверяем, есть ли этот персонаж в данных загруженной игры
    if (!lobby.loadedGameData || !lobby.loadedGameData.playersData[targetPlayerId]) {
        console.log(`❌ Персонаж с ID ${targetPlayerId} не найден в данных загруженной игры`);
        newPlayer.socket.send(JSON.stringify({
            type: 'error',
            message: 'Персонаж не знайдено'
        }));
        return;
    }
    
    // Проверяем, не занят ли уже этот персонаж
    const isOccupied = lobby.players.has(targetPlayerId) && lobby.players.get(targetPlayerId).status === 'online';
    if (isOccupied) {
        console.log(`❌ Персонаж ${targetPlayerId} уже занят другим игроком`);
        newPlayer.socket.send(JSON.stringify({
            type: 'error',
            message: 'Цей персонаж вже зайнятий'
        }));
        return;
    }
    
    // Проверяем, не пытается ли игрок взять персонажа хоста
    if (targetPlayerId === lobby.hostId) {
        console.log(`❌ Игрок пытается взять персонажа хоста`);
        newPlayer.socket.send(JSON.stringify({
            type: 'error',
            message: 'Неможливо взяти персонажа хоста'
        }));
        return;
    }
    
    console.log(`🎭 Игрок ${newPlayerId} берет персонажа ${targetPlayerId} в лобби ${lobby.code}`);
    
    // Получаем данные персонажа из сохранения
    const characterData = lobby.loadedGameData.playersData[targetPlayerId];
    
    // Обновляем данные текущего игрока - он принимает личность выбранного персонажа
    const currentPlayer = lobby.players.get(newPlayerId);
    currentPlayer.character = characterData.character;
    currentPlayer.status = 'online';
    
    // Удаляем старый ID игрока и создаем новый с ID персонажа
    lobby.players.delete(newPlayerId);
    lobby.players.set(targetPlayerId, {
        id: targetPlayerId,
        name: characterData.character.name,
        status: 'online',
        socket: newPlayer.socket,
        character: characterData.character,
        lastAction: null,
        joinedAt: Date.now()
    });
    
    // Обновляем глобальное подключение
    newPlayer.lobbyCode = lobby.code;
    
    // Удаляем старое подключение и добавляем новое с ID целевого персонажа
    players.delete(newPlayerId);
    players.set(targetPlayerId, {
        socket: newPlayer.socket,
        lobbyCode: lobby.code,
        isTemporary: false
    });
    
    // Отправляем подтверждение новому игроку
    newPlayer.socket.send(JSON.stringify({
        type: 'character_assigned',
        character: characterData.character,
        playerId: targetPlayerId,
        message: `Вы играете за ${characterData.character.name}`
    }));
    
    // Уведомляем всех игроков об обновлении списка
    lobby.players.forEach((player, playerId) => {
        if (player.socket && player.socket.readyState === 1) {
            player.socket.send(JSON.stringify({
                type: 'player_joined',
                joiningPlayerId: targetPlayerId,
                players: lobby.getPlayersArray()
            }));
        }
    });
    
    console.log(`Персонаж ${targetPlayerId} теперь управляется игроком ${newPlayerId}`);
    
    // Возвращаем новый ID для обновления currentPlayerId в WebSocket
    return { newPlayerId: targetPlayerId };
}

// Создание восстановительного лобби с сохранением игровых данных
function handleCreateRecoveryLobby(playerId, message) {
    const player = players.get(playerId);
    
    if (!player) {
        return;
    }
    
    console.log(`🔄 Создание восстановительного лобби игроком ${playerId}`);
    
    // Генерируем новый код лобби
    let newLobbyCode = generateLobbyCode();
    while (lobbies.has(newLobbyCode)) {
        newLobbyCode = generateLobbyCode();
    }
    
    // Создаем новое лобби
    const recoveryLobby = new Lobby(newLobbyCode, playerId);
    recoveryLobby.isGameStarted = true; // Помечаем как начатую игру
    
    // Добавляем всех игроков из переданных данных
    if (message.gameData && message.gameData.players) {
        message.gameData.players.forEach(playerData => {
            // Добавляем игрока как offline (кроме создателя лобби)
            const status = playerData.id === playerId ? 'online' : 'offline';
            const socket = playerData.id === playerId ? player.socket : null;
            
            recoveryLobby.players.set(playerData.id, {
                id: playerData.id,
                name: playerData.name,
                status: status,
                socket: socket,
                character: playerData.character,
                lastAction: null,
                joinedAt: Date.now()
            });
        });
    }
    
    // Сохраняем лобби
    lobbies.set(newLobbyCode, recoveryLobby);
    player.lobbyCode = newLobbyCode;
    
    console.log(`✅ Восстановительное лобби создано: ${newLobbyCode} с ${recoveryLobby.players.size} игроками`);
    
    // Отправляем подтверждение создателю
    player.socket.send(JSON.stringify({
        type: 'recovery_lobby_created',
        code: newLobbyCode,
        playerId: playerId,
        players: recoveryLobby.getPlayersArray(),
        gameStarted: true,
        originalLobbyCode: message.originalLobbyCode
    }));
}

// Обробка відключення гравця
function handlePlayerDisconnect(playerId) {
    console.log(`Гравець відключився: ${playerId}`);
    
    const player = players.get(playerId);
    if (player && player.lobbyCode) {
        const lobby = lobbies.get(player.lobbyCode);
        if (lobby) {
            // Проверяем, был ли это хост
            const isHost = lobby.hostId === playerId;
            
            // Обновляем статус игрока на offline, но НЕ удаляем его из лобби
            lobby.setPlayerStatus(playerId, 'offline');
            
            if (isHost && lobby.isGameStarted) {
                // Хост отключился во время активной игры
                console.log(`🚨 Хост ${playerId} отключился во время игры в лобби ${lobby.code}`);
                
                // Запускаем 2-минутный таймер ожидания возвращения хоста
                startHostReconnectionTimer(lobby, playerId);
                
                // Уведомляем всех игроков о отключении хоста и запуске таймера
                lobby.broadcastToAll({
                    type: 'host_disconnected',
                    disconnectedHostId: playerId,
                    players: lobby.getPlayersArray(),
                    gameStarted: lobby.isGameStarted,
                    countdownStarted: true,
                    countdownDuration: 120, // 2 минуты в секундах
                    gameState: {
                        players: Array.from(lobby.players.values()).map(p => ({
                            id: p.id,
                            name: p.name,
                            character: p.character,
                            status: p.status
                        })),
                        lobbyCode: lobby.code
                    }
                });
            } else {
                // Обычное отключение игрока (не хоста или хоста до начала игры)
                lobby.broadcastToAll({
                    type: 'player_disconnected',
                    playerId: playerId,
                    players: lobby.getPlayersArray(),
                    gameStarted: lobby.isGameStarted
                });
            }
            
            console.log(`Игрок ${playerId} отключен, но персонаж сохранен в лобби для возможного переподключения`);
        }
    }
    
    // Удаляем только из глобального списка активных подключений
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

// Функция запуска таймера ожидания переподключения хоста
function startHostReconnectionTimer(lobby, disconnectedHostId) {
    const lobbyCode = lobby.code;
    
    console.log(`⏰ Запуск 2-минутного таймера ожидания хоста ${disconnectedHostId} в лобби ${lobbyCode}`);
    
    // Очищаем предыдущий таймер если он есть
    if (hostReconnectionTimers.has(lobbyCode)) {
        clearTimeout(hostReconnectionTimers.get(lobbyCode));
    }
    
    const timer = setTimeout(() => {
        console.log(`⏰ Время ожидания хоста истекло для лобби ${lobbyCode}`);
        
        // Удаляем таймер из карты
        hostReconnectionTimers.delete(lobbyCode);
        
        // Проверяем, вернулся ли хост
        const hostPlayer = lobby.players.get(disconnectedHostId);
        if (!hostPlayer || hostPlayer.status !== 'online') {
            console.log(`❌ Хост ${disconnectedHostId} не вернулся, кикаем всех из лобби ${lobbyCode}`);
            
            // Уведомляем всех игроков о закрытии лобби
            lobby.broadcastToAll({
                type: 'lobby_closed_host_timeout',
                message: 'Хост не вернулся в течение 2 минут. Лобби закрывается.',
                disconnectedHostId: disconnectedHostId
            });
            
            // Закрываем все соединения в лобби
            lobby.players.forEach((player, playerId) => {
                if (player.socket && player.socket.readyState === WebSocket.OPEN) {
                    player.socket.close();
                }
                // Удаляем игрока из глобального списка
                players.delete(playerId);
            });
            
            // Удаляем лобби
            lobbies.delete(lobbyCode);
            console.log(`🗑️ Лобби ${lobbyCode} удалено из-за неявки хоста`);
        } else {
            console.log(`✅ Хост ${disconnectedHostId} вернулся в лобби ${lobbyCode}`);
        }
    }, 120000); // 2 минуты = 120000 мс
    
    // Сохраняем таймер
    hostReconnectionTimers.set(lobbyCode, timer);
}

// Функция отмены таймера при возвращении хоста
function cancelHostReconnectionTimer(lobbyCode, hostId) {
    if (hostReconnectionTimers.has(lobbyCode)) {
        clearTimeout(hostReconnectionTimers.get(lobbyCode));
        hostReconnectionTimers.delete(lobbyCode);
        console.log(`✅ Таймер ожидания хоста отменен для лобби ${lobbyCode} - хост ${hostId} вернулся`);
        return true;
    }
    return false;
}

// Обработка переподключения хоста
function handleHostReconnect(playerId, message) {
    const player = players.get(playerId);
    const lobbyCode = message.lobbyCode;
    
    if (!player || !lobbyCode) {
        player?.socket.send(JSON.stringify({
            type: 'error',
            message: 'Неверные данные для переподключения хоста'
        }));
        return;
    }
    
    // Проверяем существование лобби
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Лобби не найдено или срок его действия истек'
        }));
        return;
    }
    
    // Проверяем, является ли игрок хостом этого лобби
    if (lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Вы не являетесь хостом этого лобби'
        }));
        return;
    }
    
    // Переподключение успешно
    player.lobbyCode = lobbyCode;
    
    // ИСПРАВЛЕНИЕ: Обновляем статус хоста в лобби на "online"
    const hostPlayerInLobby = lobby.players.get(playerId);
    if (hostPlayerInLobby) {
        hostPlayerInLobby.status = 'online';
        hostPlayerInLobby.socket = player.socket;
        console.log(`✅ Статус хоста ${playerId} обновлен на "online" в лобби ${lobbyCode}`);
    }
    
    // Отменяем таймер ожидания хоста если он есть
    cancelHostReconnectionTimer(lobbyCode, playerId);
    
    // Сохраняем информацию о текущих действиях для передачи хосту
    const currentActionsData = {};
    const playersWithActions = [];
    lobby.currentActions.forEach((action, playerId) => {
        const player = lobby.players.get(playerId);
        if (player) {
            currentActionsData[playerId] = {
                action: action,
                playerName: player.name,
                character: player.character
            };
            playersWithActions.push(player.name);
        }
    });
    
    const hasActiveActions = lobby.currentActions.size > 0;
    const onlinePlayersCount = Array.from(lobby.players.values()).filter(p => p.status === 'online').length;
    const allPlayersActed = lobby.currentActions.size === onlinePlayersCount;
    console.log(`💾 При переподключении хоста: ${lobby.currentActions.size}/${onlinePlayersCount} онлайн игроков уже сделали действия: ${playersWithActions.join(', ')}`);
    
    // Отправляем подтверждение хосту
    player.socket.send(JSON.stringify({
        type: 'host_reconnect_success',
        lobbyCode: lobbyCode,
        players: lobby.getPlayersArray(),
        gameState: lobby.gameState,
        lastScene: lobby.lastScene,
        currentActions: currentActionsData,
        hasActiveActions: hasActiveActions,
        allPlayersActed: allPlayersActed
    }));
    
    // Если все онлайн игроки уже сделали действия, сразу запускаем обработку
    if (allPlayersActed && hasActiveActions) {
        console.log(`🚀 Все онлайн игроки уже сделали действия при переподключении хоста, запускаем обработку`);
        setTimeout(() => {
            lobby.processAllActions();
        }, 1000); // Небольшая задержка чтобы хост успел восстановиться
    }
    
    // Уведомляем других игроков о возвращении хоста
    lobby.players.forEach((lobbyPlayer, lobbyPlayerId) => {
        if (lobbyPlayerId !== playerId && lobbyPlayer.socket.readyState === 1) {
            lobbyPlayer.socket.send(JSON.stringify({
                type: 'host_reconnected',
                hostId: playerId,
                currentActions: currentActionsData,
                hasActiveActions: hasActiveActions,
                players: lobby.getPlayersArray()
            }));
        }
    });
    
    console.log(`✅ Хост ${playerId} успешно переподключился к лобби ${lobbyCode}`);
}

// Обработка установки данных загруженной игры
function handleSetLoadedGameData(playerId, message) {
    const player = players.get(playerId);
    if (!player || !player.lobbyCode) {
        player?.socket.send(JSON.stringify({
            type: 'error',
            message: 'Игрок не в лобби'
        }));
        return;
    }
    
    const lobby = lobbies.get(player.lobbyCode);
    if (!lobby || lobby.hostId !== playerId) {
        player.socket.send(JSON.stringify({
            type: 'error',
            message: 'Только хост может устанавливать данные загруженной игры'
        }));
        return;
    }
    
    // Сохраняем минимальные данные загруженной игры
    lobby.loadedGameData = message.gameData;
    
    // Устанавливаем gameState для передачи в AI (без истории - она уже есть у хоста)
    lobby.gameState = {
        currentScene: message.gameData.lastStory ? {
            text: message.gameData.lastStory,
            options: [],
            isWaitingForAction: false
        } : null,
        isMultiplayer: true,
        language: message.gameData.language || 'uk'
    };
    
    const charactersCount = Object.keys(message.gameData.playersData || {}).length;
    console.log(`💾 Данные загруженной игры установлены для лобби ${lobby.code}:`, 
        charactersCount, 'персонажей, последняя сцена:', 
        message.gameData.lastStory ? message.gameData.lastStory.substring(0, 50) + '...' : 'нет');
    console.log('🔍 loadedGameData установлено:', !!lobby.loadedGameData);
    console.log('🎮 gameState установлен для AI:', !!lobby.gameState);
    
    // Больше не создаем фиктивных игроков - персонажи назначаются динамически при присоединении
    
    // Автоматически назначаем хосту его персонажа
    const hostPlayer = lobby.players.get(playerId);
    if (hostPlayer && message.gameData.hostCharacter) {
        hostPlayer.character = message.gameData.hostCharacter;
        hostPlayer.status = 'online';
        console.log(`👑 Хост получил персонажа: ${message.gameData.hostCharacter.name}`);
        
        // Уведомляем хоста о том, что он получил персонажа
        player.socket.send(JSON.stringify({
            type: 'character_assigned',
            character: message.gameData.hostCharacter,
            playerId: playerId,
            message: `Вы играете за ${message.gameData.hostCharacter.name}`
        }));
    }
    
    // Уведомляем всех уже подключенных игроков о доступных персонажах (кроме хоста)
    const availableCharactersForNotification = {};
    Object.entries(message.gameData.playersData || {}).forEach(([originalPlayerId, playerData]) => {
        if (originalPlayerId !== lobby.hostId) { // Исключаем персонажа хоста
            availableCharactersForNotification[originalPlayerId] = playerData;
        }
    });
    
    lobby.players.forEach((lobbyPlayer, lobbyPlayerId) => {
        if (lobbyPlayerId !== lobby.hostId && lobbyPlayer.socket && lobbyPlayer.socket.readyState === 1) {
            lobbyPlayer.socket.send(JSON.stringify({
                type: 'loaded_game_characters_available',
                characters: availableCharactersForNotification,
                hostCharacter: message.gameData.hostCharacter,
                lastStory: message.gameData.lastStory,
                lastImage: message.gameData.lastImage
            }));
        }
    });
}

// Экспорт для тестирования
module.exports = { server, wss, lobbies, players };