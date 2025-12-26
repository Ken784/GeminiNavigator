// ==UserScript==
// @name         Gemini Navigator (Text Mode & Title Sync Fix)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  修復 Gemini 網頁版標題回滾問題，提供穩定的側邊欄純文字導航。Fixes "My content" title bug.
// @author       Gemini Research Persona
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

/**
 * Gemini Navigator - 深度研究修復版
 * ------------------------------------------
 * 架構說明:
 * 1. ContentExtractor: 負責從 DOM 中提取用戶對話，支援多種選擇器策略。
 * 2. TitleSentinel (核心修復): 監控 <title> 標籤，防止 App 將標題重置為 "我的內容"。
 * 3. NavigationGuard: 攔截 History API，處理 SPA 頁面切換時的狀態重置。
 * 4. UIController: 負責側邊欄的渲染與互動。
 */

(function() {
    'use strict';

    console.log('[Gemini Navigator] v2.5 系統初始化中...');

    // ==========================================
    // 配置與常數
    // ==========================================
    const CONFIG = {
        debounceMs: 500, // 降低延遲以提高響應速度
        titleSyncDebounceMs: 2000, // 標題同步的 debounce（較長，因為不需要即時）
        // 定義會被視為「無效」或「預設」的標題清單，當標題變為這些時，Sentinel 會介入
        genericTitles: [
            "Gemini", 
            "My content", 
            "我的內容", 
            "Loading...", 
            "New chat", 
            "新對話"
        ],
        // 選擇器策略：依優先順序排列
        selectors: [
            '[data-message-author-role="user"]', // 策略 1: 現代屬性 (最穩健)
            'user-query',                        // 策略 2: 舊版標籤
            '.user-query-container',             // 策略 3: 容器類名 (推測)
            'h2[data-test-id="user-query"]'      // 策略 4: 測試屬性
        ]
    };

    // 全局狀態管理
    const state = {
        currentDerivedTitle: "", // 我們計算出的正確標題
        isManualUpdate: false,   // 鎖：防止 MutationObserver 無限迴圈
        navigationTimer: null,
        titleSyncTimer: null,        // 標題同步的 timer
        lastDetectedTitle: null      // 上次偵測到的標題
    };

    // ==========================================
    // 模組 1: UI 樣式注入 (Style Injection)
    // ==========================================
    function injectStyles() {
        const styleId = 'gemini-toc-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* 側邊欄容器 */
            #gemini-toc-sidebar {
                position: fixed;
                top: 0;
                right: 0;
                width: 300px;
                height: 100vh;
                background: #f8f9fa;
                border-left: 1px solid #dadce0;
                z-index: 9999; /* 確保在 Gemini 介面之上 */
                transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                box-shadow: -2px 0 8px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                font-family: 'Google Sans', Roboto, sans-serif;
            }
            
            /* 深色模式支援 (Dark Mode) */
            @media (prefers-color-scheme: dark) {
                #gemini-toc-sidebar {
                    background: #1e1f20;
                    border-left: 1px solid #444746;
                    color: #e3e3e3;
                }
            }
            body[data-theme="dark"] #gemini-toc-sidebar {
                background: #1e1f20;
                border-left: 1px solid #444746;
                color: #e3e3e3;
            }

            #gemini-toc-sidebar.collapsed {
                transform: translateX(100%);
            }

            /* 切換按鈕 */
            #gemini-toc-toggle {
                position: absolute;
                left: -40px;
                top: 165px;
                width: 40px;
                height: 40px;
                background: inherit;
                border: 1px solid #dadce0;
                border-right: none;
                border-radius: 8px 0 0 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #5f6368;
                box-shadow: -2px 0 4px rgba(0,0,0,0.05);
                outline: none;
                padding: 0;
            }
            
            #gemini-toc-toggle svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }
            
            /* 深色模式下的按鈕樣式 */
            @media (prefers-color-scheme: dark) {
                #gemini-toc-toggle {
                    border-color: #444746;
                    color: #e3e3e3;
                }
            }
            body[data-theme="dark"] #gemini-toc-toggle {
                border-color: #444746;
                color: #e3e3e3;
            }

           .toc-header {
                padding: 16px;
                font-size: 14px;
                font-weight: 500;
                border-bottom: 1px solid rgba(0,0,0,0.1);
                letter-spacing: 0.5px;
                color: #5f6368;
            }
            
            #toc-content {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                scrollbar-width: thin;
            }

           .toc-item {
                padding: 8px 12px;
                margin-bottom: 4px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                line-height: 1.4;
                color: inherit;
                transition: background 0.2s;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

           .toc-item:hover {
                background-color: rgba(0,0,0,0.05);
            }
            
            /* 被點擊時的高亮動畫 */
            @keyframes flash-highlight {
                0% { background-color: rgba(26, 115, 232, 0.3); }
                100% { background-color: transparent; }
            }
            
           .toc-item.index {
                opacity: 0.5;
                margin-right: 8px;
                font-size: 11px;
                font-variant-numeric: tabular-nums;
            }

           .toc-item.empty {
                text-align: center;
                opacity: 0.5;
                font-style: italic;
                margin-top: 20px;
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ==========================================
    // 模組 2: 內容提取 (Content Extraction)
    // ==========================================
    
    function createUI() {
        if (document.getElementById('gemini-toc-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'gemini-toc-sidebar';
        sidebar.className = 'collapsed'; // 預設收合
        sidebar.innerHTML = `
            <button id="gemini-toc-toggle" title="切換目錄">
                <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                    <path d="M127 118C127.552 118 128 118.448 128 119V125C128 125.552 127.552 126 127 126H116C115.448 126 115 125.552 115 125V119C115 118.448 115.448 118 116 118H127ZM107 124.983C102.496 123.124 99 118.908 99 114V68.4834C77.0158 74.142 60.3515 93.051 58.0283 116.189C57.8705 117.76 56.5782 119 55 119C53.4218 119 52.1295 117.76 51.9717 116.189C49.3676 90.2539 28.7461 69.6313 2.81055 67.0273C1.24055 66.8697 0.000234369 65.5778 0 64C0 62.422 1.24041 61.1293 2.81055 60.9717C28.746 58.3678 49.3676 37.746 51.9717 11.8105C52.1295 10.2403 53.4218 9 55 9C56.5782 9 57.8705 10.2403 58.0283 11.8105C60.3515 34.9489 77.016 53.8562 99 59.5146V14C99 9.09235 102.495 4.87505 107 3.01562V124.983ZM127 81C127.552 81 128 81.4477 128 82V88C128 88.5523 127.552 89 127 89H116C115.448 89 115 88.5523 115 88V82C115 81.4477 115.448 81 116 81H127ZM127 42C127.552 42 128 42.4477 128 43V49C128 49.5523 127.552 50 127 50H116C115.448 50 115 49.5523 115 49V43C115 42.4477 115.448 42 116 42H127ZM127 2C127.552 2 128 2.44772 128 3V9C128 9.55228 127.552 10 127 10H116C115.448 10 115 9.55228 115 9V3C115 2.44772 115.448 2 116 2H127Z" fill="currentColor"/>
                </svg>
            </button>
            <div class="toc-header">Conversation Index</div>
            <div id="toc-content"></div>
        `;

        document.body.appendChild(sidebar);

        const toggleBtn = document.getElementById('gemini-toc-toggle');
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
        };
    }

    /**
     * 使用策略模式尋找用戶的提問元素
     */
    function findUserQueries() {
        for (const selector of CONFIG.selectors) {
            const elements = document.querySelectorAll(selector);
            // 過濾掉空元素或不可見元素
            const valid = Array.from(elements).filter(el => 
                el.innerText && el.innerText.trim().length > 0 && el.offsetParent!== null
            );
            if (valid.length > 0) return valid;
        }
        return;
    }

    function extractText(element) {
        // 克隆節點以避免破壞頁面事件
        const clone = element.cloneNode(true);
        // 移除干擾元素 (時間戳、按鈕、SVG)
        const noise = clone.querySelectorAll('svg,.timestamp, button, [role="button"]');
        noise.forEach(n => n.remove());
        
        // 獲取純文字並壓縮空白
        let text = clone.innerText || "";
        return text.trim().replace(/\s+/g, ' ');
    }

    /**
     * 獲取 Gemini 的實際對話標題
     * @returns {string|null} 對話標題，如果找不到則返回 null
     */
    function getGeminiConversationTitle() {
        const titleElement = document.querySelector('.conversation-title');
        if (titleElement) {
            const text = titleElement.innerText || titleElement.textContent || '';
            return text.trim() || null;
        }
        return null;
    }

    // ==========================================
    // 模組 3: 標題哨兵 (Title Sentinel) - 核心修復
    // ==========================================
    
    /**
     * 強制執行標題設定
     * @param {string} targetTitle - 我們期望的標題
     */
    function enforceTitle(targetTitle) {
        if (!targetTitle) return;
        
        const current = document.title;
        
        // 如果標題已經正確，無需操作
        if (current === targetTitle) return;

        // 判斷當前標題是否為「無效/預設」標題
        // 這裡使用 some 來檢查當前標題是否包含任何一個 genericTitles (例如 "我的內容")
        // 注意：有些語言版本可能是 "Gemini - 我的內容"，所以用 includes 比較保險
        const isGeneric = CONFIG.genericTitles.some(t => current.includes(t) 
| current === t);
        
        // 觸發條件：
        // 1. 當前標題是預設值 (表示 App 重置了標題)
        // 2. 或者，當前標題與我們的目標不符，且我們已經確定了一個有效目標 (防止 App 瞬間覆蓋)
        if (isGeneric 
| (current!== targetTitle && state.currentDerivedTitle === targetTitle)) {
            // 上鎖
            state.isManualUpdate = true;
            document.title = targetTitle;
            
            // 在 Microtask 結束後解鎖
            setTimeout(() => { state.isManualUpdate = false; }, 0);
        }
    }

    function initTitleSentinel() {
        const titleElement = document.querySelector('title');
        if (!titleElement) return;

        // 專門監控 <title> 標籤的觀察器
        const titleObserver = new MutationObserver((mutations) => {
            // 如果鎖被開啟，表示這次變動是我們自己造成的，忽略之
            if (state.isManualUpdate) return; 

            // App 修改了標題。檢查是否需要回滾。
            if (state.currentDerivedTitle) {
                const newTitle = document.title;
                // 如果 App 把標題改回了 "我的內容"，我們必須再次強制覆蓋
                if (CONFIG.genericTitles.some(t => newTitle.includes(t))) {
                    console.log('[Gemini Navigator] 偵測到標題回滾，正在強制修復:', state.currentDerivedTitle);
                    enforceTitle(state.currentDerivedTitle);
                }
            }
        });

        titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
        console.log('[Gemini Navigator] 標題哨兵 (Title Sentinel) 已啟動。');
    }

    // ==========================================
    // 模組 3.5: 標題變化監聽器 (Title Change Listener)
    // ==========================================
    
    /**
     * 同步標題到 Chrome tab
     * @param {string} title - 要同步的標題
     */
    function syncTitleToTab(title) {
        if (!title) return;
        
        // 限制標題長度
        if (title.length > 60) {
            title = title.substring(0, 60) + '...';
        }
        
        // 更新全局狀態
        state.currentDerivedTitle = title;
        
        // 同步到 tab（使用 enforceTitle，它會處理防止回滾的邏輯）
        enforceTitle(title);
        
        console.log('[Gemini Navigator] 標題已同步到 tab:', title);
    }

    /**
     * 初始化標題變化監聽器
     * 使用 MutationObserver 被動監聽 .conversation-title 元素的變化
     */
    function initTitleChangeListener() {
        // 使用 MutationObserver 監聽 .conversation-title 元素
        const titleObserver = new MutationObserver((mutations) => {
            const titleElement = document.querySelector('.conversation-title');
            if (!titleElement) return;
            
            const currentTitle = titleElement.innerText || titleElement.textContent || '';
            const trimmedTitle = currentTitle.trim();
            
            // 如果標題有變化，且不是空字串
            if (trimmedTitle && trimmedTitle !== state.lastDetectedTitle) {
                state.lastDetectedTitle = trimmedTitle;
                
                // 清除之前的 timer
                clearTimeout(state.titleSyncTimer);
                
                // 使用較長的 debounce，因為標題修改不需要即時同步
                state.titleSyncTimer = setTimeout(() => {
                    syncTitleToTab(trimmedTitle);
                }, CONFIG.titleSyncDebounceMs);
            }
        });
        
        // 初始查找標題元素
        function startObserving() {
            const titleElement = document.querySelector('.conversation-title');
            if (titleElement) {
                // 記錄初始標題
                const initialTitle = titleElement.innerText || titleElement.textContent || '';
                state.lastDetectedTitle = initialTitle.trim();
                
                // 開始監聽該元素
                titleObserver.observe(titleElement, {
                    childList: true,      // 監聽子節點變化
                    characterData: true,  // 監聽文字內容變化
                    subtree: true         // 監聽子樹變化
                });
                
                console.log('[Gemini Navigator] 標題變化監聽器已啟動');
            } else {
                // 如果元素還不存在，稍後再試（可能是動態載入）
                setTimeout(startObserving, 1000);
            }
        }
        
        // 延遲啟動，等待 DOM 載入
        setTimeout(startObserving, 2000);
    }

    // ==========================================
    // 模組 4: 主邏輯循環
    // ==========================================

    function updateSystem() {
        const queries = findUserQueries();
        const tocContent = document.getElementById('toc-content');
        
        if (!tocContent) return; // UI 尚未就緒

        // 1. 更新側邊欄 UI（如果有對話項目）
        if (queries.length === 0) {
            tocContent.innerHTML = '<div class="toc-item empty">等待對話中...</div>';
        } else {
            // 生成目錄數據
            const items = queries.map(el => ({
                text: extractText(el),
                element: el
            }));

            // 使用簽名比對 (Signature Matching) 避免不必要的 DOM 重繪
            const signature = items.map(i => i.text.substring(0, 10)).join('|');
            if (tocContent.dataset.signature!== signature) {
                tocContent.innerHTML = '';
                tocContent.dataset.signature = signature;
                
                items.forEach((item, idx) => {
                    const div = document.createElement('div');
                    div.className = 'toc-item';
                    // 限制顯示長度
                    const displayText = item.text.length > 60? item.text.substring(0, 60) + '...' : item.text;
                    div.innerHTML = `<span class="index">${idx + 1}.</span> ${displayText}`;
                    div.title = item.text; // Tooltip 顯示完整文字
                    
                    div.onclick = () => {
                        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // 視覺反饋：閃爍背景
                        item.element.style.animation = 'none';
                        item.element.offsetHeight; /* trigger reflow */
                        item.element.style.animation = 'flash-highlight 1s ease-out';
                    };
                    tocContent.appendChild(div);
                });
            }
        }

        // 2. 更新標題 (修復 bug 的核心) - 無論是否有對話項目都檢查標題
        // 優先嘗試獲取 Gemini 的實際對話標題（.conversation-title 元素）
        let conversationTitle = getGeminiConversationTitle();
        
        // 如果找不到 Gemini 的標題，且有對話項目，則使用第一條訊息作為備用
        if (!conversationTitle && queries.length > 0) {
            const items = queries.map(el => ({
                text: extractText(el),
                element: el
            }));
            if (items.length > 0) {
                let firstQuery = items[0].text.split('\n')[0]; // 取第一條的第一行
                if (firstQuery.length > 40) firstQuery = firstQuery.substring(0, 40) + '...';
                conversationTitle = firstQuery;
            }
        }
        
        // 如果找到了標題，更新頁籤
        if (conversationTitle) {
            // 限制標題長度（避免過長）
            if (conversationTitle.length > 60) {
                conversationTitle = conversationTitle.substring(0, 60) + '...';
            }
            
            // 更新全局狀態
            state.currentDerivedTitle = conversationTitle;
            
            // 執行強制檢查和同步
            enforceTitle(conversationTitle);
        }
    }

    // ==========================================
    // 模組 5: 導航守衛 (Navigation Guard)
    // ==========================================
    
    // 攔截 SPA 的路由行為
    function initNavigationGuard() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            onUrlChange();
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            // replaceState 通常用於更新參數，不一定代表換頁，視情況可加可不加
        };

        window.addEventListener('popstate', onUrlChange);
    }

    function onUrlChange() {
        console.log('[Gemini Navigator] URL 變更偵測。重置標題狀態。');
        // 清除緩存的標題，這樣如果進入新頁面，標題會暫時變回 App 預設值，直到讀取到新內容
        state.currentDerivedTitle = ""; 
        // 延遲更新以等待新內容加載
        setTimeout(updateSystem, 1000);
    }

    // ==========================================
    // 初始化流程
    // ==========================================
    
    function init() {
        injectStyles();
        createUI();
        initTitleSentinel();
        initNavigationGuard();
        initTitleChangeListener();

        // 監控 document.body 的變化 (對話氣泡生成)
        const observer = new MutationObserver((mutations) => {
            // 性能優化：只在相關節點增加時觸發
            const relevantMutation = mutations.some(m => 
                m.addedNodes.length > 0 && 
                (m.target.nodeName === 'BODY' || 
                 (m.target.className && typeof m.target.className === 'string' && m.target.className.includes('conversation')) ||
                 m.target.querySelector && m.target.querySelector('[data-message-author-role="user"]'))
            );

            if (relevantMutation) {
                clearTimeout(state.navigationTimer);
                state.navigationTimer = setTimeout(updateSystem, CONFIG.debounceMs);
            }
        });

        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        // 初始執行
        setTimeout(updateSystem, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();