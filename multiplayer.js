// Обновленный мультиплеєр система для DnD гри
// Полная интеграция с game.js

class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.isHost = false;
        this.lobbyCode = null;
        this.players = [];
        this.currentActions = {};
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.gameState = null;
        this.playerId = null; // Добавляем ID игрока
        this.gameIntegration = null; // Интеграция с game.js
        
        // Пинг система для поддержания соединения
        this.pingInterval = null;
        this.pongTimeout = null;
        this.pingIntervalTime = 30000; // 30 секунд между пингами
        this.pongTimeoutTime = 10000; // 10 секунд ожидание понга
        
        this.initializeUI();
    }

    // Генерация уникального ID игрока
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    // Запуск пинг системы
    startPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.socket && this.isConnected) {
                console.log('📡 Отправка пинга серверу...');
                this.socket.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
                
                // Устанавливаем таймаут для получения понга
                this.pongTimeout = setTimeout(() => {
                    console.warn('⚠️ Не получен понг от сервера, переподключение...');
                    this.handleConnectionTimeout();
                }, this.pongTimeoutTime);
            }
        }, this.pingIntervalTime);
        
        console.log('🔄 Пинг система запущена (интервал:', this.pingIntervalTime / 1000, 'сек)');
    }

    // Остановка пинг системы
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
        
        console.log('⏹️ Пинг система остановлена');
    }

    // Обработка полученного понга
    handlePong() {
        console.log('🏓 Получен понг от сервера');
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    // Обработка таймаута соединения
    handleConnectionTimeout() {
        console.error('❌ Таймаут соединения WebSocket');
        this.isConnected = false;
        this.stopPing();
        
        if (this.socket) {
            this.socket.close();
        }
        
        this.handleDisconnection();
    }

    // Ініціалізація UI для мультиплеєра
    initializeUI() {
        // Створюємо модальне вікно для мультиплеєра
        const multiplayerModal = document.createElement('div');
        multiplayerModal.id = 'multiplayerModal';
        multiplayerModal.className = 'modal';
        multiplayerModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="multiplayerModalTitle">🎮 Мультиплеєр (БЕТА)</h2>
                    <span class="close" id="closeMultiplayer">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="beta-warning">
                        <h3 id="betaWarningTitle">⚠️ УВАГА: БЕТА ВЕРСІЯ</h3>
                        <p id="betaWarningText">Мультиплеєр знаходиться в стадії бета-тестування. Можливі проблеми з балансом та стабільністю.</p>
                    </div>
                    
                    <div id="multiplayerMenu">
                        <button id="hostGameBtn" class="mp-btn primary">Створити лобі</button>
                        <button id="joinGameBtn" class="mp-btn secondary">Приєднатися до лобі</button>
                    </div>
                    
                    <div id="hostLobby" style="display: none;">
                        <h3 id="lobbyCodeTitle">Ваш код лобі:</h3>
                        <div class="lobby-code" id="lobbyCodeDisplay"></div>
                        <p id="shareLobbyText">Поділіться цим кодом з друзями</p>
                        <div id="playersList"></div>
                        <button id="startGameBtn" class="mp-btn primary" disabled>Почати гру</button>
                    </div>
                    
                    <div id="joinLobby" style="display: none;">
                        <h3 id="enterLobbyCodeTitle">Введіть код лобі:</h3>
                        <input type="text" id="lobbyCodeInput" placeholder="Код лобі (6 символів)" maxlength="6">
                        <button id="connectBtn" class="mp-btn primary">Підключитися</button>
                    </div>
                    
                    <div id="gameSession" style="display: none;">
                        <div class="players-status">
                            <h3 id="playersInSessionTitle">Гравці в сесії:</h3>
                            <div id="playersStatus"></div>
                        </div>
                        <div class="action-status">
                            <div id="actionStatus">Очікування дій гравців...</div>
                            <div id="actionProgress"></div>
                        </div>
                        <button id="leaveGameBtn" class="mp-btn danger">Покинути гру</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(multiplayerModal);
        
        // Додаємо стилі
        this.addStyles();
        
        // Додаємо обробники подій
        this.attachEventListeners();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
            }
            
            .modal-content {
                background-color: #2a2a2a;
                margin: 5% auto;
                padding: 0;
                border: 1px solid #555;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                color: #fff;
            }
            
            .modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h2 {
                margin: 0;
                color: white;
            }
            
            .close {
                color: white;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            
            .close:hover {
                opacity: 0.7;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .beta-warning {
                background: #ff6b35;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
            }
            
            .beta-warning h3 {
                margin: 0 0 10px 0;
                color: white;
            }
            
            .beta-warning p {
                margin: 0;
                color: white;
                font-size: 14px;
            }
            
            .mp-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                margin: 5px;
                transition: all 0.3s ease;
                width: 100%;
            }
            
            .mp-btn.primary {
                background: #4CAF50;
                color: white;
            }
            
            .mp-btn.secondary {
                background: #2196F3;
                color: white;
            }
            
            .mp-btn.danger {
                background: #f44336;
                color: white;
            }
            
            .mp-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            
            .mp-btn:disabled {
                background: #666;
                cursor: not-allowed;
                opacity: 0.6;
            }
            
            .lobby-code {
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                background: #333;
                padding: 20px;
                border-radius: 8px;
                margin: 10px 0;
                letter-spacing: 4px;
                color: #4CAF50;
            }
            
            #lobbyCodeInput {
                width: 100%;
                padding: 12px;
                font-size: 18px;
                border: 2px solid #555;
                border-radius: 6px;
                background: #333;
                color: white;
                text-align: center;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 15px;
            }
            
            .players-status, .action-status {
                background: #333;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
            }
            
            .player-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #555;
            }
            
            .player-item:last-child {
                border-bottom: none;
            }
            
            .player-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .status-online {
                background: #4CAF50;
                color: white;
            }
            
            .status-offline {
                background: #f44336;
                color: white;
            }
            
            .status-waiting {
                background: #ff9800;
                color: white;
            }
            
            .action-progress {
                margin-top: 10px;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #555;
                border-radius: 10px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #45a049);
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Закриття модального вікна
        document.getElementById('closeMultiplayer').addEventListener('click', () => {
            this.hideModal();
        });

        // Створення лобі
        document.getElementById('hostGameBtn').addEventListener('click', () => {
            this.hostGame();
        });

        // Приєднання до лобі
        document.getElementById('joinGameBtn').addEventListener('click', () => {
            this.showJoinLobby();
        });

        // Підключення до лобі
        document.getElementById('connectBtn').addEventListener('click', () => {
            const code = document.getElementById('lobbyCodeInput').value.trim().toUpperCase();
            if (code.length === 6) {
                this.joinGame(code);
            } else {
                alert('Код лобі повинен містити 6 символів');
            }
        });

        // Початок гри
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startMultiplayerGame();
        });

        // Покинути гру
        document.getElementById('leaveGameBtn').addEventListener('click', () => {
            this.leaveGame();
        });

        // Обробка введення коду лобі
        document.getElementById('lobbyCodeInput').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    // Обновление текстов интерфейса при смене языка
    updateUITexts() {
        const getText = (key) => {
            // Fallback to window.getText if it exists
            if (typeof window.getText === 'function') {
                return window.getText(key);
            }
            if (window.localization && window.gameState && window.localization[window.gameState.language]) {
                return window.localization[window.gameState.language][key] || key;
            }
            return key;
        };

        // Обновляем все тексты интерфейса
        document.getElementById('multiplayerModalTitle').textContent = `🎮 ${getText('multiplayer')}`;
        document.getElementById('betaWarningTitle').textContent = getText('multiplayerBetaWarning');
        document.getElementById('betaWarningText').textContent = getText('multiplayerBetaDesc');
        
        document.getElementById('hostGameBtn').textContent = getText('createLobby');
        document.getElementById('joinGameBtn').textContent = getText('joinLobby');
        
        document.getElementById('lobbyCodeTitle').textContent = getText('lobbyCode');
        document.getElementById('shareLobbyText').textContent = getText('shareLobbyCode');
        document.getElementById('startGameBtn').textContent = getText('startGame');
        
        document.getElementById('enterLobbyCodeTitle').textContent = getText('enterLobbyCode');
        document.getElementById('lobbyCodeInput').placeholder = getText('lobbyCodePlaceholder');
        document.getElementById('connectBtn').textContent = getText('connect');
        
        document.getElementById('playersInSessionTitle').textContent = getText('playersInSession');
        document.getElementById('leaveGameBtn').textContent = getText('leaveGame');
    }

    // Генерація коду лобі
    generateLobbyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Показати модальне вікно
    showModal() {
        // Обновляем тексты перед показом
        this.updateUITexts();
        document.getElementById('multiplayerModal').style.display = 'block';
    }

    // Сховати модальне вікно
    hideModal() {
        document.getElementById('multiplayerModal').style.display = 'none';
        
        // Возвращаемся в главное меню, если не активна игра
        if (!window.multiplayerState || !window.multiplayerState.isActive) {
            document.getElementById('mainMenu').style.display = 'block';
        }
    }

    // Створення гри
    hostGame() {
        // Проверяем наличие API ключа перед созданием лобби
        if (!window.gameState || !window.gameState.apiKey) {
            const getText = window.getText || ((key) => key);
            alert(getText('hostApiKeyRequired') || 'Хост должен предоставить Gemini API ключ перед созданием лобби');
            
            // Показываем экран API setup
            this.hideModal();
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('apiSetup').style.display = 'block';
            
            // Добавляем обработчик для возврата к мультиплееру после ввода API ключа
            const originalSaveApiKey = window.saveApiKey;
            window.saveApiKey = function() {
                const apiKey = document.getElementById('apiKey').value.trim();
                if (apiKey) {
                    window.gameState.apiKey = apiKey;
                    
                    // Сохраняем настройки озвучивания
                    if (window.voiceGenerator) {
                        const voiceEnabled = document.getElementById('voiceEnabled').checked;
                        const voiceService = document.getElementById('voiceService').value;
                        const elevenLabsApiKey = document.getElementById('elevenLabsApiKey').value.trim();
                        
                        window.gameState.shortResponses = document.getElementById('shortResponsesEnabled').checked;
                        
                        let voiceSettings = {
                            isEnabled: voiceEnabled,
                            service: voiceService
                        };
                        
                        if (voiceService === 'gemini') {
                            voiceSettings.voice = document.getElementById('geminiVoiceSelect').value;
                        } else if (voiceService === 'elevenlabs') {
                            voiceSettings.elevenLabsApiKey = elevenLabsApiKey;
                            voiceSettings.elevenLabsVoice = document.getElementById('elevenLabsVoiceSelect').value;
                        }
                        
                        window.voiceGenerator.setVoiceSettings(voiceSettings);
                        window.gameState.voiceSettings = window.voiceGenerator.getVoiceSettings();
                    }
                    
                    document.getElementById('apiSetup').style.display = 'none';
                    initSoundControls();
                    
                    // Возвращаемся к созданию мультиплеер лобби
                    setTimeout(() => {
                        window.multiplayerManager.hostGame();
                    }, 100);
                    
                    // Восстанавливаем оригинальную функцию
                    window.saveApiKey = originalSaveApiKey;
                } else {
                    const getText = window.getText || ((key) => key);
                    alert(getText('enterApiKey') || 'Введіть API ключ');
                }
            };
            return;
        }
        
        this.isHost = true;
        this.lobbyCode = this.generateLobbyCode();
        this.playerId = this.generatePlayerId();
        
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('hostLobby').style.display = 'block';
        document.getElementById('lobbyCodeDisplay').textContent = this.lobbyCode;
        
        this.connectToServer();
    }

    // Показ екрану приєднання до лобі
    showJoinLobby() {
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('joinLobby').style.display = 'block';
    }

    // Приєднання до гри
    joinGame(code) {
        this.isHost = false;
        this.lobbyCode = code;
        this.playerId = this.generatePlayerId();
        
        document.getElementById('joinLobby').style.display = 'none';
        
        this.connectToServer();
    }

    // Підключення до сервера
    connectToServer() {
        const serverUrl = 'wss://ai-rpg-c4df.onrender.com';
        console.log('Підключення до сервера:', serverUrl);
        
        try {
            this.socket = new WebSocket(serverUrl);
            
            this.socket.onopen = () => {
                console.log('Підключено до сервера');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Запускаем пинг систему для поддержания соединения
                this.startPing();
                
                if (this.isHost) {
                    // Створюємо лобі
                    this.socket.send(JSON.stringify({
                        type: 'create_lobby',
                        code: this.lobbyCode,
                        playerName: this.getPlayerName()
                    }));
                } else {
                    // Приєднуємося до лобі
                    this.socket.send(JSON.stringify({
                        type: 'join_lobby',
                        code: this.lobbyCode,
                        playerName: this.getPlayerName()
                    }));
                }
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Помилка парсингу повідомлення:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('З\'єднання з сервером закрито');
                this.isConnected = false;
                this.stopPing(); // Останавливаем пинг систему при закрытии соединения
                this.handleDisconnection();
            };
            
            this.socket.onerror = (error) => {
                console.error('Помилка WebSocket:', error);
                this.isConnected = false;
            };
            
        } catch (error) {
            console.error('Помилка створення WebSocket:', error);
            alert('Помилка підключення до сервера. Переконайтеся, що сервер запущено.');
        }
    }

    // ИСПРАВЛЕНИЕ 2: Добавляем функцию кика игроков для хоста
    kickPlayer(playerId) {
        if (!this.isHost) {
            console.error('Только хост может кикать игроков');
            return;
        }
        
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'kick_player',
                playerId: playerId
            }));
        }
    }

    // ИСПРАВЛЕНИЕ 3: Обновляем отображение списка игроков с кнопками кика для хоста
    updatePlayersList(players) {
        console.log('=== НАЧАЛО updatePlayersList ===');
        console.log('Входные данные players:', players);
        try {
            console.log('updatePlayersList вызван с данными:', players);
            this.players = players;
            console.log('this.players установлено');
            const playersList = document.getElementById('playersList');
            const playersStatus = document.getElementById('playersStatus');
            console.log('Элементы найдены:', {playersList: !!playersList, playersStatus: !!playersStatus});
        
        console.log('Начинаем обработку игроков...');
        const playersHTML = players.map(player => {
            console.log(`Обрабатываем игрока ${player.name}: character =`, player.character, ', status =', player.status);
            const kickButton = this.isHost && player.id !== this.playerId ? 
                `<button onclick="window.multiplayerManager.kickPlayer('${player.id}')" 
                         style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 2px 8px; margin-left: 10px; cursor: pointer; font-size: 10px;">
                    ❌ Кик
                </button>` : '';
            
            // Определяем статус игрока на основе наличия персонажа
            let playerStatus = player.status;
            let statusText = this.getStatusText(playerStatus);
            
            if (player.character) {
                statusText = '✅ Готов';
                playerStatus = 'ready';
            } else if (playerStatus === 'online') {
                statusText = '⏳ Создает персонажа';
                playerStatus = 'creating';
            }
            
            return `
                <div class="player-item">
                    <span>${player.name}${kickButton}</span>
                    <span class="player-status status-${playerStatus}">${statusText}</span>
                </div>
            `;
        }).join('');
        
        console.log('HTML для игроков сгенерирован, длина:', playersHTML.length);
        
        if (playersList) {
            const getText = window.getText || ((key) => key);
            const playersTitle = getText('playersInLobby') || `Гравці (${players.length}/4):`;
            playersList.innerHTML = `<h4>${playersTitle}</h4>` + playersHTML;
        }
        
        if (playersStatus) {
            playersStatus.innerHTML = playersHTML;
        }
        
        // Активуємо кнопку початку гри для хоста
        const startBtn = document.getElementById('startGameBtn');
        console.log('Ищем кнопку startGameBtn:', startBtn ? 'найдена' : 'НЕ найдена');
        console.log('Является ли хостом:', this.isHost);
        if (startBtn && this.isHost) {
            const getText = window.getText || ((key) => key);
            console.log('Обновляем кнопку старта игры. Количество игроков:', players.length);
            startBtn.disabled = players.length < 2;
            if (players.length < 2) {
                startBtn.textContent = getText('needMinPlayersBtn') || `Нужно минимум 2 игрока (${players.length}/4)`;
            } else {
                startBtn.textContent = getText('startGameBtn') || `Начать игру (${players.length} игроков)`;
            }
            console.log('Кнопка обновлена. Disabled:', startBtn.disabled, 'Text:', startBtn.textContent);
        }
        } catch (error) {
            console.error('Ошибка в updatePlayersList:', error);
        }
    }

    // ИСПРАВЛЕНИЕ 4: Обновляем обработку сообщений от сервера
    handleServerMessage(message) {
        console.log('Получено сообщение от сервера:', message.type, message);
        
        switch (message.type) {
            case 'lobby_created':
                // ИСПРАВЛЕНИЕ: Обновляем playerId на основе данных сервера
                if (message.playerId) {
                    console.log('Обновляем playerId с', this.playerId, 'на', message.playerId);
                    this.playerId = message.playerId;
                }
                this.updatePlayersList(message.players);
                if (this.gameIntegration && this.gameIntegration.onLobbyCreated) {
                    this.gameIntegration.onLobbyCreated(message);
                }
                break;
                
            case 'lobby_joined':
                // ИСПРАВЛЕНИЕ: Обновляем playerId для клиента, который присоединился к лобби
                if (message.playerId) {
                    console.log('Обновляем playerId при присоединении к лобби с', this.playerId, 'на', message.playerId);
                    this.playerId = message.playerId;
                }
                this.updatePlayersList(message.players);
                if (this.gameIntegration && this.gameIntegration.onLobbyJoined) {
                    this.gameIntegration.onLobbyJoined(message);
                }
                break;
                
            case 'player_joined':
                console.log('Игрок присоединился к лобби. Всего игроков в сообщении:', message.players.length);
                console.log('Вызываем updatePlayersList...');
                // Просто обновляем список игроков, ID уже обновлен в lobby_joined
                this.updatePlayersList(message.players);
                console.log('updatePlayersList завершен');
                if (this.gameIntegration && this.gameIntegration.onPlayerJoined) {
                    this.gameIntegration.onPlayerJoined(message);
                }
                break;
                
            case 'player_left':
                this.updatePlayersList(message.players);
                if (this.gameIntegration && this.gameIntegration.onPlayerLeft) {
                    this.gameIntegration.onPlayerLeft(message);
                }
                break;
                
            case 'player_kicked':
                if (message.kickedPlayerId === this.playerId) {
                    // Этого игрока кикнули
                    const getText = window.getText || ((key) => key);
                    alert(getText('youWereKicked') || 'Вас исключили из лобби');
                    this.leaveGame();
                } else {
                    // Кто-то другой был кикнут
                    this.updatePlayersList(message.players);
                }
                break;
                
            case 'game_started':
                console.log('Игра начата, скрываем модальное окно и показываем создание персонажа');
                
                // Важно: НЕ вызываем hideModal(), так как игра активна
                document.getElementById('multiplayerModal').style.display = 'none';
                
                if (this.gameIntegration && this.gameIntegration.onGameStarted) {
                    this.gameIntegration.onGameStarted(message);
                }
                break;
                
            case 'character_created':
                console.log('Персонаж создан игроком:', message.playerId, message.character);
                console.log('Получен обновленный список игроков:', message.players);
                
                // Обновляем список игроков с новой информацией
                if (message.players) {
                    console.log('Обновляем отображение списка игроков...');
                    this.updatePlayersList(message.players);
                }
                
                if (this.gameIntegration && this.gameIntegration.onCharacterCreated) {
                    this.gameIntegration.onCharacterCreated(message);
                }
                break;
                
            case 'all_characters_ready':
                if (this.gameIntegration && this.gameIntegration.onAllCharactersReady) {
                    this.gameIntegration.onAllCharactersReady(message);
                }
                break;
                
            case 'initial_story_received':
                if (this.gameIntegration && this.gameIntegration.onInitialStoryReceived) {
                    this.gameIntegration.onInitialStoryReceived(message);
                }
                break;
                
            case 'action_received':
                if (this.gameIntegration && this.gameIntegration.onActionReceived) {
                    this.gameIntegration.onActionReceived(message);
                }
                break;
                
            case 'all_actions_received':
                if (this.gameIntegration && this.gameIntegration.onAllActionsReceived) {
                    this.gameIntegration.onAllActionsReceived(message);
                }
                break;
                
            case 'turn_complete':
                if (this.gameIntegration && this.gameIntegration.onTurnComplete) {
                    this.gameIntegration.onTurnComplete(message);
                }
                break;
                
            case 'image_shared':
                if (this.gameIntegration && this.gameIntegration.onImageShared) {
                    this.gameIntegration.onImageShared(message);
                }
                break;
                
            case 'player_disconnected':
                if (this.gameIntegration && this.gameIntegration.onPlayerDisconnected) {
                    this.gameIntegration.onPlayerDisconnected(message);
                }
                break;
                
                case 'pong':
                this.handlePong();
                break;
                
            case 'error':
                    if (this.gameIntegration && this.gameIntegration.onError) {
                        this.gameIntegration.onError(message);
                    } else {
                        alert('Помилка: ' + message.message);
                    }
                    break;
            }
            
    }
    getPlayerName() {
        // Пытаемся получить имя из gameState
        if (window.gameState && window.gameState.character && window.gameState.character.name) {
            return window.gameState.character.name;
        }
        
        // Запрашиваем у пользователя
        const getText = window.getText || ((key) => key);
        const name = prompt(getText('enterPlayerName') || 'Введите ваше имя:');
        return name || `Player${this.playerId.slice(-4)}`;
    }
    



    getStatusText(status) {
        const getText = (key) => {
            // Fallback to window.getText if it exists
            if (typeof window.getText === 'function') {
                return window.getText(key);
            }
            if (window.localization && window.gameState && window.localization[window.gameState.language]) {
                return window.localization[window.gameState.language][key] || key;
            }
            return key;
        };

        const statusTexts = {
            online: getText('online'),
            offline: getText('offline'),
            waiting: getText('waiting'),
            ready: getText('ready')
        };
        return statusTexts[status] || status;
    }

    // Початок мультиплеєрної гри
    startMultiplayerGame() {
        if (!this.isHost) {
            console.error('Только хост может начать игру');
            return;
        }
        
        if (this.players.length < 2) {
            alert('Потрібно мінімум 2 гравці для початку гри');
            return;
        }
        
        if (!window.gameState || !window.gameState.apiKey) {
            alert('Хост повинен надати Gemini API ключ перед початком гри');
            return;
        }
        
        if (this.socket && this.isConnected) {
            console.log('Хост запускає мультиплеєрну гру...');
            this.socket.send(JSON.stringify({
                type: 'start_game',
                gameState: {
                    ...window.gameState,
                    isMultiplayer: true,
                    hostApiKey: window.gameState.apiKey
                }
            }));
        }
    }

    // Покинути гру
    leaveGame() {
        // Останавливаем пинг систему перед закрытием соединения
        this.stopPing();
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.isHost = false;
        this.lobbyCode = null;
        this.players = [];
        this.currentActions = {};
        
        // Повертаємося до головного меню
        document.getElementById('hostLobby').style.display = 'none';
        document.getElementById('joinLobby').style.display = 'none';
        document.getElementById('gameSession').style.display = 'none';
        document.getElementById('multiplayerMenu').style.display = 'block';
        
        this.hideModal();
    }

    // Обробка відключення
    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            if (window.handleMultiplayerDisconnect) {
                window.handleMultiplayerDisconnect();
            }
        } else {
            alert('Втрачено з\'єднання з сервером');
            this.leaveGame();
        }
    }

    // Переподключение
    reconnect() {
        this.reconnectAttempts++;
        setTimeout(() => this.connectToServer(), 2000);
    }

    // Перевірка, чи активний мультиплеєр
    isMultiplayerActive() {
        return this.isConnected && this.socket;
    }

    // Отримання кількості гравців
    getPlayerCount() {
        return this.players.length;
    }
}

// Глобальний екземпляр мультиплеєра
window.multiplayerManager = new MultiplayerManager();

// Експорт для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}
