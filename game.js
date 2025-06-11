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
    animeFanFemale: { health: 75, mana: 90, perks: ['Харизма', 'Кавайність'] },
    boxer: { health: 130, mana: 40, perks: ['Міцні кулаки', 'Витривалість'] },
    lumberjack: { health: 125, mana: 35, perks: ['Сила замаху', 'Стійкість'] },
    loser: { health: 20, mana: 0, perks: ['Невдача', 'Нікчемність'] },
    programmer: { health: 60, mana: 200, perks: ['Баг-фікс', 'Оптимізація'] },
    streamer: { health: 50, mana: 150, perks: ['Стримерська харизма', 'Донати'] },
    karen: { health: 100, mana: 80, perks: ['Хочу поговорити з менеджером', 'Скарги'] },
    boomer: { health: 90, mana: 40, perks: ['В молодості було краще', 'Грамофон'] },
    zoomer: { health: 70, mana: 120, perks: ['Тікток танці', 'Мемологія'] }
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
        boxer: "Boxer",
        boxerDesc: "Tough fighter with powerful punches and high endurance",
        boxerStats: "HP: 130, Mana: 40, Strength: Very High",
        lumberjack: "Lumberjack",
        lumberjackDesc: "Strong woodcutter with axe mastery and resilience",
        lumberjackStats: "HP: 125, Mana: 35, Stamina: High",
        // ... existing code ...
        
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
        
        IMPORTANT: 
        1. Respond ONLY with clean JSON without markdown blocks, without additional text, without prefixes or suffixes!
        2. Create CHALLENGING, meaningful situations - don't make it too easy
        3. Players need to face significant consequences for their actions
        4. Start with some initial threat or difficult situation - no peaceful beginnings
        5. Include moral dilemmas and tough choices
        
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
                "new_perks": [],
                "gameover": false
            }
        }
        
        If combat is true, always return enemy information in this format:
        - For a single enemy: 
          "enemy": {
            "name": "Enemy Name", 
            "health": numeric_value_or_description, 
            "description": "brief description"
          }
        
        - For multiple enemies or a group:
          "enemy": {
            "name": "Group Name", 
            "count": number_of_enemies, 
            "health": numeric_value_or_description_per_individual, 
            "type": "combat_type",
            "description": "description of the group",
            "elements": [  // Optional: provide details for individual enemies
              {
                "name": "Enemy 1 Name",
                "health": "Enemy 1 Health",
                "description": "Enemy 1 description"
              },
              {
                "name": "Enemy 2 Name",
                "health": "Enemy 2 Health",
                "description": "Enemy 2 description"
              }
            ]
          }
        
        NEVER return enemy as a simple string. Always use the proper object structure.

        The 'gameover' field should be set to true only if the character has died or the adventure has reached a definitive end.`,
        
        actionPrompt: `Continue the D&D adventure. Previous situation: "{prevSituation}"
        Player chose action: "{action}"
        Character: {name}, class {class}, level {level}
        Current stats: HP {health}/{maxHealth}, Mana {mana}/{maxMana}
        Experience: {experience}, Perks: {perks}
        
        IMPORTANT: 
        1. Respond ONLY with clean JSON without markdown blocks, without additional text, without prefixes or suffixes!
        2. Consider the context of previous events for logical story development
        3. Create VERY CHALLENGING situations - be harsh and unforgiving with players!
        4. Actions should have significant consequences, both positive and negative
        5. Include occasional unexpected negative events, even when player makes good decisions
        6. All perks MUST have both benefits AND drawbacks - create balanced trade-offs
        7. If character health reaches 0 or a definitive ending is reached, set gameover to true
        8. Don't be afraid to cause damage to the character during normal activities
        9. For peaceful choices, introduce unforeseen complications
        
        Example perks with stronger trade-offs:
        - "Crystal Harmony: +15 to maximum mana but -5 to maximum health and -10% fire resistance"
        - "Warrior's Fervor: +10% critical hit chance but -5% dodge chance and occasional recklessness"
        - "Shadow Pact: Ability to become invisible for a short time but -10% movement speed and occasional dark whispers"
        
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
                "new_perks": ["name and description of new perk with both benefits and drawbacks"],
                "gameover": false
            }
        }
        
        If combat is true, always return enemy information in this format:
        - For a single enemy: 
          "enemy": {
            "name": "Enemy Name", 
            "health": numeric_value_or_description, 
            "description": "brief description"
          }
        
        - For multiple enemies or a group:
          "enemy": {
            "name": "Group Name", 
            "count": number_of_enemies, 
            "health": numeric_value_or_description_per_individual, 
            "type": "combat_type",
            "description": "description of the group",
            "elements": [  // Optional: provide details for individual enemies
              {
                "name": "Enemy 1 Name",
                "health": "Enemy 1 Health",
                "description": "Enemy 1 description"
              },
              {
                "name": "Enemy 2 Name",
                "health": "Enemy 2 Health",
                "description": "Enemy 2 description"
              }
            ]
          }
        
        NEVER return enemy as a simple string. Always use the proper object structure.

        The 'gameover' field should be set to true if the character has died (health reaches 0) or the adventure has reached a definitive end.`,
        
        // Додаємо нові рядки локалізації для вибору початку гри
        gameStartOptions: "Choose an option",
        newGame: "Start new game",
        enemyGroup: "Enemy Group",
        enemyCount: "Count",
        enemiesName: "Enemies",
        
        // Додаємо нові рядки локалізації для спеціальних класів
        boxer: "Boxer",
        boxerDesc: "Tough fighter with powerful punches and high endurance",
        boxerStats: "HP: 130, Mana: 40, Strength: Very High",
        lumberjack: "Lumberjack",
        lumberjackDesc: "Strong woodcutter with axe mastery and resilience",
        lumberjackStats: "HP: 125, Mana: 35, Stamina: High",
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
        loser: "Loser",
        loserDesc: "Fails at everything, speaks uncertainly and mumbles",
        loserStats: "HP: 20, Mana: 0, Luck: 0, Charisma: 0",
        gameOver: "Game Over",
        gameOverDesc: "Your adventure has ended.",
        restartGame: "Start New Adventure",
        deathMessage: "You have died!",
        programmer: "Programmer",
        programmerDesc: "Master of code with infinite mana but low health",
        programmerStats: "HP: 60, Mana: 200, Debug: High",
        streamer: "Streamer",
        streamerDesc: "Charismatic entertainer with unique abilities",
        streamerStats: "HP: 50, Mana: 150, Charisma: Very High",
        karen: "Karen",
        karenDesc: "Professional complainer with manager-seeking abilities",
        karenStats: "HP: 100, Mana: 80, Complaints: Maximum",
        boomer: "Boomer",
        boomerDesc: "Nostalgic warrior with old-school knowledge",
        boomerStats: "HP: 90, Mana: 40, Nostalgia: High",
        zoomer: "Zoomer",
        zoomerDesc: "Modern adventurer with meme powers",
        zoomerStats: "HP: 70, Mana: 120, Memes: Infinite",
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
        boxer: "Боксер",
        boxerDesc: "Витривалий боєць з потужними ударами та високою стійкістю",
        boxerStats: "HP: 130, Mana: 40, Сила: Дуже висока",
        lumberjack: "Лісоруб",
        lumberjackDesc: "Сильний лісоруб з майстерністю сокири та стійкістю",
        lumberjackStats: "HP: 125, Mana: 35, Витривалість: Висока",
        // ... existing code ...
        
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
        
        ВАЖЛИВО: 
        1. Відповідай ТІЛЬКИ чистим JSON без markdown блоків, без додаткового тексту, без префіксів та суфіксів!
        2. Створюй СКЛАДНІ, змістовні ситуації - не роби гру занадто простою
        3. Гравці повинні нести серйозні наслідки за свої дії
        4. Починай з якоїсь початкової загрози чи складної ситуації - без мирних початків
        5. Включай моральні дилеми та складні вибори
        
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
                "new_perks": [],
                "gameover": false
            }
        }
        
        Якщо combat є true, завжди повертай інформацію про ворога в такому форматі:
        - Для одного ворога: 
          "enemy": {
            "name": "Ім'я ворога", 
            "health": числове_значення_або_опис, 
            "description": "короткий опис"
          }
        
        - Для кількох ворогів або групи:
          "enemy": {
            "name": "Назва групи", 
            "count": кількість_ворогів, 
            "health": здоров'я_кожного_індивіда, 
            "type": "тип_бою",
            "description": "опис групи",
            "elements": [  // Необов'язково: надайте деталі для окремих ворогів
              {
                "name": "Ім'я ворога 1",
                "health": "Здоров'я ворога 1",
                "description": "Опис ворога 1"
              },
              {
                "name": "Ім'я ворога 2",
                "health": "Здоров'я ворога 2",
                "description": "Опис ворога 2"
              }
            ]
          }
        
        НІКОЛИ не повертай ворога як простий рядок. Завжди використовуй правильну структуру об'єкта.

        Поле 'gameover' має бути встановлено в true тільки якщо персонаж помер або пригода досягла остаточного завершення.`,
        
        actionPrompt: `Продовжи D&D пригоду. Попередня ситуація: "{prevSituation}"
        Гравець обрав дію: "{action}"
        Персонаж: {name}, клас {class}, рівень {level}
        Поточні характеристики: HP {health}/{maxHealth}, Mana {mana}/{maxMana}
        Досвід: {experience}, Перки: {perks}
        
        ВАЖЛИВО: 
        1. Відповідай ТІЛЬКИ чистим JSON без markdown блоків, без додаткового тексту, без префіксів та суфіксів!
        2. Врахуй контекст попередніх подій для логічного розвитку сюжету
        3. Створюй ДУЖЕ СКЛАДНІ ситуації - будь суворим та безжальним до гравця!
        4. Дії повинні мати серйозні наслідки, як позитивні, так і негативні
        5. Включай випадкові неочікувані негативні події, навіть коли гравець робить правильні рішення
        6. ВСІ перки ПОВИННІ мати як переваги, ТАК І недоліки - створюй збалансовані компроміси
        7. Якщо здоров'я персонажа досягає 0 або досягнуто остаточного завершення, встанови gameover в true
        8. Не бійся наносити шкоду персонажу під час звичайних дій
        9. Для мирних виборів, додавай непередбачувані ускладнення
        
        Приклад перків із сильнішими компромісами:
        - "Кришталева Гармонія: +15 до максимальної мани, але -5 до максимального здоров'я та -10% стійкості до вогню"
        - "Воїнський запал: +10% до шансу критичного удару, але -5% до шансу ухилення та періодична нерозсудливість"
        - "Тіньовий пакт: Вміння на короткий час ставати невидимим, але -10% до швидкості руху та періодичні темні шепоти"
        
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
                "new_perks": ["назва та опис нового перку з перевагами та недоліками"],
                "gameover": false
            }
        }
        
        Якщо combat є true, завжди повертай інформацію про ворога в такому форматі:
        - Для одного ворога: 
          "enemy": {
            "name": "Ім'я ворога", 
            "health": числове_значення_або_опис, 
            "description": "короткий опис"
          }
        
        - Для кількох ворогів або групи:
          "enemy": {
            "name": "Назва групи", 
            "count": кількість_ворогів, 
            "health": здоров'я_кожного_індивіда, 
            "type": "тип_бою",
            "description": "опис групи",
            "elements": [  // Необов'язково: надайте деталі для окремих ворогів
              {
                "name": "Ім'я ворога 1",
                "health": "Здоров'я ворога 1",
                "description": "Опис ворога 1"
              },
              {
                "name": "Ім'я ворога 2",
                "health": "Здоров'я ворога 2",
                "description": "Опис ворога 2"
              }
            ]
          }
        
        НІКОЛИ не повертай ворога як простий рядок. Завжди використовуй правильну структуру об'єкта.

        Поле 'gameover' має бути встановлено в true якщо персонаж помер (здоров'я досягло 0) або пригода досягла остаточного завершення.`,
        
        // Додаємо нові рядки локалізації для вибору початку гри
        gameStartOptions: "Виберіть опцію",
        newGame: "Почати нову гру",
        enemyGroup: "Група ворогів",
        enemyCount: "Кількість",
        enemiesName: "Вороги",
        
        // Додаємо нові рядки локалізації для спеціальних класів
        boxer: "Боксер",
        boxerDesc: "Витривалий боєць з потужними ударами та високою стійкістю",
        boxerStats: "HP: 130, Mana: 40, Сила: Дуже висока",
        lumberjack: "Лісоруб",
        lumberjackDesc: "Сильний лісоруб з майстерністю сокири та стійкістю",
        lumberjackStats: "HP: 125, Mana: 35, Витривалість: Висока",
        startAdventure: "Почати пригоду!",
        health: "Здоров'я",
        mana: "Мана",
        experience: "Досвід",
        level: "Рівень",
        perks: "Перки",
        basicSkills: "Базові навички",
        saveGame: "Зберегти",
        loadGame: "Завантажити",
        history: "Історія",
        enemyName: "Ворог",
        enemyHealth: "Здоров'я",
        enemyDesc: "Опис",
        enemyAbilities: "Навички",
        enemyWeaknesses: "Слабкості",
        customActionPlaceholder: "Опишіть, що ви хочете зробити...",
        performAction: "Виконати дію",
        customActionLabel: "Або виберіть свою дію:",
        processingAction: "Обробка дії",
        loser: "Попуск",
        loserDesc: "У всьому зазнає невдачі, мямлить та говорить невпевнено",
        loserStats: "HP: 20, Mana: 0, Удача: 0, Харизма: 0",
        gameOver: "Гра завершена",
        gameOverDesc: "Ваша пригода закінчилась.",
        restartGame: "Почати нову пригоду",
        deathMessage: "Ви померли!",
        programmer: "Програміст",
        programmerDesc: "Майстер коду з нескінченною маною, але низьким здоров'ям",
        programmerStats: "HP: 60, Mana: 200, Дебаг: Високий",
        streamer: "Стрімер",
        streamerDesc: "Харизматичний розважальник з унікальними здібностями",
        streamerStats: "HP: 50, Mana: 150, Харизма: Дуже висока",
        karen: "Карен",
        karenDesc: "Професійна скаржниця з навичками пошуку менеджера",
        karenStats: "HP: 100, Mana: 80, Скарги: Максимум",
        boomer: "Бумер",
        boomerDesc: "Ностальгічний воїн зі знаннями старої школи",
        boomerStats: "HP: 90, Mana: 40, Ностальгія: Висока",
        zoomer: "Зумер",
        zoomerDesc: "Сучасний шукач пригод з силою мемів",
        zoomerStats: "HP: 70, Mana: 120, Меми: Нескінченні",
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
        boxer: "Боксер",
        boxerDesc: "Выносливый боец с мощными ударами и высокой стойкостью",
        boxerStats: "HP: 130, Mana: 40, Сила: Очень высокая",
        lumberjack: "Лесоруб",
        lumberjackDesc: "Сильный лесоруб с мастерством топора и стойкостью",
        lumberjackStats: "HP: 125, Mana: 35, Выносливость: Высокая",
        // ... existing code ...
        
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
        
        ВАЖНО: 
        1. Отвечай ТОЛЬКО чистым JSON без markdown блоков, без дополнительного текста, без префиксов и суффиксов!
        2. Создавай СЛОЖНЫЕ, содержательные ситуации - не делай игру слишком простой
        3. Игроки должны нести серьезные последствия за свои действия
        4. Начинай с какой-то начальной угрозы или сложной ситуации - без мирных начал
        5. Включай моральные дилеммы и сложные выборы
        
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
                "new_perks": [],
                "gameover": false
            }
        }
        
        Если combat равен true, всегда возвращай информацию о враге в таком формате:
        - Для одного врага: 
          "enemy": {
            "name": "Имя врага", 
            "health": числовое_значение_или_описание, 
            "description": "краткое описание"
          }
        
        - Для нескольких врагов или группы:
          "enemy": {
            "name": "Название группы", 
            "count": количество_врагов, 
            "health": здоровье_каждого_индивида, 
            "type": "тип_боя",
            "description": "описание группы",
            "elements": [  // Необязательно: предоставьте детали для отдельных врагов
              {
                "name": "Имя врага 1",
                "health": "Здоровье врага 1",
                "description": "Описание врага 1"
              },
              {
                "name": "Имя врага 2",
                "health": "Здоровье врага 2",
                "description": "Описание врага 2"
              }
            ]
          }
        
        НИКОГДА не возвращай врага как простую строку. Всегда используй правильную структуру объекта.

        Поле 'gameover' должно быть установлено в true только если персонаж умер или приключение достигло окончательного завершения.`,
        
        actionPrompt: `Продолжи D&D приключение. Предыдущая ситуация: "{prevSituation}"
        Игрок выбрал действие: "{action}"
        Персонаж: {name}, класс {class}, уровень {level}
        Текущие характеристики: HP {health}/{maxHealth}, Mana {mana}/{maxMana}
        Опыт: {experience}, Перки: {perks}
        
        ВАЖНО: 
        1. Отвечай ТОЛЬКО чистым JSON без markdown блоков, без дополнительного текста, без префиксов и суффиксов!
        2. Учитывай контекст предыдущих событий для логичного развития сюжета
        3. Создавай ОЧЕНЬ СЛОЖНЫЕ ситуации - будь суровым и беспощадным к игроку!
        4. Действия должны иметь серьезные последствия, как положительные, так и отрицательные
        5. Включай случайные неожиданные негативные события, даже когда игрок делает правильные решения
        6. ВСЕ перки ДОЛЖНЫ иметь как преимущества, ТАК И недостатки - создавай сбалансированные компромиссы
        7. Если здоровье персонажа достигает 0 или достигнуто окончательное завершение, установи gameover в true
        8. Не бойся наносить урон персонажу во время обычных действий
        9. Для мирных выборов, добавляй непредвиденные осложнения
        
        Пример перков с более сильными компромиссами:
        - "Кристальная Гармония: +15 к максимальной мане, но -5 к максимальному здоровью и -10% устойчивости к огню"
        - "Воинский пыл: +10% к шансу критического удара, но -5% к шансу уклонения и периодическая безрассудность"
        - "Теневой пакт: Умение на короткое время становиться невидимым, но -10% к скорости движения и периодические темные шепоты"
        
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
                "new_perks": ["название и описание нового перка с преимуществами и недостатками"],
                "gameover": false
            }
        }
        
        Если combat равен true, всегда возвращай информацию о враге в таком формате:
        - Для одного врага: 
          "enemy": {
            "name": "Имя врага", 
            "health": числовое_значение_или_описание, 
            "description": "краткое описание"
          }
        
        - Для нескольких врагов или группы:
          "enemy": {
            "name": "Название группы", 
            "count": количество_врагов, 
            "health": здоровье_каждого_индивида, 
            "type": "тип_боя",
            "description": "описание группы",
            "elements": [  // Необязательно: предоставьте детали для отдельных врагов
              {
                "name": "Имя врага 1",
                "health": "Здоровье врага 1",
                "description": "Описание врага 1"
              },
              {
                "name": "Имя врага 2",
                "health": "Здоровье врага 2",
                "description": "Описание врага 2"
              }
            ]
          }
        
        НИКОГДА не возвращай врага как простую строку. Всегда используй правильную структуру объекта.

        Поле 'gameover' должно быть установлено в true если персонаж умер (здоровье достигло 0) или приключение достигло окончательного завершения.`,
        
        // Додаємо нові рядки локалізації для вибору початку гри
        gameStartOptions: "Выберите опцию",
        newGame: "Начать новую игру",
        enemyGroup: "Группа врагов",
        enemyCount: "Количество",
        enemiesName: "Враги",
        
        // Додаємо нові рядки локалізації для спеціальних класів
        boxer: "Боксер",
        boxerDesc: "Выносливый боец с мощными ударами и высокой стойкостью",
        boxerStats: "HP: 130, Mana: 40, Сила: Очень высокая",
        lumberjack: "Лесоруб",
        lumberjackDesc: "Сильный лесоруб с мастерством топора и стойкостью",
        lumberjackStats: "HP: 125, Mana: 35, Выносливость: Высокая",
        startAdventure: "Начать приключение!",
        health: "Здоровье",
        mana: "Мана",
        experience: "Опыт",
        level: "Уровень",
        perks: "Перки",
        basicSkills: "Базовые навыки",
        saveGame: "Сохранить",
        loadGame: "Загрузить",
        history: "История",
        enemyName: "Враг",
        enemyHealth: "Здоровье",
        enemyDesc: "Описание",
        enemyAbilities: "Навыки",
        enemyWeaknesses: "Слабости",
        customActionPlaceholder: "Опишите, что вы хотите сделать...",
        performAction: "Выполнить действие",
        customActionLabel: "Или выберите свою собственную:",
        processingAction: "Обработка действия",
        loser: "Лузер",
        loserDesc: "Во всем терпит неудачу, мямлит и говорит неуверенно",
        loserStats: "HP: 20, Mana: 0, Удача: 0, Харизма: 0",
        gameOver: "Игра окончена",
        gameOverDesc: "Ваше приключение завершилось.",
        restartGame: "Начать новое приключение",
        deathMessage: "Вы умерли!",
        programmer: "Программист",
        programmerDesc: "Мастер кода с бесконечной маной, но низким здоровьем",
        programmerStats: "HP: 60, Mana: 200, Дебаг: Высокий",
        streamer: "Стример",
        streamerDesc: "Харизматичный развлекатель с уникальными способностями",
        streamerStats: "HP: 50, Mana: 150, Харизма: Очень высокая",
        karen: "Карен",
        karenDesc: "Профессиональная жалобщица с навыками поиска менеджера",
        karenStats: "HP: 100, Mana: 80, Жалобы: Максимум",
        boomer: "Бумер",
        boomerDesc: "Ностальгический воин со знаниями старой школы",
        boomerStats: "HP: 90, Mana: 40, Ностальгия: Высокая",
        zoomer: "Зумер",
        zoomerDesc: "Современный искатель приключений с силой мемов",
        zoomerStats: "HP: 70, Mana: 120, Мемы: Бесконечные",
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
    updateClassInfo("boxer", "👊", "boxer", "boxerDesc", "boxerStats");
    updateClassInfo("lumberjack", "🪓", "lumberjack", "lumberjackDesc", "lumberjackStats");
    updateClassInfo("loser", "😞", "loser", "loserDesc", "loserStats");
    updateClassInfo("programmer", "👨‍💻", "programmer", "programmerDesc", "programmerStats");
    updateClassInfo("streamer", "🎥", "streamer", "streamerDesc", "streamerStats");
    updateClassInfo("karen", "👩‍💼", "karen", "karenDesc", "karenStats");
    updateClassInfo("boomer", "👴", "boomer", "boomerDesc", "boomerStats");
    updateClassInfo("zoomer", "👶", "zoomer", "zoomerDesc", "zoomerStats");
    
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

// Функція для отримання локалізованої назви класу
function getCharacterClassName(characterClass) {
    const currentLang = gameState.language;
    
    // Спеціальна обробка для аніме-персонажів
    const classTranslations = {
        "animeFan": {
            "en": "Otaku",
            "uk": "Анімешник",
            "ru": "Анимешник"
        },
        "animeFanFemale": {
            "en": "Anime Enthusiast",
            "uk": "Анімешниця",
            "ru": "Анимешница"
        }
    };
    
    // Якщо знайдено переклад у спеціальному списку
    if (classTranslations[characterClass] && classTranslations[characterClass][currentLang]) {
        return classTranslations[characterClass][currentLang];
    }
    
    // Інакше намагаємось знайти у загальних локалізаціях
    return getText(characterClass) || characterClass;
}

// Функція для оновлення панелі персонажа
function updateCharacterPanel() {
    // Ім'я класу персонажа
    const characterClass = gameState.character.class;
    // Отримуємо локалізовану назву класу
    const translatedClass = getCharacterClassName(characterClass);
    
    document.getElementById('characterHeader').textContent = `${gameState.character.name} (${translatedClass})`;
    document.getElementById('healthValue').textContent = `${gameState.character.health}/${gameState.character.maxHealth}`;
    document.getElementById('manaValue').textContent = `${gameState.character.mana}/${gameState.character.maxMana}`;
    document.getElementById('levelValue').textContent = gameState.character.level;
    document.getElementById('expValue').textContent = gameState.character.experience;
    
    const perksList = document.getElementById('perksList');
    perksList.innerHTML = gameState.character.perks.map(perk => `<div class="perk">${translatePerk(perk)}</div>`).join('');
}

// Додаємо переклади для перків аніме-персонажів
const animePerkTranslations = {
    // Анімешник/анімешниця перки
    "Гарем початковий рівень": {
        "en": "Harem Starting Level",
        "ru": "Гарем начальный уровень"
    },
    "Гарем початковий рівень: +5 до харизми з анімешницями, але -5 до харизми з усіма іншими": {
        "en": "Harem Starting Level: +5 to charisma when interacting with female anime fans, but -5 to charisma with everyone else",
        "ru": "Гарем начальный уровень: +5 к харизме при взаимодействии с анимешницами, но -5 к харизме со всеми остальными"
    },
    "Отаку мудрість": {
        "en": "Otaku Wisdom",
        "ru": "Мудрость отаку"
    },
    "Отаку мудрість: +10 до знань про аніме та мангу, що іноді може бути корисно": {
        "en": "Otaku Wisdom: +10 to knowledge about anime and manga, which can sometimes be useful",
        "ru": "Мудрость отаку: +10 к знаниям об аниме и манге, что иногда может быть полезно"
    },
    "Аніме харизма": {
        "en": "Anime Charisma",
        "ru": "Аниме харизма"
    },
    "Аніме харизма: +15 до харизми при взаємодії з любителями аніме": {
        "en": "Anime Charisma: +15 to charisma when interacting with anime fans",
        "ru": "Аниме харизма: +15 к харизме при взаимодействии с любителями аниме"
    },
    "Невдача": {
        "en": "Bad Luck",
        "ru": "Неудача"
    },
    "Нікчемність": {
        "en": "Worthlessness",
        "ru": "Никчемность"
    }
};

// Функція для перекладу перків
function translatePerk(perk) {
    // Перевірка на наявність перекладу для перку
    const currentLang = gameState.language;
    
    // Перевіряємо чи є переклад в animePerkTranslations
    if (animePerkTranslations[perk] && animePerkTranslations[perk][currentLang]) {
        return animePerkTranslations[perk][currentLang];
    }
    
    // Базові переклади перків
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
        },
        "Міцні кулаки": {
            "en": "Powerful Punches",
            "ru": "Мощные удары"
        },
        "Витривалість": {
            "en": "High Endurance",
            "ru": "Высокая выносливость"
        },
        "Сила замаху": {
            "en": "Axe Mastery",
            "ru": "Сила замаха"
        },
        "Стійкість": {
            "en": "Resilience",
            "ru": "Прочность"
        },
        // Програміст
"Баг-фікс": {
    "en": "Bug Fix",
    "ru": "Исправление багов"
},
"Оптимізація": {
    "en": "Optimization",
    "ru": "Оптимизация"
},
// Стрімер
"Стримерська харизма": {
    "en": "Streamer Charisma",
    "ru": "Стримерская харизма"
},
"Донати": {
    "en": "Donations",
    "ru": "Донаты"
},
// Карен
"Хочу поговорити з менеджером": {
    "en": "I Want to Speak to the Manager",
    "ru": "Хочу поговорить с менеджером"
},
"Скарги": {
    "en": "Complaints",
    "ru": "Жалобы"
},
// Бумер
"В молодості було краще": {
    "en": "It Was Better in My Youth",
    "ru": "В молодости было лучше"
},
"Грамофон": {
    "en": "Gramophone",
    "ru": "Грамофон"
},
// Зумер
"Тікток танці": {
    "en": "TikTok Dances",
    "ru": "ТикТок танцы"
},
"Мемологія": {
    "en": "Memology",
    "ru": "Мемология"
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
        .replace('{class}', getCharacterClassName(gameState.character.class));

    await callGeminiAPI(prompt, true);
}

// Додаємо локалізацію для спеціальних ефектів аніме-персонажів
const animeSpecialTexts = {
    "uk": {
        "awkwardness": "Ви відчуваєте незручність і ваш голос тремтить. Чомусь вам стає важко дивитися співрозмовнику в очі, а серце починає битися частіше.",
        "animeConfidence": "Ваші знання аніме та манги дозволяють вам відчувати особливу впевненість в цій ситуації.",
        "animeFemaleInfluence": "Ви помічаєте, що ваша присутність викликає особливу реакцію. Здається, ви маєте певний вплив на цю людину.",
        "useInfluence": "Використати свій природній вплив на цю людину",
        "nervously": "(нервуючи)"
    },
    "en": {
        "awkwardness": "You feel uncomfortable and your voice trembles. For some reason, it becomes difficult to look your interlocutor in the eyes, and your heart begins to beat faster.",
        "animeConfidence": "Your knowledge of anime and manga allows you to feel special confidence in this situation.",
        "animeFemaleInfluence": "You notice that your presence causes a special reaction. It seems you have some influence over this person.",
        "useInfluence": "Use your natural influence on this person",
        "nervously": "(nervously)"
    },
    "ru": {
        "awkwardness": "Вы чувствуете неловкость и ваш голос дрожит. Почему-то вам становится трудно смотреть собеседнику в глаза, а сердце начинает биться чаще.",
        "animeConfidence": "Ваши знания аниме и манги позволяют вам чувствовать особую уверенность в этой ситуации.",
        "animeFemaleInfluence": "Вы замечаете, что ваше присутствие вызывает особую реакцию. Кажется, вы имеете определенное влияние на этого человека.",
        "useInfluence": "Использовать своё естественное влияние на этого человека",
        "nervously": "(нервничая)"
    }
};

// Функція для отримання локалізованого тексту спеціальних ефектів аніме-персонажів
function getAnimeText(key) {
    const lang = gameState.language;
    if (animeSpecialTexts[lang] && animeSpecialTexts[lang][key]) {
        return animeSpecialTexts[lang][key];
    }
    // За замовчуванням повертаємо український текст
    return animeSpecialTexts["uk"][key] || key;
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
            modifiedResponse.text = originalText + ' ' + getAnimeText('awkwardness');
            
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
                            return option + ' ' + getAnimeText('nervously');
                        }
                        return option;
                    });
                }
            }
            
            // Шанс 10% отримати перк "Гарем початковий рівень" після кількох таких взаємодій
            if (!gameState.character.perks.includes('Гарем початковий рівень') && Math.random() < 0.1) {
                modifiedResponse.consequences.new_perks = modifiedResponse.consequences.new_perks || [];
                
                // Використовуємо локалізовану версію перку
                if (gameState.language === 'en') {
                    modifiedResponse.consequences.new_perks.push('Harem Starting Level: +5 to charisma when interacting with female anime fans, but -5 to charisma with everyone else');
                } else if (gameState.language === 'ru') {
                    modifiedResponse.consequences.new_perks.push('Гарем начальный уровень: +5 к харизме при взаимодействии с анимешницами, но -5 к харизме со всеми остальными');
                } else {
                modifiedResponse.consequences.new_perks.push('Гарем початковий рівень: +5 до харизми з анімешницями, але -5 до харизми з усіма іншими');
                }
            }
        }
        
        // Якщо дія пов'язана з аніме або мангою, додаємо бонус
        if (actionLowerCase.includes('аніме') || actionLowerCase.includes('манг') || 
            actionLowerCase.includes('аниме') || actionLowerCase.includes('манг') ||
            actionLowerCase.includes('anime') || actionLowerCase.includes('manga')) {
            
            modifiedResponse.text = modifiedResponse.text + ' ' + getAnimeText('animeConfidence');
            
            // Бонус до досвіду за використання знань аніме
            modifiedResponse.consequences.experience = (modifiedResponse.consequences.experience || 0) + 5;
            
            // Шанс 15% отримати перк "Отаку мудрість"
            if (!gameState.character.perks.includes('Отаку мудрість') && Math.random() < 0.15) {
                modifiedResponse.consequences.new_perks = modifiedResponse.consequences.new_perks || [];
                
                // Використовуємо локалізовану версію перку
                if (gameState.language === 'en') {
                    modifiedResponse.consequences.new_perks.push('Otaku Wisdom: +10 to knowledge about anime and manga, which can sometimes be useful');
                } else if (gameState.language === 'ru') {
                    modifiedResponse.consequences.new_perks.push('Мудрость отаку: +10 к знаниям об аниме и манге, что иногда может быть полезно');
                } else {
                modifiedResponse.consequences.new_perks.push('Отаку мудрість: +10 до знань про аніме та мангу, що іноді може бути корисно');
                }
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
            modifiedResponse.text = modifiedResponse.text + ' ' + getAnimeText('animeFemaleInfluence');
            
            // Бонус до харизми при взаємодії з анімешниками
            if (modifiedResponse.options && modifiedResponse.options.length > 0) {
                // Додаємо опцію використання впливу
                modifiedResponse.options.push(getAnimeText('useInfluence'));
            }
            
            // Шанс 20% отримати перк "Аніме харизма"
            if (!gameState.character.perks.includes('Аніме харизма') && Math.random() < 0.2) {
                modifiedResponse.consequences.new_perks = modifiedResponse.consequences.new_perks || [];
                
                // Використовуємо локалізовану версію перку
                if (gameState.language === 'en') {
                    modifiedResponse.consequences.new_perks.push('Anime Charisma: +15 to charisma when interacting with anime fans');
                } else if (gameState.language === 'ru') {
                    modifiedResponse.consequences.new_perks.push('Аниме харизма: +15 к харизме при взаимодействии с любителями аниме');
                } else {
                modifiedResponse.consequences.new_perks.push('Аніме харизма: +15 до харизми при взаємодії з любителями аніме');
                }
            }
        }
    }
    
    return modifiedResponse;
}

// Додаємо змінну для збереження останнього промпту
let lastPrompt = '';
let isRetrying = false;

// Модифікуємо функцію callGeminiAPI для обробки аніме-персонажів
async function callGeminiAPI(prompt, isInitial = false) {
    if (gameState.isLoading) return;

    gameState.isLoading = true;
    document.getElementById('customActionBtn').disabled = true;
    document.getElementById('storyText').innerHTML = `<div class="loading">${getText('processingAction')}</div>`;
    
    // Зберігаємо останній промпт для можливого повторного виклику
    lastPrompt = prompt;
    
    // Add special instructions for loser class
    if (gameState.character.class === 'loser') {
        // Add harsh treatment instruction for the loser class
        if (!isInitial) {
            prompt += "\n\nIMPORTANT: This character is a complete loser. Be extremely harsh with them, create difficult situations, never forgive mistakes, and make everything go wrong for them. Even good decisions should have bad outcomes.";
        } else {
            prompt = prompt.replace(
                "create an initial scene", 
                "create a particularly harsh and unlucky initial scene"
            );
            prompt += "\n\nIMPORTANT: This character is a complete loser. Start with an embarrassing and difficult situation. Be extremely harsh and unforgiving.";
        }
    }

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
            // Якщо ми повторюємо запит, не додаємо його знову до історії
            if (!isRetrying) {
            gameState.conversationHistory.push({
                role: "user",
                parts: [{ text: prompt }]
            });
            }
            
            gameState.conversationHistory.push({
                role: "model", 
                parts: [{ text: responseText }]
            });
            
            // Скидаємо прапорець повторної спроби
            isRetrying = false;
            
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
                
                // Спробуємо виправити можливі проблеми з відповіддю та витягти валідний JSON
                let gameData = null;
                
                // Спроба 1: Парсинг як є
                try {
                    gameData = JSON.parse(responseText);
                } catch (error) {
                    console.log('Не вдалося розпарсити відповідь як є, пробуємо виправлення...');
                    
                    // Спроба 2: Витягуємо JSON з тексту
                    gameData = extractJsonFromText(responseText);
                    
                    // Спроба 3: Шукаємо JSON в тексті, який може бути розбитий або містити зайві символи
                    if (!gameData) {
                        // Пошук по регулярному виразу
                        const jsonRegex = /{[\s\S]*?}/g;
                        const matches = responseText.match(jsonRegex);
                        
                        if (matches && matches.length > 0) {
                            // Перебираємо всі знайдені можливі JSON-об'єкти
                            for (const match of matches) {
                                try {
                                    const potentialData = JSON.parse(match);
                                    // Перевіряємо, чи має об'єкт потрібні властивості
                                    if (potentialData.text && potentialData.options && potentialData.consequences) {
                                        gameData = potentialData;
                                        break;
                                    }
                                } catch (parseErr) {
                                    // Пропускаємо, якщо не вдалося розпарсити
                                    continue;
                                }
                            }
                        }
                    }
                    
                    // Якщо все ще не вдалося розпарсити, викидаємо помилку
                    if (!gameData) {
                        throw new Error('Не вдалося розпарсити відповідь як JSON');
                    }
                }
                
                // Застосовуємо специфічну логіку для анімешників/анімешниць, якщо це не початкова сцена
                if (!isInitial && (gameState.character.class === 'animeFan' || gameState.character.class === 'animeFanFemale')) {
                    // Отримуємо останню дію гравця для контексту
                    const lastAction = gameState.conversationHistory.slice(-4, -3)[0]?.parts[0]?.text || '';
                    const actionMatch = lastAction.match(/Гравець обрав дію: "([^"]*)"/);
                    let playerAction = actionMatch ? actionMatch[1] : '';
                    
                    // Для мов, відмінних від української, шукаємо відповідний патерн
                    if (!playerAction && gameState.language === 'en') {
                        const enMatch = lastAction.match(/Player chose action: "([^"]*)"/);
                        playerAction = enMatch ? enMatch[1] : '';
                    } else if (!playerAction && gameState.language === 'ru') {
                        const ruMatch = lastAction.match(/Игрок выбрал действие: "([^"]*)"/);
                        playerAction = ruMatch ? ruMatch[1] : '';
                    }
                    
                    gameData = processAnimeFanSpecialInteractions(playerAction, gameData);
                }
                
                updateGameState(gameData);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.log('Raw response:', responseText);
                
                // Додаємо переклади для повторної генерації
                if (!localization.en.retryGeneration) {
                    localization.en.retryGeneration = "Retry Generation";
                    localization.uk.retryGeneration = "Повторити генерацію";
                    localization.ru.retryGeneration = "Повторить генерацию";
                }
                
                // Додаємо повідомлення про помилку до локалізацій
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
                
                // Додаємо кнопку повторної генерації
                document.getElementById('storyText').innerHTML = `
                    <p>${getText('parseError')}</p>
                    <button id="retryButton" class="action-btn" style="margin: 10px 0;">${getText('retryGeneration')}</button>
                    <details><summary>${getText('detailedInfo')}</summary><pre>${responseText}</pre></details>
                `;
                
                // Додаємо обробник події для кнопки повторної генерації
                document.getElementById('retryButton').addEventListener('click', () => {
                    retryGeneration();
                });
            }
        } else {
            throw new Error('Неправильна відповідь від API');
        }
    } catch (error) {
        console.error('API Error:', error);
        
        // Додаємо переклади для повторної генерації
        if (!localization.en.retryGeneration) {
            localization.en.retryGeneration = "Retry Generation";
            localization.uk.retryGeneration = "Повторити генерацію";
            localization.ru.retryGeneration = "Повторить генерацию";
        }
        
        // Додаємо кнопку повторної генерації
        document.getElementById('storyText').innerHTML = `
            <p>${getText('apiError')}</p>
            <button id="retryButton" class="action-btn" style="margin: 10px 0;">${getText('retryGeneration')}</button>
        `;
        
        // Додаємо обробник події для кнопки повторної генерації
        document.getElementById('retryButton').addEventListener('click', () => {
            retryGeneration();
        });
    }

    gameState.isLoading = false;
    document.getElementById('customActionBtn').disabled = false;
}

// Функція для повторної генерації
function retryGeneration() {
    if (!lastPrompt) return;
    
    // Встановлюємо прапорець повторної спроби
    isRetrying = true;
    
    // Викликаємо API з останнім промптом
    callGeminiAPI(lastPrompt, false);
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
        
        // Check for game over
        if (cons.gameover || gameState.character.health <= 0) {
            // Ensure health is 0 if player is dead
            if (gameState.character.health <= 0) {
                gameState.character.health = 0;
            }
            
            // Update character panel before showing game over
            updateCharacterPanel();
            
            // Show game over popup
            showGameOverPopup(gameState.character.health <= 0);
            return; // Stop further processing
        }
        
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
        
        // Додавання нових перків від API у список доступних
        if (cons.new_perks && Array.isArray(cons.new_perks) && cons.new_perks.length > 0) {
            // Функція для локалізації перків в залежності від вибраної мови (зворотний переклад)
            function localizeNewPerk(perk) {
                // Якщо гра на українській мові, повертаємо перк без змін
                if (gameState.language === 'uk') return perk;
                
                // Словник відомих перків з локалізацією (зворотний переклад)
                const perkLocalizations = {
                    // Базові переклади
                    "Otaku Wisdom": "Отаку мудрість",
                    "Anime Charisma": "Аніме харизма",
                    "Harem Starting Level": "Гарем початковий рівень",
                    
                    // Розширені описи перків
                    "Otaku Wisdom: +10 to knowledge about anime and manga, which can sometimes be useful": 
                        "Отаку мудрість: +10 до знань про аніме та мангу, що іноді може бути корисно",
                    "Anime Charisma: +15 to charisma when interacting with anime fans": 
                        "Аніме харизма: +15 до харизми при взаємодії з любителями аніме",
                    "Harem Starting Level: +5 to charisma when interacting with female anime fans, but -5 to charisma with everyone else": 
                        "Гарем початковий рівень: +5 до харизми з анімешницями, але -5 до харизми з усіма іншими"
                };
                
                // Для російських відповідників
                if (gameState.language === 'ru') {
                    if (perk === "Мудрость отаку" || perk.includes("Мудрость отаку:")) return "Отаку мудрість";
                    if (perk === "Аниме харизма" || perk.includes("Аниме харизма:")) return "Аніме харизма";
                    if (perk === "Гарем начальный уровень" || perk.includes("Гарем начальный уровень:")) return "Гарем початковий рівень";
                }
                
                // Для англійських відповідників
                if (gameState.language === 'en') {
                    for (const [engPerk, ukrPerk] of Object.entries(perkLocalizations)) {
                        if (perk === engPerk || perk.includes(engPerk + ":")) {
                            return ukrPerk;
                        }
                    }
                }
                
                // Якщо не знайдено відповідностей, повертаємо оригінал
                return perk;
            }
            
            cons.new_perks.forEach(perk => {
                if (typeof perk === 'string' && perk.trim() !== '') {
                    // Локалізуємо перк перед додаванням
                    const localizedPerk = localizeNewPerk(perk);
                    if (!gameState.availablePerks.includes(localizedPerk)) {
                        gameState.availablePerks.push(localizedPerk);
                    }
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
            
            // Визначаємо локалізації для груп
            if (!localization.en.enemyGroup) {
                localization.en.enemyGroup = "Enemy Group";
                localization.uk.enemyGroup = "Група ворогів";
                localization.ru.enemyGroup = "Группа врагов";
            }
            
            if (!localization.en.enemyCount) {
                localization.en.enemyCount = "Count";
                localization.uk.enemyCount = "Кількість";
                localization.ru.enemyCount = "Количество";
            }
            
            // Покращена обробка інформації про ворога
            let enemy = cons.enemy;
            let isGroup = false;
            let groupCount = 0;
            
            // Обробляємо випадок, коли ворог приходить як рядок
            if (typeof enemy === 'string') {
                enemy = {
                    name: enemy,
                    health: 'Невідомо',
                    description: ''
                };
            }
            
            // Визначаємо типи ворогів та їхню кількість
            if (Array.isArray(enemy)) {
                isGroup = true;
                groupCount = enemy.length;
            } else if (enemy.count && typeof enemy.count === 'number') {
                isGroup = true;
                groupCount = enemy.count;
            } else if (enemy.elements && Array.isArray(enemy.elements) && enemy.elements.length > 1) {
                isGroup = true;
                groupCount = enemy.elements.length;
            }
            
            // Оновлюємо заголовок: "Вороги" для групи, "Ворог" для одного
            const enemyTitle = document.querySelector('#enemyInfo h4');
            if (enemyTitle) {
                if (isGroup) {
                    enemyTitle.textContent = `👹 ${getText('enemiesName')}`;
                } else {
                    enemyTitle.textContent = `👹 ${getText('enemyName')}`;
                }
            }
            
            // Додаємо локалізацію для невідомого ворога та невідомих значень
            if (!localization.en.unknownEnemy) {
                localization.en.unknownEnemy = "Unknown enemy";
                localization.uk.unknownEnemy = "Невідомий ворог";
                localization.ru.unknownEnemy = "Неизвестный враг";
            }
            
            if (!localization.en.unknown) {
                localization.en.unknown = "Unknown";
                localization.uk.unknown = "Невідомо";
                localization.ru.unknown = "Неизвестно";
            }
            
            let enemyHtml = '';
            
            // Якщо це група ворогів
            if (isGroup) {
                // Відображаємо заголовок групи
                enemyHtml += `<div class="enemy-group-header" style="margin-bottom: 10px; padding-bottom: 5px;">
                    <p><strong>${getText('enemyGroup')}:</strong> ${translateEnemyName(enemy.name)}</p>
                    <p><strong>${getText('enemyCount')}:</strong> ${groupCount}</p>`;
                
                // Якщо вказано здоров'я для групи, відображаємо його в заголовку
                if (enemy.health) {
                    enemyHtml += `<p><strong>${getText('enemyHealth')}:</strong> ${enemy.health}</p>`;
                }
                
                // Якщо вказано тип для групи, відображаємо його в заголовку
                if (enemy.type) {
                    // Додаємо переклад типів ворогів
                    if (!localization.en.enemyType) {
                        localization.en.enemyType = "Type";
                        localization.uk.enemyType = "Тип";
                        localization.ru.enemyType = "Тип";
                    }
                    
                    const typeTranslations = {
                        'melee': {
                            en: 'Melee',
                            uk: 'Ближній бій',
                            ru: 'Ближний бой'
                        },
                        'ranged': {
                            en: 'Ranged',
                            uk: 'Дальній бій',
                            ru: 'Дальний бой'
                        },
                        'magic': {
                            en: 'Magic',
                            uk: 'Магічний',
                            ru: 'Магический'
                        },
                        'multiple': {
                            en: 'Mixed',
                            uk: 'Змішаний',
                            ru: 'Смешанный'
                        }
                    };
                    
                    const translatedType = typeTranslations[enemy.type] && 
                                          typeTranslations[enemy.type][gameState.language] ? 
                                          typeTranslations[enemy.type][gameState.language] : 
                                          enemy.type;
                    
                    enemyHtml += `<p><strong>${getText('enemyType')}:</strong> ${translatedType}</p>`;
                }
            
                // Додаємо опис групи, якщо є
            if (enemy.description) {
                    enemyHtml += `<p><strong>${getText('enemyDesc')}:</strong> ${enemy.description}</p>`;
            }
                
                enemyHtml += `</div>`;
            
                // Перевіряємо, чи є окремі елементи для ворогів
                if (enemy.elements && Array.isArray(enemy.elements) && enemy.elements.length > 0) {
                    // Якщо є, відображаємо кожного ворога окремо
                    enemy.elements.forEach((element, index) => {
                        enemyHtml += createEnemyCard(element, index);
                    });
                }
                // Ми більше не створюємо автоматично картки для кожного ворога в групі,
                // якщо немає елементів elements
            } else {
                // Одиночний ворог
                enemyHtml = createEnemyCard(enemy);
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
    // Special handling for loser class - add mumbling to their speech
    if (gameState.character.class === 'loser') {
        // Add mumbling and uncertainty to speech
        if (action.startsWith('Сказати') || action.startsWith('Говорити') || 
            action.startsWith('Сказать') || action.startsWith('Говорить') || 
            action.startsWith('Say') || action.startsWith('Talk') || 
            action.startsWith('Speak') || action.startsWith('Tell')) {
            
            // Get current language
            const lang = gameState.language;
            
            // Add mumbling prefixes based on language
            const mumblePrefixes = {
                'uk': ['Мм.. е-е.. ', 'Н-ну.. ', 'Т-так.. ', 'Я-я.. ', 'Ем.. '],
                'ru': ['Мм.. э-э.. ', 'Н-ну.. ', 'Т-так.. ', 'Я-я.. ', 'Эм.. '],
                'en': ['Um.. er.. ', 'S-so.. ', 'W-well.. ', 'I-I.. ', 'Hmm.. ']
            };
            
            // Random selection of mumbling prefix
            const prefixes = mumblePrefixes[lang] || mumblePrefixes['uk'];
            const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            
            // Add random stutter to words
            action = randomPrefix + stutterText(action);
        }
        
        // Randomly apply small damage to represent bad luck (25% chance)
        if (Math.random() < 0.25) {
            gameState.character.health = Math.max(1, gameState.character.health - 1);
            updateCharacterPanel();
        }
    }
    
    // Створюємо детальний опис персонажа з усіма перками та характеристиками
    const characterDetails = {
        name: gameState.character.name,
        class: getCharacterClassName(gameState.character.class),
        level: gameState.character.level,
        health: gameState.character.health,
        maxHealth: gameState.character.maxHealth,
        mana: gameState.character.mana,
        maxMana: gameState.character.maxMana,
        experience: gameState.character.experience,
        perks: gameState.character.perks.map(perk => translatePerk(perk)).join(', ')
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

// Helper function to add random stuttering to text
function stutterText(text) {
    const words = text.split(' ');
    return words.map(word => {
        // 30% chance to stutter on words longer than 2 letters
        if (word.length > 2 && Math.random() < 0.3) {
            const firstLetter = word[0];
            return `${firstLetter}-${word}`;
        }
        return word;
    }).join(' ');
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
                <li>+${levelGains.health} ${getText('health') === 'Health' ? 'to maximum health' : '❤️ ' + getText('health').toLowerCase()}</li>
                <li>+${levelGains.mana} ${getText('mana') === 'Mana' ? 'to maximum mana' : '💙 ' + getText('mana').toLowerCase()}</li>
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
    
    // Special handling for loser perks - they should actually be penalties
    if (gameState.character.class === 'loser') {
        // Apply negative effects for any perk the loser gets
        gameState.character.maxHealth -= 1;
        gameState.character.health = Math.max(1, gameState.character.health - 1);
        
        // Show a negative message about the perk
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 107, 107, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 1000;
            animation: fadeOut 3s forwards;
        `;
        
        // Message based on language
        const messages = {
            'uk': 'Навіть перки вас підводять!',
            'ru': 'Даже перки вас подводят!',
            'en': 'Even perks let you down!'
        };
        
        message.innerHTML = `<strong>${messages[gameState.language] || messages['uk']}</strong>`;
        document.body.appendChild(message);
        
        // Add CSS animation for the message
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                0%, 80% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, 20px); }
            }
        `;
        document.head.appendChild(style);
        
        // Auto-remove the message after animation
        setTimeout(() => message.remove(), 3000);
        
       
    }
    
    // Parse perk for benefits and drawbacks
    let healthBonus = 0;
    let manaBonus = 0;
    let healthPenalty = 0;
    let manaPenalty = 0;
    
    // Extract health and mana bonuses
    const healthBonusMatch = perk.match(/\+(\d+)\s*(?:до)?\s*(?:макс(?:имального)?|макс\.?)?\s*(?:здоров'я|здоровʼя|хп|hp|здоровья)/i);
    if (healthBonusMatch && healthBonusMatch[1]) {
        healthBonus = parseInt(healthBonusMatch[1]);
        if (!isNaN(healthBonus)) {
            gameState.character.maxHealth += healthBonus;
            gameState.character.health = Math.min(gameState.character.health + healthBonus, gameState.character.maxHealth);
        }
    }
    
    const manaBonusMatch = perk.match(/\+(\d+)\s*(?:до)?\s*(?:макс(?:имально[їго])?|макс\.?)?\s*(?:мани|мана|маны)/i);
    if (manaBonusMatch && manaBonusMatch[1]) {
        manaBonus = parseInt(manaBonusMatch[1]);
        if (!isNaN(manaBonus)) {
            gameState.character.maxMana += manaBonus;
            gameState.character.mana = Math.min(gameState.character.mana + manaBonus, gameState.character.maxMana);
        }
    }
    
    // Extract health and mana penalties
    const healthPenaltyMatch = perk.match(/\-(\d+)\s*(?:до)?\s*(?:макс(?:имального)?|макс\.?)?\s*(?:здоров'я|здоровʼя|хп|hp|здоровья)/i);
    if (healthPenaltyMatch && healthPenaltyMatch[1]) {
        healthPenalty = parseInt(healthPenaltyMatch[1]);
        if (!isNaN(healthPenalty)) {
            gameState.character.maxHealth = Math.max(1, gameState.character.maxHealth - healthPenalty);
            gameState.character.health = Math.min(gameState.character.health, gameState.character.maxHealth);
        }
    }
    
    const manaPenaltyMatch = perk.match(/\-(\d+)\s*(?:до)?\s*(?:макс(?:имально[їго])?|макс\.?)?\s*(?:мани|мана|маны)/i);
    if (manaPenaltyMatch && manaPenaltyMatch[1]) {
        manaPenalty = parseInt(manaPenaltyMatch[1]);
        if (!isNaN(manaPenalty)) {
            gameState.character.maxMana = Math.max(0, gameState.character.maxMana - manaPenalty);
            gameState.character.mana = Math.min(gameState.character.mana, gameState.character.maxMana);
        }
    }
    
    // If no explicit bonuses/penalties were found in the text but keywords are present, apply default bonuses
    if (healthBonus === 0 && healthPenalty === 0) {
        // Check for health-related keywords
        if (lowerPerk.includes('здоров') || lowerPerk.includes('життя') || lowerPerk.includes('hp') || 
            lowerPerk.includes('жизн') || lowerPerk.includes('health')) {
            
            if (lowerPerk.match(/(\+|збільш|увелич|increas|повыш)/i)) {
                // Positive effect on health
        gameState.character.maxHealth += 5;
        gameState.character.health = Math.min(gameState.character.health + 5, gameState.character.maxHealth);
            } else if (lowerPerk.match(/(\-|зменш|уменьш|decreas|сниж)/i)) {
                // Negative effect on health
                gameState.character.maxHealth = Math.max(1, gameState.character.maxHealth - 3);
                gameState.character.health = Math.min(gameState.character.health, gameState.character.maxHealth);
            }
        }
    }
    
    if (manaBonus === 0 && manaPenalty === 0) {
        // Check for mana-related keywords
        if (lowerPerk.includes('мана') || lowerPerk.includes('мани') || lowerPerk.includes('магі') || 
            lowerPerk.includes('колдов') || lowerPerk.includes('magic') || lowerPerk.includes('spell')) {
            
            if (lowerPerk.match(/(\+|збільш|увелич|increas|повыш)/i)) {
                // Positive effect on mana
        gameState.character.maxMana += 5;
        gameState.character.mana = Math.min(gameState.character.mana + 5, gameState.character.maxMana);
            } else if (lowerPerk.match(/(\-|зменш|уменьш|decreas|сниж)/i)) {
                // Negative effect on mana
                gameState.character.maxMana = Math.max(0, gameState.character.maxMana - 3);
                gameState.character.mana = Math.min(gameState.character.mana, gameState.character.maxMana);
            }
        }
    }
    
    // Show a message about the perk changes
    if (healthBonus > 0 || manaBonus > 0 || healthPenalty > 0 || manaPenalty > 0) {
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
        
        let effectMsg = '';
        
        // Add translations for effect messages
        const effectTexts = {
            'uk': {
                healthUp: (val) => `+${val} до максимального здоров'я`,
                healthDown: (val) => `-${val} до максимального здоров'я`,
                manaUp: (val) => `+${val} до максимальної мани`,
                manaDown: (val) => `-${val} до максимальної мани`
            },
            'ru': {
                healthUp: (val) => `+${val} к максимальному здоровью`,
                healthDown: (val) => `-${val} к максимальному здоровью`,
                manaUp: (val) => `+${val} к максимальной мане`,
                manaDown: (val) => `-${val} к максимальной мане`
            },
            'en': {
                healthUp: (val) => `+${val} to maximum health`,
                healthDown: (val) => `-${val} to maximum health`,
                manaUp: (val) => `+${val} to maximum mana`,
                manaDown: (val) => `-${val} to maximum mana`
            }
        };
        
        const texts = effectTexts[gameState.language] || effectTexts['uk'];
        const effects = [];
        
        if (healthBonus > 0) effects.push(texts.healthUp(healthBonus));
        if (healthPenalty > 0) effects.push(texts.healthDown(healthPenalty));
        if (manaBonus > 0) effects.push(texts.manaUp(manaBonus));
        if (manaPenalty > 0) effects.push(texts.manaDown(manaPenalty));
        
        effectMsg = effects.join(', ');
        
        message.innerHTML = `<strong>${getText('perkGained')}: </strong>${perk}<br><small>${effectMsg}</small>`;
        document.body.appendChild(message);
        
        // Add CSS animation for the message
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                0%, 80% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, 20px); }
            }
        `;
        document.head.appendChild(style);
        
        // Auto-remove the message after animation
        setTimeout(() => message.remove(), 3500);
    }
}
let backgroundAudio; // Сделаем переменную глобальной, чтобы избежать создания нескольких плееров

function playBackgroundMusic() {
    // Проверяем, не запущена ли музыка уже
    if (backgroundAudio && !backgroundAudio.paused) {
        return;
    }
    
    // Создаем аудио-плеер, если его еще нет
    if (!backgroundAudio) {
        backgroundAudio = new Audio('music.mp3'); // Укажите путь к вашему файлу
        backgroundAudio.loop = true; // Музыка будет повторяться
        backgroundAudio.volume = 0.3; // Громкость 30% (чтобы не мешала)
    }

    // Пытаемся запустить воспроизведение
    backgroundAudio.play().catch(error => {
        // Современные браузеры блокируют автовоспроизведение звука
        // до первого взаимодействия пользователя со страницей (клик, нажатие клавиши).
        // Это нормально, музыка начнется после клика по кнопке языка.
        console.log('Ошибка автовоспроизведения музыки (это нормально):', error);
    });
}

// ==========================================================
// ИЗМЕНЕННАЯ ФУНКЦИЯ ДЛЯ ЗАПУСКА МУЗЫКИ
// ==========================================================
// Функция для смены языка
function changeLanguage(lang) {
    gameState.language = lang;
    updateLanguage(lang);
    
    // Обновляем панель персонажа с новой языковой версией
    updateCharacterPanel();

    // Воспроизводим музыку (это сработает, так как пользователь нажал на кнопку)
    playBackgroundMusic();
}


// Ініціалізація мови при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    // Використовуємо мову за замовчуванням (встановлену в gameState)
    updateLanguage(gameState.language);
});

// Функция для перевода имени врага на выбранный язык
function translateEnemyName(name) {
    if (!name) return getText('unknownEnemy');
    
    // Добавим переводы для типичных врагов
    const enemyTranslations = {
        'Kobold': {
            en: 'Kobold',
            uk: 'Кобольд',
            ru: 'Кобольд'
        },
        'Kobold Pack': {
            en: 'Kobold Pack',
            uk: 'Зграя кобольдів',
            ru: 'Стая кобольдов'
        },
        'Goblin': {
            en: 'Goblin',
            uk: 'Гоблін',
            ru: 'Гоблин'
        },
        'Orc': {
            en: 'Orc',
            uk: 'Орк',
            ru: 'Орк'
        },
        'Wolf': {
            en: 'Wolf',
            uk: 'Вовк',
            ru: 'Волк'
        },
        'Rat': {
            en: 'Rat',
            uk: 'Щур',
            ru: 'Крыса'
        },
        'Skeleton': {
            en: 'Skeleton',
            uk: 'Скелет',
            ru: 'Скелет'
        },
        'Zombie': {
            en: 'Zombie',
            uk: 'Зомбі',
            ru: 'Зомби'
        },
        'Spider': {
            en: 'Spider',
            uk: 'Павук',
            ru: 'Паук'
        },
        'Bandit': {
            en: 'Bandit',
            uk: 'Бандит',
            ru: 'Бандит'
        },
        'Разгневанный Сосед': {
            en: 'Angry Neighbor',
            uk: 'Розлючений Сусід',
            ru: 'Разгневанный Сосед'
        }
    };
    
    // Проверка на существование перевода
    if (enemyTranslations[name] && enemyTranslations[name][gameState.language]) {
        return enemyTranslations[name][gameState.language];
    }
    
    return name;
}

// Функция для создания HTML-карточки врага
function createEnemyCard(enemy, index = null) {
    let cardHtml = `<div class="enemy-card" style="margin-bottom: 10px; background: rgba(255, 0, 0, 0.05); padding: 10px;">`;
    
    // Додаємо ім'я з номером для групи або просто ім'я для одиночного ворога
    cardHtml += `<p><strong>${getText('enemyName')}:</strong> ${translateEnemyName(enemy.name)}</p>`;
    
    // Додаємо здоров'я
    cardHtml += `<p><strong>${getText('enemyHealth')}:</strong> ${enemy.health || enemy.hp || getText('unknown')}</p>`;
    
    // Додаємо тип, якщо є
    if (enemy.type) {
        // Добавим перевод типов врагов
        if (!localization.en.enemyType) {
            localization.en.enemyType = "Type";
            localization.uk.enemyType = "Тип";
            localization.ru.enemyType = "Тип";
        }
        
        const typeTranslations = {
            'melee': {
                en: 'Melee',
                uk: 'Ближній бій',
                ru: 'Ближний бой'
            },
            'ranged': {
                en: 'Ranged',
                uk: 'Дальній бій',
                ru: 'Дальний бой'
            },
            'magic': {
                en: 'Magic',
                uk: 'Магічний',
                ru: 'Магический'
            }
        };
        
        const translatedType = typeTranslations[enemy.type] && 
                              typeTranslations[enemy.type][gameState.language] ? 
                              typeTranslations[enemy.type][gameState.language] : 
                              enemy.type;
        
        cardHtml += `<p><strong>${getText('enemyType')}:</strong> ${translatedType}</p>`;
    }
    
    // Додаємо опис, якщо є
    if (enemy.description) {
        cardHtml += `<p><strong>${getText('enemyDesc')}:</strong> ${enemy.description}</p>`;
    }
    
    // Додаємо здібності, якщо є
    if (enemy.abilities && Array.isArray(enemy.abilities) && enemy.abilities.length > 0) {
        cardHtml += `<p><strong>${getText('enemyAbilities')}:</strong></p><ul style="margin: 5px 0 5px 20px;">`;
        enemy.abilities.forEach(ability => {
            cardHtml += `<li>${ability}</li>`;
        });
        cardHtml += `</ul>`;
    }
    
    // Додаємо слабості, якщо є
    if (enemy.weaknesses && Array.isArray(enemy.weaknesses) && enemy.weaknesses.length > 0) {
        cardHtml += `<p><strong>${getText('enemyWeaknesses')}:</strong> ${enemy.weaknesses.join(', ')}</p>`;
    }
    
    cardHtml += `</div>`;
    return cardHtml;
}

// Function to show game over popup
function showGameOverPopup(isDead = false) {
    // Check if popup already exists and remove it
    if (document.getElementById('gameOverPopup')) {
        document.getElementById('gameOverPopup').remove();
    }
    
    // Create popup
    const popup = document.createElement('div');
    popup.id = 'gameOverPopup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid ${isDead ? '#ff6b6b' : '#4ecdc4'};
        border-radius: 15px;
        padding: 25px;
        z-index: 1000;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 0 25px rgba(${isDead ? '255, 107, 107' : '78, 205, 196'}, 0.5);
        backdrop-filter: blur(10px);
        text-align: center;
        animation: fadeIn 0.5s;
    `;
    
    // Icon based on if player died or reached end
    const icon = isDead ? '💀' : '🏆';
    
    // Set title based on death or other game over
    let title = getText('gameOver');
    let desc = getText('gameOverDesc');
    
    // If player died, show specific message
    if (isDead) {
        desc = getText('deathMessage');
    }
    
    // Populate popup
    popup.innerHTML = `
        <h2 style="text-align: center; color: ${isDead ? '#ff6b6b' : '#4ecdc4'}; margin-bottom: 15px;">${icon} ${title} ${icon}</h2>
        <p style="text-align: center; margin-bottom: 10px; font-size: 1.2em;">${desc}</p>
        <div style="margin: 20px 0; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px;">
            <p style="margin-bottom: 5px;"><strong>${gameState.character.name}</strong> (${getCharacterClassName(gameState.character.class)})</p>
            <p>Level ${gameState.character.level} • XP: ${gameState.character.experience}</p>
            <p>Survived through ${gameState.gameHistory.length} turns</p>
        </div>
        <button id="restartButton" class="action-btn" style="margin-top: 15px; padding: 12px 25px;">${getText('restartGame')}</button>
    `;
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999;
        animation: fadeIn 0.5s;
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    // Add restart button handler
    document.getElementById('restartButton').addEventListener('click', () => {
        popup.remove();
        overlay.remove();
        
        // Reset everything and show setup screen
        gameState = {
            apiKey: gameState.apiKey,
            language: gameState.language,
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
            gameHistory: [],
            conversationHistory: [],
            availablePerks: []
        };
        
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
    });
}
