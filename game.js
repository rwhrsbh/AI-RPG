let gameState = {
    apiKey: '',
    language: 'en', // Мова за замовчуванням - англійська
    character: {
        name: '',
        class: '',
        health: 100,
        maxHealth: 100,
        mana: 50,
        maxMana: 50,
        experience: 0,
        level: 1,
        perks: ['Базові навички']
    },
    currentScene: null,
    isLoading: false,
    gameHistory: [], // Для збереження контексту
    conversationHistory: [], // Для API контексту
    availablePerks: [] // Доступні перки для вибору
};

const classStats = {
    warrior: { health: 120, mana: 30, perks: ['Майстерність мечем', 'Берсерк'] },
    mage: { health: 80, mana: 150, perks: ['Магічна стріла', 'Щит магії'] },
    rogue: { health: 90, mana: 60, perks: ['Скритність', 'Критичний удар'] },
    cleric: { health: 100, mana: 120, perks: ['Лікування', 'Священна аура'] },
    archer: { health: 85, mana: 40, perks: ['Влучний постріл', 'Око яструба'] },
    necromancer: { health: 70, mana: 160, perks: ['Контроль нежиті', 'Темна аура'] },
    homeless: { health: 70, mana: 50, perks: ['Виживання', 'Знахідка'] },
    blind: { health: 90, mana: 80, perks: ['Шостий сенс', 'Чуття небезпеки'] },
    elfFemale: { health: 85, mana: 110, perks: ['Ельфійська спритність', 'Стародавня мудрість'] },
    animeFan: { health: 80, mana: 70, perks: ['Отаку знання', 'Фанатизм'] },
    animeFanFemale: { health: 75, mana: 90, perks: ['Харизма', 'Кавайність'] }
};

// Локалізація гри
const localization = {
    en: {
        // Інтерфейс
        apiSetup: "API Setup",
        enterApiKey: "Enter your Gemini API key to start the game:",
        apiKeyPlaceholder: "Gemini API key",
        save: "Save",
        createCharacter: "Create your character",
        characterNamePlaceholder: "Character name",
        warrior: "Warrior",
        warriorDesc: "Melee combat master with high health",
        warriorStats: "HP: 120, Mana: 30, Strength: High",
        mage: "Mage",
        mageDesc: "Master of magic with powerful spells",
        mageStats: "HP: 80, Mana: 150, Magic: High",
        rogue: "Rogue",
        rogueDesc: "Fast and agile master of stealth",
        rogueStats: "HP: 90, Mana: 60, Agility: High",
        cleric: "Cleric",
        clericDesc: "Healer with divine magic",
        clericStats: "HP: 100, Mana: 120, Healing: High",
        archer: "Archer",
        archerDesc: "Master of ranged combat with deadly accuracy",
        archerStats: "HP: 85, Mana: 40, Precision: High",
        necromancer: "Necromancer",
        necromancerDesc: "Dark magic user who controls the dead",
        necromancerStats: "HP: 70, Mana: 160, Dark Magic: High",
        homeless: "Homeless",
        homelessDesc: "Survivor with unexpected skills and resourcefulness",
        homelessStats: "HP: 70, Mana: 50, Luck: Unpredictable",
        blind: "Blind",
        blindDesc: "Warrior who fights using enhanced senses",
        blindStats: "HP: 90, Mana: 80, Perception: Exceptional",
        elfFemale: "Elven Maiden",
        elfFemaleDesc: "Graceful warrior with ancient knowledge",
        elfFemaleStats: "HP: 85, Mana: 110, Grace: High",
        animeFan: "Otaku",
        animeFanDesc: "Adventurer with unusual knowledge and skills",
        animeFanStats: "HP: 80, Mana: 70, Knowledge: Specialized",
        animeFanFemale: "Anime Enthusiast",
        animeFanFemaleDesc: "Charismatic adventurer with unique abilities",
        animeFanFemaleStats: "HP: 75, Mana: 90, Charisma: High",
        startAdventure: "Start Adventure!",
        health: "Health",
        mana: "Mana",
        experience: "Experience",
        level: "Level",
        perks: "Perks",
        basicSkills: "Basic Skills",
        saveGame: "Save",
        loadGame: "Load",
        history: "History",
        enemyName: "Enemy",
        enemyHealth: "Health",
        enemyDesc: "Description",
        enemyAbilities: "Abilities",
        enemyWeaknesses: "Weaknesses",
        customActionPlaceholder: "Describe what you want to do...",
        performAction: "Perform Action",
        customActionLabel: "Or choose your own action:",
        processingAction: "Processing action",
        
        // Попапи
        levelUp: "Level Up!",
        levelUpDesc: "You have reached level",
        bonuses: "Bonuses",
        great: "Great!",
        availablePerks: "Available Perks",
        selectPerk: "Select one perk from available:",
        confirmSelection: "Confirm Selection",
        perkGained: "Perk gained",
        
        // Повідомлення
        enterName: "Please enter a name and choose a class",
        enterAction: "Enter an action",
        gameSaved: "Game saved successfully!",
        saveError: "Error saving game. Check console for details.",
        noSavedGames: "No saved games found!",
        gameLoaded: "Game loaded successfully!",
        loadError: "Error loading game. Check console for details.",
        apiError: "API connection error. Check your key and try again.",
        
        // API промпти
        initialScenePrompt: `You are a D&D game master. Create an initial scene for character {name} of class {class}.
        
        IMPORTANT: Respond ONLY with clean JSON without markdown blocks, without additional text, without prefixes or suffixes!
        
        Response format:
        {
            "text": "detailed situation description",
            "options": ["option 1", "option 2", "option 3", "option 4"],
            "consequences": {
                "health": 0,
                "mana": 0,
                "experience": 0,
                "combat": false,
                "enemy": null,
                "new_perks": []
            }
        }`,
        
        actionPrompt: `Continue the D&D adventure. Previous situation: "{prevSituation}"
        Player chose action: "{action}"
        Character: {name}, class {class}, level {level}
        Current stats: HP {health}/{maxHealth}, Mana {mana}/{maxMana}
        Experience: {experience}, Perks: {perks}
        
        IMPORTANT: 
        1. Respond ONLY with clean JSON without markdown blocks, without additional text, without prefixes or suffixes!
        2. Consider the context of previous events for logical story development
        3. You can create various situations: combat, puzzles, NPCs, treasures, traps, etc.
        4. If the character gains a new level or acquires new skills, create new perks through the new_perks field
        5. The perks you create should be original, thematic, and appropriate to the character's class and situation
        
        Example perks:
        - "Crystal Harmony: +15 to maximum mana and improved resistance to chaotic magic"
        - "Warrior's Fervor: Enhanced combat skills, +10% critical hit chance"
        - "Shadow of the Bumblebee: Ability to become invisible for a short time"
        
        Response format:
        {
            "text": "detailed description of the action result and the new situation, including description of perks gained",
            "options": ["option 1", "option 2", "option 3", "option 4"],
            "consequences": {
                "health": 0,
                "mana": 0,
                "experience": 10,
                "combat": false,
                "enemy": null,
                "new_perks": ["name and description of new perk"]
            }
        }`,
        
        // Додаємо нові рядки локалізації для вибору початку гри
        gameStartOptions: "Choose an option",
        newGame: "Start new game"
    },
    uk: {
        // Інтерфейс
        apiSetup: "Налаштування API",
        enterApiKey: "Введіть ваш Gemini API ключ для початку гри:",
        apiKeyPlaceholder: "API ключ Gemini",
        save: "Зберегти",
        createCharacter: "Створіть вашого персонажа",
        characterNamePlaceholder: "Імʼя персонажа",
        warrior: "Воїн",
        warriorDesc: "Майстер ближнього бою з високим здоровʼям",
        warriorStats: "HP: 120, Mana: 30, Сила: Висока",
        mage: "Маг",
        mageDesc: "Володар магії з потужними заклинаннями",
        mageStats: "HP: 80, Mana: 150, Магія: Висока",
        rogue: "Плут",
        rogueDesc: "Швидкий та спритний майстер скритності",
        rogueStats: "HP: 90, Mana: 60, Спритність: Висока",
        cleric: "Жрець",
        clericDesc: "Цілитель з божественною магією",
        clericStats: "HP: 100, Mana: 120, Лікування: Високе",
        archer: "Лучниця",
        archerDesc: "Майстриня дальнього бою з відмінною точністю",
        archerStats: "HP: 85, Mana: 40, Точність: Висока",
        necromancer: "Некромант",
        necromancerDesc: "Користувач темної магії, що контролює мерців",
        necromancerStats: "HP: 70, Mana: 160, Темна магія: Висока",
        homeless: "Безхатько",
        homelessDesc: "Виживальник з неочікуваними навичками та винахідливістю",
        homelessStats: "HP: 70, Mana: 50, Удача: Непередбачувана",
        blind: "Сліпий",
        blindDesc: "Воїн, що бореться з використанням загострених чуттів",
        blindStats: "HP: 90, Mana: 80, Сприйняття: Надзвичайне",
        elfFemale: "Ельфійка",
        elfFemaleDesc: "Граціозна воїтелька з прадавніми знаннями",
        elfFemaleStats: "HP: 85, Mana: 110, Грація: Висока",
        animeFan: "Анімешник",
        animeFanDesc: "Шукач пригод з незвичайними знаннями та навичками",
        animeFanStats: "HP: 80, Mana: 70, Знання: Специфічні",
        animeFanFemale: "Анімешниця",
        animeFanFemaleDesc: "Харизматична шукачка пригод з унікальними здібностями",
        animeFanFemaleStats: "HP: 75, Mana: 90, Харизма: Висока",
        startAdventure: "Почати пригоду!",
        health: "Здоровʼя",
        mana: "Мана",
        experience: "Досвід",
        level: "Рівень",
        perks: "Перки",
        basicSkills: "Базові навички",
        saveGame: "Зберегти",
        loadGame: "Завантажити",
        history: "Історія подій",
        enemyName: "Ворог",
        enemyHealth: "Здоровʼя",
        enemyDesc: "Опис",
        enemyAbilities: "Здібності",
        enemyWeaknesses: "Слабкості",
        customActionPlaceholder: "Опишіть, що ви хочете зробити...",
        performAction: "Виконати дію",
        customActionLabel: "Або виберіть власну дію:",
        processingAction: "Обробка дії",
        
        // Попапи
        levelUp: "Рівень підвищено!",
        levelUpDesc: "Ви досягли рівня",
        bonuses: "Бонуси",
        great: "Чудово!",
        availablePerks: "Доступні перки",
        selectPerk: "Оберіть один перк із доступних:",
        confirmSelection: "Підтвердити вибір",
        perkGained: "Отримано перк",
        
        // Повідомлення
        enterName: "Будь ласка, введіть імʼя та оберіть клас",
        enterAction: "Введіть дію",
        gameSaved: "Гру збережено успішно!",
        saveError: "Помилка збереження гри. Перевірте консоль для деталей.",
        noSavedGames: "Збережених ігор не знайдено!",
        gameLoaded: "Гру завантажено успішно!",
        loadError: "Помилка при завантаженні гри. Перевірте консоль для деталей.",
        apiError: "Помилка зʼєднання з API. Перевірте ключ та спробуйте ще раз.",
        
        // API промпти
        initialScenePrompt: `Ти - майстер гри у D&D. Створи початкову сцену для персонажа {name} класу {class}. 
        
        ВАЖЛИВО: Відповідай ТІЛЬКИ чистим JSON без markdown блоків, без додаткового тексту, без префіксів та суфіксів!
        
        Формат відповіді:
        {
            "text": "детальний опис ситуації",
            "options": ["варіант 1", "варіант 2", "варіант 3", "варіант 4"],
            "consequences": {
                "health": 0,
                "mana": 0,
                "experience": 0,
                "combat": false,
                "enemy": null,
                "new_perks": []
            }
        }`,
        
        actionPrompt: `Продовжи D&D пригоду. Попередня ситуація: "{prevSituation}"
        Гравець обрав дію: "{action}"
        Персонаж: {name}, клас {class}, рівень {level}
        Поточні характеристики: HP {health}/{maxHealth}, Mana {mana}/{maxMana}
        Досвід: {experience}, Перки: {perks}
        
        ВАЖЛИВО: 
        1. Відповідай ТІЛЬКИ чистим JSON без markdown блоків, без додаткового тексту, без префіксів та суфіксів!
        2. Врахуй контекст попередніх подій для логічного розвитку сюжету
        3. Можеш створювати різноманітні ситуації: бої, загадки, NPC, скарби, пастки тощо
        4. Якщо персонаж отримує новий рівень або набуває нових навичок, створюй нові перки через поле new_perks
        5. Створені тобою перки повинні бути оригінальними, тематичними і відповідати класу персонажа та ситуації
        
        Приклад перків:
        - "Кришталева Гармонія: +15 до максимальної мани та покращена стійкість до хаотичної магії"
        - "Воїнський запал: Посилення бойових навичок, +10% до шансу критичного удару"
        - "Тінь джмеля: Вміння на короткий час ставати невидимим"
        
        Формат відповіді:
        {
            "text": "детальний опис результату дії та нової ситуації, включаючи опис отриманих перків",
            "options": ["варіант 1", "варіант 2", "варіант 3", "варіант 4"],
            "consequences": {
                "health": 0,
                "mana": 0,
                "experience": 10,
                "combat": false,
                "enemy": null,
                "new_perks": ["назва та опис нового перку"]
            }
        }`,
        
        // Додаємо нові рядки локалізації для вибору початку гри
        gameStartOptions: "Виберіть опцію",
        newGame: "Почати нову гру"
    },
    ru: {
        // Интерфейс
        apiSetup: "Настройка API",
        enterApiKey: "Введите ваш Gemini API ключ для начала игры:",
        apiKeyPlaceholder: "API ключ Gemini",
        save: "Сохранить",
        createCharacter: "Создайте вашего персонажа",
        characterNamePlaceholder: "Имя персонажа",
        warrior: "Воин",
        warriorDesc: "Мастер ближнего боя с высоким здоровьем",
        warriorStats: "HP: 120, Mana: 30, Сила: Высокая",
        mage: "Маг",
        mageDesc: "Владыка магии с мощными заклинаниями",
        mageStats: "HP: 80, Mana: 150, Магия: Высокая",
        rogue: "Плут",
        rogueDesc: "Быстрый и ловкий мастер скрытности",
        rogueStats: "HP: 90, Mana: 60, Ловкость: Высокая",
        cleric: "Жрец",
        clericDesc: "Целитель с божественной магией",
        clericStats: "HP: 100, Mana: 120, Лечение: Высокое",
        archer: "Лучница",
        archerDesc: "Мастерица дальнего боя с отличной точностью",
        archerStats: "HP: 85, Mana: 40, Точность: Высокая",
        necromancer: "Некромант",
        necromancerDesc: "Пользователь темной магии, контролирующий мертвецов",
        necromancerStats: "HP: 70, Mana: 160, Тёмная магия: Высокая",
        homeless: "Бездомный",
        homelessDesc: "Выживальщик с неожиданными навыками и изобретательностью",
        homelessStats: "HP: 70, Mana: 50, Удача: Непредсказуемая",
        blind: "Слепой",
        blindDesc: "Воин, сражающийся с использованием обострённых чувств",
        blindStats: "HP: 90, Mana: 80, Восприятие: Превосходное",
        elfFemale: "Эльфийка",
        elfFemaleDesc: "Грациозная воительница с древними знаниями",
        elfFemaleStats: "HP: 85, Mana: 110, Грация: Высокая",
        animeFan: "Анимешник",
        animeFanDesc: "Искатель приключений с необычными знаниями и навыками",
        animeFanStats: "HP: 80, Mana: 70, Знания: Специфические",
        animeFanFemale: "Анимешница",
        animeFanFemaleDesc: "Харизматичная искательница приключений с уникальными способностями",
        animeFanFemaleStats: "HP: 75, Mana: 90, Харизма: Высокая",
        startAdventure: "Начать приключение!",
        health: "Здоровье",
        mana: "Мана",
        experience: "Опыт",
        level: "Уровень",
        perks: "Перки",
        basicSkills: "Базовые навыки",
        saveGame: "Сохранить",
        loadGame: "Загрузить",
        history: "История событий",
        enemyName: "Враг",
        enemyHealth: "Здоровье",
        enemyDesc: "Описание",
        enemyAbilities: "Способности",
        enemyWeaknesses: "Слабости",
        customActionPlaceholder: "Опишите, что вы хотите сделать...",
        performAction: "Выполнить действие",
        customActionLabel: "Или выберите собственное действие:",
        processingAction: "Обработка действия",
        
        // Попапы
        levelUp: "Уровень повышен!",
        levelUpDesc: "Вы достигли уровня",
        bonuses: "Бонусы",
        great: "Отлично!",
        availablePerks: "Доступные перки",
        selectPerk: "Выберите один перк из доступных:",
        confirmSelection: "Подтвердить выбор",
        perkGained: "Получен перк",
        
        // Сообщения
        enterName: "Пожалуйста, введите имя и выберите класс",
        enterAction: "Введите действие",
        gameSaved: "Игра сохранена успешно!",
        saveError: "Ошибка сохранения игры. Проверьте консоль для деталей.",
        noSavedGames: "Сохраненных игр не найдено!",
        gameLoaded: "Игра загружена успешно!",
        loadError: "Ошибка при загрузке игры. Проверьте консоль для деталей.",
        apiError: "Ошибка соединения с API. Проверьте ключ и попробуйте снова.",
        
        // API промпты
        initialScenePrompt: `Ты - мастер игры в D&D. Создай начальную сцену для персонажа {name} класса {class}.
        
        ВАЖНО: Отвечай ТОЛЬКО чистым JSON без markdown блоков, без дополнительного текста, без префиксов и суффиксов!
        
        Формат ответа:
        {
            "text": "детальное описание ситуации",
            "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
            "consequences": {
                "health": 0,
                "mana": 0,
                "experience": 0,
                "combat": false,
                "enemy": null,
                "new_perks": []
            }
        }`,
        
        actionPrompt: `Продолжи D&D приключение. Предыдущая ситуация: "{prevSituation}"
        Игрок выбрал действие: "{action}"
        Персонаж: {name}, класс {class}, уровень {level}
        Текущие характеристики: HP {health}/{maxHealth}, Mana {mana}/{maxMana}
        Опыт: {experience}, Перки: {perks}
        
        ВАЖНО: 
        1. Отвечай ТОЛЬКО чистым JSON без markdown блоков, без дополнительного текста, без префиксов и суффиксов!
        2. Учитывай контекст предыдущих событий для логичного развития сюжета
        3. Можешь создавать разнообразные ситуации: бои, загадки, NPC, сокровища, ловушки и т.д.
        4. Если персонаж получает новый уровень или приобретает новые навыки, создавай новые перки через поле new_perks
        5. Созданные тобой перки должны быть оригинальными, тематическими и соответствовать классу персонажа и ситуации
        
        Пример перков:
        - "Кристальная Гармония: +15 к максимальной мане и улучшенная устойчивость к хаотической магии"
        - "Воинский пыл: Усиление боевых навыков, +10% к шансу критического удара"
        - "Тень шмеля: Умение на короткое время становиться невидимым"
        
        Формат ответа:
        {
            "text": "детальное описание результата действия и новой ситуации, включая описание полученных перков",
            "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
            "consequences": {
                "health": 0,
                "mana": 0,
                "experience": 10,
                "combat": false,
                "enemy": null,
                "new_perks": ["название и описание нового перка"]
            }
        }`,
        
        // Додаємо нові рядки локалізації для вибору початку гри
        gameStartOptions: "Выберите опцию",
        newGame: "Начать новую игру"
    }
};

// Функції для збереження і завантаження гри
function saveGame() {
    try {
        // Зберігаємо всі дані крім API ключа
        const saveData = {
            ...gameState,
            apiKey: undefined
        };
        
        localStorage.setItem('dndAdventureSave', JSON.stringify(saveData));
        alert(getText('gameSaved'));
    } catch (error) {
        console.error('Помилка збереження:', error);
        alert(getText('saveError'));
    }
}

function loadGame() {
    try {
        // Отримуємо всі збережені ігри з localStorage
        const allSaves = getAllSaveGames();
        
        if (Object.keys(allSaves).length === 0) {
            alert(getText('noSavedGames'));
            return false;
        }
        
        // Показуємо модальне вікно з вибором сейвів
        showSaveSelectionModal(allSaves);
        return true;
    } catch (error) {
        console.error('Помилка завантаження:', error);
        alert(getText('loadError'));
        return false;
    }
}

// Функція для отримання всіх збережених ігор з localStorage
function getAllSaveGames() {
    const saves = {};
    // Перевіряємо стандартний сейв
    const defaultSave = localStorage.getItem('dndAdventureSave');
    if (defaultSave) {
        try {
            const saveData = JSON.parse(defaultSave);
            const characterInfo = saveData.character || {};
            saves['default'] = {
                name: characterInfo.name || 'Невідомий герой',
                level: characterInfo.level || 1,
                class: characterInfo.class || 'Невідомий клас',
                timestamp: new Date().toLocaleString(),
                data: defaultSave
            };
        } catch (e) {
            console.error('Помилка парсингу збереження:', e);
        }
    }
    
    // Можна додати перевірку інших слотів для збереження в майбутньому
    
    return saves;
}

// Функція для показу модального вікна з вибором сейву
function showSaveSelectionModal(saves) {
    // Перевіряємо, чи не існує вже модальне вікно
    if (document.getElementById('saveSelectionModal')) {
        document.getElementById('saveSelectionModal').remove();
    }
    
    // Створюємо модальне вікно
    const modal = document.createElement('div');
    modal.id = 'saveSelectionModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #4ecdc4;
        border-radius: 15px;
        padding: 25px;
        z-index: 1000;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 0 25px rgba(78, 205, 196, 0.5);
        backdrop-filter: blur(10px);
    `;
    
    // Створюємо заголовок
    const title = document.createElement('h2');
    title.textContent = getText('loadGame');
    title.style.cssText = `
        text-align: center;
        color: #4ecdc4;
        margin-bottom: 20px;
    `;
    modal.appendChild(title);
    
    // Додаємо блоки для кожного збереження
    for (const [key, save] of Object.entries(saves)) {
        const saveBlock = document.createElement('div');
        saveBlock.classList.add('save-item');
        saveBlock.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        
        // Добавим локализацию для текста "рівень" в сохранениях
        if (!localization.en.levelSave) {
            localization.en.levelSave = "level";
            localization.uk.levelSave = "рівень";
            localization.ru.levelSave = "уровень";
        }
        
        // Добавим локализацию для "Час не вказано"
        if (!localization.en.timeNotSpecified) {
            localization.en.timeNotSpecified = "Time not specified";
            localization.uk.timeNotSpecified = "Час не вказано";
            localization.ru.timeNotSpecified = "Время не указано";
        }
        
        saveBlock.innerHTML = `
            <div><strong>${save.name}</strong> (${save.class}, ${getText('levelSave')} ${save.level})</div>
            <small>${save.timestamp || getText('timeNotSpecified')}</small>
        `;
        
        saveBlock.addEventListener('mouseover', () => {
            saveBlock.style.background = 'rgba(78, 205, 196, 0.2)';
            saveBlock.style.borderColor = 'rgba(78, 205, 196, 0.5)';
        });
        
        saveBlock.addEventListener('mouseout', () => {
            saveBlock.style.background = 'rgba(255, 255, 255, 0.1)';
            saveBlock.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        // Обробник для завантаження конкретного сейву
        saveBlock.addEventListener('click', () => {
            loadSpecificSave(save.data);
            modal.remove();
            overlay.remove();
        });
        
        modal.appendChild(saveBlock);
    }
    
    // Додаємо кнопку закриття
    const closeButton = document.createElement('button');
    // Добавим кнопку отмены к локализациям
    if (!localization.en.cancel) {
        localization.en.cancel = "Cancel";
        localization.uk.cancel = "Скасувати";
        localization.ru.cancel = "Отмена";
    }
    
    closeButton.textContent = getText('cancel');
    closeButton.style.cssText = `
        display: block;
        margin: 20px auto 0 auto;
        padding: 10px 20px;
        background: linear-gradient(45deg, #ff6b6b, #ee5a52);
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-size: 1em;
    `;
    
    closeButton.addEventListener('click', () => {
        modal.remove();
        overlay.remove();
    });
    
    modal.appendChild(closeButton);
    
    // Додаємо фон-затемнення
    const overlay = document.createElement('div');
    overlay.id = 'saveSelectionOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 999;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
}

// Функція для завантаження конкретного сейву
function loadSpecificSave(saveData) {
    try {
        const loadedData = JSON.parse(saveData);
        // Зберігаємо поточний API ключ
        const currentApiKey = gameState.apiKey;
        
        // Відновлюємо gameState
        gameState = {
            ...loadedData,
            apiKey: currentApiKey
        };
        
        // Оновлюємо мову інтерфейсу
        updateLanguage(gameState.language);
        
        // Оновлюємо UI
        updateCharacterPanel();
        
        // Відображаємо поточну сцену
        if (gameState.currentScene) {
            document.getElementById('setupScreen').style.display = 'none';
            document.getElementById('gameArea').style.display = 'block';
            updateGameState(gameState.currentScene);
        }
        
        alert(getText('gameLoaded'));
        return true;
    } catch (error) {
        console.error('Помилка завантаження:', error);
        alert(getText('loadError'));
        return false;
    }
}

// Функція для отримання перекладеного тексту
function getText(key) {
    return localization[gameState.language][key] || key;
}

// Функція для оновлення мови інтерфейсу
function updateLanguage(lang) {
    gameState.language = lang;
    
    // Оновлюємо всі текстові елементи
    const headerTitle = document.querySelector('.header h1');
    if (headerTitle) headerTitle.textContent = "⚔️ D&D Adventure ⚔️";
    
    const headerDesc = document.querySelector('.header p');
    if (headerDesc) headerDesc.textContent = getText('createCharacter');
    
    // API налаштування
    const apiSetupTitle = document.querySelector('#apiSetup h3');
    if (apiSetupTitle) apiSetupTitle.textContent = `🔑 ${getText('apiSetup')}`;
    
    const apiSetupDesc = document.querySelector('#apiSetup p');
    if (apiSetupDesc) apiSetupDesc.textContent = getText('enterApiKey');
    
    const apiKeyInput = document.querySelector('#apiKey');
    if (apiKeyInput) apiKeyInput.placeholder = getText('apiKeyPlaceholder');
    
    const apiSetupBtn = document.querySelector('#apiSetup button');
    if (apiSetupBtn) apiSetupBtn.textContent = getText('save');
    
    // Екран створення персонажа
    const setupTitle = document.querySelector('#setupScreen h2');
    if (setupTitle) setupTitle.textContent = getText('createCharacter');
    
    const characterNameInput = document.querySelector('#characterName');
    if (characterNameInput) characterNameInput.placeholder = getText('characterNamePlaceholder');
    
    // Класи - перевіряємо наявність елементів перед оновленням
    updateClassInfo("warrior", "⚔️", "warrior", "warriorDesc", "warriorStats");
    updateClassInfo("mage", "🔮", "mage", "mageDesc", "mageStats");
    updateClassInfo("rogue", "🗡️", "rogue", "rogueDesc", "rogueStats");
    updateClassInfo("cleric", "✨", "cleric", "clericDesc", "clericStats");
    updateClassInfo("archer", "🏹", "archer", "archerDesc", "archerStats");
    updateClassInfo("necromancer", "💀", "necromancer", "necromancerDesc", "necromancerStats");
    updateClassInfo("homeless", "🪵", "homeless", "homelessDesc", "homelessStats");
    updateClassInfo("blind", "👁️", "blind", "blindDesc", "blindStats");
    updateClassInfo("elfFemale", "🧝‍♀️", "elfFemale", "elfFemaleDesc", "elfFemaleStats");
    updateClassInfo("animeFan", "📺", "animeFan", "animeFanDesc", "animeFanStats");
    updateClassInfo("animeFanFemale", "🎀", "animeFanFemale", "animeFanFemaleDesc", "animeFanFemaleStats");
    
    // Кнопка початку гри
    const startButton = document.querySelector('#setupScreen button');
    if (startButton) startButton.textContent = getText('startAdventure');
    
    // Панель персонажа - корректные селекторы, учитывая что h3 идет перед stat-bar
    const healthLabel = document.querySelector('.character-panel .stat-bar:nth-of-type(1) span:first-child');
    if (healthLabel) healthLabel.textContent = `❤️ ${getText('health')}:`;
    
    const manaLabel = document.querySelector('.character-panel .stat-bar:nth-of-type(2) span:first-child');
    if (manaLabel) manaLabel.textContent = `💙 ${getText('mana')}:`;
    
    const levelLabel = document.querySelector('.character-panel .stat-bar:nth-of-type(3) span:first-child');
    if (levelLabel) levelLabel.textContent = `🏆 ${getText('level')}:`;
    
    const expLabel = document.querySelector('.character-panel .stat-bar:nth-of-type(4) span:first-child');
    if (expLabel) expLabel.textContent = `⭐ ${getText('experience')}:`;
    
    const perksTitle = document.querySelector('#perksSection h4');
    if (perksTitle) perksTitle.textContent = `🎯 ${getText('perks')}:`;
    
    // Кнопки збереження/завантаження
    const charPanelButtons = document.querySelectorAll('.character-panel button');
    if (charPanelButtons.length >= 3) {
        charPanelButtons[0].textContent = `💾 ${getText('saveGame')}`;
        charPanelButtons[1].textContent = `📂 ${getText('loadGame')}`;
        charPanelButtons[2].textContent = `📜 ${getText('history')}`;
    }
    
    // Поле введення дії
    const customActionLabel = document.querySelector('.custom-action h4');
    if (customActionLabel) customActionLabel.textContent = getText('customActionLabel');
    
    const customActionInput = document.querySelector('#customAction');
    if (customActionInput) customActionInput.placeholder = getText('customActionPlaceholder');
    
    const customActionBtn = document.querySelector('#customActionBtn');
    if (customActionBtn) customActionBtn.textContent = getText('performAction');
    
    // Ворог (якщо відображається)
    const enemyTitle = document.querySelector('#enemyInfo h4');
    if (enemyTitle) enemyTitle.textContent = `👹 ${getText('enemyName')}`;
}

// Допоміжна функція для оновлення інформації про клас персонажа
function updateClassInfo(className, icon, textKey, descKey, statsKey) {
    const classCard = document.querySelector(`[data-class="${className}"]`);
    if (!classCard) return;
    
    const titleElement = classCard.querySelector('h3');
    if (titleElement) titleElement.textContent = `${icon} ${getText(textKey)}`;
    
    const descElement = classCard.querySelector('p');
    if (descElement) descElement.textContent = getText(descKey);
    
    const statsElement = classCard.querySelector('small');
    if (statsElement) statsElement.textContent = getText(statsKey);
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (apiKey) {
        gameState.apiKey = apiKey;
        document.getElementById('apiSetup').style.display = 'none';
        
        // Перевіряємо наявність збережених ігор
        const allSaves = getAllSaveGames();
        
        if (Object.keys(allSaves).length > 0) {
            // Показуємо вікно з вибором: створити нову гру або завантажити збережену
            showGameStartOptions();
        } else {
            // Якщо збережених ігор немає, відразу показуємо екран створення персонажа
            document.getElementById('setupScreen').style.display = 'block';
        }
    } else {
        alert(getText('enterApiKey'));
    }
}

// Функція для показу опцій початку гри
function showGameStartOptions() {
    // Створюємо модальне вікно
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #4ecdc4;
        border-radius: 15px;
        padding: 30px;
        z-index: 1000;
        min-width: 300px;
        box-shadow: 0 0 25px rgba(78, 205, 196, 0.5);
        backdrop-filter: blur(10px);
        text-align: center;
    `;
    
    // Заголовок
    const title = document.createElement('h2');
    title.textContent = getText('gameStartOptions');
    title.style.cssText = `
        margin-bottom: 25px;
        color: #4ecdc4;
    `;
    modal.appendChild(title);
    
    // Кнопки
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 15px;
    `;
    
    // Кнопка нової гри
    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = getText('newGame');
    newGameBtn.style.cssText = `
        padding: 15px 25px;
        background: linear-gradient(135deg, #4ecdc4, #45b7d1);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s;
    `;
    newGameBtn.addEventListener('mouseover', () => {
        newGameBtn.style.background = 'linear-gradient(135deg, #45b7d1, #4ecdc4)';
        newGameBtn.style.transform = 'translateY(-3px)';
    });
    newGameBtn.addEventListener('mouseout', () => {
        newGameBtn.style.background = 'linear-gradient(135deg, #4ecdc4, #45b7d1)';
        newGameBtn.style.transform = 'translateY(0)';
    });
    newGameBtn.addEventListener('click', () => {
        document.getElementById('setupScreen').style.display = 'block';
        modal.remove();
        overlay.remove();
    });
    buttonsContainer.appendChild(newGameBtn);
    
    // Кнопка завантаження гри
    const loadGameBtn = document.createElement('button');
    loadGameBtn.textContent = getText('loadGame');
    loadGameBtn.style.cssText = `
        padding: 15px 25px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s;
    `;
    loadGameBtn.addEventListener('mouseover', () => {
        loadGameBtn.style.background = 'linear-gradient(135deg, #ee5a52, #ff6b6b)';
        loadGameBtn.style.transform = 'translateY(-3px)';
    });
    loadGameBtn.addEventListener('mouseout', () => {
        loadGameBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
        loadGameBtn.style.transform = 'translateY(0)';
    });
    loadGameBtn.addEventListener('click', () => {
        loadGame();
        modal.remove();
        overlay.remove();
    });
    buttonsContainer.appendChild(loadGameBtn);
    
    modal.appendChild(buttonsContainer);
    
    // Додаємо фон-затемнення
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
}

// Character creation
document.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        gameState.character.class = this.dataset.class;
    });
});

function startGame() {
    const name = document.getElementById('characterName').value.trim();
    if (!name || !gameState.character.class) {
        alert(getText('enterName'));
        return;
    }

    gameState.character.name = name;
    const stats = classStats[gameState.character.class];
    gameState.character.health = stats.health;
    gameState.character.maxHealth = stats.health;
    gameState.character.mana = stats.mana;
    gameState.character.maxMana = stats.mana;
    gameState.character.perks = [...stats.perks];

    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    updateCharacterPanel();
    generateInitialScene();
}

// Функція для оновлення панелі персонажа
function updateCharacterPanel() {
    // Ім'я класу персонажа
    const characterClass = gameState.character.class;
    // Отримуємо локалізовану назву класу
    const translatedClass = getText(characterClass) || characterClass;
    
    document.getElementById('characterHeader').textContent = `${gameState.character.name} (${translatedClass})`;
    document.getElementById('healthValue').textContent = `${gameState.character.health}/${gameState.character.maxHealth}`;
    document.getElementById('manaValue').textContent = `${gameState.character.mana}/${gameState.character.maxMana}`;
    document.getElementById('levelValue').textContent = gameState.character.level;
    document.getElementById('expValue').textContent = gameState.character.experience;
    
    const perksList = document.getElementById('perksList');
    perksList.innerHTML = gameState.character.perks.map(perk => `<div class="perk">${translatePerk(perk)}</div>`).join('');
}

// Функція для перекладу перків
function translatePerk(perk) {
    // Перевірка на наявність перекладу для перку
    const currentLang = gameState.language;
    
    // Базові перки класів
    const perkTranslations = {
        // Воїн
        "Майстерність мечем": {
            "en": "Sword Mastery",
            "ru": "Мастерство меча"
        },
        "Берсерк": {
            "en": "Berserk",
            "ru": "Берсерк"
        },
        
        // Маг
        "Магічна стріла": {
            "en": "Magic Arrow",
            "ru": "Магическая стрела"
        },
        "Щит магії": {
            "en": "Magic Shield",
            "ru": "Щит магии"
        },
        
        // Плут
        "Скритність": {
            "en": "Stealth",
            "ru": "Скрытность"
        },
        "Критичний удар": {
            "en": "Critical Strike",
            "ru": "Критический удар"
        },
        
        // Жрець
        "Лікування": {
            "en": "Healing",
            "ru": "Лечение"
        },
        "Священна аура": {
            "en": "Holy Aura",
            "ru": "Священная аура"
        },
        
        // Лучниця
        "Влучний постріл": {
            "en": "Precise Shot",
            "ru": "Меткий выстрел"
        },
        "Око яструба": {
            "en": "Hawk Eye",
            "ru": "Глаз ястреба"
        },
        
        // Некромант
        "Контроль нежиті": {
            "en": "Undead Control",
            "ru": "Контроль нежити"
        },
        "Темна аура": {
            "en": "Dark Aura",
            "ru": "Тёмная аура"
        },
        
        // Безхатько
        "Виживання": {
            "en": "Survival",
            "ru": "Выживание"
        },
        "Знахідка": {
            "en": "Scavenger",
            "ru": "Находка"
        },
        
        // Сліпий
        "Шостий сенс": {
            "en": "Sixth Sense",
            "ru": "Шестое чувство"
        },
        "Чуття небезпеки": {
            "en": "Danger Sense",
            "ru": "Чутьё опасности"
        },
        
        // Ельфійка
        "Ельфійська спритність": {
            "en": "Elven Agility",
            "ru": "Эльфийская ловкость"
        },
        "Стародавня мудрість": {
            "en": "Ancient Wisdom",
            "ru": "Древняя мудрость"
        },
        
        // Анімешник
        "Отаку знання": {
            "en": "Otaku Knowledge",
            "ru": "Знания отаку"
        },
        "Фанатизм": {
            "en": "Fanaticism",
            "ru": "Фанатизм"
        },
        
        // Анімешниця
        "Харизма": {
            "en": "Charisma",
            "ru": "Харизма"
        },
        "Кавайність": {
            "en": "Kawaiiness",
            "ru": "Каваинность"
        },
        
        // Базові навички
        "Базові навички": {
            "en": "Basic Skills",
            "ru": "Базовые навыки"
        }
    };
    
    // Перевіряємо, чи є переклад для перку
    if (perkTranslations[perk] && perkTranslations[perk][currentLang]) {
        return perkTranslations[perk][currentLang];
    }
    
    // Якщо немає точного перекладу, повертаємо оригінальний перк
    return perk;
}

async function generateInitialScene() {
    const prompt = getText('initialScenePrompt')
        .replace('{name}', gameState.character.name)
        .replace('{class}', gameState.character.class);

    await callGeminiAPI(prompt, true);
}

// Функція для обробки специфіки взаємодії аніме-персонажів
function processAnimeFanSpecialInteractions(action, response) {
    // Якщо персонаж не є аніме-фаном або аніме-фанкою, нічого не змінюємо
    if (gameState.character.class !== 'animeFan' && gameState.character.class !== 'animeFanFemale') {
        return response;
    }
    
    // Клонуємо об'єкт, щоб не змінювати оригінал
    const modifiedResponse = JSON.parse(JSON.stringify(response));
    
    if (gameState.character.class === 'animeFan') {
        // Перевіряємо, чи дія пов'язана з взаємодією з жіночими NPC
        const femaleInteractionKeywords = [
            'дівчина', 'дівчину', 'дівчині', 'жінка', 'жінку', 'жінці', 
            'красуня', 'красуню', 'красуні', 'принцеса', 'принцесу', 'принцесі',
            'девушка', 'девушку', 'девушке', 'женщина', 'женщину', 'женщине', 
            'красавица', 'красавицу', 'красавице', 'принцесса', 'принцессу', 'принцессе',
            'girl', 'woman', 'princess', 'lady', 'female', 'maiden',
            'anime', 'аніме', 'манга', 'manga', 'отаку', 'otaku'
        ];
        
        const actionLowerCase = action.toLowerCase();
        const textLowerCase = modifiedResponse.text.toLowerCase();
        
        // Перевірка на взаємодію з жіночим персонажем
        const isInteractingWithFemale = femaleInteractionKeywords.some(keyword => 
            actionLowerCase.includes(keyword) || textLowerCase.includes(keyword)
        );
        
        if (isInteractingWithFemale) {
            // Додаємо прихований ефект: анімешник починає нервувати і соромитись при розмові
            // Створюємо новий текст, що натякає на дивну поведінку персонажа
            const originalText = modifiedResponse.text;
            modifiedResponse.text = originalText + ' Ви відчуваєте незручність і ваш голос тремтить. Чомусь вам стає важко дивитися співрозмовнику в очі, а серце починає битися частіше.';
            
            // Штраф до дії, якщо це розмова чи харизма
            if (actionLowerCase.includes('розмов') || actionLowerCase.includes('говор') || 
                actionLowerCase.includes('спита') || actionLowerCase.includes('переконат') ||
                actionLowerCase.includes('флірт') || actionLowerCase.includes('комплімент') ||
                actionLowerCase.includes('говорить') || actionLowerCase.includes('спросить') ||
                actionLowerCase.includes('убедить') || actionLowerCase.includes('флирт') ||
                actionLowerCase.includes('комплимент') || actionLowerCase.includes('talk') ||
                actionLowerCase.includes('speak') || actionLowerCase.includes('ask') ||
                actionLowerCase.includes('convince') || actionLowerCase.includes('flirt') ||
                actionLowerCase.includes('compliment')) {
                
                // Додаємо малу втрату мани від нервування
                modifiedResponse.consequences.mana = (modifiedResponse.consequences.mana || 0) - 5;
                
                // Змінюємо опції для відображення нервозності
                if (modifiedResponse.options && modifiedResponse.options.length > 0) {
                    modifiedResponse.options = modifiedResponse.options.map(option => {
                        if (option.includes('сказати') || option.includes('говорити') || 
                            option.includes('спитати') || option.includes('сказать') || 
                            option.includes('говорить') || option.includes('спросить') ||
                            option.includes('say') || option.includes('ask') || 
                            option.includes('tell') || option.includes('speak')) {
                            return option + ' (нервуючи)';
                        }
                        return option;
                    });
                }
            }
            
            // Шанс 10% отримати перк "Гарем початковий рівень" після кількох таких взаємодій
            if (!gameState.character.perks.includes('Гарем початковий рівень') && Math.random() < 0.1) {
                modifiedResponse.consequences.new_perks = modifiedResponse.consequences.new_perks || [];
                modifiedResponse.consequences.new_perks.push('Гарем початковий рівень: +5 до харизми з анімешницями, але -5 до харизми з усіма іншими');
            }
        }
        
        // Якщо дія пов'язана з аніме або мангою, додаємо бонус
        if (actionLowerCase.includes('аніме') || actionLowerCase.includes('манг') || 
            actionLowerCase.includes('аниме') || actionLowerCase.includes('манг') ||
            actionLowerCase.includes('anime') || actionLowerCase.includes('manga')) {
            
            modifiedResponse.text = modifiedResponse.text + ' Ваші знання аніме та манги дозволяють вам відчувати особливу впевненість в цій ситуації.';
            
            // Бонус до досвіду за використання знань аніме
            modifiedResponse.consequences.experience = (modifiedResponse.consequences.experience || 0) + 5;
            
            // Шанс 15% отримати перк "Отаку мудрість"
            if (!gameState.character.perks.includes('Отаку мудрість') && Math.random() < 0.15) {
                modifiedResponse.consequences.new_perks = modifiedResponse.consequences.new_perks || [];
                modifiedResponse.consequences.new_perks.push('Отаку мудрість: +10 до знань про аніме та мангу, що іноді може бути корисно');
            }
        }
    } 
    else if (gameState.character.class === 'animeFanFemale') {
        // Перевіряємо, чи дія пов'язана з взаємодією з анімешниками
        const isInteractingWithAnimeFan = response.text.toLowerCase().includes('анімешник') || 
                                         response.text.toLowerCase().includes('анимешник') || 
                                         response.text.toLowerCase().includes('otaku');
        
        if (isInteractingWithAnimeFan) {
            // Анімешниця має владу над анімешниками
            modifiedResponse.text = modifiedResponse.text + ' Ви помічаєте, що ваша присутність викликає особливу реакцію. Здається, ви маєте певний вплив на цю людину.';
            
            // Бонус до харизми при взаємодії з анімешниками
            if (modifiedResponse.options && modifiedResponse.options.length > 0) {
                // Додаємо опцію використання впливу
                modifiedResponse.options.push('Використати свій природній вплив на цю людину');
            }
            
            // Шанс 20% отримати перк "Аніме харизма"
            if (!gameState.character.perks.includes('Аніме харизма') && Math.random() < 0.2) {
                modifiedResponse.consequences.new_perks = modifiedResponse.consequences.new_perks || [];
                modifiedResponse.consequences.new_perks.push('Аніме харизма: +15 до харизми при взаємодії з любителями аніме');
            }
        }
    }
    
    return modifiedResponse;
}

// Модифікуємо функцію callGeminiAPI для обробки аніме-персонажів
async function callGeminiAPI(prompt, isInitial = false) {
    if (gameState.isLoading) return;

    gameState.isLoading = true;
    document.getElementById('customActionBtn').disabled = true;
    document.getElementById('storyText').innerHTML = `<div class="loading">${getText('processingAction')}</div>`;

    try {
        // Підготовка контексту для API
        let contents = [];

        if (!isInitial && gameState.conversationHistory.length > 0) {
            // Використовуємо всю історію розмови, а не тільки останні 10 повідомлень
            contents.push(...gameState.conversationHistory);
        }

        // Додаємо поточний промпт з правильною роллю
        contents.push({
            role: "user",
            parts: [{ text: prompt }]
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${gameState.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    responseMimeType: 'text/plain',
                    maxOutputTokens: 200000
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

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            let responseText = data.candidates[0].content.parts[0].text;
            
            // Збереження контексту з правильними ролями
            gameState.conversationHistory.push({
                role: "user",
                parts: [{ text: prompt }]
            });
            gameState.conversationHistory.push({
                role: "model", 
                parts: [{ text: responseText }]
            });
            
            try {
                // Розширена очистка відповіді від markdown та JSON обгорток
                // Видаляємо markdown-блоки початку та кінця JSON
                responseText = responseText.replace(/```(?:json)?\s*\n?/g, '').trim();
                
                // Перевіряємо, чи не повернуто вкладений JSON у вигляді рядка
                if (responseText.includes('"text": "```json')) {
                    try {
                        // Спочатку парсимо верхній рівень
                        const outerObj = JSON.parse(responseText);
                        // Якщо text містить JSON-рядок, витягуємо і парсимо його
                        if (outerObj.text && outerObj.text.includes('```json')) {
                            let innerJson = outerObj.text.replace(/```(?:json)?\s*\n?/g, '').trim();
                            const innerObj = JSON.parse(innerJson);
                            // Використовуємо внутрішній об'єкт як результат
                            responseText = innerJson;
                        }
                    } catch (nestedError) {
                        console.error('Помилка при обробці вкладеного JSON:', nestedError);
                    }
                }
                
                let gameData = JSON.parse(responseText);
                
                // Застосовуємо специфічну логіку для анімешників/анімешниць, якщо це не початкова сцена
                if (!isInitial && (gameState.character.class === 'animeFan' || gameState.character.class === 'animeFanFemale')) {
                    // Отримуємо останню дію гравця для контексту
                    const lastAction = gameState.conversationHistory.slice(-4, -3)[0]?.parts[0]?.text || '';
                    const actionMatch = lastAction.match(/Гравець обрав дію: "([^"]*)"/);
                    const playerAction = actionMatch ? actionMatch[1] : '';
                    
                    gameData = processAnimeFanSpecialInteractions(playerAction, gameData);
                }
                
                updateGameState(gameData);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.log('Raw response:', responseText);
                // Добавим сообщение об ошибке к локализациям
                if (!localization.en.parseError) {
                    localization.en.parseError = "Response processing error. Try again.";
                    localization.uk.parseError = "Помилка обробки відповіді. Спробуйте ще раз.";
                    localization.ru.parseError = "Ошибка обработки ответа. Попробуйте снова.";
                }
                if (!localization.en.detailedInfo) {
                    localization.en.detailedInfo = "Detailed information";
                    localization.uk.detailedInfo = "Детальна інформація";
                    localization.ru.detailedInfo = "Детальная информация";
                }
                
                document.getElementById('storyText').innerHTML = `<p>${getText('parseError')}</p><details><summary>${getText('detailedInfo')}</summary><pre>${responseText}</pre></details>`;
            }
        } else {
            throw new Error('Неправильна відповідь від API');
        }
    } catch (error) {
        console.error('API Error:', error);
        document.getElementById('storyText').innerHTML = `<p>${getText('apiError')}</p>`;
    }

    gameState.isLoading = false;
    document.getElementById('customActionBtn').disabled = false;
}

function updateGameState(gameData) {
    gameState.currentScene = gameData;
    
    // Додаємо до історії гри
    gameState.gameHistory.push({
        scene: gameData,
        character: { ...gameState.character },
        timestamp: new Date().toLocaleString()
    });
    
    // Update story text
    document.getElementById('storyText').innerHTML = `<p>${gameData.text}</p>`;
    
    // Apply consequences
    if (gameData.consequences) {
        const cons = gameData.consequences;
        gameState.character.health = Math.max(0, Math.min(gameState.character.maxHealth, gameState.character.health + cons.health));
        gameState.character.mana = Math.max(0, Math.min(gameState.character.maxMana, gameState.character.mana + cons.mana));
        gameState.character.experience += cons.experience;
        
        // Level up check
        const newLevel = Math.floor(gameState.character.experience / 100) + 1;
        if (newLevel > gameState.character.level) {
            const levelGains = {
                health: 10,
                mana: 5
            };
            
            // Додаткові бонуси в залежності від класу
            if (gameState.character.class === 'warrior') levelGains.health += 5;
            if (gameState.character.class === 'mage') levelGains.mana += 10;
            if (gameState.character.class === 'cleric') {
                levelGains.health += 3;
                levelGains.mana += 5;
            }
            
            // Застосовуємо підвищення рівня
            gameState.character.level = newLevel;
            gameState.character.maxHealth += levelGains.health;
            gameState.character.maxMana += levelGains.mana;
            gameState.character.health = gameState.character.maxHealth;
            gameState.character.mana = gameState.character.maxMana;
            
            // Показуємо попап про підвищення рівня
            showLevelUpPopup(newLevel, levelGains);
        }
        
        // Додавання нових перків від AI у список доступних
        if (cons.new_perks && Array.isArray(cons.new_perks) && cons.new_perks.length > 0) {
            cons.new_perks.forEach(perk => {
                if (typeof perk === 'string' && perk.trim() !== '' && !gameState.availablePerks.includes(perk)) {
                    gameState.availablePerks.push(perk);
                }
            });
            
            // Якщо є доступні перки, показуємо попап для вибору
            if (gameState.availablePerks.length > 0) {
                showPerkSelectionPopup();
            }
        }
        
        // Combat mode
        const mainContent = document.querySelector('.main-content');
        const enemyInfo = document.getElementById('enemyInfo');
        
        if (cons.combat && cons.enemy) {
            mainContent.classList.add('combat-mode');
            enemyInfo.style.display = 'block';
            
            // Покращена обробка інформації про ворога
            const enemy = cons.enemy;
            let enemyHtml = `
                <p><strong>Назва:</strong> ${enemy.name || 'Невідомий ворог'}</p>
                <p><strong>Здоровʼя:</strong> ${enemy.health || enemy.hp || 'Невідомо'}</p>
            `;
            
            // Додаємо опис, якщо є
            if (enemy.description) {
                enemyHtml += `<p><strong>Опис:</strong> ${enemy.description}</p>`;
            }
            
            // Додаємо здібності, якщо є
            if (enemy.abilities && Array.isArray(enemy.abilities) && enemy.abilities.length > 0) {
                enemyHtml += `<p><strong>Здібності:</strong></p><ul style="margin: 5px 0 5px 20px;">`;
                enemy.abilities.forEach(ability => {
                    enemyHtml += `<li>${ability}</li>`;
                });
                enemyHtml += `</ul>`;
            }
            
            // Додаємо слабкості, якщо є
            if (enemy.weaknesses && Array.isArray(enemy.weaknesses) && enemy.weaknesses.length > 0) {
                enemyHtml += `<p><strong>Слабкості:</strong> ${enemy.weaknesses.join(', ')}</p>`;
            }
            
            document.getElementById('enemyDetails').innerHTML = enemyHtml;
        } else {
            mainContent.classList.remove('combat-mode');
            enemyInfo.style.display = 'none';
        }
    }
    
    // Update character panel
    updateCharacterPanel();
    
    // Create option buttons
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    if (gameData.options && gameData.options.length > 0) {
        gameData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = `${index + 1}. ${option}`;
            button.onclick = () => performAction(option);
            optionsContainer.appendChild(button);
        });
    }
    
    // Clear custom action input
    document.getElementById('customAction').value = '';
}

function performAction(action) {
    // Створюємо детальний опис персонажа з усіма перками та характеристиками
    const characterDetails = {
        name: gameState.character.name,
        class: gameState.character.class,
        level: gameState.character.level,
        health: gameState.character.health,
        maxHealth: gameState.character.maxHealth,
        mana: gameState.character.mana,
        maxMana: gameState.character.maxMana,
        experience: gameState.character.experience,
        perks: gameState.character.perks.join(', ')
    };
    
    // Формуємо шаблон промпту та замінюємо всі змінні
    const prompt = getText('actionPrompt')
        .replace('{prevSituation}', gameState.currentScene.text)
        .replace('{action}', action)
        .replace('{name}', characterDetails.name)
        .replace('{class}', characterDetails.class)
        .replace('{level}', characterDetails.level)
        .replace('{health}', characterDetails.health)
        .replace('{maxHealth}', characterDetails.maxHealth)
        .replace('{mana}', characterDetails.mana)
        .replace('{maxMana}', characterDetails.maxMana)
        .replace('{experience}', characterDetails.experience)
        .replace('{perks}', characterDetails.perks);

    callGeminiAPI(prompt, false);
}

function performCustomAction() {
    const customAction = document.getElementById('customAction').value.trim();
    if (!customAction) {
        alert(getText('enterAction'));
        return;
    }
    
    performAction(customAction);
}

// Allow Enter key for custom actions
document.getElementById('customAction').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performCustomAction();
    }
});

// Функція для перегляду історії гри
function toggleGameHistory() {
    const historyPanel = document.getElementById('gameHistoryPanel');
    const historyContent = document.getElementById('historyContent');
    const historyTitle = document.getElementById('historyTitle');
    
    // Добавим заголовок истории к локализациям
    if (!localization.en.adventureHistory) {
        localization.en.adventureHistory = "Adventure History:";
        localization.uk.adventureHistory = "Історія пригоди:";
        localization.ru.adventureHistory = "История приключения:";
    }
    
    // Обновляем заголовок истории
    if (historyTitle) historyTitle.textContent = getText('adventureHistory');
    
    if (historyPanel.style.display === 'none') {
        // Показати історію
        // Добавим историю к локализациям
        if (!localization.en.historyEmpty) {
            localization.en.historyEmpty = "History is empty";
            localization.uk.historyEmpty = "Історія поки що порожня";
            localization.ru.historyEmpty = "История пока пуста";
        }
        
        historyContent.innerHTML = gameState.gameHistory.length > 0 
            ? gameState.gameHistory.map((event, index) => `
                <div style="margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 5px; border-left: 3px solid #4ecdc4;">
                    <small style="color: #888;">${event.timestamp}</small>
                    <p style="margin: 5px 0; font-size: 0.85em;">${event.scene.text}</p>
                    <small>HP: ${event.character.health}/${event.character.maxHealth}, Mana: ${event.character.mana}/${event.character.maxMana}, XP: ${event.character.experience}</small>
                </div>
            `).join('')
            : `<p style="color: #888;">${getText('historyEmpty')}</p>`;
        historyPanel.style.display = 'block';
    } else {
        // Сховати історію
        historyPanel.style.display = 'none';
    }
}

// Функція для відображення попапу про підвищення рівня
function showLevelUpPopup(newLevel, levelGains) {
    // Перевіряємо, чи не існує вже попап
    if (document.getElementById('levelUpPopup')) {
        document.getElementById('levelUpPopup').remove();
    }
    
    // Створюємо попап
    const popup = document.createElement('div');
    popup.id = 'levelUpPopup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #4ecdc4;
        border-radius: 15px;
        padding: 25px;
        z-index: 1000;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 0 25px rgba(78, 205, 196, 0.5);
        backdrop-filter: blur(10px);
        animation: fadeIn 0.3s;
    `;
    
    popup.innerHTML = `
        <h2 style="text-align: center; color: #4ecdc4; margin-bottom: 15px;">🎉 ${getText('levelUp')} 🎉</h2>
        <p style="text-align: center; margin-bottom: 20px;">${getText('levelUpDesc')} <strong>${newLevel}</strong>!</p>
        <div style="background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin: 10px 0;">
            <p><strong>${getText('bonuses')}:</strong></p>
            <ul style="margin: 10px 0 10px 20px;">
                <li>+${levelGains.health} ${getText('health') === 'Health' ? 'to maximum health' : 'до максимального ' + getText('health').toLowerCase()}</li>
                <li>+${levelGains.mana} ${getText('mana') === 'Mana' ? 'to maximum mana' : 'до максимальної ' + getText('mana').toLowerCase()}</li>
            </ul>
        </div>
        <button id="levelUpCloseBtn" style="
            display: block;
            margin: 20px auto 0 auto;
            padding: 10px 20px;
            background: linear-gradient(45deg, #4ecdc4, #45b7d1);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 1em;
        ">${getText('great')}</button>
    `;
    
    document.body.appendChild(popup);
    
    // Додаємо фон-затемнення
    const overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 999;
        animation: fadeIn 0.3s;
    `;
    
    document.body.appendChild(overlay);
    
    // Додаємо CSS анімацію
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Обробник для закриття
    document.getElementById('levelUpCloseBtn').addEventListener('click', () => {
        popup.remove();
        overlay.remove();
    });
}

// Функція для відображення попапу вибору перків
function showPerkSelectionPopup() {
    // Якщо немає доступних перків, виходимо
    if (gameState.availablePerks.length === 0) return;
    
    // Перевіряємо, чи не існує вже попап
    if (document.getElementById('perkPopup')) {
        document.getElementById('perkPopup').remove();
    }
    
    // Створюємо попап
    const popup = document.createElement('div');
    popup.id = 'perkPopup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #ff6b6b;
        border-radius: 15px;
        padding: 25px;
        z-index: 1000;
        min-width: 320px;
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
        box-shadow: 0 0 25px rgba(255, 107, 107, 0.5);
        backdrop-filter: blur(10px);
        animation: fadeIn 0.3s;
    `;
    
    // Формуємо HTML для перків
    let perksHtml = '';
    gameState.availablePerks.forEach((perk, index) => {
        perksHtml += `
            <div class="perk-option" style="
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 15px;
                margin: 10px 0;
                cursor: pointer;
                transition: all 0.3s;
                border: 1px solid transparent;
            " data-perk-index="${index}">
                <p>${perk}</p>
            </div>
        `;
    });
    
    popup.innerHTML = `
        <h2 style="text-align: center; color: #ff6b6b; margin-bottom: 15px;">✨ ${getText('availablePerks')} ✨</h2>
        <p style="text-align: center; margin-bottom: 20px;">${getText('selectPerk')}</p>
        <div id="perkOptions">
            ${perksHtml}
        </div>
        <button id="perkCloseBtn" style="
            display: none;
            margin: 20px auto 0 auto;
            padding: 10px 20px;
            background: linear-gradient(45deg, #ff6b6b, #ee5a52);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 1em;
        ">${getText('confirmSelection')}</button>
    `;
    
    document.body.appendChild(popup);
    
    // Додаємо фон-затемнення
    const overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 999;
        animation: fadeIn 0.3s;
    `;
    
    document.body.appendChild(overlay);
    
    // Змінна для збереження вибраного індексу
    let selectedPerkIndex = null;
    
    // Додаємо обробники подій для вибору перку
    document.querySelectorAll('.perk-option').forEach(option => {
        option.addEventListener('click', function() {
            // Знімаємо виділення з усіх перків
            document.querySelectorAll('.perk-option').forEach(opt => {
                opt.style.border = '1px solid transparent';
                opt.style.background = 'rgba(255,255,255,0.1)';
            });
            
            // Виділяємо вибраний перк
            this.style.border = '1px solid #ff6b6b';
            this.style.background = 'rgba(255,107,107,0.2)';
            
            // Зберігаємо індекс вибраного перку
            selectedPerkIndex = parseInt(this.dataset.perkIndex);
            
            // Показуємо кнопку підтвердження
            document.getElementById('perkCloseBtn').style.display = 'block';
        });
    });
    
    // Обробник для закриття та застосування вибору
    document.getElementById('perkCloseBtn').addEventListener('click', () => {
        if (selectedPerkIndex !== null) {
            const selectedPerk = gameState.availablePerks[selectedPerkIndex];
            
            // Додаємо вибраний перк персонажу
            gameState.character.perks.push(selectedPerk);
            
            // Видаляємо всі перки зі списку доступних
            gameState.availablePerks = [];
            
            // Додаємо бонуси на основі перку
            applyPerkBonuses(selectedPerk);
            
            // Оновлюємо панель персонажа
            updateCharacterPanel();
            
            // Показуємо повідомлення про отримання перку
            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(78, 205, 196, 0.9);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                z-index: 1000;
                animation: fadeOut 3s forwards;
            `;
            message.innerHTML = `<strong>${getText('perkGained')}:</strong> ${selectedPerk}`;
            document.body.appendChild(message);
            
            // Додаємо CSS анімацію для повідомлення
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeOut {
                    0%, 80% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, 20px); }
                }
            `;
            document.head.appendChild(style);
            
            // Автоматично видаляємо повідомлення після завершення анімації
            setTimeout(() => message.remove(), 3000);
        }
        
        // Закриваємо попап
        popup.remove();
        overlay.remove();
    });
}

// Функція для застосування бонусів від перків
function applyPerkBonuses(perk) {
    const lowerPerk = perk.toLowerCase();
    
    // Бонуси до здоров'я
    if (lowerPerk.includes('здоров') || lowerPerk.includes('життя') || lowerPerk.includes('hp')) {
        gameState.character.maxHealth += 5;
        gameState.character.health = Math.min(gameState.character.health + 5, gameState.character.maxHealth);
    }
    
    // Бонуси до мани
    if (lowerPerk.includes('мана') || lowerPerk.includes('мани') || lowerPerk.includes('магі')) {
        gameState.character.maxMana += 5;
        gameState.character.mana = Math.min(gameState.character.mana + 5, gameState.character.maxMana);
    }
    
    // Якщо в описі перку вказані конкретні числові бонуси, витягуємо їх
    const healthBonus = perk.match(/\+(\d+)\s*(?:до)?\s*(?:макс(?:имального)?|макс\.?)?\s*(?:здоров'я|здоровʼя|хп|hp)/i);
    if (healthBonus && healthBonus[1]) {
        const bonus = parseInt(healthBonus[1]);
        if (!isNaN(bonus)) {
            gameState.character.maxHealth += bonus;
            gameState.character.health = Math.min(gameState.character.health + bonus, gameState.character.maxHealth);
        }
    }
    
    const manaBonus = perk.match(/\+(\d+)\s*(?:до)?\s*(?:макс(?:имально[їго])?|макс\.?)?\s*(?:мани|мана)/i);
    if (manaBonus && manaBonus[1]) {
        const bonus = parseInt(manaBonus[1]);
        if (!isNaN(bonus)) {
            gameState.character.maxMana += bonus;
            gameState.character.mana = Math.min(gameState.character.mana + bonus, gameState.character.maxMana);
        }
    }
}

// Функція для зміни мови
function changeLanguage(lang) {
    gameState.language = lang;
    updateLanguage(lang);
    
    // Оновлюємо панель персонажа з новою мовою
    updateCharacterPanel();
}

// Ініціалізація мови при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    // Використовуємо мову за замовчуванням (встановлену в gameState)
    updateLanguage(gameState.language);
});