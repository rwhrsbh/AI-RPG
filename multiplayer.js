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
                    <h2>Мультиплеєр (БЕТА)</h2>
                    <span class="close" id="closeMultiplayer">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="beta-warning">
                        <h3>⚠️ УВАГА: БЕТА ВЕРСІЯ</h3>
                        <p>Мультиплеєр знаходиться в стадії бета-тестування. Можливі проблеми з балансом та стабільністю.</p>
                    </div>
                    
                    <div id="multiplayerMenu">
                        <button id="hostGameBtn" class="mp-btn primary">Створити лобі</button>
                        <button id="joinGameBtn" class="mp-btn secondary">Приєднатися до лобі</button>
                    </div>
                    
                    <div id="hostLobby" style="display: none;">
                        <h3>Ваш код лобі:</h3>
                        <div class="lobby-code" id="lobbyCodeDisplay"></div>
                        <p>Поділіться цим кодом з друзями</p>
                        <div id="playersList"></div>
                        <button id="startGameBtn" class="mp-btn primary" disabled>Почати гру</button>
                    </div>
                    
                    <div id="joinLobby" style="display: none;">
                        <h3>Введіть код лобі:</h3>
                        <input type="text" id="lobbyCodeInput" placeholder="Код лобі (6 символів)" maxlength="6">
                        <button id="connectBtn" class="mp-btn primary">Підключитися</button>
                    </div>
                    
                    <div id="gameSession" style="display: none;">
                        <div class="players-status">
                            <h3>Гравці в сесії:</h3>
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

    // Створення гри
    hostGame() {
        this.isHost = true;
        this.lobbyCode = this.generateLobbyCode();
        
        document.getElementById('multiplayerMenu').style.display = 'none';
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
    joinGame(code) {
        this.isHost = false;
        this.lobbyCode = code;
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
                        code: this.lobbyCode
                    }));
                } else {
                    this.socket.send(JSON.stringify({
                        type: 'join_lobby',
                        code: this.lobbyCode
                    }));
                }
            };
            
            this.socket.onmessage = (event) => {
                this.handleServerMessage(JSON.parse(event.data));
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
        document.getElementById('gameSession').style.display = 'block';
        
        this.gameState = gameState;
        this.updateActionStatus({}, this.players);
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
        // Оновлюємо стан гри результатами від сервера
        if (results.gameState) {
            window.gameState = results.gameState;
        }
        
        // Оновлюємо UI
        if (results.storyText) {
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
        document.getElementById('multiplayerMenu').style.display = 'block';
        
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
}

// Глобальний екземпляр мультиплеєра
window.multiplayerManager = new MultiplayerManager();

// Експорт для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}