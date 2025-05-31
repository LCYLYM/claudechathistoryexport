document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎨 弹出窗口加载中...');

    // DOM元素
    const elements = {
        loading: document.getElementById('loading'),
        mainContent: document.getElementById('main-content'),
        userCount: document.getElementById('user-count'),
        conversationCount: document.getElementById('conversation-count'),
        pageStatus: document.getElementById('page-status'),
        pageDot: document.getElementById('page-dot'),
        useridStatus: document.getElementById('userid-status'),
        useridDot: document.getElementById('userid-dot'),
        exportBtn: document.getElementById('export-btn'),
        viewerBtn: document.getElementById('viewer-btn'),
        managerBtn: document.getElementById('manager-btn'),
        debugBtn: document.getElementById('debug-btn'),
        helpLink: document.getElementById('help-link'),
        feedbackLink: document.getElementById('feedback-link'),
        aboutLink: document.getElementById('about-link')
    };

    // 应用状态
    const state = {
        currentTab: null,
        userIds: [],
        conversations: [],
        isInChatPage: false,
        hasUserIds: false
    };

    // 初始化
    async function init() {
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            state.currentTab = tab;

            // 检查页面状态
            await checkPageStatus();

            // 获取数据
            await loadData();

            // 更新UI
            updateUI();

            // 绑定事件
            bindEvents();

            // 隐藏加载界面
            elements.loading.style.display = 'none';
            elements.mainContent.style.display = 'block';

            console.log('✅ 弹出窗口初始化完成');
        } catch (error) {
            console.error('初始化失败:', error);
            showError('初始化失败: ' + error.message);
        }
    }

    // 检查页面状态
    async function checkPageStatus() {
        try {
            if (!state.currentTab?.url) {
                state.isInChatPage = false;
                return;
            }

            const url = state.currentTab.url;
            state.isInChatPage = /\/chat\/[a-zA-Z0-9-]+/.test(url) || url.includes('claude');

            // 尝试与content script通信
            try {
                const response = await chrome.tabs.sendMessage(state.currentTab.id, {
                    type: 'GET_STATUS'
                });
                
                if (response) {
                    state.isInChatPage = response.isInChatPage || state.isInChatPage;
                    state.hasUserIds = response.hasUserIds || false;
                }
            } catch (error) {
                console.log('无法与content script通信:', error.message);
            }
        } catch (error) {
            console.error('检查页面状态失败:', error);
        }
    }

    // 加载数据
    async function loadData() {
        try {
            // 从background获取用户ID
            const userIdsResponse = await chrome.runtime.sendMessage({
                type: 'GET_USER_IDS'
            });
            
            if (userIdsResponse?.success) {
                state.userIds = userIdsResponse.userIds || [];
                state.hasUserIds = state.userIds.length > 0;
            }

            // 从background获取对话
            const conversationsResponse = await chrome.runtime.sendMessage({
                type: 'GET_CONVERSATIONS'
            });
            
            if (conversationsResponse?.success) {
                state.conversations = conversationsResponse.conversations || [];
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 更新UI
    function updateUI() {
        // 更新统计数据
        elements.userCount.textContent = state.userIds.length;
        elements.conversationCount.textContent = state.conversations.length;

        // 更新页面状态
        if (state.isInChatPage) {
            elements.pageStatus.innerHTML = 'Claude对话页面 <span class="status-dot" id="page-dot"></span>';
            elements.pageDot.classList.remove('inactive');
        } else {
            elements.pageStatus.innerHTML = '非Claude页面 <span class="status-dot inactive" id="page-dot"></span>';
        }

        // 更新用户ID状态
        if (state.hasUserIds) {
            elements.useridStatus.innerHTML = `已发现 ${state.userIds.length} 个 <span class="status-dot" id="userid-dot"></span>`;
            elements.useridDot.classList.remove('inactive');
        } else {
            elements.useridStatus.innerHTML = '未检测到 <span class="status-dot inactive" id="userid-dot"></span>';
        }

        // 更新按钮状态
        const canExport = state.isInChatPage && state.hasUserIds;
        elements.exportBtn.disabled = !canExport;
        if (!canExport) {
            elements.exportBtn.style.opacity = '0.5';
            elements.exportBtn.style.cursor = 'not-allowed';
        }
    }

    // 绑定事件
    function bindEvents() {
        // 导出对话
        elements.exportBtn.addEventListener('click', async () => {
            if (!state.isInChatPage || !state.hasUserIds) {
                showToast('请在Claude对话页面使用此功能', 'error');
                return;
            }

            try {
                await chrome.tabs.sendMessage(state.currentTab.id, {
                    type: 'EXPORT_CONVERSATION'
                });
                showToast('导出请求已发送', 'success');
                window.close();
            } catch (error) {
                console.error('导出失败:', error);
                showToast('导出失败: ' + error.message, 'error');
            }
        });

        // 查看对话
        elements.viewerBtn.addEventListener('click', () => {
            const viewerUrl = chrome.runtime.getURL('viewer/viewer.html');
            chrome.tabs.create({ url: viewerUrl });
            window.close();
        });

        // 存储管理
        elements.managerBtn.addEventListener('click', () => {
            const managerUrl = chrome.runtime.getURL('manager/manager.html');
            chrome.tabs.create({ url: managerUrl });
            window.close();
        });

        // 调试信息
        elements.debugBtn.addEventListener('click', () => {
            const debugUrl = chrome.runtime.getURL('debug/debug.html');
            chrome.tabs.create({ url: debugUrl });
            window.close();
        });

        // 帮助链接
        elements.helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('帮助文档开发中...', 'info');
        });

        // 反馈链接
        elements.feedbackLink.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('感谢您的反馈！', 'info');
        });

        // 关于链接
        elements.aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAbout();
        });
    }

    // 显示关于信息
    function showAbout() {
        const aboutInfo = `
Claude对话助手 v2.0.0

🤖 功能特性:
• 智能用户ID检测
• 多分支对话导出
• 可视化对话查看
• 本地存储管理
• 调试信息获取

🛠️ 技术栈:
• Manifest V3
• Chrome Extensions API
• Modern JavaScript
• CSS3 动画

❤️ 开发团队:
Claude Assistant Team

🐟 彩蛋:
感谢使用我们的插件！
        `.trim();
        
        alert(aboutInfo);
    }

    // 显示错误
    function showError(message) {
        elements.loading.innerHTML = `
            <div style="color: #ff6b6b; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;
    }

    // 显示提示
    function showToast(message, type = 'info') {
        // 创建简单的提示
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#4ade80' : '#667eea'};
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            animation: slideDown 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateX(-50%) translateY(0); opacity: 1; }
            to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // 启动初始化
    init();
});
