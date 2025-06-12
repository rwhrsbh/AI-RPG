/**
 * Voice Generator for D&D Game
 * Uses Gemini API to generate voice narration based on game events
 */

// Глобальні змінні
let isGeneratingVoice = false;
let voiceQueue = [];
let currentlyPlaying = null;
let voiceContext = {
    voice: 'Zephyr',
    isEnabled: true,
    volume: 1.0
};

// Доступні голоси Gemini
const AVAILABLE_VOICES = [
    'Sulafat', 'Sadaltager', 'Sadachbia', 'Vindemiatrix', 'Zubenelgenubi', 
    'Achird', 'Pulcherrima', 'Gacrux', 'Schedar', 'Alnilam', 
    'Achernar', 'Laomedeia', 'Rasalgethi', 'Algenib', 'Erinome', 
    'Despina', 'Algieba', 'Umbriel', 'Iapetus', 'Enceladus', 
    'Autonoe', 'Callirrhoe', 'Aoede', 'Orus', 'Leda', 
    'Fenrir', 'Kore', 'Charon', 'Puck', 'Zephyr'
];

/**
 * Генерує озвучування тексту
 * @param {string} text - Текст для озвучування
 * @param {Object} options - Додаткові параметри
 * @param {string} options.voice - Голос для озвучування
 * @param {string} options.instructions - Інструкції для озвучування (тон, емоції тощо)
 * @returns {Promise<void>}
 */
async function generateVoice(text, options = {}) {
    console.log('=============== ГЕНЕРАЦІЯ ОЗВУЧУВАННЯ ===============');
    console.log('Текст для озвучування (перші 100 символів):', text ? text.substring(0, 100) + '...' : 'не вказано');
    console.log('Опції:', JSON.stringify(options));
    
    // Якщо озвучування вимкнено, одразу виходимо
    if (!voiceContext.isEnabled) {
        console.log('Озвучування вимкнено в налаштуваннях');
        return;
    }
    
    // Якщо текст порожній, виходимо
    if (!text || typeof text !== 'string' || text.trim() === '') {
        console.log('Порожній текст, пропускаємо озвучування');
        return;
    }
    
    const voice = options.voice || voiceContext.voice;
    let instructions = '';
    
    // Перевіряємо, чи є інструкції рядком
    if (options.instructions && typeof options.instructions === 'string') {
        instructions = options.instructions;
    } else if (options.instructions && typeof options.instructions === 'object') {
        // Спробуємо перетворити об'єкт на рядок
        try {
            instructions = JSON.stringify(options.instructions);
        } catch (e) {
            console.warn('Не вдалося перетворити інструкції на рядок:', e);
        }
    }
    
    // Розбиваємо текст на частини для кращої обробки
    const textChunks = splitTextIntoChunks(text);
    console.log(`Текст розбито на ${textChunks.length} частин`);
    
    // Додаємо частини тексту до черги озвучування
    for (const chunk of textChunks) {
        voiceQueue.push({ text: chunk, voice, instructions });
    }
    
    // Запускаємо обробку черги, якщо вона ще не запущена
    if (!isGeneratingVoice) {
        processVoiceQueue();
    }
}

/**
 * Розбиває текст на менші частини для кращої обробки
 * @param {string} text - Вхідний текст
 * @param {number} maxSentences - Максимальна кількість речень в одній частині
 * @returns {string[]} - Масив частин тексту
 */
function splitTextIntoChunks(text, maxSentences = 2) {
    // Повертаємо весь текст як одну частину
    return [text.trim()];
    
    // Старий код для розбиття на речення (закоментований)
    /*
    // Розбиваємо на речення за допомогою регулярного виразу
    // Шукаємо крапку, знак оклику або знак питання, за якими йде пробіл або кінець рядка
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    
    // Об'єднуємо речення в частини по maxSentences штук
    for (let i = 0; i < sentences.length; i += maxSentences) {
        const chunk = sentences.slice(i, i + maxSentences).join(' ');
        if (chunk.trim() !== '') {
            chunks.push(chunk);
        }
    }
    
    return chunks;
    */
}

/**
 * Обробляє чергу озвучування послідовно
 * @returns {Promise<void>}
 */
async function processVoiceQueue() {
    // Встановлюємо прапорець, що озвучування в процесі
    isGeneratingVoice = true;
    console.log(`Початок обробки черги озвучування. Кількість елементів: ${voiceQueue.length}`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    while (voiceQueue.length > 0) {
        // Беремо перший елемент з черги
        const item = voiceQueue.shift();
        processedCount++;
        
        console.log(`Обробка елемента озвучування ${processedCount}/${processedCount + voiceQueue.length}`);
        console.log(`Текст для озвучування: ${item.text.substring(0, 50)}...`);
        
        try {
            // Генеруємо аудіо
            console.log(`Запит на генерацію озвучування для голосу ${item.voice}...`);
            const audioBlob = await fetchGeminiVoiceAudio(item.text, item.voice, item.instructions);
            
            if (!audioBlob) {
                console.error('Не вдалося отримати аудіо blob');
                errorCount++;
                continue;
            }
            
            // Відтворюємо аудіо, використовуючи всі доступні методи послідовно
            console.log('Аудіо отримано, починаємо відтворення...');
            
            // Масив методів відтворення, які будемо пробувати послідовно
            const playbackMethods = [
                { name: 'стандартний', method: playAudio },
                { name: 'DOM', method: playAudioViaDom },
                { name: 'URL', method: playAudioViaURL }
            ];
            
            let played = false;
            let lastError = null;
            
            // Пробуємо кожен метод по черзі
            for (const method of playbackMethods) {
                if (played) break;
                
                try {
                    console.log(`Спроба відтворення через ${method.name} метод...`);
                    await method.method(audioBlob);
                    console.log(`Відтворення через ${method.name} метод успішно`);
                    played = true;
                    break;
                } catch (playError) {
                    console.warn(`Помилка відтворення через ${method.name} метод:`, playError);
                    lastError = playError;
                }
            }
            
            if (!played) {
                console.error('Усі методи відтворення аудіо зазнали невдачі');
                throw lastError || new Error('Не вдалося відтворити аудіо жодним методом');
            }
            
            console.log('Відтворення елемента завершено');
            
        } catch (error) {
            console.error('Помилка генерації або відтворення озвучування:', error);
            errorCount++;
            
            // Якщо забагато помилок підряд, очищаємо чергу
            if (errorCount >= 3) {
                console.error('Забагато помилок, очищаємо чергу озвучування');
                voiceQueue = [];
                break;
            }
        }
    }
    
    // Скидаємо прапорець після обробки всієї черги
    isGeneratingVoice = false;
    console.log(`Обробка черги озвучування завершена. Оброблено елементів: ${processedCount}, помилок: ${errorCount}`);
}

/**
 * Отримує аудіо з Gemini API
 * @param {string} text - Текст для озвучування
 * @param {string} voice - Голос для озвучування
 * @param {string} instructions - Інструкції для озвучування
 * @returns {Promise<Blob>} - Blob з аудіо
 */
async function fetchGeminiVoiceAudio(text, voice, instructions) {
    try {
        // Використовуємо API ключ з gameState
        const apiKey = gameState.apiKey;
        console.log(`Генерація озвучування через Gemini API: ${text.substring(0, 50)}... (голос: ${voice})`);
        
        // Підготовка тексту з інструкціями
        let promptText = '';
        if (instructions && instructions.trim() !== '') {
            promptText = `${instructions}\n${text}`;
        } else {
            promptText = `Read aloud in a warm, engaging tone\n${text}`;
        }
        
        // Вибір другого голосу (Gemini API вимагає саме 2 голоси)
        // Використовуємо інший голос, ніж основний
        const secondVoice = voice === "Zephyr" ? "Fenrir" : "Zephyr";
        
        // Формуємо запит до API
        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: promptText
                        }
                    ]
                }
            ],
            generationConfig: {
                responseModalities: ["audio"],
                temperature: 1,
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            {
                                speaker: "Speaker 1", // Основний голос (використовується)
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: voice
                                    }
                                }
                            },
                            {
                                speaker: "Speaker 2", // Другий голос (не використовується, але потрібен для API)
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: secondVoice
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        };
        
        // Логування для діагностики
        console.log('TTS запит:', JSON.stringify(requestBody, null, 2));
        
        // Використовуємо non-streaming API endpoint замість streaming
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
        console.log('TTS API URL:', apiUrl.replace(apiKey, '****'));
        
        // Відправляємо запит
        console.log('Відправляємо запит до TTS API...');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('TTS відповідь статус:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('TTS помилка відповіді:', errorText);
            throw new Error(`Помилка API: ${response.status} ${response.statusText} ${errorText}`);
        }
        
        // Отримуємо JSON відповідь замість потокової обробки
        const data = await response.json();
        console.log('TTS отримано повну відповідь:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
        
        let audioData = null;
        let mimeType = 'audio/wav'; // За замовчуванням
        
        // Шукаємо аудіо дані в відповіді
        if (data.candidates && 
            data.candidates[0] && 
            data.candidates[0].content && 
            data.candidates[0].content.parts) {
            
            const parts = data.candidates[0].content.parts;
            console.log('Кількість частин у відповіді:', parts.length);
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                console.log(`Перевірка частини ${i}:`, part);
                
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.includes('audio/')) {
                    // Знайдено аудіо дані
                    console.log('TTS знайдено аудіо дані, тип:', part.inlineData.mimeType);
                    let base64Data = part.inlineData.data;
                    mimeType = part.inlineData.mimeType;
                    
                    // Перетворюємо нестандартний MIME тип на стандартний
                    if (mimeType.includes('audio/L16') || mimeType.includes('pcm')) {
                        console.log('Виявлено PCM формат, конвертуємо в WAV...');
                        
                        try {
                            // Конвертуємо PCM дані в WAV формат
                            // Визначаємо частоту дискретизації з MIME типу, якщо можливо
                            let sampleRate = 24000; // За замовчуванням
                            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                            if (sampleRateMatch && sampleRateMatch[1]) {
                                sampleRate = parseInt(sampleRateMatch[1]);
                            }
                            
                            // Перевіряємо, чи base64 дані не пошкоджені
                            let cleanedBase64 = base64Data;
                            if (base64Data.includes(' ') || base64Data.includes('\n')) {
                                console.warn('Base64 дані містять пробіли або переноси рядків, очищаємо...');
                                cleanedBase64 = base64Data.replace(/[\s\n]/g, '');
                                console.log('Оригінальна довжина:', base64Data.length, 'Очищена довжина:', cleanedBase64.length);
                            }
                            
                            // Перевіряємо мінімальну довжину base64 даних
                            if (cleanedBase64.length < 10) {
                                console.error('Base64 дані занадто короткі:', cleanedBase64);
                                throw new Error('Отримано некоректні аудіо дані (занадто короткі)');
                            }
                            
                            // Конвертуємо base64 у бінарні дані
                            const binaryData = atob(cleanedBase64);
                            const bytes = new Uint8Array(binaryData.length);
                            for (let j = 0; j < binaryData.length; j++) {
                                bytes[j] = binaryData.charCodeAt(j);
                            }
                            
                            // Конвертуємо PCM в WAV
                            audioData = pcmToWav(bytes, sampleRate);
                            console.log('PCM успішно конвертовано в WAV, розмір:', audioData.size);
                            return audioData;
                        } catch (conversionError) {
                            console.error('Помилка конвертації PCM в WAV:', conversionError);
                            // Продовжуємо зі стандартною обробкою, якщо конвертація не вдалася
                        }
                        
                        // Якщо конвертація не вдалася, використовуємо стандартний WAV MIME тип
                        mimeType = 'audio/wav';
                    }
                    
                    if (!base64Data) {
                        console.error('Відсутні base64 дані в частині відповіді');
                        continue;
                    }
                    
                    try {
                        // Перевіряємо, чи base64 дані не пошкоджені
                        let cleanedBase64 = base64Data;
                        if (base64Data.includes(' ') || base64Data.includes('\n')) {
                            console.warn('Base64 дані містять пробіли або переноси рядків, очищаємо...');
                            cleanedBase64 = base64Data.replace(/[\s\n]/g, '');
                            console.log('Оригінальна довжина:', base64Data.length, 'Очищена довжина:', cleanedBase64.length);
                        }
                        
                        // Перевіряємо мінімальну довжину base64 даних
                        if (cleanedBase64.length < 10) {
                            console.error('Base64 дані занадто короткі:', cleanedBase64);
                            throw new Error('Отримано некоректні аудіо дані (занадто короткі)');
                        }
                        
                        // Конвертуємо base64 у blob
                        const binaryData = atob(cleanedBase64);
                        const bytes = new Uint8Array(binaryData.length);
                        for (let j = 0; j < binaryData.length; j++) {
                            bytes[j] = binaryData.charCodeAt(j);
                        }
                        
                        // Перевіряємо розмір бінарних даних
                        if (bytes.length < 100) {
                            console.warn('Аудіо дані дуже малі, можливо некоректні:', bytes.length, 'байт');
                        }
                        
                        // Створюємо Blob з правильним MIME типом
                        audioData = new Blob([bytes], { type: mimeType });
                        console.log('TTS створено аудіо Blob, розмір:', audioData.size);
                        break;
                    } catch (conversionError) {
                        console.error('Помилка конвертації base64 в blob:', conversionError);
                        throw new Error(`Помилка конвертації аудіо даних: ${conversionError.message}`);
                    }
                }
            }
        } else {
            // Альтернативний метод пошуку аудіо даних, якщо стандартна структура не відповідає
            console.warn('Стандартна структура відповіді не знайдена, спробуємо альтернативний метод пошуку аудіо...');
            
            // Перетворюємо відповідь в рядок для пошуку
            const responseStr = JSON.stringify(data);
            
            // Шукаємо патерни, які можуть вказувати на аудіо дані
            const audioDataMatches = responseStr.match(/"mimeType"\s*:\s*"audio\/[^"]+"\s*,\s*"data"\s*:\s*"([^"]+)"/);
            if (audioDataMatches && audioDataMatches[1]) {
                console.log('Знайдено аудіо дані за допомогою альтернативного методу');
                let base64Data = audioDataMatches[1];
                const mimeTypeMatches = responseStr.match(/"mimeType"\s*:\s*"(audio\/[^"]+)"/);
                mimeType = mimeTypeMatches && mimeTypeMatches[1] ? mimeTypeMatches[1] : 'audio/wav';
                
                // Перетворюємо нестандартний MIME тип на стандартний
                if (mimeType.includes('audio/L16') || mimeType.includes('pcm')) {
                    console.log('Виявлено PCM формат, конвертуємо в WAV...');
                    
                    try {
                        // Конвертуємо PCM дані в WAV формат
                        // Визначаємо частоту дискретизації з MIME типу, якщо можливо
                        let sampleRate = 24000; // За замовчуванням
                        const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                        if (sampleRateMatch && sampleRateMatch[1]) {
                            sampleRate = parseInt(sampleRateMatch[1]);
                        }
                        
                        // Перевіряємо, чи base64 дані не пошкоджені
                        let cleanedBase64 = base64Data;
                        if (base64Data.includes(' ') || base64Data.includes('\n')) {
                            console.warn('Base64 дані містять пробіли або переноси рядків, очищаємо...');
                            cleanedBase64 = base64Data.replace(/[\s\n]/g, '');
                            console.log('Оригінальна довжина:', base64Data.length, 'Очищена довжина:', cleanedBase64.length);
                        }
                        
                        // Перевіряємо мінімальну довжину base64 даних
                        if (cleanedBase64.length < 10) {
                            console.error('Base64 дані занадто короткі:', cleanedBase64);
                            throw new Error('Отримано некоректні аудіо дані (занадто короткі)');
                        }
                        
                        // Конвертуємо base64 у бінарні дані
                        const binaryData = atob(cleanedBase64);
                        const bytes = new Uint8Array(binaryData.length);
                        for (let j = 0; j < binaryData.length; j++) {
                            bytes[j] = binaryData.charCodeAt(j);
                        }
                        
                        // Конвертуємо PCM в WAV
                        audioData = pcmToWav(bytes, sampleRate);
                        console.log('PCM успішно конвертовано в WAV, розмір:', audioData.size);
                        return audioData;
                    } catch (conversionError) {
                        console.error('Помилка конвертації PCM в WAV:', conversionError);
                        // Продовжуємо зі стандартною обробкою, якщо конвертація не вдалася
                    }
                    
                    // Якщо конвертація не вдалася, використовуємо стандартний WAV MIME тип
                    mimeType = 'audio/wav';
                }
                
                try {
                    // Перевіряємо, чи base64 дані не пошкоджені
                    let cleanedBase64 = base64Data;
                    if (base64Data.includes(' ') || base64Data.includes('\n')) {
                        console.warn('Base64 дані містять пробіли або переноси рядків, очищаємо...');
                        cleanedBase64 = base64Data.replace(/[\s\n]/g, '');
                        console.log('Оригінальна довжина:', base64Data.length, 'Очищена довжина:', cleanedBase64.length);
                    }
                    
                    // Перевіряємо мінімальну довжину base64 даних
                    if (cleanedBase64.length < 10) {
                        console.error('Base64 дані занадто короткі:', cleanedBase64);
                        throw new Error('Отримано некоректні аудіо дані (занадто короткі)');
                    }
                    
                    // Конвертуємо base64 у blob
                    const binaryData = atob(cleanedBase64);
                    const bytes = new Uint8Array(binaryData.length);
                    for (let j = 0; j < binaryData.length; j++) {
                        bytes[j] = binaryData.charCodeAt(j);
                    }
                    
                    audioData = new Blob([bytes], { type: mimeType });
                    console.log('TTS створено аудіо Blob через альтернативний метод, розмір:', audioData.size);
                } catch (conversionError) {
                    console.error('Помилка конвертації base64 в blob (альтернативний метод):', conversionError);
                }
            } else {
                console.error('Неочікувана структура відповіді:', data);
                throw new Error('Аудіо дані не знайдено у відповіді API');
            }
        }
        
        if (!audioData) {
            console.error('TTS аудіо дані не знайдено у відповіді');
            throw new Error('Аудіо дані не знайдено у відповіді API');
        }
        
        // Спробуємо перетворити аудіо в MP3 формат, який краще підтримується браузерами
        try {
            // Створюємо аудіо елемент для перевірки підтримки формату
            const testAudio = document.createElement('audio');
            const canPlayType = testAudio.canPlayType(audioData.type);
            
            console.log(`Перевірка підтримки формату ${audioData.type}: ${canPlayType}`);
            
            if (canPlayType === '' || canPlayType === 'maybe') {
                console.warn(`Формат ${audioData.type} може не підтримуватися, спробуємо використати MP3`);
                // Тут можна було б додати конвертацію в MP3, але це потребує додаткових бібліотек
                // Наразі просто змінимо MIME тип на більш сумісний
                audioData = new Blob([audioData], { type: 'audio/mpeg' });
            }
        } catch (e) {
            console.warn('Помилка при перевірці підтримки аудіо формату:', e);
        }
        
        return audioData;
    } catch (error) {
        console.error('Помилка отримання аудіо з Gemini API:', error);
        throw error;
    }
}

/**
 * Відтворює аудіо
 * @param {Blob} audioBlob - Blob з аудіо
 * @returns {Promise<void>}
 */
function playAudio(audioBlob) {
    return new Promise((resolve, reject) => {
        try {
            // Перевіряємо, що отримали коректний Blob
            if (!audioBlob || !(audioBlob instanceof Blob)) {
                throw new Error(`Некоректний аудіо blob: ${audioBlob}`);
            }
            
            console.log('Створюємо аудіо з blob розміром:', audioBlob.size, 'байт, тип:', audioBlob.type);
            
            // Створюємо URL для blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Створюємо аудіо елемент
            const audioElement = new Audio(audioUrl);
            audioElement.volume = voiceContext.volume;
            
            // Зберігаємо посилання на поточний аудіо елемент
            currentlyPlaying = audioElement;
            
            // Додаємо обробники подій
            audioElement.onended = () => {
                // Звільняємо ресурси
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                resolve();
            };
            
            audioElement.onerror = (error) => {
                const errorCode = audioElement.error ? audioElement.error.code : 'невідомо';
                const errorMessage = audioElement.error ? audioElement.error.message : 'невідома помилка';
                console.error('Помилка відтворення аудіо:', errorCode, errorMessage);
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                reject(new Error(`Помилка відтворення аудіо: код ${errorCode}, ${errorMessage}`));
            };
            
            // Додаємо обробник для відлагодження
            audioElement.oncanplaythrough = () => {
                console.log('Аудіо готове до відтворення');
            };
            
            // Починаємо відтворення
            console.log('Спроба відтворення аудіо...');
            audioElement.play().then(() => {
                console.log('Відтворення аудіо успішно розпочато');
            }).catch((error) => {
                console.error('Помилка запуску відтворення:', error);
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                reject(new Error(`Не вдалося почати відтворення аудіо: ${error.message}`));
            });
        } catch (error) {
            console.error('Критична помилка при налаштуванні відтворення аудіо:', error);
            currentlyPlaying = null;
            reject(new Error(`Помилка при налаштуванні відтворення аудіо: ${error.message}`));
        }
    });
}

/**
 * Альтернативний метод відтворення аудіо через DOM
 * @param {Blob} audioBlob - Blob з аудіо
 * @returns {Promise<void>}
 */
function playAudioViaDom(audioBlob) {
    return new Promise((resolve, reject) => {
        try {
            // Перевіряємо, що отримали коректний Blob
            if (!audioBlob || !(audioBlob instanceof Blob)) {
                throw new Error(`Некоректний аудіо blob: ${audioBlob}`);
            }
            
            console.log('Створюємо DOM аудіо з blob розміром:', audioBlob.size, 'байт, тип:', audioBlob.type);
            
            // Створюємо URL для blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Створюємо аудіо елемент і додаємо його до DOM
            const audioElement = document.createElement('audio');
            audioElement.style.display = 'none';
            audioElement.src = audioUrl;
            audioElement.volume = voiceContext.volume;
            document.body.appendChild(audioElement);
            
            // Зберігаємо посилання на поточний аудіо елемент
            currentlyPlaying = audioElement;
            
            // Додаємо обробники подій
            audioElement.onended = () => {
                // Видаляємо елемент з DOM
                document.body.removeChild(audioElement);
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                resolve();
            };
            
            audioElement.onerror = (error) => {
                const errorCode = audioElement.error ? audioElement.error.code : 'невідомо';
                const errorMessage = audioElement.error ? audioElement.error.message : 'невідома помилка';
                console.error('Помилка відтворення DOM аудіо:', errorCode, errorMessage);
                
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                reject(new Error(`Помилка відтворення DOM аудіо: код ${errorCode}, ${errorMessage}`));
            };
            
            // Додаємо обробник для відлагодження
            audioElement.oncanplaythrough = () => {
                console.log('DOM аудіо готове до відтворення');
            };
            
            // Починаємо відтворення
            console.log('Спроба відтворення DOM аудіо...');
            audioElement.play().then(() => {
                console.log('Відтворення DOM аудіо успішно розпочато');
            }).catch((error) => {
                console.error('Помилка запуску відтворення DOM аудіо:', error);
                
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                reject(new Error(`Не вдалося почати відтворення DOM аудіо: ${error.message}`));
            });
        } catch (error) {
            console.error('Критична помилка при налаштуванні відтворення DOM аудіо:', error);
            currentlyPlaying = null;
            reject(new Error(`Помилка при налаштуванні відтворення DOM аудіо: ${error.message}`));
        }
    });
}

/**
 * Створює тимчасовий аудіо файл та відтворює його через URL
 * Використовується як запасний варіант, якщо прямі методи відтворення не працюють
 * @param {Blob} audioBlob - Blob з аудіо
 * @returns {Promise<void>}
 */
function playAudioViaURL(audioBlob) {
    return new Promise((resolve, reject) => {
        try {
            // Перевіряємо, що отримали коректний Blob
            if (!audioBlob || !(audioBlob instanceof Blob)) {
                throw new Error(`Некоректний аудіо blob: ${audioBlob}`);
            }
            
            console.log('Створюємо URL аудіо з blob розміром:', audioBlob.size, 'байт, тип:', audioBlob.type);
            
            // Створюємо тимчасовий URL для blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Відкриваємо URL в новому вікні або вкладці
            console.log('Відкриваємо аудіо URL:', audioUrl);
            
            // Створюємо тимчасовий елемент для відтворення
            const audioElement = document.createElement('audio');
            audioElement.style.display = 'none';
            audioElement.controls = true; // Додаємо елементи керування
            audioElement.src = audioUrl;
            audioElement.volume = voiceContext.volume;
            
            // Додаємо елемент до DOM
            document.body.appendChild(audioElement);
            
            // Зберігаємо посилання на поточний аудіо елемент
            currentlyPlaying = audioElement;
            
            // Додаємо обробники подій
            audioElement.onended = () => {
                console.log('URL аудіо відтворення завершено');
                // Видаляємо елемент з DOM
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                resolve();
            };
            
            audioElement.onerror = (error) => {
                console.error('Помилка відтворення URL аудіо:', error);
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
                URL.revokeObjectURL(audioUrl);
                currentlyPlaying = null;
                reject(new Error(`Помилка відтворення URL аудіо: ${error.message || 'невідома помилка'}`));
            };
            
            // Починаємо відтворення
            console.log('Спроба відтворення URL аудіо...');
            audioElement.play().then(() => {
                console.log('Відтворення URL аудіо успішно розпочато');
            }).catch((error) => {
                console.error('Помилка запуску відтворення URL аудіо:', error);
                
                // Якщо автовідтворення не працює, показуємо елемент керування
                console.log('Автовідтворення не працює, показуємо елемент керування');
                audioElement.style.display = 'block';
                audioElement.style.position = 'fixed';
                audioElement.style.bottom = '10px';
                audioElement.style.right = '10px';
                audioElement.style.zIndex = '9999';
                
                // Створюємо кнопку закриття
                const closeButton = document.createElement('button');
                closeButton.textContent = '×';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '-15px';
                closeButton.style.right = '-15px';
                closeButton.style.background = 'red';
                closeButton.style.color = 'white';
                closeButton.style.border = 'none';
                closeButton.style.borderRadius = '50%';
                closeButton.style.width = '25px';
                closeButton.style.height = '25px';
                closeButton.style.cursor = 'pointer';
                closeButton.style.fontSize = '16px';
                closeButton.style.lineHeight = '1';
                closeButton.style.padding = '0';
                
                closeButton.onclick = () => {
                    if (document.body.contains(audioElement)) {
                        document.body.removeChild(audioElement);
                    }
                    URL.revokeObjectURL(audioUrl);
                    currentlyPlaying = null;
                    resolve();
                };
                
                // Створюємо контейнер для аудіо та кнопки закриття
                const container = document.createElement('div');
                container.style.position = 'fixed';
                container.style.bottom = '10px';
                container.style.right = '10px';
                container.style.zIndex = '9999';
                container.appendChild(audioElement);
                container.appendChild(closeButton);
                
                document.body.appendChild(container);
                
                // Не відхиляємо проміс, щоб користувач міг вручну запустити відтворення
            });
        } catch (error) {
            console.error('Критична помилка при налаштуванні відтворення URL аудіо:', error);
            currentlyPlaying = null;
            reject(new Error(`Помилка при налаштуванні відтворення URL аудіо: ${error.message}`));
        }
    });
}

/**
 * Зупиняє поточне відтворення аудіо
 */
function stopVoice() {
    if (currentlyPlaying) {
        try {
            currentlyPlaying.pause();
            currentlyPlaying.currentTime = 0;
            
            // Якщо це DOM елемент, видаляємо його
            if (currentlyPlaying.parentElement) {
                currentlyPlaying.parentElement.removeChild(currentlyPlaying);
            }
            
            currentlyPlaying = null;
        } catch (error) {
            console.error('Помилка при зупинці відтворення:', error);
        }
    }
    
    // Очищаємо чергу
    voiceQueue = [];
    isGeneratingVoice = false;
}

/**
 * Встановлює налаштування озвучування
 * @param {Object} settings - Налаштування
 * @param {boolean} settings.isEnabled - Чи увімкнено озвучування
 * @param {string} settings.voice - Голос для озвучування
 * @param {number} settings.volume - Гучність (0-1)
 */
function setVoiceSettings(settings) {
    if (typeof settings !== 'object') return;
    
    // Оновлюємо налаштування
    if (typeof settings.isEnabled === 'boolean') {
        voiceContext.isEnabled = settings.isEnabled;
    }
    
    if (typeof settings.voice === 'string' && settings.voice.trim() !== '') {
        // Перевіряємо, чи є такий голос у списку доступних
        if (AVAILABLE_VOICES.includes(settings.voice)) {
            voiceContext.voice = settings.voice;
        } else {
            console.warn(`Голос "${settings.voice}" не знайдено в списку доступних голосів. Використовуємо поточний: ${voiceContext.voice}`);
        }
    }
    
    if (typeof settings.volume === 'number' && !isNaN(settings.volume)) {
        // Обмежуємо значення від 0 до 1
        voiceContext.volume = Math.max(0, Math.min(1, settings.volume));
    }
    
    // Зберігаємо налаштування
    saveVoiceSettings();
    
    console.log('Встановлено нові налаштування озвучування:', voiceContext);
}

/**
 * Повертає поточні налаштування озвучування
 * @returns {Object} - Налаштування озвучування
 */
function getVoiceSettings() {
    return { ...voiceContext };
}

/**
 * Зберігає налаштування озвучування в localStorage
 */
function saveVoiceSettings() {
    try {
        localStorage.setItem('dndVoiceSettings', JSON.stringify(voiceContext));
    } catch (error) {
        console.error('Помилка збереження налаштувань озвучування:', error);
    }
}

/**
 * Завантажує налаштування озвучування з localStorage
 */
function loadVoiceSettings() {
    try {
        const savedSettings = localStorage.getItem('dndVoiceSettings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setVoiceSettings(parsedSettings);
        }
    } catch (error) {
        console.error('Помилка завантаження налаштувань озвучування:', error);
    }
}

// Завантажуємо налаштування при ініціалізації
loadVoiceSettings();

/**
 * Конвертує PCM аудіо дані в WAV формат
 * @param {Uint8Array} pcmData - PCM аудіо дані
 * @param {number} sampleRate - Частота дискретизації (за замовчуванням 24000)
 * @param {number} numChannels - Кількість каналів (за замовчуванням 1)
 * @returns {Blob} - Blob з WAV аудіо
 */
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1) {
    console.log('Конвертація PCM в WAV, розмір даних:', pcmData.length);
    
    // Розмір заголовка WAV
    const headerSize = 44;
    
    // Створюємо буфер для WAV файлу
    const wavBuffer = new ArrayBuffer(headerSize + pcmData.length);
    const wavView = new DataView(wavBuffer);
    
    // Заповнюємо заголовок WAV
    // "RIFF" chunk descriptor
    writeString(wavView, 0, 'RIFF');
    wavView.setUint32(4, 36 + pcmData.length, true); // Розмір файлу - 8
    writeString(wavView, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(wavView, 12, 'fmt ');
    wavView.setUint32(16, 16, true); // Розмір fmt chunk
    wavView.setUint16(20, 1, true); // Аудіо формат (1 = PCM)
    wavView.setUint16(22, numChannels, true); // Кількість каналів
    wavView.setUint32(24, sampleRate, true); // Частота дискретизації
    wavView.setUint32(28, sampleRate * numChannels * 2, true); // Байт в секунду
    wavView.setUint16(32, numChannels * 2, true); // Байт на семпл
    wavView.setUint16(34, 16, true); // Біт на семпл
    
    // "data" sub-chunk
    writeString(wavView, 36, 'data');
    wavView.setUint32(40, pcmData.length, true); // Розмір даних
    
    // Копіюємо PCM дані
    const wavBytes = new Uint8Array(wavBuffer);
    wavBytes.set(pcmData, headerSize);
    
    // Створюємо Blob з WAV даними
    return new Blob([wavBuffer], { type: 'audio/wav' });
    
    // Допоміжна функція для запису рядків
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}

// Експортуємо функції
window.voiceGenerator = {
    generateVoice,
    stopVoice,
    setVoiceSettings,
    getVoiceSettings,
    loadVoiceSettings,
    availableVoices: AVAILABLE_VOICES
};