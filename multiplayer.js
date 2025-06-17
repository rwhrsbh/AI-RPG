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
        this.playerId = this.getPersistentPlayerId(); // Используем постоянный ID игрока
        this.gameIntegration = null; // Интеграция с game.js
        
        // Устанавливаем URL сервера
        // this.serverUrl = 'ws://localhost:3001';
        this.serverUrl = 'wss://ai-rpg-c4df.onrender.com';
        // this.serverUrl = 'wss://f486-185-136-134-229.ngrok-free.app';
        
        // Пинг система для поддержания соединения
        this.pingInterval = null;
        this.pongTimeout = null;
        this.pingIntervalTime = 30000; // 30 секунд между пингами
        this.pongTimeoutTime = 100000000; // 10 секунд ожидание понга
        
        this.initializeUI();
    }

    // Генерация уникального ID игрока
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    // Получение постоянного ID игрока из localStorage или создание нового
    getPersistentPlayerId() {
        let playerId = localStorage.getItem('dndPlayerId');
        if (!playerId) {
            playerId = this.generatePlayerId();
            localStorage.setItem('dndPlayerId', playerId);
            console.log('🆔 Создан новый постоянный ID игрока:', playerId);
        } else {
            console.log('🆔 Загружен существующий ID игрока:', playerId);
        }
        return playerId;
    }

    // Сохранение последнего хост лобби
    saveLastHostLobby(lobbyCode) {
        localStorage.setItem('dndLastHostLobby', lobbyCode);
        localStorage.setItem('dndLastHostTime', Date.now().toString());
        console.log('💾 Сохранен последний хост лобби:', lobbyCode);
    }

    // Получение последнего хост лобби
    getLastHostLobby() {
        const lobbyCode = localStorage.getItem('dndLastHostLobby');
        const timestamp = localStorage.getItem('dndLastHostTime');
        
        // Проверяем, что лобби было создано не более 24*60 минут назад
        
        if (lobbyCode && timestamp) {
            const minutesAgo = (Date.now() - parseInt(timestamp)) / (1000 * 60);
            if (minutesAgo < 24*60) {
                console.log('🔄 Найдено последнее хост лобби:', lobbyCode, `(${Math.round(minutesAgo)} минут назад)`);
                return lobbyCode;
            } else {
                console.log('⏰ Последнее хост лобби слишком старое, удаляем');
                this.clearLastHostLobby();
            }
        }
        return null;
    }

    // Очистка данных последнего хост лобби
    clearLastHostLobby() {
        localStorage.removeItem('dndLastHostLobby');
        localStorage.removeItem('dndLastHostTime');
        console.log('🗑️ Данные последнего хост лобби очищены');
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
                    playerId: this.playerId,
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

    // Обработка сброса состояния хода
    handleTurnStateReset(message) {
        console.log('🔄 Получен сброс состояния хода:', message);
        
        // Разблокируем интерфейс
        if (document.getElementById('customActionBtn')) {
            document.getElementById('customActionBtn').disabled = false;
        }
        if (document.getElementById('customAction')) {
            document.getElementById('customAction').disabled = false;
        }
        
        // Включаем кнопки действий
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = false;
        });
        
        // Показываем сообщение о возможности повторить действие
        if (window.showMultiplayerError) {
            window.showMultiplayerError(message.message || 'Состояние хода сброшено, можете выполнить новые действия');
        }
    }

    // Обработка уведомления об ошибке AI
    handleAIErrorNotification(message) {
        console.error('❌ Получено уведомление об ошибке AI:', message);
        
        // Разблокируем интерфейс
        if (document.getElementById('customActionBtn')) {
            document.getElementById('customActionBtn').disabled = false;
        }
        if (document.getElementById('customAction')) {
            document.getElementById('customAction').disabled = false;
        }
        
        // Включаем кнопки действий
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = false;
        });
        
        // Показываем ошибку (указываем что это от уведомления чтобы избежать бесконечного цикла)
        if (window.showMultiplayerError) {
            window.showMultiplayerError(message.message, true);
        }
    }

    // Показ попапа выбора персонажа
    showCharacterSelectionPopup(message) {
        console.log('Показ выбора персонажа:', message);
        
        // Удаляем существующий попап если есть
        const existingPopup = document.getElementById('characterSelectionPopup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // Создаем новый попап
        const popup = document.createElement('div');
        popup.id = 'characterSelectionPopup';
        popup.className = 'modal';
        popup.style.display = 'block';
        
        const getText = (key) => {
            if (typeof window.getText === 'function') {
                return window.getText(key);
            }
            if (window.localization && window.gameState && window.localization[window.gameState.language]) {
                return window.localization[window.gameState.language][key] || key;
            }
            return key;
        };
        
        popup.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);">
                    <h2>🎮 ${getText('selectCharacter') || 'Выберите персонажа'}</h2>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px;">${getText('selectCharacterInfo') || 'Игра уже началась. Выберите персонажа для подключения:'}</p>
                    
                    <div class="character-selection-list">
                        ${message.availableCharacters.map(char => `
                            <div class="character-option" onclick="window.multiplayerManager.selectCharacter('${char.id}', '${message.lobbyCode}')" 
                                 style="padding: 15px; margin: 10px 0; background: rgba(76, 175, 80, 0.1); border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">
                                <h3 style="margin: 0 0 10px 0; color: #4CAF50;">${char.name}</h3>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                                    <div><strong>${getText('characterName') || 'Имя'}:</strong> ${char.character.name}</div>
                                    <div><strong>${getText('class') || 'Класс'}:</strong> ${char.character.class}</div>
                                    <div><strong>${getText('level') || 'Уровень'}:</strong> ${char.character.level}</div>
                                    <div><strong>${getText('health') || 'Здоровье'}:</strong> ${char.character.health}/${char.character.maxHealth}</div>
                                </div>
                                ${char.character.perks && char.character.perks.length > 0 ? `
                                    <div style="margin-top: 10px;">
                                        <strong>${getText('perks') || 'Перки'}:</strong>
                                        <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                            ${char.character.perks.slice(0, 3).join(', ')}${char.character.perks.length > 3 ? '...' : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="mp-btn secondary" onclick="window.multiplayerManager.cancelCharacterSelection()">${getText('cancel') || 'Отмена'}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Добавляем hover эффект
        popup.querySelectorAll('.character-option').forEach(option => {
            option.addEventListener('mouseenter', () => {
                option.style.borderColor = '#4CAF50';
                option.style.background = 'rgba(76, 175, 80, 0.2)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.borderColor = 'transparent';
                option.style.background = 'rgba(76, 175, 80, 0.1)';
            });
        });
    }

    // Выбор персонажа
    selectCharacter(characterId, lobbyCode) {
        console.log('Выбран персонаж:', characterId);
        
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'take_over_character',
                targetPlayerId: characterId,
                lobbyCode: lobbyCode
            }));
        }
    }

    // Отмена выбора персонажа
    cancelCharacterSelection() {
        const popup = document.getElementById('characterSelectionPopup');
        if (popup) {
            popup.remove();
        }
        this.hideModal();
    }

    // Обработка успешного взятия персонажа
    handleCharacterTakenOver(message) {
        console.log('=== НАЧАЛО handleCharacterTakenOver в multiplayer.js ===');
        console.log('Персонаж успешно взят:', message);
        console.log('gameIntegration доступен:', !!this.gameIntegration);
        console.log('onCharacterTakenOver доступен:', !!(this.gameIntegration && this.gameIntegration.onCharacterTakenOver));
        console.log('🔗 Состояние сокета после взятия персонажа:', this.socket?.readyState);
        console.log('🔗 Подключен ли сокет:', this.isConnected);
        
        // Закрываем попап выбора
        const popup = document.getElementById('characterSelectionPopup');
        if (popup) {
            popup.remove();
        }
        
        // Обновляем ID игрока
        this.playerId = message.playerId;
        this.lobbyCode = message.lobbyCode;
        
        // Убеждаемся что сокет все еще активен
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('✅ Сокет активен после взятия персонажа');
        } else {
            console.error('❌ Сокет не активен после взятия персонажа!', this.socket?.readyState);
        }
        
        // Уведомляем игровую интеграцию
        if (this.gameIntegration && this.gameIntegration.onCharacterTakenOver) {
            console.log('🎯 Вызываем gameIntegration.onCharacterTakenOver...');
            this.gameIntegration.onCharacterTakenOver(message);
            console.log('✅ gameIntegration.onCharacterTakenOver выполнен');
        } else {
            console.error('❌ gameIntegration или onCharacterTakenOver не найден!');
        }
        
        // Обновляем список игроков
        this.updatePlayersList(message.players);
        
        console.log('Игрок успешно подключился как:', message.character.name);
        console.log('=== КОНЕЦ handleCharacterTakenOver в multiplayer.js ===');
    }

    // Обработка переподключения игрока
    handlePlayerReconnected(message) {
        console.log('Игрок переподключился:', message);
        
        // Обновляем список игроков
        this.updatePlayersList(message.players);
        
        if (this.gameIntegration && this.gameIntegration.onPlayerReconnected) {
            this.gameIntegration.onPlayerReconnected(message);
        }
    }

    // Обработка отключения хоста
    handleHostDisconnected(message) {
        console.log('🚨 Хост отключился:', message);
        
        // Проверяем, запущен ли обратный отсчет
        if (message.countdownStarted) {
            console.log('⏰ Запускаем 2-минутный обратный отсчет ожидания хоста');
            this.showHostReconnectionCountdown(message);
        }
        
        // Обновляем список игроков
        this.updatePlayersList(message.players);
        
        if (this.gameIntegration && this.gameIntegration.onHostDisconnected) {
            this.gameIntegration.onHostDisconnected(message);
        }
    }

    // Обработка ситуации когда все игроки оффлайн
    handleAllPlayersOffline(message) {
        console.log('⚠️ Все игроки оффлайн:', message);
        
        if (this.gameIntegration && this.gameIntegration.onAllPlayersOffline) {
            this.gameIntegration.onAllPlayersOffline(message);
        }
    }

    // Обработка создания восстановительного лобби
    handleRecoveryLobbyCreated(message) {
        console.log('✅ Восстановительное лобби создано:', message);
        
        // Обновляем данные лобби
        this.lobbyCode = message.code;
        this.isHost = true;
        
        // Обновляем список игроков
        this.updatePlayersList(message.players);
        
        if (this.gameIntegration && this.gameIntegration.onRecoveryLobbyCreated) {
            this.gameIntegration.onRecoveryLobbyCreated(message);
        }
    }
    
    // Обработка возвращения хоста
    handleHostReconnected(message) {
        console.log('✅ Хост переподключился:', message);
        
        // Закрываем окно обратного отсчета если оно открыто
        this.hideHostReconnectionCountdown();
        
        // Обновляем список игроков
        this.updatePlayersList(message.players);
        
        if (this.gameIntegration && this.gameIntegration.onHostReconnected) {
            this.gameIntegration.onHostReconnected(message);
        }
    }
    
    // Обработка закрытия лобби из-за неявки хоста
    handleLobbyClosedHostTimeout(message) {
        console.log('❌ Лобби закрыто из-за неявки хоста:', message);
        
        // Закрываем окно обратного отсчета
        this.hideHostReconnectionCountdown();
        
        // Показываем уведомление
        alert(message.message || 'Лобби закрыто - хост не вернулся');
        
        // Возвращаемся в главное меню
        this.leaveGame();
        
        if (this.gameIntegration && this.gameIntegration.onLobbyClosedHostTimeout) {
            this.gameIntegration.onLobbyClosedHostTimeout(message);
        }
    }
    
    // Обработка закрытия лобби из-за выхода хоста
    handleLobbyClosedHostLeft(message) {
        console.log('❌ Лобби закрыто из-за выхода хоста:', message);
        
        // Показываем уведомление
        alert(message.message || 'Лобби закрыто - хост покинул игру');
        
        // Возвращаемся в главное меню
        this.leaveGame();
        
        if (this.gameIntegration && this.gameIntegration.onLobbyClosedHostLeft) {
            this.gameIntegration.onLobbyClosedHostLeft(message);
        }
    }
    
    // Показать окно обратного отсчета ожидания хоста
    showHostReconnectionCountdown(message) {
        // Удаляем предыдущее окно если есть
        this.hideHostReconnectionCountdown();
        
        const countdownDuration = message.countdownDuration || 120; // секунды
        let remainingTime = countdownDuration;
        
        // Создаем попап
        const popup = document.createElement('div');
        popup.id = 'hostReconnectionCountdown';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            border: 2px solid #ff6b6b;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
        `;
        
        content.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #ff6b6b;">🚨 Хост отключился</h2>
            <p style="margin: 0 0 20px 0; font-size: 18px;">Ожидаем возвращения хоста...</p>
            <div id="countdownTimer" style="font-size: 48px; font-weight: bold; color: #4ecdc4; margin: 20px 0;">
                ${this.formatTime(remainingTime)}
            </div>
            <p style="margin: 0; opacity: 0.8;">Если хост не вернется, лобби будет закрыто</p>
            
            <div style="margin-top: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #4ecdc4;">Игроки в лобби:</h3>
                <div id="countdownPlayersList" style="text-align: left; margin-top: 15px;"></div>
            </div>
        `;
        
        popup.appendChild(content);
        document.body.appendChild(popup);
        
        // Обновляем список игроков в попапе
        this.updateCountdownPlayersList(message.players);
        
        // Запускаем таймер
        this.hostCountdownInterval = setInterval(() => {
            remainingTime--;
            const timerElement = document.getElementById('countdownTimer');
            if (timerElement) {
                timerElement.textContent = this.formatTime(remainingTime);
                
                // Меняем цвет когда остается мало времени
                if (remainingTime <= 30) {
                    timerElement.style.color = '#ff6b6b';
                } else if (remainingTime <= 60) {
                    timerElement.style.color = '#ffa726';
                }
            }
            
            if (remainingTime <= 0) {
                clearInterval(this.hostCountdownInterval);
                // Сервер должен сам закрыть лобби, но на всякий случай
                console.log('⏰ Время ожидания хоста истекло');
            }
        }, 1000);
        
        console.log('⏰ Окно обратного отсчета показано');
    }
    
    // Скрыть окно обратного отсчета
    hideHostReconnectionCountdown() {
        const popup = document.getElementById('hostReconnectionCountdown');
        if (popup) {
            popup.remove();
        }
        
        if (this.hostCountdownInterval) {
            clearInterval(this.hostCountdownInterval);
            this.hostCountdownInterval = null;
        }
        
        console.log('⏰ Окно обратного отсчета скрыто');
    }
    
    // Обновить список игроков в окне обратного отсчета
    updateCountdownPlayersList(players) {
        const listElement = document.getElementById('countdownPlayersList');
        if (!listElement || !players) return;
        
        listElement.innerHTML = players.map(player => {
            const statusColor = player.status === 'online' ? '#4CAF50' : '#f44336';
            const statusIcon = player.status === 'online' ? '🟢' : '🔴';
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin: 5px 0; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <span>${player.character?.name || player.name}</span>
                    <span style="color: ${statusColor};">${statusIcon} ${this.getStatusText(player.status)}</span>
                </div>
            `;
        }).join('');
    }
    
    // Форматирование времени для отображения (мм:сс)
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Создание восстановительного лобби
    createRecoveryLobby(gameData, originalLobbyCode) {
        console.log('🔄 Создание восстановительного лобби...');
        
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'create_recovery_lobby',
                gameData: gameData,
                originalLobbyCode: originalLobbyCode
            }));
        }
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
                        <button id="reconnectHostBtn" class="mp-btn warning" style="display: none;">Переподключитися як хост</button>
                        <button id="loadMultiplayerGameBtn" class="mp-btn info">Завантажити мультиплеєрну гру</button>
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
            
            .mp-btn.warning {
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
            }
            
            .mp-btn.info {
                background: linear-gradient(135deg, #3498db, #2980b9);
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

        // Переподключение как хост
        document.getElementById('reconnectHostBtn').addEventListener('click', () => {
            this.reconnectAsHost();
        });

        // Загрузка мультиплеерной игры
        document.getElementById('loadMultiplayerGameBtn').addEventListener('click', () => {
            this.loadMultiplayerGameWithApiKey();
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
        
        // Проверяем наличие последнего хост лобби
        const lastLobby = this.getLastHostLobby();
        const reconnectBtn = document.getElementById('reconnectHostBtn');
        if (lastLobby && reconnectBtn) {
            reconnectBtn.style.display = 'block';
            reconnectBtn.textContent = `🔄 Переподключитися до лобі ${lastLobby}`;
        } else if (reconnectBtn) {
            reconnectBtn.style.display = 'none';
        }
        
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
            this.showApiKeyInput();
            return;
        }
        
        this.createLobby();
    }
    
    // Показать поле ввода API ключа в модальном окне
    showApiKeyInput() {
        const getText = window.getText || ((key) => key);
        const multiplayerMenu = document.getElementById('multiplayerMenu');
        
        multiplayerMenu.innerHTML = `
            <div class="api-key-section">
                <h3 style="color: #4ecdc4; margin-bottom: 15px;">
                    🔑 ${getText('enterApiKey') || 'Введіть Gemini API ключ'}
                </h3>
                <p style="margin-bottom: 15px; color: #ccc; font-size: 0.9em;">
                    ${getText('hostApiKeyRequired') || 'Хост повинен надати API ключ для створення лобі'}
                </p>
                <input type="password" id="multiplayerApiKey" placeholder="${getText('apiKeyPlaceholder') || 'Gemini API ключ'}" 
                       style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #4ecdc4; border-radius: 5px; background: rgba(0,0,0,0.3); color: white;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.multiplayerManager.saveApiKeyAndCreateLobby()" class="mp-btn primary" style="flex: 1;">
                        ${getText('createLobby') || 'Створити лобі'}
                    </button>
                    <button onclick="window.multiplayerManager.backToMultiplayerMenu()" class="mp-btn secondary" style="flex: 1;">
                        ${getText('back') || 'Назад'}
                    </button>
                </div>
            </div>
        `;
    }
    
    // Сохранить API ключ и создать лобби
    saveApiKeyAndCreateLobby() {
        const apiKey = document.getElementById('multiplayerApiKey').value.trim();
        if (!apiKey) {
            const getText = window.getText || ((key) => key);
            alert(getText('enterApiKey') || 'Будь ласка, введіть API ключ');
            return;
        }
        
        // Сохраняем API ключ в gameState
        if (!window.gameState) {
            window.gameState = { apiKey: '' };
        }
        window.gameState.apiKey = apiKey;
        
        // Возвращаемся к меню и создаем лобби
        this.backToMultiplayerMenu();
        this.createLobby();
    }
    
    // Вернуться к меню мультиплеера
    backToMultiplayerMenu() {
        const getText = window.getText || ((key) => key);
        const multiplayerMenu = document.getElementById('multiplayerMenu');
        
        // Проверяем наличие последнего хост лобби для показа кнопки переподключения
        const lastLobby = this.getLastHostLobby();
        const reconnectButton = lastLobby ? 
            `<button id="reconnectHostBtn" class="mp-btn warning">🔄 Переподключитися до лобі ${lastLobby}</button>` : 
            `<button id="reconnectHostBtn" class="mp-btn warning" style="display: none;">Переподключитися як хост</button>`;
        
        multiplayerMenu.innerHTML = `
            <button id="hostGameBtn" class="mp-btn primary">${getText('createLobby') || 'Створити лобі'}</button>
            <button id="joinGameBtn" class="mp-btn secondary">${getText('joinLobby') || 'Приєднатися до лобі'}</button>
            ${reconnectButton}
            <button id="loadMultiplayerGameBtn" class="mp-btn info">Завантажити мультиплеєрну гру</button>
        `;
        
        // Переподключаем обработчики событий
        document.getElementById('hostGameBtn').onclick = () => this.hostGame();
        document.getElementById('joinGameBtn').onclick = () => this.showJoinLobby();
        document.getElementById('reconnectHostBtn').onclick = () => this.reconnectAsHost();
        document.getElementById('loadMultiplayerGameBtn').onclick = () => this.loadMultiplayerGameWithApiKey();
    }
    
    // Создать лобби (выделенная функция)
    createLobby() {
        this.isHost = true;
        this.lobbyCode = this.generateLobbyCode();
        
        // Сохраняем последнее хост лобби
        this.saveLastHostLobby(this.lobbyCode);
        
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
        
        document.getElementById('joinLobby').style.display = 'none';
        
        this.connectToServer();
    }

    // Переподключение как хост к последнему лобби
    reconnectAsHost() {
        const lastLobby = this.getLastHostLobby();
        if (!lastLobby) {
            alert('Не найдено последнего хост лобби');
            return;
        }

        // Проверяем наличие API ключа
        if (!window.gameState || !window.gameState.apiKey) {
            this.showApiKeyInputForReconnect(lastLobby);
            return;
        }

        this.performHostReconnect(lastLobby);
    }

    // Показать поле ввода API ключа для переподключения хоста
    showApiKeyInputForReconnect(lobbyCode) {
        const getText = window.getText || ((key) => key);
        const multiplayerMenu = document.getElementById('multiplayerMenu');
        
        multiplayerMenu.innerHTML = `
            <div class="api-key-section">
                <h3 style="color: #f39c12; margin-bottom: 15px;">
                    🔑 ${getText('enterApiKey') || 'Введіть Gemini API ключ'}
                </h3>
                <p style="margin-bottom: 15px; color: #ccc; font-size: 0.9em;">
                    Для переподключення до лобі <strong>${lobbyCode}</strong> як хост потрібен API ключ
                </p>
                <input type="password" id="reconnectApiKey" placeholder="${getText('apiKeyPlaceholder') || 'Gemini API ключ'}" 
                       style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #f39c12; border-radius: 5px; background: rgba(0,0,0,0.3); color: white;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.multiplayerManager.saveApiKeyAndReconnect('${lobbyCode}')" class="mp-btn warning" style="flex: 1;">
                        🔄 Переподключитися
                    </button>
                    <button onclick="window.multiplayerManager.backToMultiplayerMenu()" class="mp-btn secondary" style="flex: 1;">
                        ${getText('back') || 'Назад'}
                    </button>
                </div>
            </div>
        `;
    }

    // Загрузка мультиплеерной игры с запросом API ключа
    loadMultiplayerGameWithApiKey() {
        // Проверяем наличие API ключа
        if (!window.gameState || !window.gameState.apiKey) {
            this.showApiKeyInputForLoad();
            return;
        }

        this.performMultiplayerLoad();
    }

    // Показать поле ввода API ключа для загрузки
    showApiKeyInputForLoad() {
        const getText = window.getText || ((key) => key);
        const multiplayerMenu = document.getElementById('multiplayerMenu');
        
        multiplayerMenu.innerHTML = `
            <div class="api-key-section">
                <h3 style="color: #3498db; margin-bottom: 15px;">
                    🔑 ${getText('enterApiKey') || 'Введіть Gemini API ключ'}
                </h3>
                <p style="margin-bottom: 15px; color: #ccc; font-size: 0.9em;">
                    Для завантаження мультиплеєрної гри потрібен API ключ
                </p>
                <input type="password" id="loadApiKey" placeholder="${getText('apiKeyPlaceholder') || 'Gemini API ключ'}" 
                       style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #3498db; border-radius: 5px; background: rgba(0,0,0,0.3); color: white;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.multiplayerManager.saveApiKeyAndLoad()" class="mp-btn info" style="flex: 1;">
                        📂 Завантажити
                    </button>
                    <button onclick="window.multiplayerManager.backToMultiplayerMenu()" class="mp-btn secondary" style="flex: 1;">
                        ${getText('back') || 'Назад'}
                    </button>
                </div>
            </div>
        `;
    }

    // Сохранение API ключа и переподключение
    saveApiKeyAndReconnect(lobbyCode) {
        const apiKey = document.getElementById('reconnectApiKey').value.trim();
        if (!apiKey) {
            alert('Введіть API ключ');
            return;
        }

        // Сохраняем API ключ
        if (!window.gameState) {
            window.gameState = {};
        }
        window.gameState.apiKey = apiKey;
        localStorage.setItem('dndApiKey', apiKey);

        this.performHostReconnect(lobbyCode);
    }

    // Сохранение API ключа и загрузка
    saveApiKeyAndLoad() {
        const apiKey = document.getElementById('loadApiKey').value.trim();
        if (!apiKey) {
            alert('Введіть API ключ');
            return;
        }

        // Сохраняем API ключ
        if (!window.gameState) {
            window.gameState = {};
        }
        window.gameState.apiKey = apiKey;
        localStorage.setItem('dndApiKey', apiKey);

        this.performMultiplayerLoad();
    }

    // Выполнение переподключения хоста
    performHostReconnect(lobbyCode) {
        this.isHost = true;
        this.lobbyCode = lobbyCode;
        
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('hostLobby').style.display = 'block';
        document.getElementById('lobbyCodeDisplay').textContent = this.lobbyCode;
        
        // Подключаемся к серверу и отправляем запрос на переподключение хоста
        this.connectToServerForReconnect(lobbyCode);
    }
    
    // Подключение к серверу для переподключения хоста
    connectToServerForReconnect(lobbyCode) {
        console.log('🔄 Переподключение хоста к лобби:', lobbyCode);
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }
        
        this.socket = new WebSocket(this.serverUrl);
        
        this.socket.onopen = () => {
            console.log('✅ WebSocket соединение установлено для переподключения хоста');
            this.isConnected = true;
            
            // Отправляем запрос на переподключение хоста
            this.socket.send(JSON.stringify({
                type: 'reconnect_host',
                playerId: this.playerId,
                lobbyCode: lobbyCode
            }));
        };
        
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleServerMessage(message);
            } catch (error) {
                console.error('Ошибка парсинга сообщения при переподключении хоста:', error);
            }
        };
        
        this.socket.onclose = () => {
            console.log('❌ WebSocket соединение закрыто');
            this.isConnected = false;
            this.handleDisconnection();
        };
        
        this.socket.onerror = (error) => {
            console.error('❌ Ошибка WebSocket:', error);
            this.isConnected = false;
        };
    }

    // Выполнение загрузки мультиплеерной игры
    performMultiplayerLoad() {
        // Скрываем модальное окно мультиплеера
        this.hideModal();
        
        // Вызываем функцию загрузки мультиплеерной игры из game.js
        if (window.loadMultiplayerGame) {
            window.loadMultiplayerGame();
        } else {
            alert('Функция загрузки мультиплеерной игры недоступна');
        }
    }

    // Підключення до сервера
    connectToServer() {
        const serverUrl = 'ws://localhost:3001';
        // const serverUrl = 'wss://ai-rpg-c4df.onrender.com';
// const serverUrl = 'wss://f486-185-136-134-229.ngrok-free.app';
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
                        playerId: this.playerId,
                        playerName: this.getPlayerName()
                    }));
                } else {
                    // Приєднуємося до лобі
                    this.socket.send(JSON.stringify({
                        type: 'join_lobby',
                        code: this.lobbyCode,
                        playerId: this.playerId,
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
            const playersWithCharacters = players.filter(p => p.character);
            console.log('Обновляем кнопку старта игры. Всего игроков:', players.length, 'с персонажами:', playersWithCharacters.length);
            
            // Для НОВЫХ игр - нужно просто 2+ игрока
            // Для ЗАГРУЖЕННЫХ игр - нужно 2+ игрока с персонажами
            const hasLoadedGame = window.loadedGameData || window.pendingLoadedGameData;
            const canStart = hasLoadedGame ? playersWithCharacters.length >= 2 : players.length >= 2;
            
            startBtn.disabled = !canStart;
            
            if (!canStart) {
                if (hasLoadedGame) {
                    startBtn.textContent = getText('needMinPlayersBtn') || `Нужно минимум 2 игрока с персонажами (${playersWithCharacters.length}/4)`;
                } else {
                    startBtn.textContent = getText('needMinPlayersBtn') || `Нужно минимум 2 игрока (${players.length}/4)`;
                }
            } else {
                if (hasLoadedGame) {
                    startBtn.textContent = getText('startGameBtn') || `Начать игру (${playersWithCharacters.length} готовых игроков)`;
                } else {
                    startBtn.textContent = getText('startGameBtn') || `Начать игру (${players.length} игроков)`;
                }
            }
            console.log('Кнопка обновлена. Disabled:', startBtn.disabled, 'Text:', startBtn.textContent);
        }
        } catch (error) {
            console.error('Ошибка в updatePlayersList:', error);
        }
    }

    // ИСПРАВЛЕНИЕ 4: Обновляем обработку сообщений от сервера
    handleServerMessage(message) {
        console.log('📨 Получено сообщение от сервера:', message.type, message);
        console.log('🔗 Состояние сокета при получении сообщения:', this.socket?.readyState);
        console.log('🔗 Флаг подключения:', this.isConnected);
        
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
                
            case 'host_reconnect_success':
                console.log('✅ Хост успешно переподключился к лобби');
                
                // Сбрасываем состояние действий
                this.currentActions = {};
                console.log('🔄 Локальное состояние действий очищено при переподключении хоста');
                
                // Обновляем список игроков
                this.updatePlayersList(message.players);
                // Загружаем состояние игры если есть
                if (message.gameState && this.gameIntegration && this.gameIntegration.onHostReconnectSuccess) {
                    this.gameIntegration.onHostReconnectSuccess(message);
                }
                break;
                
            case 'host_reconnected':
                console.log('✅ Хост вернулся в игру');
                // Скрываем сообщение об ожидании хоста
                if (this.gameIntegration && this.gameIntegration.onHostReconnected) {
                    this.gameIntegration.onHostReconnected(message);
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
                
            case 'loaded_game_started':
                console.log('🔄 Загруженная игра запущена - сообщение получено');
                console.log('🔍 Данные сообщения:', message);
                console.log('🎭 Текущий статус: isHost =', this.isHost);
                
                // Скрываем модальные окна
                document.getElementById('multiplayerModal').style.display = 'none';
                
                if (this.gameIntegration && this.gameIntegration.onLoadedGameStarted) {
                    console.log('✅ Вызываем onLoadedGameStarted');
                    this.gameIntegration.onLoadedGameStarted(message);
                } else {
                    console.error('❌ gameIntegration или onLoadedGameStarted не найдены');
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
                
            case 'loaded_game_characters_available':
                console.log('📋 Доступны персонажи из загруженной игры:', message.characters);
                console.log('👥 Количество доступных персонажей:', Object.keys(message.characters).length);
                this.showLoadedGameCharacterSelection(message.characters, message.hostCharacter, message.lastStory, message.lastImage);
                break;
                
            case 'character_assigned':
                console.log('👑 Получен персонаж:', message.character.name);
                
                // ИСПРАВЛЕНИЕ: Обновляем playerId если предоставлен сервером
                if (message.playerId) {
                    console.log('🔄 Обновляем playerId для character_assigned с', this.playerId, 'на', message.playerId);
                    this.playerId = message.playerId;
                }
                
                if (this.gameIntegration && this.gameIntegration.onCharacterAssigned) {
                    this.gameIntegration.onCharacterAssigned(message);
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
                
            case 'turn_state_reset':
                this.handleTurnStateReset(message);
                break;
                
            case 'ai_error_notification':
                this.handleAIErrorNotification(message);
                break;
                
            case 'character_selection_required':
                this.showCharacterSelectionPopup(message);
                break;
                
            case 'character_taken_over':
                console.log('📨 Получено сообщение character_taken_over в multiplayer.js:', message);
                this.handleCharacterTakenOver(message);
                break;
                
            case 'player_reconnected':
                this.handlePlayerReconnected(message);
                break;
                
            case 'host_disconnected':
                this.handleHostDisconnected(message);
                break;
                
            case 'all_players_offline':
                this.handleAllPlayersOffline(message);
                break;
                
            case 'recovery_lobby_created':
                this.handleRecoveryLobbyCreated(message);
                break;
                
            case 'host_reconnected':
                this.handleHostReconnected(message);
                break;
                
            case 'lobby_closed_host_timeout':
                this.handleLobbyClosedHostTimeout(message);
                break;
                
            case 'lobby_closed_host_left':
                this.handleLobbyClosedHostLeft(message);
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
        
        // Для НОВЫХ игр - считаем всех игроков (персонажи создаются после старта)
        // Для ЗАГРУЖЕННЫХ игр - считаем только игроков с персонажами
        const hasLoadedGame = window.loadedGameData || window.pendingLoadedGameData;
        
        if (hasLoadedGame) {
            // Логика для загруженных игр - нужны персонажи
            const playersWithCharacters = this.players.filter(p => p.character);
            console.log('🎮 Проверка готовности ЗАГРУЖЕННОЙ игры:', {
                всего_игроков: this.players.length,
                с_персонажами: playersWithCharacters.length,
                список: this.players.map(p => `${p.name}: ${p.character ? 'есть' : 'нет'} персонаж`)
            });
            
            if (playersWithCharacters.length < 2) {
                alert(`Для загруженной игры нужно минимум 2 игрока с персонажами. Сейчас готовы: ${playersWithCharacters.length}`);
                return;
            }
        } else {
            // Логика для новых игр - просто нужно минимум 2 игрока
            console.log('🎮 Проверка готовности НОВОЙ игры:', {
                всего_игроков: this.players.length,
                список: this.players.map(p => p.name)
            });
            
            if (this.players.length < 2) {
                alert(`Потрібно мінімум 2 гравці. Зараз в лобі: ${this.players.length}`);
                return;
            }
        }
        
        if (!window.gameState || !window.gameState.apiKey) {
            alert('Хост повинен надати Gemini API ключ перед початком гри');
            return;
        }
        
        if (this.socket && this.isConnected) {
            console.log('Хост запускає мультиплеєрну гру...');
            this.socket.send(JSON.stringify({
                type: 'start_game',
                language: window.gameState.language || 'uk',
                isMultiplayer: true,
                hostApiKey: window.gameState.apiKey,
                shortResponses: window.gameState.shortResponses || false
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
    
    // Показать выбор персонажа из загруженной игры
    showLoadedGameCharacterSelection(characters, hostCharacter, lastStory, lastImage) {
        console.log('Показываем выбор персонажа из загруженной игры');
        
        // Закрываем мультиплеер модальное окно
        this.hideModal();
        
        // Создаем модальное окно выбора персонажа
        const charactersArray = Object.values(characters);
        let charactersHTML = '';
        
        if (charactersArray.length === 0) {
            charactersHTML = '<p class="no-characters">Нет доступных персонажей из предыдущей игры</p>';
        } else {
            charactersHTML = charactersArray.map(playerData => {
                const character = playerData.character;
                return `
                    <div class="character-selection-card" onclick="window.multiplayerManager.selectLoadedCharacter('${playerData.playerId}', '${character.name}')">
                        <h4>${character.name}</h4>
                        <p class="character-class">${character.class}</p>
                        <p class="character-level">Рівень ${character.level}</p>
                        <div class="character-stats">
                            <span class="stat-hp">❤️ ${character.health}/${character.maxHealth}</span>
                            <span class="stat-mana">🔮 ${character.mana}/${character.maxMana}</span>
                        </div>
                        <div class="character-perks">
                            ${character.perks ? character.perks.slice(0, 2).map(perk => `<span class="perk">${perk}</span>`).join('') : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Добавляем контекст игры если есть
        let gameContextHTML = '';
        if (lastStory) {
            gameContextHTML = `
                <div class="game-context">
                    <h4>📖 Контекст истории:</h4>
                    <div class="last-story">${lastStory.length > 200 ? lastStory.substring(0, 200) + '...' : lastStory}</div>
                </div>
            `;
        }
        
        if (lastImage) {
            gameContextHTML += `
                <div class="game-image">
                    <h4>🖼️ Последнее изображение:</h4>
                    <img src="${lastImage}" alt="Последняя сцена" style="max-width: 200px; border-radius: 8px;">
                </div>
            `;
        }
        
        const modalHTML = `
            <div id="characterSelectionModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>🎭 Вибір персонажа</h2>
                        <span class="close" onclick="window.multiplayerManager.hideCharacterSelectionModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="character-selection-info">
                            <h3>Приєднання до збереженої гри</h3>
                            <p>Хост <strong>${hostCharacter.name}</strong> завантажив збережену гру.</p>
                            <p>Виберіть персонажа, яким хочете грати:</p>
                        </div>
                        
                        ${gameContextHTML}
                        
                        <div class="characters-grid">
                            ${charactersHTML}
                        </div>
                        
                        <div class="character-selection-actions">
                            <button onclick="window.multiplayerManager.createNewCharacterInstead()" class="mp-btn secondary">
                                ✨ Створити нового персонажа
                            </button>
                            <button onclick="window.multiplayerManager.hideCharacterSelectionModal()" class="mp-btn danger">
                                ❌ Покинути лобі
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно в DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Добавляем стили
        this.addCharacterSelectionStyles();
    }
    
    // Выбрать загруженного персонажа
    selectLoadedCharacter(originalPlayerId, characterName) {
        console.log('Выбран персонаж:', characterName, 'от игрока:', originalPlayerId);
        
        // Отправляем запрос на сервер для взятия персонажа под контроль
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'take_over_character',
                originalPlayerId: originalPlayerId,
                characterName: characterName
            }));
        }
        
        // Закрываем модальное окно
        this.hideCharacterSelectionModal();
    }
    
    // Создать нового персонажа вместо выбора из загруженных
    createNewCharacterInstead() {
        console.log('Игрок решил создать нового персонажа');
        
        // Закрываем модальное окно выбора
        this.hideCharacterSelectionModal();
        
        // Показываем обычное создание персонажа
        if (this.gameIntegration && this.gameIntegration.onGameStarted) {
            // Имитируем событие начала игры для показа создания персонажа
            this.gameIntegration.onGameStarted({
                players: this.players,
                isLoadedGame: true
            });
        }
    }
    
    // Скрыть модальное окно выбора персонажа
    hideCharacterSelectionModal() {
        const modal = document.getElementById('characterSelectionModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Добавить стили для выбора персонажа
    addCharacterSelectionStyles() {
        if (document.getElementById('characterSelectionStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'characterSelectionStyles';
        style.textContent = `
            .character-selection-info {
                text-align: center;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
            
            .character-selection-info h3 {
                color: #4ecdc4;
                margin-bottom: 10px;
            }
            
            .game-context {
                margin: 15px 0;
                padding: 15px;
                background: rgba(255, 193, 7, 0.1);
                border-radius: 8px;
                border-left: 3px solid #ffc107;
            }
            
            .game-context h4 {
                color: #ffc107;
                margin-bottom: 10px;
            }
            
            .last-story {
                color: #ddd;
                line-height: 1.4;
                font-style: italic;
            }
            
            .game-image {
                text-align: center;
                margin: 15px 0;
                padding: 15px;
                background: rgba(78, 205, 196, 0.1);
                border-radius: 8px;
                border-left: 3px solid #4ecdc4;
            }
            
            .game-image h4 {
                color: #4ecdc4;
                margin-bottom: 10px;
            }
            
            .characters-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .character-selection-card {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            }
            
            .character-selection-card:hover {
                border-color: #4ecdc4;
                background: rgba(78, 205, 196, 0.2);
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(78, 205, 196, 0.3);
            }
            
            .character-selection-card h4 {
                color: #fff;
                margin: 0 0 8px 0;
                font-size: 18px;
            }
            
            .character-class {
                color: #4ecdc4;
                font-weight: bold;
                margin: 0 0 5px 0;
                text-transform: capitalize;
            }
            
            .character-level {
                color: #f39c12;
                margin: 0 0 10px 0;
                font-size: 14px;
            }
            
            .character-stats {
                display: flex;
                justify-content: space-around;
                margin: 10px 0;
                font-size: 12px;
            }
            
            .stat-hp {
                color: #e74c3c;
            }
            
            .stat-mana {
                color: #3498db;
            }
            
            .character-perks {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                justify-content: center;
                margin-top: 10px;
            }
            
            .perk {
                background: rgba(155, 89, 182, 0.3);
                border: 1px solid rgba(155, 89, 182, 0.5);
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 10px;
                color: #ddd;
            }
            
            .character-selection-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .no-characters {
                text-align: center;
                color: #95a5a6;
                font-style: italic;
                padding: 40px 20px;
                grid-column: 1 / -1;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Глобальний екземпляр мультиплеєра
window.multiplayerManager = new MultiplayerManager();

// Експорт для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}