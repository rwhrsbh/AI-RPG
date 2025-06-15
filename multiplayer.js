// Мультиплеєр система для DnD гри
// Підтримує до 4 гравців з синхронізацією дій

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
        
        this.initializeUI();
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
                    <h2 id="multiplayerTitle">Мультиплеєр (БЕТА)</h2>
                    <span class="close" id="closeMultiplayer">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="beta-warning">
                        <h3 id="betaWarningTitle">⚠️ УВАГА: БЕТА ВЕРСІЯ</h3>
                        <p id="betaWarningText">Мультиплеєр знаходиться в стадії бета-тестування. Можливі проблеми з балансом та стабільністю.</p>
                    </div>
                    
                    <div id="multiplayerMenu">
                        <button id="hostGameBtn" class="mp-btn primary" data-text="hostGame">Створити лобі</button>
                        <button id="joinGameBtn" class="mp-btn secondary" data-text="joinGame">Приєднатися до лобі</button>
                    </div>
                    
                    <div id="hostSetup" style="display: none;">
                        <h3 id="hostSetupTitle">Налаштування хоста</h3>
                        <div style="margin: 15px 0;">
                            <label for="hostApiKey" id="hostApiKeyLabel">Gemini API ключ (обов'язково для хоста):</label>
                            <input type="password" id="hostApiKey" class="api-input" placeholder="Введіть ваш Gemini API ключ" style="margin-top: 5px;">
                        </div>
                        <div style="margin: 15px 0;">
                            <label for="hostPlayerName" id="hostPlayerNameLabel">Ваше ім'я:</label>
                            <input type="text" id="hostPlayerName" class="api-input" placeholder="Введіть ваше ім'я" style="margin-top: 5px;" maxlength="20">
                        </div>
                        <button id="createLobbyBtn" class="mp-btn primary" data-text="createLobby">Створити лобі</button>
                    </div>
                    
                    <div id="hostLobby" style="display: none;">
                        <h3 id="lobbyCodeTitle">Ваш код лобі:</h3>
                        <div class="lobby-code" id="lobbyCodeDisplay"></div>
                        <p id="shareLobbyText">Поділіться цим кодом з друзями</p>
                        <div id="playersList"></div>
                        <button id="startGameBtn" class="mp-btn primary" disabled data-text="startGame">Почати гру</button>
                    </div>
                    
                    <div id="joinLobby" style="display: none;">
                        <h3 id="joinLobbyTitle">Приєднання до лобі</h3>
                        <div style="margin: 15px 0;">
                            <label for="playerNameInput" id="playerNameLabel">Ваше ім'я:</label>
                            <input type="text" id="playerNameInput" placeholder="Введіть ваше ім'я" maxlength="20" style="width: 100%; padding: 10px; margin: 5px 0; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(0, 0, 0, 0.3); color: white;">
                        </div>
                        <div style="margin: 15px 0;">
                            <label for="lobbyCodeInput" id="lobbyCodeLabel">Код лобі:</label>
                            <input type="text" id="lobbyCodeInput" placeholder="Код лобі (6 символів)" maxlength="6" style="width: 100%; padding: 10px; margin: 5px 0; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(0, 0, 0, 0.3); color: white; text-align: center; letter-spacing: 2px; text-transform: uppercase;">
                        </div>
                        <button id="connectBtn" class="mp-btn primary" data-text="connect">Підключитися</button>
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
                        <button id="leaveGameBtn" class="mp-btn danger" data-text="leaveGame">Покинути гру</button>
                    </div>
                    
                    <div id="characterCreation" style="display: none;">
                        <h3 id="characterCreationTitle">Створення персонажів</h3>
                        <p id="characterCreationDesc">Всі гравці повинні створити своїх персонажів</p>
                        <div id="characterCreationStatus"></div>
                        <button id="openCharacterCreator" class="mp-btn primary" data-text="createCharacter">Створити персонажа</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(multiplayerModal);
        
        // Додаємо стилі
        this.addStyles();
        
        // Додаємо обробники подій
        this.attachEventListeners();
        
        // Update UI text with current language
        this.updateUILocalization();
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

        // Показати налаштування хоста
        document.getElementById('hostGameBtn').addEventListener('click', () => {
            this.showHostSetup();
        });

        // Показати форму приєднання
        document.getElementById('joinGameBtn').addEventListener('click', () => {
            this.showJoinLobby();
        });

        // Створити лобі з API ключем
        document.getElementById('createLobbyBtn').addEventListener('click', () => {
            this.createLobbyWithApiKey();
        });

        // Підключення до лобі
        document.getElementById('connectBtn').addEventListener('click', () => {
            const code = document.getElementById('lobbyCodeInput').value.trim().toUpperCase();
            const playerName = document.getElementById('playerNameInput').value.trim();
            if (code.length === 6 && playerName) {
                this.joinGame(code, playerName);
            } else {
                alert(this.getText('enterNameAndCode') || 'Введіть ім\'я та код лобі');
            }
        });

        // Початок гри
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startMultiplayerGame();
        });

        // Покинути гру з підтвердженням
        document.getElementById('leaveGameBtn').addEventListener('click', () => {
            if (confirm(this.getText('confirmLeaveGame') || 'Ви впевнені, що хочете покинути гру?')) {
                this.leaveGame();
            }
        });

        // Відкрити створення персонажа
        document.getElementById('openCharacterCreator').addEventListener('click', () => {
            this.openCharacterCreation();
        });

        // Обробка введення коду лобі
        document.getElementById('lobbyCodeInput').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
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
        document.getElementById('multiplayerModal').style.display = 'block';
    }

    // Сховати модальне вікно
    hideModal() {
        document.getElementById('multiplayerModal').style.display = 'none';
    }

    // Показати налаштування хоста
    showHostSetup() {
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('hostSetup').style.display = 'block';
    }

    // Створення лобі з API ключем
    createLobbyWithApiKey() {
        const apiKey = document.getElementById('hostApiKey').value.trim();
        const playerName = document.getElementById('hostPlayerName').value.trim() || 'Хост';
        
        if (!apiKey) {
            alert(this.getText('apiKeyRequired') || 'API ключ Gemini обов\'язковий для хоста');
            return;
        }
        
        // Зберігаємо API ключ
        this.hostApiKey = apiKey;
        this.hostPlayerName = playerName;
        
        this.hostGame();
    }

    // Створення гри
    hostGame() {
        this.isHost = true;
        this.lobbyCode = this.generateLobbyCode();
        
        document.getElementById('hostSetup').style.display = 'none';
        document.getElementById('hostLobby').style.display = 'block';
        document.getElementById('lobbyCodeDisplay').textContent = this.lobbyCode;
        
        this.connectToServer();
    }

    // Показати форму приєднання
    showJoinLobby() {
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('joinLobby').style.display = 'block';
    }

    // Приєднання до гри
    joinGame(code, playerName) {
        this.isHost = false;
        this.lobbyCode = code;
        this.playerName = playerName;
        this.connectToServer();
    }

    // Підключення до сервера
    connectToServer() {
        try {
            this.socket = new WebSocket('ws://localhost:3001');
            
            this.socket.onopen = () => {
                console.log('Підключено до сервера');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                if (this.isHost) {
                    this.socket.send(JSON.stringify({
                        type: 'create_lobby',
                        code: this.lobbyCode,
                        playerName: this.hostPlayerName
                    }));
                } else {
                    this.socket.send(JSON.stringify({
                        type: 'join_lobby',
                        code: this.lobbyCode,
                        playerName: this.playerName
                    }));
                }
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Помилка парсингу WebSocket повідомлення:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('З\'єднання закрито');
                this.isConnected = false;
                this.handleDisconnection();
            };
            
            this.socket.onerror = (error) => {
                console.error('Помилка WebSocket:', error);
                alert('Не вдалося підключитися до сервера. Переконайтеся, що сервер запущено.');
            };
            
        } catch (error) {
            console.error('Помилка підключення:', error);
            alert('Помилка підключення до сервера');
        }
    }

    // Обробка повідомлень від сервера
    handleServerMessage(message) {
        switch (message.type) {
            case 'lobby_created':
                this.updatePlayersList(message.players);
                break;
                
            case 'player_joined':
                this.updatePlayersList(message.players);
                break;
                
            case 'player_left':
                this.updatePlayersList(message.players);
                break;
                
            case 'game_started':
                this.startGameSession(message.gameState);
                break;
                
            case 'action_received':
                this.updateActionStatus(message.actions, message.players);
                break;
                
            case 'turn_complete':
                this.processTurnResults(message.results);
                break;
                
            case 'player_disconnected':
                this.handlePlayerDisconnection(message.playerId);
                break;
                
            case 'all_actions_received':
                this.handleAllActionsReceived(message);
                break;
                
            case 'character_created':
                this.handleCharacterCreated(message);
                break;
                
            case 'all_characters_ready':
                console.log('Отримано повідомлення: всі персонажі готові');
                this.handleAllCharactersReady();
                break;
                
            case 'initial_story_received':
                console.log('Отримано початкову історію від хоста');
                this.handleInitialStoryReceived(message);
                break;
                
            case 'image_shared':
                console.log('Отримано зображення від хоста');
                this.handleImageReceived(message.imageUrl);
                break;
                
            case 'error':
                alert('Помилка: ' + message.message);
                break;
        }
    }

    // Оновлення списку гравців
    updatePlayersList(players) {
        this.players = players;
        const playersList = document.getElementById('playersList');
        const playersStatus = document.getElementById('playersStatus');
        
        const playersHTML = players.map(player => `
            <div class="player-item">
                <span>${player.name}</span>
                <span class="player-status status-${player.status}">${this.getStatusText(player.status)}</span>
            </div>
        `).join('');
        
        if (playersList) {
            playersList.innerHTML = `<h4>Гравці (${players.length}/4):</h4>` + playersHTML;
        }
        
        if (playersStatus) {
            playersStatus.innerHTML = playersHTML;
        }
        
        // Активуємо кнопку початку гри для хоста
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn && this.isHost) {
            startBtn.disabled = players.length < 2;
        }
        
        // Оновлюємо індикатор кількості гравців
        this.updatePlayerCountDisplay();
    }

    getStatusText(status) {
        const statusTexts = {
            online: 'Онлайн',
            offline: 'Офлайн',
            waiting: 'Очікує',
            ready: 'Готовий'
        };
        return statusTexts[status] || status;
    }

    // Початок ігрової сесії
    startGameSession(gameState) {
        document.getElementById('hostLobby').style.display = 'none';
        document.getElementById('joinLobby').style.display = 'none';
        document.getElementById('characterCreation').style.display = 'block';
        
        this.gameState = gameState;
        this.updateCharacterCreationStatus();
        this.showMultiplayerIndicator();
    }

    // Початок мультиплеєрної гри
    startMultiplayerGame() {
        if (this.isHost && this.socket) {
            this.socket.send(JSON.stringify({
                type: 'start_game',
                gameState: window.gameState // Передаємо поточний стан гри
            }));
        }
    }

    // Відправка дії гравця
    sendPlayerAction(action) {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'player_action',
                action: action
            }));
        }
    }

    // Оновлення статусу дій
    updateActionStatus(actions, players) {
        const actionStatus = document.getElementById('actionStatus');
        const actionProgress = document.getElementById('actionProgress');
        
        const completedActions = Object.keys(actions).length;
        const totalPlayers = players.length;
        const progress = (completedActions / totalPlayers) * 100;
        
        actionStatus.textContent = `Дії отримано: ${completedActions}/${totalPlayers}`;
        
        actionProgress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        `;
        
        if (completedActions === totalPlayers) {
            actionStatus.textContent = 'Обробка дій...';
        }
    }

    // Обробка результатів ходу
    processTurnResults(results) {
        console.log('Обробка результатів мультиплеєра:', results);
        
        // Оновлюємо стан гри результатами від сервера
        if (results.gameState) {
            window.gameState = results.gameState;
        }
        
        // Обробка нового формату мультиплеєра
        if (results.text) {
            // Основний текст для всіх
            document.getElementById('storyText').innerHTML = results.text;
            
            // Обробка індивідуальних даних гравців
            if (results.players) {
                this.processPlayerResults(results.players);
            }
            
            // Обробка ворогів
            if (results.combat && results.enemy) {
                this.displayEnemyInfo(results.enemy);
            } else {
                // Ховаємо інформацію про ворога
                const enemyInfo = document.getElementById('enemyInfo');
                if (enemyInfo) enemyInfo.style.display = 'none';
            }
            
            // Відображаємо опції (загальні + персональні)
            this.displayMultiplayerOptions(results);
            
            // Генеруємо озвучування як у одиночній грі
            if (window.voiceGenerator && results.text) {
                let instructions = results.instructions;
                if (!instructions) {
                    // Fallback генерация инструкций, если их нет
                    instructions = "Identity: Fantasy Narrator\nAffect: Dramatic and mysterious\nTone: Deep and resonant\nEmotion: Tense and suspenseful\nPronunciation: Clear and articulate\nPause: Brief pauses after important moments";
                }
                window.voiceGenerator.generateVoice(results.text, { instructions });
            }
            
            // Генеруємо зображення для нового ходу (тільки хост) як у одиночній грі
            if (this.isHost && window.imageGenerator && typeof window.imageGenerator !== 'undefined') {
                const apiKey = this.hostApiKey || window.gameState?.apiKey;
                if (apiKey) {
                    // Використовуємо image_prompt з відповіді, як у одиночній грі
                    if (results.image_prompt) {
                        window.imageGenerator.generateImage(
                            results.image_prompt, 
                            apiKey, 
                            results.safe_image_prompt || results.image_prompt
                        ).then(imageUrl => {
                            if (imageUrl) {
                                // Відображаємо зображення локально для хоста
                                window.imageGenerator.displayGeneratedImage(imageUrl);
                                // Відправляємо зображення іншим гравцям через WebSocket
                                this.sendImageToOtherPlayers(imageUrl);
                            }
                        }).catch(error => {
                            console.error('Помилка генерації зображення для ходу:', error);
                        });
                    } else if (results.text) {
                        // Fallback на текст, якщо немає image_prompt
                        window.imageGenerator.generateImage(
                            results.text, 
                            apiKey, 
                            results.text
                        ).then(imageUrl => {
                            if (imageUrl) {
                                // Відображаємо зображення локально для хоста
                                window.imageGenerator.displayGeneratedImage(imageUrl);
                                this.sendImageToOtherPlayers(imageUrl);
                            }
                        }).catch(error => {
                            console.error('Помилка генерації зображення для ходу (fallback):', error);
                        });
                    }
                }
            }
        }
        // Fallback для старого формату
        else if (results.storyText) {
            document.getElementById('storyText').innerHTML = results.storyText;
        }
        
        // Скидаємо статус дій
        this.updateActionStatus({}, this.players);
    }

    // Обробка відключення
    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.showReconnectModal();
        } else {
            alert('Втрачено з\'єднання з сервером');
            this.leaveGame();
        }
    }

    // Модальне вікно переподключення
    showReconnectModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>З'єднання втрачено</h2>
                </div>
                <div class="modal-body">
                    <p>Втрачено з'єднання з сервером. Що бажаєте зробити?</p>
                    <button id="reconnectBtn" class="mp-btn primary">Переподключитися</button>
                    <button id="continueAloneBtn" class="mp-btn secondary">Продовжити без інших</button>
                    <button id="exitGameBtn" class="mp-btn danger">Вийти з гри</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('reconnectBtn').addEventListener('click', () => {
            modal.remove();
            this.reconnectAttempts++;
            setTimeout(() => this.connectToServer(), 2000);
        });
        
        document.getElementById('continueAloneBtn').addEventListener('click', () => {
            modal.remove();
            this.leaveGame();
            alert('Продовжуєте гру в одиночному режимі');
        });
        
        document.getElementById('exitGameBtn').addEventListener('click', () => {
            modal.remove();
            this.leaveGame();
            location.reload();
        });
    }

    // Обробка відключення гравця
    handlePlayerDisconnection(playerId) {
        // Оновлюємо статус гравця
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.status = 'offline';
            this.updatePlayersList(this.players);
        }
    }

    // Покинути гру
    leaveGame() {
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
        document.getElementById('characterCreation').style.display = 'none';
        document.getElementById('multiplayerMenu').style.display = 'block';
        
        // Ховаємо індикатор мультиплеєра
        this.hideMultiplayerIndicator();
        
        // Показуємо налаштування API
        document.getElementById('apiSetup').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        
        this.hideModal();
    }

    // Перевірка, чи активний мультиплеєр
    isMultiplayerActive() {
        return this.isConnected && this.socket;
    }

    // Отримання кількості гравців
    getPlayerCount() {
        return this.players.length;
    }

    // Обробка отримання всіх дій від сервера (тільки для хоста)
    handleAllActionsReceived(message) {
        if (!this.isHost) return;
        
        console.log('Отримано всі дії гравців:', message);
        
        // Формуємо промпт для ШІ з усіма діями гравців
        const combinedPrompt = this.buildMultiplayerPrompt(message.playerActions, message.playerCharacteristics);
        
        // Викликаємо API Gemini
        this.callGeminiForMultiplayer(combinedPrompt, message);
    }

    // Побудова промпту для мультиплеєра з контекстом як в одиночній грі
    buildMultiplayerPrompt(playerActions, playerCharacteristics) {
        let prompt = `Ты - мастер игры в D&D для мультиплеера. Гравці виконують дії одночасно.\n\n`;
        
        // Додаємо контекст історії як у одиночній грі
        if (window.gameState && window.gameState.gameHistory && window.gameState.gameHistory.length > 0) {
            prompt += `КОНТЕКСТ ПРЕДЫДУЩИХ СОБЫТИЙ:\n`;
            // Берем последние 5 событий для контекста
            const recentHistory = window.gameState.gameHistory.slice(-5);
            recentHistory.forEach((event, index) => {
                if (event.scene && event.scene.text) {
                    prompt += `${index + 1}. ${event.scene.text.substring(0, 200)}...\n`;
                }
            });
            prompt += `\n`;
        }
        
        // Додаємо інформацію про всіх гравців та їх дії
        prompt += `ИНФОРМАЦИЯ О ВСЕХ ИГРОКАХ:\n`;
        Object.entries(playerActions).forEach(([playerId, actionData]) => {
            const char = playerCharacteristics[playerId];
            if (char) {
                prompt += `\nИгрок: ${char.name} (ID: ${playerId})\n`;
                prompt += `Класс: ${char.class}, Уровень: ${char.level}\n`;
                prompt += `Характеристики: HP ${char.health}/${char.maxHealth}, Mana ${char.mana}/${char.maxMana}, Опыт: ${char.experience}\n`;
                prompt += `Перки: ${char.perks.join(', ')}\n`;
                prompt += `Действие: ${actionData.action}\n`;
            }
        });

        // Додаємо інструкції для зображень як у одиночній грі
        prompt += `\n\nIMPORTANT: For character consistency, if there are characters in the scene, maintain their visual appearance. `;
        
        // Додаємо опис персонажів для консистентності
        const characterDescriptions = [];
        Object.entries(playerCharacteristics).forEach(([playerId, char]) => {
            if (char && window.gameState && window.gameState.character && window.gameState.character.name === char.name && window.gameState.character.appearance) {
                characterDescriptions.push(`${char.name}: ${window.gameState.character.appearance}`);
            }
        });
        
        if (characterDescriptions.length > 0) {
            prompt += `Use these descriptions for visual consistency: ${characterDescriptions.join('; ')}. `;
        }
        
        // Додаємо інструкції для генерації промптів зображень
        prompt += `You should generate TWO image prompts describing the current scene with detailed description of characters so they should be the same style all the time on pics.: \n\n1. 'image_prompt': This is a detailed prompt with full visual description. Example: 'A heroic warrior with a huge beard (and much more details) battles a fierce dragon in a dark cave, flames illuminating the scene, fantasy style'\n\n2. 'safe_image_prompt': This is a simplified, safer version that avoids potentially problematic content. Focus on landscapes, objects, or simple character poses without combat or controversial elements but with detailed description of characters. Example: 'A warrior with huge beard (much more details) standing in a cave entrance, light filtering in from outside, fantasy style'`;
        
        // Додаємо інструкції для озвучування
        prompt += `\n\nAlso, generate instructions for voice narration in a field called 'instructions'. These must be a SIMPLE STRING value, not an object or array. These should specify the tone, emotion, and style for narrating the scene, using exactly this format:\nIdentity: Fantasy Narrator\nAffect: Dramatic and mysterious\nTone: Deep and resonant\nEmotion: Tense and suspenseful\nPronunciation: Clear and articulate\nPause: Brief pauses after important moments\n\nDo not include any quotes, brackets, or special characters around the instructions text. Just plain text.`;

        prompt += `\n\nВАЖНО: Ответь ТОЛЬКО чистым JSON без markdown блоков!\n\n`;
        prompt += `КРИТИЧЕСКИ ВАЖНО: КАЖДЫЙ игрок ОБЯЗАТЕЛЬНО должен получить:\n`;
        prompt += `1. personal_options - массив из 3-4 уникальных действий для этого игрока\n`;
        prompt += `2. personal_story - персональное описание того, что происходит именно с этим игроком\n`;
        prompt += `3. Действия должны учитывать класс, перки и уровень игрока\n\n`;
        prompt += `Формат ответа:\n`;
        prompt += `{\n`;
        prompt += `  "text": "общее описание сцены для всех",\n`;
        prompt += `  "options": ["общий вариант 1", "общий вариант 2", "общий вариант 3", "общий вариант 4"],\n`;
        prompt += `  "image_prompt": "detailed image prompt for scene visualization",\n`;
        prompt += `  "safe_image_prompt": "safer alternative image prompt",\n`;
        prompt += `  "instructions": "voice narration instructions as simple string",\n`;
        prompt += `  "players": {\n`;
        
        // Добавляем описание для каждого игрока
        Object.entries(playerCharacteristics).forEach(([playerId, char], index) => {
            const isLast = index === Object.entries(playerCharacteristics).length - 1;
            prompt += `    "${playerId}": {\n`;
            prompt += `      "name": "${char.name}",\n`;
            prompt += `      "personal_options": ["${char.class}-специфический вариант 1 для ${char.name}", "${char.class}-специфический вариант 2 для ${char.name}", "вариант использующий перк '${char.perks[0] || 'способность'}' для ${char.name}", "уникальный вариант для ${char.name}"],\n`;
            prompt += `      "consequences": {\n`;
            prompt += `        "health": 0,\n`;
            prompt += `        "mana": 0,\n`;
            prompt += `        "experience": 10,\n`;
            prompt += `        "new_perks": [],\n`;
            prompt += `        "level_up": false\n`;
            prompt += `      },\n`;
            prompt += `      "personal_story": "персональное описание результата действий этого игрока"\n`;
            prompt += `    }${isLast ? '' : ','}\n`;
        });
        
        prompt += `  },\n`;
        prompt += `  "combat": false,\n`;
        prompt += `  "enemy": null,\n`;
        prompt += `  "gameover": false\n`;
        prompt += `}\n\n`;
        prompt += `Если combat=true, используй стандартную структуру enemy. НЕ добавляй поля для TTS/voice!`;
        
        return prompt;
    }

    // Виклик Gemini API для мультиплеєра з conversationHistory
    async callGeminiForMultiplayer(prompt, actionData) {
        try {
            console.log('Відправляємо запит до Gemini для мультиплеєра:', prompt);
            
            // Перевіряємо чи потрібна сумаризація історії для мультиплеєра
            await this.checkAndSummarizeHistoryForMultiplayer();
            
            // Используем API ключ хоста
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.hostApiKey}`;
            
            // Підготовка контексту для API як у одиночній грі
            let contents = [];

            if (window.gameState && window.gameState.conversationHistory && window.gameState.conversationHistory.length > 0) {
                // Використовуємо всю історію розмови
                contents.push(...window.gameState.conversationHistory);
            }

            // Додаємо поточний промпт
            contents.push({
                role: "user",
                parts: [{ text: prompt }]
            });
            
            const requestBody = {
                contents: contents,
                generationConfig: {
                    maxOutputTokens: 1000000,
                    // thinkingConfig: {
                    //     thinkingBudget: 0
                    // }
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH", 
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_NONE"
                    }
                ]
            };
            
            console.log('Дані запиту мультиплеєра:', JSON.stringify(requestBody).substring(0, 150) + '...');
            console.log('Початок відправки запиту до API Gemini для мультиплеєра...');
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            const aiResponseText = data.candidates[0].content.parts[0].text;
            
            // Парсимо JSON відповідь используя улучшенную функцию
            const aiResponse = this.parseAIResponse(aiResponseText);
            
            // Збереження контексту в conversationHistory як у одиночній грі
            if (window.gameState) {
                // Додаємо промпт користувача
                window.gameState.conversationHistory.push({
                    role: "user",
                    parts: [{ text: prompt }]
                });
                
                // Додаємо відповідь моделі
                window.gameState.conversationHistory.push({
                    role: "model", 
                    parts: [{ text: aiResponseText }]
                });
                
                // Зберігаємо опис персонажа якщо є character_appearance
                if (aiResponse.character_appearance && window.gameState.character) {
                    window.gameState.character.appearance = aiResponse.character_appearance;
                    console.log('Збережено опис персонажа:', window.gameState.character.appearance);
                }
                
                // Додаємо до історії гри
                window.gameState.gameHistory.push({
                    scene: aiResponse,
                    character: { ...window.gameState.character },
                    timestamp: new Date().toLocaleString(),
                    type: 'multiplayer_turn'
                });
                
                console.log('Збережено мультиплеєрний хід в історію');
                
                // Перевіряємо, чи потрібна сумаризація як у одиночній грі
                const eventsToSummarize = 10;
                const unsummarizedPairs = window.gameState.gameHistory.filter(event => !event.scene?.summarized).length;
                if (unsummarizedPairs >= eventsToSummarize) {
                    console.log('Потрібна сумаризація мультиплеєрної історії:', unsummarizedPairs, 'подій');
                    // Можна викликати сумаризацію, якщо потрібно
                    // this.generateMultiplayerHistorySummary();
                }
                
                // Зберігаємо промпти для зображень як у одиночній грі
                if (aiResponse.image_prompt && typeof window.imageGenerator !== 'undefined') {
                    window.lastImagePrompt = aiResponse.image_prompt;
                    window.safeImagePrompt = aiResponse.safe_image_prompt || aiResponse.image_prompt;
                    
                    console.log('Image prompts saved from multiplayer response:', {
                        regular: window.lastImagePrompt,
                        safe: window.safeImagePrompt
                    });
                }
            }
            
            // Відправляємо результат на сервер
            this.socket.send(JSON.stringify({
                type: 'ai_response',
                aiResponse: aiResponse
            }));
            
        } catch (error) {
            console.error('Помилка при виклику Gemini API:', error);
            alert('Помилка обробки дій через ШІ');
        }
    }

    // Обробка створення персонажа
    handleCharacterCreated(message) {
        console.log('Персонаж створено:', message);
        
        // Оновлюємо локальний список гравців
        if (message.players) {
            this.players = message.players;
        }
        
        this.updateCharacterCreationStatus();
    }

    // Обробка готовності всіх персонажів
    handleAllCharactersReady() {
        console.log('Всі персонажі готові, починаємо гру');
        document.getElementById('characterCreation').style.display = 'none';
        document.getElementById('gameSession').style.display = 'block';
        this.updateActionStatus({}, this.players);
        
        // Ховаємо модальне вікно мультиплеєра
        this.hideModal();
        
        // Показуємо основну ігрову область
        document.getElementById('gameArea').style.display = 'grid';
        document.getElementById('setupScreen').style.display = 'none';
        
        // Якщо це хост, генеруємо початкову сцену
        if (this.isHost) {
            this.generateInitialMultiplayerScene();
        } else {
            // Інші гравці чекають на початкову історію від хоста
            document.getElementById('storyText').innerHTML = '<div class="loading">Очікування початкової історії від хоста...</div>';
        }
    }

    // Обробка отримання початкової історії
    handleInitialStoryReceived(message) {
        console.log('Обробка початкової історії:', message.storyData);
        
        // Оновлюємо стан гри
        if (message.gameState) {
            window.gameState = { ...window.gameState, ...message.gameState };
        }
        
        // Відображаємо початкову історію
        const storyData = message.storyData;
        if (storyData) {
            // Показуємо головний текст історії
            const storyTextElement = document.getElementById('storyText');
            if (storyTextElement && storyData.text) {
                storyTextElement.innerHTML = `<p>${storyData.text}</p>`;
            }
            
            // Відображаємо опції (загальні + персональні)
            this.displayMultiplayerOptions(storyData);
            
            // Генеруємо озвучування як у одиночній грі
            if (window.voiceGenerator && storyData.text) {
                let instructions = storyData.instructions;
                if (!instructions) {
                    // Fallback генерация инструкций, если их нет
                    instructions = "Identity: Fantasy Narrator\nAffect: Dramatic and mysterious\nTone: Deep and resonant\nEmotion: Tense and suspenseful\nPronunciation: Clear and articulate\nPause: Brief pauses after important moments";
                }
                window.voiceGenerator.generateVoice(storyData.text, { instructions });
            }
            
            // Оновлюємо індивідуальні дані гравця, якщо є
            if (storyData.players) {
                this.processPlayerResults(storyData.players);
            }
            
            // Генеруємо зображення для сцени (тільки хост) як у одиночній грі
            if (this.isHost && window.imageGenerator && typeof window.imageGenerator !== 'undefined') {
                const apiKey = this.hostApiKey || window.gameState?.apiKey;
                if (apiKey) {
                    // Використовуємо image_prompt з відповіді, як у одиночній грі
                    if (storyData.image_prompt) {
                        window.imageGenerator.generateImage(
                            storyData.image_prompt, 
                            apiKey, 
                            storyData.safe_image_prompt || storyData.image_prompt
                        ).then(imageUrl => {
                            if (imageUrl) {
                                // Відображаємо зображення локально для хоста
                                window.imageGenerator.displayGeneratedImage(imageUrl);
                                // Відправляємо зображення іншим гравцям через WebSocket
                                this.sendImageToOtherPlayers(imageUrl);
                            }
                        }).catch(error => {
                            console.error('Помилка генерації зображення:', error);
                        });
                    } else if (storyData.text) {
                        // Fallback на текст, якщо немає image_prompt
                        window.imageGenerator.generateImage(
                            storyData.text, 
                            apiKey, 
                            storyData.text
                        ).then(imageUrl => {
                            if (imageUrl) {
                                // Відображаємо зображення локально для хоста
                                window.imageGenerator.displayGeneratedImage(imageUrl);
                                this.sendImageToOtherPlayers(imageUrl);
                            }
                        }).catch(error => {
                            console.error('Помилка генерації зображення (fallback):', error);
                        });
                    }
                }
            }
            
            // Переконуємося, що гра не в стані завантаження
            window.gameState.isLoading = false;
            
            // Активуємо елементи інтерфейсу
            const customActionBtn = document.getElementById('customActionBtn');
            if (customActionBtn) {
                customActionBtn.disabled = false;
            }
        }
    }

    // Відображення опцій для мультиплеєра (загальні + персональні)
    displayMultiplayerOptions(storyData) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        // Знаходимо поточного гравця за ім'ям персонажа
        let currentPlayerData = null;
        let currentPlayerId = null;
        const myCharacterName = window.gameState?.character?.name;
        
        console.log('🔍 Searching for current player:', { myCharacterName });
        console.log('🔍 Available players in storyData:', storyData.players ? Object.keys(storyData.players) : 'none');
        
        if (myCharacterName && storyData.players) {
            Object.entries(storyData.players).forEach(([playerId, playerData]) => {
                console.log(`🔍 Checking player ${playerId}:`, { name: playerData.name, matches: playerData.name === myCharacterName });
                if (playerData.name === myCharacterName) {
                    currentPlayerData = playerData;
                    currentPlayerId = playerId;
                    console.log('✅ Found current player data:', currentPlayerData);
                }
            });
        }
        
        console.log('🔍 Current player found:', !!currentPlayerData);
        
        // Показуємо загальні опції
        if (storyData.options && Array.isArray(storyData.options)) {
            const generalOptionsTitle = document.createElement('h4');
            generalOptionsTitle.textContent = '🌍 Загальні дії:';
            generalOptionsTitle.style.cssText = 'color: #4ecdc4; margin: 15px 0 10px 0;';
            optionsContainer.appendChild(generalOptionsTitle);
            
            storyData.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
                button.textContent = `${index + 1}. ${option}`;
                button.onclick = () => {
                    // Для мультиплеера используем handleMultiplayerAction
                    if (window.handleMultiplayerAction) {
                        window.handleMultiplayerAction(option);
                    } else if (window.gameState && window.gameState.isMultiplayer) {
                        // Fallback - отправляем действие через мультиплеер менеджер
                        this.sendPlayerAction(option);
                    }
                };
                optionsContainer.appendChild(button);
            });
        }
        
        // Показуємо персональні опції для поточного гравця
        if (currentPlayerData && currentPlayerData.personal_options && Array.isArray(currentPlayerData.personal_options)) {
            const personalOptionsTitle = document.createElement('h4');
            personalOptionsTitle.textContent = `⚡ Персональні дії для ${currentPlayerData.name}:`;
            personalOptionsTitle.style.cssText = 'color: #ff6b6b; margin: 20px 0 10px 0;';
            optionsContainer.appendChild(personalOptionsTitle);
            
            currentPlayerData.personal_options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a52)';
                button.style.borderLeft = '4px solid #ffd700';
                button.textContent = `P${index + 1}. ${option}`;
                button.onclick = () => {
                    // Для мультиплеера используем handleMultiplayerAction
                    if (window.handleMultiplayerAction) {
                        window.handleMultiplayerAction(option);
                    } else if (window.gameState && window.gameState.isMultiplayer) {
                        // Fallback - отправляем действие через мультиплеер менеджер
                        this.sendPlayerAction(option);
                    }
                };
                optionsContainer.appendChild(button);
            });
        }
        
        // Показуємо персональную историю (для всех, не только введение)
        if (currentPlayerData) {
            // Персональное введение, если есть
            if (currentPlayerData.personal_intro) {
                const personalIntro = document.createElement('div');
                personalIntro.style.cssText = `
                    background: rgba(255, 107, 107, 0.1);
                    border-left: 4px solid #ff6b6b;
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 5px;
                    font-style: italic;
                `;
                personalIntro.innerHTML = `<strong>📜 Особиста історія:</strong> ${currentPlayerData.personal_intro}`;
                optionsContainer.appendChild(personalIntro);
            }
            
            // Персональная история/результат, если есть
            if (currentPlayerData.personal_story) {
                const personalStory = document.createElement('div');
                personalStory.style.cssText = `
                    background: rgba(255, 215, 0, 0.1);
                    border-left: 4px solid #ffd700;
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 5px;
                    font-style: italic;
                `;
                personalStory.innerHTML = `<strong>⭐ Ваш особистий результат:</strong> ${currentPlayerData.personal_story}`;
                optionsContainer.appendChild(personalStory);
            }
        }
    }

    // Відправка зображення іншим гравцям (тільки хост)
    sendImageToOtherPlayers(imageUrl) {
        if (this.isHost && this.socket && this.isConnected) {
            console.log('Відправляємо зображення іншим гравцям');
            this.socket.send(JSON.stringify({
                type: 'image_share',
                imageUrl: imageUrl
            }));
        }
    }

    // Обробка отримання зображення від хоста
    handleImageReceived(imageUrl) {
        if (!this.isHost && imageUrl && window.imageGenerator) {
            console.log('Отримано зображення від хоста');
            // Відображаємо зображення, яке згенерував хост
            window.imageGenerator.displayGeneratedImage(imageUrl);
        }
    }

    // Початок гри після створення всіх персонажів
    startGameAfterCharacterCreation() {
        // Show the game area
        document.getElementById('gameArea').style.display = 'block';
        
        // Initialize game UI
        if (typeof updateCharacterPanel === 'function') {
            updateCharacterPanel();
        }
        if (typeof initSoundControls === 'function') {
            initSoundControls();
        }
        
        // Generate initial scene only for single player or if host
        if (this.isHost && typeof generateInitialScene === 'function') {
            generateInitialScene();
        }
        
        // Hide multiplayer modal
        this.hideModal();
    }

    // Оновлення статусу створення персонажів
    updateCharacterCreationStatus() {
        const statusDiv = document.getElementById('characterCreationStatus');
        if (!statusDiv) return;
        
        const statusTitle = this.getText('playersStatus') || 'Статус гравців:';
        let statusHTML = `<h4>${statusTitle}</h4>`;
        this.players.forEach(player => {
            const hasCharacter = player.character ? '✅' : '⏳';
            const characterInfo = player.character ? 
                ` (${player.character.name} - ${player.character.class})` : 
                ` (${this.getText('waitingForCharacters') || 'очікує створення персонажа'})`;
            statusHTML += `<div style="margin: 5px 0;">${hasCharacter} ${player.name}${characterInfo}</div>`;
        });
        
        statusDiv.innerHTML = statusHTML;
    }

    // Відкриття створення персонажа
    openCharacterCreation() {
        // Показуємо екран створення персонажа з гри
        document.getElementById('setupScreen').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        this.hideModal();
        
        // Встановлюємо прапорець мультиплеєра
        window.gameState.isMultiplayer = true;
    }

    // Відправка створеного персонажа на сервер
    sendCharacterToServer(character) {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'character_created',
                character: character
            }));
        }
    }

    // Универсальная функция для парсинга JSON с той же логикой что в game.js
    parseAIResponse(responseText) {
        console.log('🔍 Початок парсингу AI відповіді (перші 300 символів):', responseText.substring(0, 300));
        
        let gameData = null;
        
        // Перевіряємо наявність вкладеного JSON
        const hasNestedJson = responseText.includes('```json') || responseText.includes('```\n{');
        
        if (hasNestedJson) {
            console.log('🔍 ЗНАЙДЕНО ВКЛАДЕНИЙ JSON - починаємо обробку');
            try {
                // Спочатку парсимо верхній рівень
                const outerObj = JSON.parse(responseText);
                console.log('🔍 УСПІШНО РОЗПАРСИЛИ ЗОВНІШНІЙ РІВЕНЬ, ключі:', Object.keys(outerObj));
                
                // Якщо text містить JSON-рядок, витягуємо і парсимо його
                if (outerObj.text && outerObj.text.includes('```json')) {
                    console.log('🔍 ЗНАЙДЕНО ```json В ПОЛІ TEXT, починаємо витягування');
                    console.log('🔍 Оригінальний text (перші 200 символів):', outerObj.text.substring(0, 200));
                    
                    let innerJson = outerObj.text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
                    console.log('🔍 ПІСЛЯ ОЧИСТКИ innerJson (перші 200 символів):', innerJson.substring(0, 200));
                    
                    const innerObj = JSON.parse(innerJson);
                    console.log('🔍 УСПІШНО РОЗПАРСИЛИ ВНУТРІШНІЙ JSON, ключі:', Object.keys(innerObj));
                    // Використовуємо внутрішній об'єкт як результат
                    responseText = innerJson;
                    console.log('🔍 ЗАМІНИЛИ responseText на innerJson');
                }
            } catch (nestedError) {
                console.error('❌ ПОМИЛКА ПРИ ОБРОБЦІ ВКЛАДЕНОГО JSON:', nestedError);
                console.error('❌ Деталі помилки:', nestedError.message);
                console.error('❌ Стек помилки:', nestedError.stack);
            }
        }
        
        // Покращена обробка для видалення тексту, що не є частиною JSON
        function extractJsonFromText(text) {
            try {
                // Спробуємо парсити як є
                return JSON.parse(text);
            } catch (e) {
                // Шукаємо перший відкриваючий символ JSON об'єкта
                const jsonStart = text.indexOf('{');
                if (jsonStart < 0) return null;
                
                // Шукаємо останній закриваючий символ JSON об'єкта
                const jsonEnd = text.lastIndexOf('}');
                if (jsonEnd < 0 || jsonEnd <= jsonStart) return null;
                
                try {
                    // Витягуємо підрядок, який може бути JSON
                    const jsonSubstring = text.substring(jsonStart, jsonEnd + 1);
                    return JSON.parse(jsonSubstring);
                } catch (subError) {
                    // Якщо не вдалося, повертаємо null
                    return null;
                }
            }
        }
        
        // Логуємо отриману відповідь для налагодження
        console.log('🔍 ОСТАТОЧНА ВІДПОВІДЬ для парсингу (перші 200 символів):', responseText.substring(0, 200) + '...');
        console.log('🔍 ОСТАТОЧНА ВІДПОВІДЬ довжина:', responseText.length);
        
        // Спроба 1: Парсинг як є
        try {
            console.log('🔄 СПРОБА 1: Парсинг як є...');
            gameData = JSON.parse(responseText);
            console.log('✅ СПРОБА 1 УСПІШНА: дані мають структуру:', Object.keys(gameData).join(', '));
        } catch (parseError1) {
            console.log('❌ СПРОБА 1 НЕВДАЛА:', parseError1.message);
        }
        
        // Спроба 2: Очищаємо markdown та пробуємо знову
        if (!gameData) {
            console.log('🔄 СПРОБА 2: Очищаємо markdown...');
            let cleanedText = responseText.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
            
            try {
                gameData = JSON.parse(cleanedText);
                console.log('✅ СПРОБА 2 УСПІШНА: після очистки markdown, ключі:', Object.keys(gameData).join(', '));
            } catch (parseError2) {
                console.log('❌ СПРОБА 2 НЕВДАЛА:', parseError2.message);
            }
        }
        
        // Спроба 3: Очищаємо управляючі символи та пробуємо знову
        if (!gameData) {
            console.log('🔄 СПРОБА 3: Очищаємо управляючі символи...');
            // Очищаємо управляючі символи, які можуть викликати помилки
            let cleanedText = JSON.stringify(JSON.parse(responseText.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')));
            
            console.log('🔍 Очищений текст (перші 200 символів):', cleanedText.substring(0, 200));
            
            try {
                gameData = JSON.parse(cleanedText);
                console.log('✅ СПРОБА 3 УСПІШНА: після очистки управляючих символів, ключі:', Object.keys(gameData).join(', '));
            } catch (cleanError) {
                console.log('❌ СПРОБА 3 НЕВДАЛА: навіть після очистки символів');
                console.log('❌ Помилка:', cleanError.message);
            }
        }
        
        // Спроба 4: Шукаємо JSON в тексті, який може бути розбитий або містити зайві символи
        if (!gameData) {
            console.log('🔄 СПРОБА 4: Пошук JSON по регексу...');
            const jsonRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            const matches = responseText.match(jsonRegex);
            
            if (matches) {
                console.log(`🔍 Знайдено ${matches.length} можливих JSON об'єктів`);
                // Перебираємо всі знайдені можливі JSON-об'єкти
                for (let i = 0; i < matches.length; i++) {
                    const match = matches[i];
                    console.log(`🔍 Перевіряємо JSON ${i + 1}/${matches.length} (перші 100 символів):`, match.substring(0, 100));
                    try {
                        const potentialData = JSON.parse(match);
                        console.log(`🔍 JSON ${i + 1} успішно розпарсений, ключі:`, Object.keys(potentialData));
                        // Перевіряємо, чи має об'єкт потрібні властивості для мультиплеєра
                        if (potentialData.text && (potentialData.options || potentialData.players)) {
                            gameData = potentialData;
                            console.log(`✅ СПРОБА 4 УСПІШНА: використовуємо JSON ${i + 1}`);
                            break;
                        } else {
                            console.log(`🔍 JSON ${i + 1} не має потрібних властивостей для мультиплеєра`);
                        }
                    } catch (parseErr) {
                        console.log(`❌ JSON ${i + 1} не вдалося розпарсити:`, parseErr.message);
                        // Спробуємо очистити цей JSON від управляючих символів
                        try {
                            console.log(`🔄 Спробуємо очистити JSON ${i + 1} від управляючих символів...`);
                            const cleanedMatch = JSON.stringify(JSON.parse(match.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')));
                            const cleanedData = JSON.parse(cleanedMatch);
                            if (cleanedData.text && (cleanedData.options || cleanedData.players)) {
                                gameData = cleanedData;
                                console.log(`✅ СПРОБА 4 УСПІШНА: використовуємо очищений JSON ${i + 1}`);
                                break;
                            }
                        } catch (cleanParseErr) {
                            console.log(`❌ Очищений JSON ${i + 1} теж не вдалося розпарсити:`, cleanParseErr.message);
                        }
                        continue;
                    }
                }
            } else {
                console.log('❌ Не знайдено жодного можливого JSON об\'єкта в тексті');
            }
        }
        
        // Спроба 5: Функція витягування JSON
        if (!gameData) {
            console.log('🔄 СПРОБА 5: Витягування JSON функцією...');
            gameData = extractJsonFromText(responseText);
            if (gameData) {
                console.log('✅ СПРОБА 5 УСПІШНА: витягнули JSON функцією');
            } else {
                console.log('❌ СПРОБА 5 НЕВДАЛА: не вдалося витягнути JSON');
            }
        }
        
        if (!gameData) {
            console.error('❌ НЕ ВДАЛОСЯ РОЗПАРСИТИ JSON ВІДПОВІДЬ ПІСЛЯ ВСІХ СПРОБ');
            throw new Error('Не вдалося розпарсити JSON відповідь від ШІ');
        }
        
        console.log('✅ ПАРСИНГ ЗАВЕРШЕНО УСПІШНО. Фінальні ключі:', Object.keys(gameData).join(', '));
        
        // Дополнительное логирование для персональных данных
        if (gameData.players) {
            console.log('🎮 Players data found:', Object.keys(gameData.players));
            Object.entries(gameData.players).forEach(([playerId, playerData]) => {
                console.log(`👤 Player ${playerId}:`, {
                    name: playerData.name,
                    hasPersonalOptions: !!playerData.personal_options,
                    personalOptionsCount: playerData.personal_options ? playerData.personal_options.length : 0,
                    hasPersonalStory: !!playerData.personal_story,
                    hasPersonalIntro: !!playerData.personal_intro
                });
            });
        }
        
        return gameData;
    }

    // Локалізація для мультиплеєра
    getText(key) {
        const lang = window.gameState?.language || 'uk';
        const multiplayerTexts = {
            uk: {
                hostGame: 'Створити лобі',
                joinGame: 'Приєднатися до лобі',
                createLobby: 'Створити лобі',
                startGame: 'Почати гру',
                connect: 'Підключитися',
                leaveGame: 'Покинути гру',
                createCharacter: 'Створити персонажа',
                confirmLeaveGame: 'Ви впевнені, що хочете покинути гру?',
                apiKeyRequired: 'API ключ Gemini обов\'язковий для хоста',
                enterNameAndCode: 'Введіть ім\'я та код лобі',
                hostSetupTitle: 'Налаштування хоста',
                characterCreationTitle: 'Створення персонажів',
                characterCreationDesc: 'Всі гравці повинні створити своїх персонажів'
            },
            en: {
                hostGame: 'Host Game',
                joinGame: 'Join Game',
                createLobby: 'Create Lobby',
                startGame: 'Start Game',
                connect: 'Connect',
                leaveGame: 'Leave Game',
                createCharacter: 'Create Character',
                confirmLeaveGame: 'Are you sure you want to leave the game?',
                apiKeyRequired: 'Gemini API key is required for host',
                enterNameAndCode: 'Enter name and lobby code',
                hostSetupTitle: 'Host Setup',
                characterCreationTitle: 'Character Creation',
                characterCreationDesc: 'All players must create their characters'
            },
            ru: {
                hostGame: 'Создать игру',
                joinGame: 'Присоединиться к игре',
                createLobby: 'Создать лобби',
                startGame: 'Начать игру',
                connect: 'Подключиться',
                leaveGame: 'Покинуть игру',
                createCharacter: 'Создать персонажа',
                confirmLeaveGame: 'Вы уверены, что хотите покинуть игру?',
                apiKeyRequired: 'API ключ Gemini обязателен для хоста',
                enterNameAndCode: 'Введите имя и код лобби',
                hostSetupTitle: 'Настройка хоста',
                characterCreationTitle: 'Создание персонажей',
                characterCreationDesc: 'Все игроки должны создать своих персонажей'
            }
        };
        
        return multiplayerTexts[lang]?.[key] || key;
    }

    // Генерація початкової сцени для мультиплеєра (тільки хост)
    async generateInitialMultiplayerScene() {
        if (!this.isHost) return;
        
        console.log('Генеруємо початкову сцену для мультиплеєра');
        
        try {
            // Будуємо промпт з інформацією про всіх персонажів
            const initialPrompt = this.buildInitialMultiplayerPrompt();
            
            // Викликаємо API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.hostApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: initialPrompt }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 1000000,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH", 
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_NONE"
                        }
                    ]
                })
            });

            const data = await response.json();
            const responseText = data.candidates[0].content.parts[0].text;
            
            // Парсимо JSON відповідь используя улучшенную функцию
            const aiResponse = this.parseAIResponse(responseText);
            
            // Відправляємо початкову історію всім гравцям
            this.socket.send(JSON.stringify({
                type: 'initial_story',
                storyData: aiResponse
            }));
            
        } catch (error) {
            console.error('Помилка при генерації початкової сцени:', error);
            alert('Помилка генерації початкової історії');
        }
    }

    // Будуємо промпт для початкової сцени мультиплеєра
    buildInitialMultiplayerPrompt() {
        let prompt = `Ты - мастер игры в D&D для мультиплеера. Создай начальную сцену для группы персонажей.\n\n`;
        
        // Додаємо інформацію про всіх персонажів
        prompt += `ИНФОРМАЦИЯ О ВСЕХ ПЕРСОНАЖАХ В ГРУППЕ:\n`;
        this.players.forEach((player, index) => {
            if (player.character) {
                prompt += `\n${index + 1}. Игрок: ${player.character.name}\n`;
                prompt += `   Класс: ${player.character.class}\n`;
                prompt += `   Уровень: ${player.character.level || 1}\n`;
                prompt += `   HP: ${player.character.health}/${player.character.maxHealth}\n`;
                prompt += `   Mana: ${player.character.mana}/${player.character.maxMana}\n`;
                prompt += `   Начальные перки: ${player.character.perks.join(', ')}\n`;
            }
        });

        // Додаємо інструкції для зображень як у одиночній грі
        prompt += `\n\nYou should generate TWO image prompts describing the current scene with detailed description of characters so they should be the same style all the time on pics.: \n\n1. 'image_prompt': This is a detailed prompt with full visual description. Example: 'A heroic warrior with a huge beard (and much more details) battles a fierce dragon in a dark cave, flames illuminating the scene, fantasy style'\n\n2. 'safe_image_prompt': This is a simplified, safer version that avoids potentially problematic content. Focus on landscapes, objects, or simple character poses without combat or controversial elements but with detailed description of characters. Example: 'A warrior with huge beard (much more details) standing in a cave entrance, light filtering in from outside, fantasy style'`;
        
        // Додаємо інструкції для озвучування
        prompt += `\n\nAlso, generate instructions for voice narration in a field called 'instructions'. These must be a SIMPLE STRING value, not an object or array. These should specify the tone, emotion, and style for narrating the scene, using exactly this format:\nIdentity: Fantasy Narrator\nAffect: Dramatic and mysterious\nTone: Deep and resonant\nEmotion: Tense and suspenseful\nPronunciation: Clear and articulate\nPause: Brief pauses after important moments\n\nDo not include any quotes, brackets, or special characters around the instructions text. Just plain text.`;

        prompt += `\n\nВАЖНО: Ответь ТОЛЬКО чистым JSON без markdown блоков!\n\n`;
        prompt += `Создай интересную начальную ситуацию, где ВСЕ персонажи встречаются и начинают совместную авантюру. Учти характеристики каждого персонажа.\n\n`;
        prompt += `КРИТИЧЕСКИ ВАЖНО: КАЖДЫЙ игрок ОБЯЗАТЕЛЬНО должен получить:\n`;
        prompt += `1. personal_intro - персональное введение описывающее что замечает именно этот персонаж\n`;
        prompt += `2. personal_options - массив из 4 уникальных действий специфичных для класса и перков этого игрока\n`;
        prompt += `3. Действия должны быть разными для каждого класса и учитывать их способности\n\n`;
        
        prompt += `Формат ответа:\n`;
        prompt += `{\n`;
        prompt += `  "text": "общее описание начальной сцены для всех персонажей",\n`;
        prompt += `  "options": ["общий вариант 1", "общий вариант 2", "общий вариант 3", "общий вариант 4"],\n`;
        prompt += `  "image_prompt": "detailed image prompt for scene visualization",\n`;
        prompt += `  "safe_image_prompt": "safer alternative image prompt",\n`;
        prompt += `  "instructions": "voice narration instructions as simple string",\n`;
        prompt += `  "players": {\n`;
        
        // Добавляем объект для каждого игрока
        this.players.forEach((player, index) => {
            if (player.character) {
                const playerId = player.id || `player_${index}`;
                const isLast = index === this.players.length - 1;
                prompt += `    "${playerId}": {\n`;
                prompt += `      "name": "${player.character.name}",\n`;
                prompt += `      "personal_intro": "персональное вступление для ${player.character.name}",\n`;
                prompt += `      "personal_options": ["${player.character.class}-специфический вариант 1 для ${player.character.name}", "${player.character.class}-специфический вариант 2 для ${player.character.name}", "вариант используя перк '${player.character.perks[0] || 'способность'}' для ${player.character.name}", "уникальное действие для ${player.character.name}"],\n`;
                prompt += `      "consequences": {\n`;
                prompt += `        "health": 0,\n`;
                prompt += `        "mana": 0,\n`;
                prompt += `        "experience": 0,\n`;
                prompt += `        "new_perks": [],\n`;
                prompt += `        "level_up": false\n`;
                prompt += `      }\n`;
                prompt += `    }${isLast ? '' : ','}\n`;
            }
        });
        
        prompt += `  },\n`;
        prompt += `  "combat": false,\n`;
        prompt += `  "enemy": null,\n`;
        prompt += `  "gameover": false\n`;
        prompt += `}\n\n`;
        prompt += `НЕ добавляй поля для TTS/voice! Создай ситуацию, где персонажи могут взаимодействовать.`;
        
        return prompt;
    }

    // Обробка індивідуальних результатів гравців
    processPlayerResults(playersData) {
        // В мультиплеєрі ID гравця зберігається на сервері
        // Для спрощення, обробляємо дані для всіх гравців, 
        // але оновлюємо тільки локальний стан персонажа
        
        // Знайдемо поточного гравця за ім'ям персонажа
        let myPlayerId = null;
        const myCharacterName = window.gameState?.character?.name;
        
        if (myCharacterName) {
            Object.entries(playersData).forEach(([playerId, playerData]) => {
                if (playerData.name === myCharacterName) {
                    myPlayerId = playerId;
                }
            });
        }
        
        // Якщо у нас є дані для поточного гравця, оновлюємо характеристики
        if (myPlayerId && playersData[myPlayerId]) {
            const myData = playersData[myPlayerId];
            
            if (myData.consequences) {
                // Оновлюємо характеристики персонажа
                if (window.gameState && window.gameState.character) {
                    const char = window.gameState.character;
                    
                    if (myData.consequences.health !== undefined) {
                        char.health = Math.max(0, char.health + myData.consequences.health);
                        char.health = Math.min(char.maxHealth, char.health);
                    }
                    
                    if (myData.consequences.mana !== undefined) {
                        char.mana = Math.max(0, char.mana + myData.consequences.mana);
                        char.mana = Math.min(char.maxMana, char.mana);
                    }
                    
                    if (myData.consequences.experience !== undefined) {
                        char.experience += myData.consequences.experience;
                    }
                    
                    if (myData.consequences.new_perks && myData.consequences.new_perks.length > 0) {
                        char.perks.push(...myData.consequences.new_perks);
                    }
                    
                    if (myData.consequences.level_up) {
                        char.level += 1;
                        // Можна додати логіку підвищення здоров'я/мани при підвищенні рівня
                    }
                    
                    // Оновлюємо панель персонажа
                    if (window.updateCharacterPanel) {
                        window.updateCharacterPanel();
                    }
                }
            }
            
            // Показуємо персональну історію, якщо вона є
            if (myData.personal_story) {
                this.showPersonalStory(myData.personal_story);
            }
        }
    }

    // Показати персональну історію гравця
    showPersonalStory(personalStory) {
        const storyElement = document.getElementById('storyText');
        if (storyElement && personalStory) {
            // Додаємо персональну історію під основною
            const personalDiv = document.createElement('div');
            personalDiv.style.cssText = `
                margin-top: 15px; 
                padding: 15px; 
                background: rgba(78, 205, 196, 0.1); 
                border-left: 4px solid #4ecdc4; 
                border-radius: 5px;
            `;
            personalDiv.innerHTML = `<strong>Ваша персональна історія:</strong><br>${personalStory}`;
            storyElement.appendChild(personalDiv);
        }
    }

    // Показати інформацію про ворога
    displayEnemyInfo(enemy) {
        const enemyInfo = document.getElementById('enemyInfo');
        const enemyDetails = document.getElementById('enemyDetails');
        
        if (enemyInfo && enemyDetails) {
            enemyInfo.style.display = 'block';
            
            let enemyHTML = `<strong>${enemy.name}</strong><br>`;
            
            if (enemy.health) {
                enemyHTML += `Здоров'я: ${enemy.health}<br>`;
            }
            
            if (enemy.description) {
                enemyHTML += `Опис: ${enemy.description}<br>`;
            }
            
            if (enemy.count) {
                enemyHTML += `Кількість: ${enemy.count}<br>`;
            }
            
            enemyDetails.innerHTML = enemyHTML;
        }
    }

    // Оновити опції дій
    updateOptions(options) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (optionsContainer && options) {
            optionsContainer.innerHTML = '';
            
            options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = option;
                button.onclick = () => {
                    if (window.performAction) {
                        window.performAction(option);
                    }
                };
                optionsContainer.appendChild(button);
            });
        }
    }

    // Показати індикатор мультиплеєра
    showMultiplayerIndicator() {
        const indicator = document.getElementById('multiplayerIndicator');
        if (indicator) {
            indicator.style.display = 'block';
            this.updatePlayerCountDisplay();
        }
    }

    // Сховати індикатор мультиплеєра
    hideMultiplayerIndicator() {
        const indicator = document.getElementById('multiplayerIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Оновити відображення кількості гравців
    updatePlayerCountDisplay() {
        const display = document.getElementById('playerCountDisplay');
        if (display && this.players) {
            display.textContent = `👥 Гравців: ${this.players.length}`;
        }
    }

    // Оновлення локалізації UI
    updateUILocalization() {
        const elements = {
            'multiplayerTitle': this.getText('multiplayer'),
            'betaWarningTitle': this.getText('multiplayerBetaWarning'),
            'betaWarningText': this.getText('multiplayerBetaDesc'),
            'hostGameBtn': this.getText('hostGame'),
            'joinGameBtn': this.getText('joinGame'),
            'hostSetupTitle': this.getText('hostSetupTitle'),
            'createLobbyBtn': this.getText('createLobby'),
            'lobbyCodeTitle': this.getText('lobbyCode'),
            'shareLobbyText': this.getText('shareLobbyCode'),
            'startGameBtn': this.getText('startGame'),
            'joinLobbyTitle': this.getText('joinLobby'),
            'connectBtn': this.getText('connect'),
            'playersInSessionTitle': this.getText('playersInSession'),
            'leaveGameBtn': this.getText('leaveGame'),
            'characterCreationTitle': this.getText('characterCreationTitle'),
            'characterCreationDesc': this.getText('characterCreationDesc'),
            'openCharacterCreator': this.getText('createCharacter')
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element && elements[id]) {
                if (element.tagName === 'BUTTON') {
                    element.textContent = elements[id];
                } else {
                    element.textContent = elements[id];
                }
            }
        });
    }

    // Перевірка та сумаризація історії для мультиплеєра
    async checkAndSummarizeHistoryForMultiplayer() {
        // Перевіряємо чи є доступна функція сумаризації з game.js
        if (typeof window.generateHistorySummary !== 'function') {
            console.log('Функція generateHistorySummary недоступна');
            return;
        }

        // Перевіряємо чи ми хост (тільки хост повинен робити сумаризацію)
        if (!this.isHost) {
            return;
        }

        // Перевіряємо чи є gameState та conversationHistory
        if (!window.gameState || !window.gameState.conversationHistory) {
            return;
        }

        // Параметри як у одиночній грі
        const eventsToSummarize = 10;
        const conversationThreshold = eventsToSummarize * 2; // 2 повідомлення на кожну взаємодію

        // Перевіряємо, чи потрібна сумаризація для conversationHistory
        const conversationLength = window.gameState.conversationHistory.length;
        const needConversationSummary = conversationLength >= conversationThreshold;

        // Перевіряємо, чи потрібна сумаризація для gameHistory
        const unsummarizedPairs = window.gameState.gameHistory ? 
            window.gameState.gameHistory.filter(event => event.scene && !event.scene.summarized).length : 0;
        const needGameHistorySummary = unsummarizedPairs >= eventsToSummarize;

        console.log('Перевірка сумаризації мультиплеєра:', {
            conversationLength,
            conversationThreshold,
            needConversationSummary,
            unsummarizedPairs,
            needGameHistorySummary
        });

        // Якщо потрібна сумаризація, викликаємо функцію з game.js
        if (needConversationSummary || needGameHistorySummary) {
            console.log('Запуск сумаризації історії для мультиплеєра...');
            
            try {
                // Зберігаємо API ключ хоста для функції сумаризації
                const originalApiKey = window.gameState.apiKey;
                window.gameState.apiKey = this.hostApiKey;
                
                // Визначаємо чи це інкрементальна сумаризація
                const isIncremental = window.gameState.summarizedHistory && window.gameState.summarizedHistory.length > 0;
                
                // Викликаємо функцію сумаризації
                const summaryText = await window.generateHistorySummary(isIncremental);
                
                // Відновлюємо оригінальний API ключ
                window.gameState.apiKey = originalApiKey;
                
                if (summaryText) {
                    console.log('Сумаризація мультиплеєра успішна:', summaryText.substring(0, 100) + '...');
                } else {
                    console.log('Сумаризація мультиплеєра не дала результату');
                }
                
            } catch (error) {
                console.error('Помилка при сумаризації історії мультиплеєра:', error);
                
                // Відновлюємо оригінальний API ключ у випадку помилки
                if (window.gameState) {
                    window.gameState.apiKey = window.gameState.apiKey || null;
                }
            }
        }
    }
}

// Глобальний екземпляр мультиплеєра
window.multiplayerManager = new MultiplayerManager();

// Експорт для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}