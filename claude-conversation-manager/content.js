(function() {
    'use strict';

    console.log('🚀 Claude对话管理中心启动');

    let capturedUserId = '';
    let isCollapsed = localStorage.getItem('claudeToolCollapsed') === 'true';

    // 获取用户ID（多种方式）
    async function getUserId() {
        if (capturedUserId) return capturedUserId;
        
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_USER_ID' });
            if (response?.userId) {
                capturedUserId = response.userId;
                return capturedUserId;
            }
        } catch (error) {
            console.log('获取用户ID失败:', error);
        }
        
        return null;
    }

    // 监听来自background和popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            switch (request.type) {
                case 'USER_ID_CAPTURED':
                    capturedUserId = request.userId;
                    console.log("✨ 接收到用户ID:", capturedUserId);
                    updateUIWithUserId();
                    sendResponse({ received: true });
                    break;

                case 'GET_STATUS':
                    sendResponse({
                        userId: capturedUserId,
                        isInChatPage: isInChatPage(),
                        currentUUID: getCurrentChatUUID(),
                        panelExists: !!document.getElementById('claude-control-panel')
                    });
                    break;

                case 'EXPORT_CURRENT':
                    exportMultiBranchJSON().then(() => {
                        sendResponse({ success: true });
                    }).catch(error => {
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // 保持消息通道开放

                case 'SHOW_DEBUG':
                    showDebugInfo();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('消息处理错误:', error);
            sendResponse({ success: false, error: error.message });
        }
    });

    // 检查是否在chat页面
    function isInChatPage() {
        return /\/chat\/[a-zA-Z0-9-]+/.test(window.location.href);
    }

    // 获取当前对话UUID
    function getCurrentChatUUID() {
        const url = window.location.href;
        const match = url.match(/\/chat\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    }

    // 获取当前域名
    function getCurrentDomain() {
        return window.location.origin;
    }

    // 显示提示消息
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `claude-toast claude-toast-${type}`;
        toast.innerHTML = `
            <div class="claude-toast-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div class="claude-toast-message">${message}</div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('claude-toast-show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('claude-toast-show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // 创建主控制面板
    function createControlPanel() {
        if (document.getElementById('claude-control-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'claude-control-panel';
        panel.className = isCollapsed ? 'collapsed' : '';
        
        panel.innerHTML = `
            <div class="claude-toggle-btn" id="claude-toggle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </div>
            
            <div class="claude-panel-content">
                <div class="claude-panel-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="claude-logo">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <h3>Claude管理中心</h3>
                </div>
                
                <div class="claude-user-info">
                    <div class="claude-user-id">
                        <span class="label">用户ID:</span>
                        <span class="value" id="user-id-display">获取中...</span>
                    </div>
                    <div class="claude-conversation-id">
                        <span class="label">对话ID:</span>
                        <span class="value" id="conversation-id-display">${getCurrentChatUUID() || '未检测到'}</span>
                    </div>
                </div>
                
                <div class="claude-actions">
                    <button class="claude-btn claude-btn-primary" id="export-multi-branch">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        导出多分支JSON
                    </button>
                    
                    <button class="claude-btn claude-btn-secondary" id="view-conversations">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
                        </svg>
                        可视化查看器
                    </button>
                    
                    <button class="claude-btn claude-btn-secondary" id="manage-storage">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                        </svg>
                        存储管理
                    </button>
                    
                    <button class="claude-btn claude-btn-info" id="debug-info">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                        </svg>
                        调试信息
                    </button>
                </div>
                
                <div class="claude-footer">
                    <div class="claude-author" id="claude-author-link" style="cursor: pointer;">
                        <span>Made with 🐟 by Claude Assistant</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        bindEvents();
        updateUIWithUserId();
    }

    // 绑定事件
    function bindEvents() {
        // 折叠/展开按钮
        document.getElementById('claude-toggle').addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            const panel = document.getElementById('claude-control-panel');
            panel.classList.toggle('collapsed', isCollapsed);
            localStorage.setItem('claudeToolCollapsed', isCollapsed);
        });

        // 导出多分支JSON
        document.getElementById('export-multi-branch').addEventListener('click', exportMultiBranchJSON);

        // 可视化查看器
        document.getElementById('view-conversations').addEventListener('click', openViewer);

        // 存储管理
        document.getElementById('manage-storage').addEventListener('click', openManager);

        // 调试信息
        document.getElementById('debug-info').addEventListener('click', showDebugInfo);

        // 作者彩蛋
        document.getElementById('claude-author-link').addEventListener('click', showAuthorEasterEgg);
    }

    // 导出多分支JSON
    async function exportMultiBranchJSON() {
        const uuid = getCurrentChatUUID();
        const userId = await getUserId();

        if (!uuid) {
            showToast('未找到对话UUID', 'error');
            throw new Error('未找到对话UUID');
        }

        if (!userId) {
            showToast('未获取到用户ID，请刷新页面', 'error');
            throw new Error('未获取到用户ID');
        }

        try {
            showToast('正在导出多分支对话数据...', 'info');

            const apiUrl = `${getCurrentDomain()}/api/organizations/${userId}/chat_conversations/${uuid}?tree=True&rendering_mode=messages&render_all_tools=true`;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`请求失败: ${response.status}`);
            }

            const data = await response.json();

            // 保存到本地存储
            try {
                await chrome.runtime.sendMessage({
                    type: 'SAVE_CONVERSATION',
                    data: data
                });
            } catch (storageError) {
                console.warn('保存到本地存储失败:', storageError);
                // 继续执行下载，不阻断流程
            }

            // 下载文件
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `claude_${uuid.substring(0, 8)}_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('多分支JSON导出成功！', 'success');
            return data; // 返回数据供调用者使用
        } catch (error) {
            console.error('导出失败:', error);
            showToast(`导出失败: ${error.message}`, 'error');
            throw error; // 重新抛出错误
        }
    }

    // 打开可视化查看器
    async function openViewer() {
        const viewerUrl = chrome.runtime.getURL('viewer.html');

        // 如果在对话页面，尝试直接加载当前对话
        if (isInChatPage()) {
            const uuid = getCurrentChatUUID();
            const userId = await getUserId();

            if (uuid && userId) {
                try {
                    showToast('正在获取当前对话数据...', 'info');

                    const apiUrl = `${getCurrentDomain()}/api/organizations/${userId}/chat_conversations/${uuid}?tree=True&rendering_mode=messages&render_all_tools=true`;
                    const response = await fetch(apiUrl);

                    if (response.ok) {
                        const data = await response.json();

                        // 保存到本地存储
                        try {
                            await chrome.runtime.sendMessage({
                                type: 'SAVE_CONVERSATION',
                                data: data
                            });
                        } catch (storageError) {
                            console.warn('保存到本地存储失败:', storageError);
                        }

                        const dataParam = encodeURIComponent(JSON.stringify(data));
                        window.open(`${viewerUrl}?data=${dataParam}`, '_blank', 'width=1400,height=900');
                        showToast('已在查看器中打开当前对话', 'success');
                        return;
                    }
                } catch (error) {
                    console.warn('获取当前对话失败，打开空白查看器:', error);
                    showToast('获取当前对话失败，打开空白查看器', 'error');
                }
            }
        }

        // 打开空白查看器
        window.open(viewerUrl, '_blank', 'width=1400,height=900');
    }

    // 打开存储管理
    function openManager() {
        const managerUrl = chrome.runtime.getURL('manager.html');
        window.open(managerUrl, '_blank', 'width=1200,height=800');
    }

    // 显示调试信息
    async function showDebugInfo() {
        const uuid = getCurrentChatUUID();
        const userId = await getUserId();
        
        const debugInfo = `
🔍 Claude对话管理中心 - 调试信息

📍 基本信息:
• 当前域名: ${getCurrentDomain()}
• 当前URL: ${window.location.href}
• 是否在chat页面: ${isInChatPage()}

🆔 标识信息:
• 对话UUID: ${uuid || '未找到'}
• 用户ID: ${userId || '未获取到'}

🔧 功能状态:
• 控制面板: ${document.getElementById('claude-control-panel') ? '已加载' : '未加载'}
• 折叠状态: ${isCollapsed ? '已折叠' : '已展开'}

💾 存储信息:
• 本地存储可用: ${typeof chrome !== 'undefined' && chrome.storage ? '是' : '否'}
• Background连接: ${typeof chrome !== 'undefined' && chrome.runtime ? '是' : '否'}

${!userId ? '\n⚠️ 用户ID获取失败，请尝试:\n1. 刷新页面\n2. 发送一条消息\n3. 手动输入用户ID' : ''}
        `.trim();
        
        alert(debugInfo);
        
        if (!userId) {
            const manualUserId = prompt("请输入用户ID（从开发者工具Network标签中获取）:");
            if (manualUserId && manualUserId.trim()) {
                capturedUserId = manualUserId.trim();
                await chrome.runtime.sendMessage({
                    type: 'SET_USER_ID',
                    userId: capturedUserId
                });
                updateUIWithUserId();
                showToast('用户ID已设置', 'success');
            }
        }
    }

    // 更新UI中的用户ID显示
    function updateUIWithUserId() {
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.textContent = capturedUserId ? 
                capturedUserId.substring(0, 8) + '...' : '未获取到';
        }
    }

    // 初始化
    function init() {
        setTimeout(() => {
            if (isInChatPage()) {
                console.log('✅ 在chat页面，创建控制面板');
                createControlPanel();
                getUserId(); // 尝试获取用户ID
            }
        }, 1000);

        // 监听URL变化
        let lastUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                setTimeout(() => {
                    if (isInChatPage()) {
                        createControlPanel();
                        // 更新对话ID显示
                        const conversationDisplay = document.getElementById('conversation-id-display');
                        if (conversationDisplay) {
                            conversationDisplay.textContent = getCurrentChatUUID() || '未检测到';
                        }
                    }
                }, 1000);
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Claude对话管理中心已加载');

    // 作者彩蛋功能 🐟
    window.showAuthorEasterEgg = function() {
        const messages = [
            "🐟 Claude: 我是一个AI助手，很高兴为您服务！",
            "🎯 这个插件是我精心设计的，希望能帮助您更好地管理Claude对话",
            "🚀 支持多分支对话导出、可视化查看、本地存储管理等功能",
            "💡 如果您有任何建议或问题，欢迎反馈！",
            "🌟 感谢您使用Claude对话管理中心！",
            "🐟 小彩蛋：点击我会有惊喜哦~ (已经点击了！)"
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        // 创建特殊的彩蛋提示
        const easterEgg = document.createElement('div');
        easterEgg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px 32px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            z-index: 1000001;
            text-align: center;
            max-width: 400px;
            animation: easterEggPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;

        easterEgg.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🐟✨</div>
            <div style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">${randomMessage}</div>
            <div style="margin-bottom: 20px;">
                <a href="https://github.com/LCYLYM/claudechathistoryexport" target="_blank" class="github-link" style="
                    color: rgba(255, 255, 255, 0.9);
                    text-decoration: none;
                    font-size: 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 6px;
                    transition: all 0.3s ease;
                ">
                    🔗 GitHub项目地址
                </a>
            </div>
            <button class="easter-egg-close-btn" style="
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            ">
                谢谢Claude！🎉
            </button>
        `;

        // 添加事件监听器
        const closeBtn = easterEgg.querySelector('.easter-egg-close-btn');
        const githubLink = easterEgg.querySelector('.github-link');

        closeBtn.addEventListener('click', () => easterEgg.remove());
        closeBtn.addEventListener('mouseover', () => closeBtn.style.background = 'rgba(255, 255, 255, 0.3)');
        closeBtn.addEventListener('mouseout', () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)');

        githubLink.addEventListener('mouseover', () => githubLink.style.background = 'rgba(255, 255, 255, 0.1)');
        githubLink.addEventListener('mouseout', () => githubLink.style.background = 'transparent');

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes easterEggPop {
                0% {
                    transform: translate(-50%, -50%) scale(0.3);
                    opacity: 0;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(easterEgg);

        // 3秒后自动消失
        setTimeout(() => {
            if (easterEgg.parentElement) {
                easterEgg.remove();
            }
            style.remove();
        }, 5000);

        // 播放一个小音效（如果浏览器支持）
        try {
            if (window.AudioContext) {
                const audioContext = new window.AudioContext();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
                oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (e) {
            // 忽略音频错误
        }
    };
})();
