(function() {
    'use strict';

    console.log('🤖 Claude对话助手 v2.0 启动');

    // 全局状态管理
    const ClaudeAssistant = {
        userIds: new Set(),
        currentUserId: '',
        isInChatPage: false,
        panelVisible: false,
        conversations: new Map(),
        
        // 初始化
        init() {
            this.setupInterceptors();
            this.detectPage();
            this.createPanel();
            this.setupEventListeners();
            this.loadStoredData();
        },

        // 设置网络拦截器
        setupInterceptors() {
            // 拦截XMLHttpRequest
            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                ClaudeAssistant.extractUserIdFromUrl(url, 'XHR');
                return originalXHROpen.apply(this, arguments);
            };

            // 拦截fetch请求
            const originalFetch = window.fetch;
            window.fetch = function(resource, options) {
                const url = typeof resource === 'string' ? resource : resource?.url;
                ClaudeAssistant.extractUserIdFromUrl(url, 'Fetch');
                return originalFetch.apply(this, arguments);
            };

            // 从已有数据中搜索
            this.searchExistingData();
        },

        // 从URL中提取用户ID
        extractUserIdFromUrl(url, source) {
            if (!url) return;
            
            const patterns = [
                /api\/organizations\/([a-zA-Z0-9-]+)/,
                /organizations\/([a-zA-Z0-9-]+)/,
                /org\/([a-zA-Z0-9-]+)/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    this.addUserId(match[1], source);
                    break;
                }
            }
        },

        // 添加用户ID
        addUserId(userId, source) {
            if (!this.userIds.has(userId)) {
                this.userIds.add(userId);
                console.log(`✨ ${source}发现用户ID:`, userId);
                
                if (!this.currentUserId) {
                    this.currentUserId = userId;
                    this.updatePanelStatus();
                }
            }
        },

        // 搜索已有数据
        searchExistingData() {
            // 搜索localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                this.searchInText(value, 'localStorage');
            }

            // 搜索Performance API
            if (window.performance?.getEntriesByType) {
                const entries = window.performance.getEntriesByType('resource');
                entries.forEach(entry => {
                    this.extractUserIdFromUrl(entry.name, 'Performance');
                });
            }
        },

        // 在文本中搜索用户ID
        searchInText(text, source) {
            if (!text || typeof text !== 'string') return;
            
            const uuidPattern = /([a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})/g;
            const matches = text.match(uuidPattern);
            
            if (matches) {
                matches.forEach(match => {
                    this.addUserId(match, source);
                });
            }
        },

        // 检测页面类型
        detectPage() {
            this.isInChatPage = /\/chat\/[a-zA-Z0-9-]+/.test(window.location.href);
            console.log('📍 页面检测:', {
                url: window.location.href,
                isInChatPage: this.isInChatPage
            });
        },

        // 获取当前对话UUID
        getCurrentChatUUID() {
            const match = window.location.href.match(/\/chat\/([a-zA-Z0-9-]+)/);
            return match ? match[1] : null;
        },

        // 创建控制面板
        createPanel() {
            if (!this.isInChatPage) return;

            const panel = document.createElement('div');
            panel.id = 'claude-assistant-panel';
            panel.className = 'claude-panel';
            panel.innerHTML = this.getPanelHTML();

            document.body.appendChild(panel);
            this.bindPanelEvents(panel);
            
            console.log('🎨 控制面板已创建');
        },

        // 获取面板HTML
        getPanelHTML() {
            return `
                <div class="claude-panel-toggle" id="claude-panel-toggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div class="claude-panel-content" id="claude-panel-content">
                    <div class="claude-panel-header">
                        <h3>🤖 Claude助手</h3>
                        <div class="claude-panel-status" id="claude-panel-status">
                            <span class="status-dot"></span>
                            <span class="status-text">检测中...</span>
                        </div>
                    </div>
                    
                    <div class="claude-panel-section">
                        <h4>📊 用户ID管理</h4>
                        <div class="user-id-list" id="user-id-list">
                            <div class="no-users">暂无用户ID</div>
                        </div>
                    </div>
                    
                    <div class="claude-panel-section">
                        <h4>🔧 操作功能</h4>
                        <div class="claude-panel-actions">
                            <button class="claude-btn primary" id="export-conversation">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                </svg>
                                导出对话
                            </button>
                            <button class="claude-btn secondary" id="view-conversations">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                </svg>
                                查看对话
                            </button>
                            <button class="claude-btn secondary" id="manage-storage">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                                </svg>
                                存储管理
                            </button>
                            <button class="claude-btn secondary" id="debug-info">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14,12H10V10H14M14,16H10V14H14M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.49,5 12,5C11.51,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8Z"/>
                                </svg>
                                调试信息
                            </button>
                        </div>
                    </div>
                    
                    <div class="claude-panel-section">
                        <div class="claude-panel-options">
                            <label class="claude-checkbox">
                                <input type="checkbox" id="tree-mode-toggle">
                                <span class="checkmark"></span>
                                <span class="label-text">多分支模式</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="claude-panel-footer">
                        <div class="claude-panel-credits">
                            <span>Made with ❤️ by Claude Team</span>
                            <button class="easter-egg" id="easter-egg">🐟</button>
                        </div>
                    </div>
                </div>
            `;
        },

        // 绑定面板事件
        bindPanelEvents(panel) {
            const toggle = panel.querySelector('#claude-panel-toggle');
            const content = panel.querySelector('#claude-panel-content');

            // 切换面板显示/隐藏
            toggle.addEventListener('click', () => {
                this.panelVisible = !this.panelVisible;
                panel.classList.toggle('expanded', this.panelVisible);
            });

            // 导出对话按钮
            panel.querySelector('#export-conversation').addEventListener('click', () => {
                this.exportConversation();
            });

            // 查看对话按钮
            panel.querySelector('#view-conversations').addEventListener('click', () => {
                this.openViewer();
            });

            // 存储管理按钮
            panel.querySelector('#manage-storage').addEventListener('click', () => {
                this.openStorageManager();
            });

            // 调试信息按钮
            panel.querySelector('#debug-info').addEventListener('click', () => {
                this.showDebugInfo();
            });

            // 彩蛋按钮
            panel.querySelector('#easter-egg').addEventListener('click', () => {
                this.showEasterEgg();
            });
        },

        // 更新面板状态
        updatePanelStatus() {
            const statusElement = document.querySelector('#claude-panel-status');
            const userListElement = document.querySelector('#user-id-list');

            if (statusElement) {
                const statusText = statusElement.querySelector('.status-text');
                const statusDot = statusElement.querySelector('.status-dot');

                if (this.userIds.size > 0) {
                    statusText.textContent = `已发现 ${this.userIds.size} 个用户ID`;
                    statusDot.className = 'status-dot active';
                } else {
                    statusText.textContent = '检测中...';
                    statusDot.className = 'status-dot';
                }
            }

            if (userListElement) {
                if (this.userIds.size === 0) {
                    userListElement.innerHTML = '<div class="no-users">暂无用户ID</div>';
                } else {
                    const userItems = Array.from(this.userIds).map((userId, index) => `
                        <div class="user-id-item ${userId === this.currentUserId ? 'active' : ''}" data-user-id="${userId}">
                            <span class="user-id-text">${userId.substring(0, 8)}...${userId.substring(userId.length - 4)}</span>
                            <button class="user-id-select" onclick="ClaudeAssistant.selectUserId('${userId}')">
                                ${userId === this.currentUserId ? '✓' : '选择'}
                            </button>
                        </div>
                    `).join('');
                    userListElement.innerHTML = userItems;
                }
            }
        },

        // 选择用户ID
        selectUserId(userId) {
            this.currentUserId = userId;
            this.updatePanelStatus();
            this.showToast(`已选择用户ID: ${userId.substring(0, 8)}...`);
        },

        // 导出对话
        async exportConversation() {
            const uuid = this.getCurrentChatUUID();
            if (!uuid) {
                this.showToast('未找到对话UUID', 'error');
                return;
            }

            if (!this.currentUserId) {
                this.showToast('请先选择一个用户ID', 'error');
                return;
            }

            try {
                const treeMode = document.querySelector('#tree-mode-toggle').checked;
                const domain = window.location.origin;
                const apiUrl = `${domain}/api/organizations/${this.currentUserId}/chat_conversations/${uuid}${treeMode ? '?tree=True&rendering_mode=messages&render_all_tools=true' : ''}`;

                this.showToast('正在导出对话...', 'info');

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`请求失败: ${response.status}`);
                }

                const data = await response.json();

                // 保存到本地存储
                await this.saveConversation(uuid, data);

                // 下载文件
                this.downloadJSON(data, `claude_${uuid.substring(0, 8)}_${new Date().toISOString().slice(0,10)}.json`);

                this.showToast('对话导出成功！', 'success');
            } catch (error) {
                console.error('导出失败:', error);
                this.showToast(`导出失败: ${error.message}`, 'error');
            }
        },

        // 保存对话到存储
        async saveConversation(uuid, data) {
            const conversation = {
                id: uuid,
                title: data.name || '未命名对话',
                data: data,
                savedAt: new Date().toISOString(),
                userId: this.currentUserId
            };

            this.conversations.set(uuid, conversation);

            // 保存到chrome.storage
            try {
                await chrome.storage.local.set({
                    [`conversation_${uuid}`]: conversation
                });
            } catch (error) {
                console.warn('保存到chrome.storage失败:', error);
            }
        },

        // 下载JSON文件
        downloadJSON(data, filename) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // 打开查看器
        openViewer() {
            const viewerUrl = chrome.runtime.getURL('viewer/viewer.html');
            window.open(viewerUrl, '_blank', 'width=1200,height=800');
        },

        // 打开存储管理器
        openStorageManager() {
            const managerUrl = chrome.runtime.getURL('manager/manager.html');
            window.open(managerUrl, '_blank', 'width=1000,height=700');
        },

        // 显示调试信息
        showDebugInfo() {
            const debugUrl = chrome.runtime.getURL('debug/debug.html');
            const debugWindow = window.open(debugUrl, '_blank', 'width=800,height=600');

            // 传递调试数据
            setTimeout(() => {
                debugWindow.postMessage({
                    type: 'DEBUG_DATA',
                    data: {
                        userIds: Array.from(this.userIds),
                        currentUserId: this.currentUserId,
                        isInChatPage: this.isInChatPage,
                        currentUrl: window.location.href,
                        chatUUID: this.getCurrentChatUUID(),
                        conversations: Array.from(this.conversations.keys())
                    }
                }, '*');
            }, 1000);
        },

        // 显示彩蛋
        showEasterEgg() {
            const messages = [
                '🐟 小鱼游啊游~',
                '🌊 在代码的海洋里遨游',
                '💻 Claude助手为您服务！',
                '🎉 感谢使用我们的插件！',
                '🚀 让对话管理变得更简单',
                '⭐ 如果喜欢请给个好评哦~'
            ];

            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            this.showToast(randomMessage, 'info', 3000);
        },

        // 显示提示消息
        showToast(message, type = 'info', duration = 2000) {
            const toast = document.createElement('div');
            toast.className = `claude-toast claude-toast-${type}`;
            toast.textContent = message;

            document.body.appendChild(toast);

            // 动画显示
            setTimeout(() => toast.classList.add('show'), 100);

            // 自动隐藏
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => document.body.removeChild(toast), 300);
            }, duration);
        },

        // 加载存储的数据
        async loadStoredData() {
            try {
                const result = await chrome.storage.local.get(null);
                Object.keys(result).forEach(key => {
                    if (key.startsWith('conversation_')) {
                        const conversation = result[key];
                        this.conversations.set(conversation.id, conversation);
                    }
                });
                console.log(`📚 已加载 ${this.conversations.size} 个存储的对话`);
            } catch (error) {
                console.warn('加载存储数据失败:', error);
            }
        },

        // 设置事件监听器
        setupEventListeners() {
            // 监听URL变化
            let lastUrl = window.location.href;
            const observer = new MutationObserver(() => {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    this.detectPage();
                    if (this.isInChatPage && !document.querySelector('#claude-assistant-panel')) {
                        setTimeout(() => this.createPanel(), 1000);
                    }
                }
            });

            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
            }

            // 监听快捷键
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    if (e.key === 'E') {
                        e.preventDefault();
                        this.exportConversation();
                    } else if (e.key === 'C') {
                        e.preventDefault();
                        const panel = document.querySelector('#claude-assistant-panel');
                        if (panel) {
                            this.panelVisible = !this.panelVisible;
                            panel.classList.toggle('expanded', this.panelVisible);
                        }
                    }
                }
            });

            // 定期更新状态
            setInterval(() => {
                this.updatePanelStatus();
            }, 5000);
        }
    };

    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ClaudeAssistant.init());
    } else {
        ClaudeAssistant.init();
    }

    // 暴露到全局作用域供其他脚本使用
    window.ClaudeAssistant = ClaudeAssistant;

})();
