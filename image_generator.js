/**
 * Image Generator for D&D Game
 * Uses Gemini API to generate images based on game events
 */

// Глобальні змінні
let lastGeneratedImage = null;
let isGeneratingImage = false;
let textResponseReady = false;
let imageResponseReady = false;
let pendingTextResponse = null;
let lastImagePrompt = null; // Зберігаємо останній промпт
let lastSafeImagePrompt = null; // Зберігаємо безпечний промпт
let isUsingSafePrompt = false; // Прапорець використання безпечного промпту

// Експортуємо змінну в глобальний об'єкт window для доступу з інших модулів
window.lastGeneratedImage = null;

/**
 * Генерує зображення за допомогою Gemini API
 * @param {string} prompt - Опис зображення англійською мовою
 * @param {string} apiKey - API ключ для Gemini
 * @param {string} safePrompt - Безпечний варіант промпту (необов'язковий)
 * @returns {Promise<string>} - URL зображення або null у випадку помилки
 */
async function generateImage(prompt, apiKey, safePrompt = null) {
    if (!prompt || !apiKey) {
        console.error('Missing prompt or API key for image generation');
        return null;
    }

    // Зберігаємо промпти для можливого повторного використання
    lastImagePrompt = prompt;
    lastSafeImagePrompt = safePrompt || prompt;
    window.lastImagePrompt = prompt;
    window.safeImagePrompt = safePrompt || prompt;
    isUsingSafePrompt = false;
    
    // Скидаємо прапорці готовності
    textResponseReady = false;
    imageResponseReady = false;
    pendingTextResponse = null;

    if (isGeneratingImage) {
        console.log('Already generating an image, please wait');
        return null;
    }

    try {
        isGeneratingImage = true;
        showImageLoadingIndicator();
        
        console.log('Generating image with prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

        // Пробуємо спочатку з основним промптом
        let imageContent = null;
        try {
            imageContent = await tryGenerateWithPrompt(prompt, apiKey);
        } catch (promptError) {
            console.error('Error with main prompt:', promptError);
            // Продовжуємо до запасного промпту
        }
        
        // Якщо основний промпт не спрацював і є запасний, пробуємо з ним
        if (!imageContent && safePrompt && safePrompt !== prompt) {
            console.log('Trying with safe prompt:', safePrompt.substring(0, 100) + (safePrompt.length > 100 ? '...' : ''));
            isUsingSafePrompt = true;
            try {
                imageContent = await tryGenerateWithPrompt(safePrompt, apiKey);
            } catch (safePromptError) {
                console.error('Error with safe prompt:', safePromptError);
            }
        }
        
        if (imageContent) {
            lastGeneratedImage = imageContent;
            window.lastGeneratedImage = imageContent; // Зберігаємо в глобальний об'єкт window
            imageResponseReady = true;
            checkAndDisplayContent(imageContent);
            return imageContent;
        } else {
            console.error('No image could be generated with either prompt');
            // Використовуємо попереднє зображення, якщо доступне
            if (lastGeneratedImage) {
                console.log('Using previous image instead');
                imageResponseReady = true;
                checkAndDisplayContent(lastGeneratedImage);
                return lastGeneratedImage;
            } else {
                showImageError('Content was blocked by safety filters');
                imageResponseReady = true;
                // Позначаємо, що зображення "готове", але його немає
                checkAndDisplayContent(null);
                return null;
            }
        }
    } catch (error) {
        console.error('Error generating image:', error);
        // Використовуємо попереднє зображення у випадку помилки
        if (lastGeneratedImage) {
            console.log('Using previous image due to error');
            imageResponseReady = true;
            checkAndDisplayContent(lastGeneratedImage);
            return lastGeneratedImage;
        } else {
            showImageError('Failed to generate image');
            imageResponseReady = true;
            // Позначаємо, що зображення "готове", але його немає
            checkAndDisplayContent(null);
            return null;
        }
    } finally {
        isGeneratingImage = false;
    }
}

/**
 * Пробує згенерувати зображення з конкретним промптом
 * @param {string} prompt - Промпт для генерації
 * @param {string} apiKey - API ключ
 * @returns {Promise<string|null>} - URL зображення або null
 */

    async function tryGenerateWithPrompt(prompt, apiKey) {
        const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent`; // Змінено на v1beta
        
        const payload = {
            contents: [
                {
                    // role: "user", // Прибрано 'role'
                    parts: [
                        { text: prepareImagePrompt(prompt) }
                    ]
                }
            ],
            generationConfig: { // Додано 'generationConfig' для 'responseModalities'
                "responseModalities": ["TEXT", "IMAGE"] 
            }
        };
    
        try {
            const response = await fetch(`${modelEndpoint}?key=${apiKey}`, { // Використовуємо оновлений modelEndpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload) // Використовуємо оновлений payload
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                // Спробуємо отримати детальнішу помилку, якщо вона в JSON
                let detailedError = errorText;
                try {
                    detailedError = JSON.parse(errorText);
                } catch(e) { /* не JSON, залишаємо як є */ }
                console.error(`Image generation API error: ${response.status} ${response.statusText}`, detailedError);
                throw new Error(`Image generation API error: ${response.status} ${response.statusText} ${JSON.stringify(detailedError)}`);
            }
    
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'IMAGE_SAFETY') {
                console.warn('Image was blocked by safety filters');
                // Можна додати логування текстової частини відповіді, якщо є пояснення
                if (data.candidates[0].content && data.candidates[0].content.parts) {
                    const textPart = data.candidates[0].content.parts.find(part => part.text);
                    if (textPart) {
                        console.warn('Safety filter reason (if provided):', textPart.text);
                    }
                }
                return null;
            }
            
            return findImageInResponse(data);
        } catch (error) {
            console.error(`Error in tryGenerateWithPrompt: ${error.message}`);
            return null;
        }
    }


/**
 * Шукає зображення у відповіді API
 * @param {Object} response - Відповідь API
 * @returns {string|null} - URL або Base64 зображення, або null
 */
function findImageInResponse(response) {
    try {
        // Перевіряємо, чи є відповідь та candidates
        if (!response || !response.candidates || !response.candidates[0]) {
            console.error('No candidates in response:', response);
            return null;
        }

        const candidate = response.candidates[0];
        
        // Перевіряємо чи є parts у content
        if (!candidate.content || !candidate.content.parts) {
            console.error('No content parts in candidate:', candidate);
            return null;
        }

        // Виводимо для налагодження
        console.log('Response structure:', JSON.stringify(candidate.content.parts, null, 2).substring(0, 500) + '...');

        // Шукаємо частину з зображенням
        for (const part of candidate.content.parts) {
            // Перевіряємо різні формати відповіді
            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            
            // Альтернативний формат для Gemini 1.5
            if (part.fileData && part.fileData.mimeType && part.fileData.mimeType.startsWith('image/')) {
                return `data:${part.fileData.mimeType};base64,${part.fileData.fileUri.split(',')[1]}`;
            }
            
            // Якщо є вкладені частини
            if (part.parts) {
                for (const subpart of part.parts) {
                    if (subpart.inlineData && subpart.inlineData.mimeType && subpart.inlineData.mimeType.startsWith('image/')) {
                        return `data:${subpart.inlineData.mimeType};base64,${subpart.inlineData.data}`;
                    }
                    if (subpart.fileData && subpart.fileData.mimeType && subpart.fileData.mimeType.startsWith('image/')) {
                        return `data:${subpart.fileData.mimeType};base64,${subpart.fileData.fileUri.split(',')[1]}`;
                    }
                }
            }
        }

        console.error('No image found in response parts');
        return null;
    } catch (error) {
        console.error('Error extracting image from response:', error);
        return null;
    }
}

/**
 * Підготовлює промпт для генерації зображення
 * @param {string} originalPrompt - Вхідний промпт
 * @returns {string} - Покращений промпт
 */
function prepareImagePrompt(originalPrompt) {
    // Переконуємося, що промпт англійською
    let prompt = originalPrompt;
    
    // Додаємо стильові інструкції
    const styleInstructions = [
        "fantasy style",
        "detailed",
        "high quality",
        "vibrant colors",
        "dramatic lighting"
    ].join(", ");
    
    // Додаємо до промпту інструкції стилю, якщо вони ще не включені
    if (!prompt.toLowerCase().includes(styleInstructions.toLowerCase())) {
        prompt = `Generate a high-quality image of: ${prompt}. Style: ${styleInstructions}.`;
    } else {
        prompt = `Generate a high-quality image of: ${prompt}`;
    }
    
    return prompt;
}

/**
 * Перевіряє готовність контенту та відображає його
 * @param {string|null} imageContent - URL або Base64 зображення, або null
 */
function checkAndDisplayContent(imageContent) {
    // Якщо і текст, і зображення готові (або зображення не вдалося отримати)
    if (textResponseReady && imageResponseReady) {
        // Якщо є зображення, відображаємо його
        if (imageContent) {
            displayGeneratedImage(imageContent);
        } else if (lastGeneratedImage) {
            // Якщо є попереднє зображення, використовуємо його
            displayGeneratedImage(lastGeneratedImage);
        }
        
        // Оновлюємо текст
        const storyTextElement = document.getElementById('storyText');
        if (storyTextElement && pendingTextResponse) {
            storyTextElement.innerHTML = `<p>${pendingTextResponse}</p>`;
        }
        
        // Скидаємо прапорці
        textResponseReady = false;
        imageResponseReady = false;
        pendingTextResponse = null;
        
        // Розблоковуємо кнопку дії
        const actionButton = document.getElementById('customActionBtn');
        if (actionButton) {
            actionButton.disabled = false;
        }
        
        // Встановлюємо прапорець завантаження в false
        if (window.gameState) {
            window.gameState.isLoading = false;
        }
    }
}

/**
 * Встановлює готовність текстової відповіді
 * @param {string} text - Текст відповіді
 */
function setTextResponseReady(text) {
    pendingTextResponse = text;
    textResponseReady = true;
    
    // Перевіряємо, чи можна відобразити контент
    if (imageResponseReady || !isGeneratingImage) {
        if (!isGeneratingImage) {
            // Якщо зображення не генерується
            if (lastGeneratedImage) {
                // Якщо є попереднє зображення, показуємо його
                displayGeneratedImage(lastGeneratedImage);
            }
            
            // Оновлюємо текст
            const storyTextElement = document.getElementById('storyText');
            if (storyTextElement && pendingTextResponse) {
                storyTextElement.innerHTML = `<p>${pendingTextResponse}</p>`;
            }
            
            // Скидаємо прапорці
            textResponseReady = false;
            pendingTextResponse = null;
            
            // Розблоковуємо кнопку дії
            const actionButton = document.getElementById('customActionBtn');
            if (actionButton) {
                actionButton.disabled = false;
            }
            
            // Встановлюємо прапорець завантаження в false
            if (window.gameState) {
                window.gameState.isLoading = false;
            }
        } else {
            checkAndDisplayContent(lastGeneratedImage);
        }
    }
}

/**
 * Відображає згенероване зображення в інтерфейсі
 * @param {string} imageContent - URL або Base64 зображення
 */
function displayGeneratedImage(imageContent) {
    const gameContent = document.querySelector('.main-content');
    if (!gameContent) return;
    
    // Перевіряємо, чи існує контейнер для зображення
    let imageContainer = document.getElementById('generatedImageContainer');
    
    if (!imageContainer) {
        // Створюємо новий контейнер, якщо його ще немає
        imageContainer = document.createElement('div');
        imageContainer.id = 'generatedImageContainer';
        imageContainer.style.cssText = `
            position: relative;
            width: 100%;
            max-width: 800px;
            margin: 25px auto;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
        `;
        
        // Вставляємо його перед елементом з класом 'story-text'
        const storyText = document.querySelector('.story-text');
        if (storyText) {
            storyText.parentNode.insertBefore(imageContainer, storyText);
        } else {
            // Або просто додаємо в початок
            gameContent.prepend(imageContainer);
        }
    }
    
    // Оновлюємо контент контейнера
    imageContainer.innerHTML = `
        <img src="${imageContent}" alt="Generated scene" style="width: 100%; height: auto; display: block; object-fit: contain; min-height: 400px;" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmYiPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg==';">
    `;
    
    // Додаємо анімацію появи
    imageContainer.style.animation = 'fadeIn 0.5s forwards';
    
    // Додаємо стилі анімації, якщо їх ще немає
    if (!document.getElementById('imageAnimationStyles')) {
        const style = document.createElement('style');
        style.id = 'imageAnimationStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Додаємо обробник кліку для збільшення зображення
    const imgElement = imageContainer.querySelector('img');
    if (imgElement) {
        imgElement.style.cursor = 'pointer';
        imgElement.addEventListener('click', function() {
            showFullScreenImage(imageContent);
        });
    }
}

/**
 * Показує зображення на весь екран
 * @param {string} imageUrl - URL або Base64 зображення
 */
function showFullScreenImage(imageUrl) {
    // Додаємо перевірку, щоб уникнути помилок з шаблонними рядками
    if (imageUrl && imageUrl.indexOf('${') !== -1) {
        console.error('Отримано неправильне значення URL зображення:', imageUrl);
        return;
    }
    // Створюємо модальне вікно
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: zoom-out;
    `;
    
    // Додаємо зображення
    const image = document.createElement('img');
    image.src = imageUrl;
    image.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;
    
    modal.appendChild(image);
    
    // Додаємо обробник кліку для закриття
    modal.addEventListener('click', function() {
        modal.remove();
    });
    
    // Додаємо модальне вікно до тіла документа
    document.body.appendChild(modal);
}

/**
 * Показує індикатор завантаження зображення
 */
function showImageLoadingIndicator() {
    const gameContent = document.querySelector('.main-content');
    if (!gameContent) return;
    
    let imageContainer = document.getElementById('generatedImageContainer');
    
    if (!imageContainer) {
        imageContainer = document.createElement('div');
        imageContainer.id = 'generatedImageContainer';
        imageContainer.style.cssText = `
            width: 100%;
            max-width: 800px;
            height: 400px;
            margin: 25px auto;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            background: rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        `;
        
        // Вставляємо його перед елементом з класом 'story-text'
        const storyText = document.querySelector('.story-text');
        if (storyText) {
            storyText.parentNode.insertBefore(imageContainer, storyText);
        } else {
            // Або просто додаємо в початок
            gameContent.prepend(imageContainer);
        }
    }
    
    imageContainer.innerHTML = `
        <div class="loading-spinner" style="
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        "></div>
        <p style="margin-top: 15px; color: white;">Generating image...</p>
    `;
    
    // Додаємо стилі анімації для спіннера
    if (!document.getElementById('spinnerStyles')) {
        const style = document.createElement('style');
        style.id = 'spinnerStyles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Показує повідомлення про помилку генерації зображення
 * @param {string} message - Повідомлення про помилку
 */
function showImageError(message) {
    const imageContainer = document.getElementById('generatedImageContainer');
    if (!imageContainer) return;
    
    imageContainer.innerHTML = `
        <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.2);
            color: white;
            padding: 20px;
            text-align: center;
        ">
            <div>
                <p style="margin-bottom: 10px;">⚠️ ${message}</p>
                <button id="retryImageBtn" style="
                    padding: 8px 15px;
                    background: #ff6b6b;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    cursor: pointer;
                ">Retry</button>
            </div>
        </div>
    `;
    
    // Додаємо обробник для кнопки повтору
    const retryButton = document.getElementById('retryImageBtn');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            console.log('Retry button clicked');
            console.log('Last image prompts:', { 
                regular: window.lastImagePrompt,
                safe: window.safeImagePrompt
            });
            // Беремо API ключ так само, як і для першої генерації
            const apiKey = window.gameState && window.gameState.apiKey;
            console.log('API key from gameState:', apiKey);
            
            if (apiKey) {
                // Показуємо індикатор завантаження та скидаємо прапорці
                isGeneratingImage = false; // Скидаємо прапорець, щоб дозволити нову генерацію
                
                // Обираємо промпт, який використовувати
                const promptToUse = isUsingSafePrompt ? window.safeImagePrompt : window.lastImagePrompt;
                const safePromptToUse = window.safeImagePrompt;
                
                if (promptToUse) {
                    generateImage(promptToUse, apiKey, safePromptToUse);
                } else {
                    console.error('Cannot retry: missing prompt');
                    alert('Не вдалося повторити генерацію зображення: відсутній prompt');
                }
            } else {
                console.error('Cannot retry: missing API key');
                alert('Не вдалося повторити генерацію зображення: відсутній API ключ');
            }
        });
    }
}

// Експортуємо функції
window.imageGenerator = {
    generateImage,
    displayGeneratedImage,
    lastGeneratedImage,
    setTextResponseReady,
    showFullScreenImage
}; 