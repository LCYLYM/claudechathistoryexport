// Claude Assistant Background Service Worker
console.log('🚀 Claude助手后台服务启动');

// 全局状态管理
const BackgroundService = {
    userIds: new Set(),
    conversations: new Map(),
    
    // 初始化
    init() {
        this.setupEventListeners();
        this.loadStoredData();
        console.log('✅ 后台服务初始化完成');
    },

    // 设置事件监听器
    setupEventListeners() {
        // 监听来自content script的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放
        });

        // 监听快捷键命令
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });

        // 监听标签页更新
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab);
            }
        });

        // 监听存储变化
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChange(changes, namespace);
        });
    },

    // 处理消息
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.type) {
                case 'GET_USER_IDS':
                    sendResponse({
                        success: true,
                        userIds: Array.from(this.userIds)
                    });
                    break;

                case 'ADD_USER_ID':
                    this.userIds.add(request.userId);
                    await this.saveUserIds();
                    sendResponse({ success: true });
                    break;

                case 'SAVE_CONVERSATION':
                    await this.saveConversation(request.conversation);
                    sendResponse({ success: true });
                    break;

                case 'GET_CONVERSATIONS':
                    const conversations = await this.getConversations();
                    sendResponse({
                        success: true,
                        conversations: conversations
                    });
                    break;

                case 'DELETE_CONVERSATION':
                    await this.deleteConversation(request.conversationId);
                    sendResponse({ success: true });
                    break;

                case 'EXPORT_CONVERSATION':
                    const result = await this.exportConversation(request.conversationId, request.userId);
                    sendResponse(result);
                    break;

                case 'GET_DEBUG_INFO':
                    const debugInfo = await this.getDebugInfo();
                    sendResponse({
                        success: true,
                        debugInfo: debugInfo
                    });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
            sendResponse({ success: false, error: error.message });
        }
    },

    // 处理快捷键命令
    async handleCommand(command) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            switch (command) {
                case 'export-conversation':
                    chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_CONVERSATION' });
                    break;
                    
                case 'toggle-panel':
                    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
                    break;
            }
        } catch (error) {
            console.error('处理快捷键命令时出错:', error);
        }
    },

    // 处理标签页更新
    handleTabUpdate(tabId, tab) {
        // 检查是否是Claude相关页面
        if (tab.url && (tab.url.includes('claude') || /\/chat\/[a-zA-Z0-9-]+/.test(tab.url))) {
            // 注入content script（如果需要）
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    if (!window.ClaudeAssistant) {
                        console.log('🔄 重新注入Claude助手');
                    }
                }
            }).catch(() => {
                // 忽略错误，可能是权限问题
            });
        }
    },

    // 处理存储变化
    handleStorageChange(changes, namespace) {
        if (namespace === 'local') {
            Object.keys(changes).forEach(key => {
                if (key.startsWith('conversation_')) {
                    const change = changes[key];
                    if (change.newValue) {
                        this.conversations.set(change.newValue.id, change.newValue);
                    } else if (change.oldValue) {
                        this.conversations.delete(change.oldValue.id);
                    }
                }
            });
        }
    },

    // 保存用户ID
    async saveUserIds() {
        try {
            await chrome.storage.local.set({
                userIds: Array.from(this.userIds)
            });
        } catch (error) {
            console.error('保存用户ID失败:', error);
        }
    },

    // 保存对话
    async saveConversation(conversation) {
        try {
            this.conversations.set(conversation.id, conversation);
            await chrome.storage.local.set({
                [`conversation_${conversation.id}`]: conversation
            });
            console.log('💾 对话已保存:', conversation.id);
        } catch (error) {
            console.error('保存对话失败:', error);
            throw error;
        }
    },

    // 获取所有对话
    async getConversations() {
        try {
            const result = await chrome.storage.local.get(null);
            const conversations = [];
            
            Object.keys(result).forEach(key => {
                if (key.startsWith('conversation_')) {
                    conversations.push(result[key]);
                }
            });
            
            return conversations.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        } catch (error) {
            console.error('获取对话失败:', error);
            return [];
        }
    },

    // 删除对话
    async deleteConversation(conversationId) {
        try {
            this.conversations.delete(conversationId);
            await chrome.storage.local.remove(`conversation_${conversationId}`);
            console.log('🗑️ 对话已删除:', conversationId);
        } catch (error) {
            console.error('删除对话失败:', error);
            throw error;
        }
    },

    // 导出对话
    async exportConversation(conversationId, userId) {
        try {
            // 这里可以添加导出逻辑
            // 比如调用API获取最新数据等
            return { success: true, message: '导出成功' };
        } catch (error) {
            console.error('导出对话失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取调试信息
    async getDebugInfo() {
        try {
            const storage = await chrome.storage.local.get(null);
            const tabs = await chrome.tabs.query({});
            const claudeTabs = tabs.filter(tab => 
                tab.url && (tab.url.includes('claude') || /\/chat\/[a-zA-Z0-9-]+/.test(tab.url))
            );

            return {
                userIds: Array.from(this.userIds),
                conversationsCount: this.conversations.size,
                storageKeys: Object.keys(storage),
                claudeTabs: claudeTabs.map(tab => ({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title
                })),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取调试信息失败:', error);
            return { error: error.message };
        }
    },

    // 加载存储的数据
    async loadStoredData() {
        try {
            const result = await chrome.storage.local.get(null);
            
            // 加载用户ID
            if (result.userIds) {
                result.userIds.forEach(id => this.userIds.add(id));
            }
            
            // 加载对话
            Object.keys(result).forEach(key => {
                if (key.startsWith('conversation_')) {
                    const conversation = result[key];
                    this.conversations.set(conversation.id, conversation);
                }
            });
            
            console.log(`📚 已加载 ${this.userIds.size} 个用户ID 和 ${this.conversations.size} 个对话`);
        } catch (error) {
            console.error('加载存储数据失败:', error);
        }
    }
};

// 初始化后台服务
BackgroundService.init();

// 暴露到全局作用域
self.BackgroundService = BackgroundService;
