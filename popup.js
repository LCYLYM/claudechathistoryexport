document.addEventListener('DOMContentLoaded', async function() {
    // 获取当前标签页信息
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 更新页面状态
    updatePageStatus(tab);
    
    // 绑定事件
    bindEvents();
    
    // 检查对话状态
    checkConversationStatus(tab);
});

function updatePageStatus(tab) {
    const currentPageElement = document.getElementById('current-page');
    const conversationStatusElement = document.getElementById('conversation-status');
    
    if (tab.url) {
        const url = new URL(tab.url);
        currentPageElement.textContent = url.hostname;
        
        // 检查是否在chat页面
        if (/\/chat\/[a-zA-Z0-9-]+/.test(tab.url)) {
            conversationStatusElement.textContent = '对话中';
            conversationStatusElement.style.background = 'rgba(16, 185, 129, 0.3)';
        } else {
            conversationStatusElement.textContent = '非对话页面';
            conversationStatusElement.style.background = 'rgba(239, 68, 68, 0.3)';
        }
    } else {
        currentPageElement.textContent = '未知页面';
        conversationStatusElement.textContent = '无法检测';
    }
}

async function checkConversationStatus(tab) {
    const userIdStatusElement = document.getElementById('user-id-status');

    try {
        // 向content script发送消息检查状态
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });

        if (response && response.userId) {
            userIdStatusElement.textContent = response.userId.substring(0, 8) + '...';
            userIdStatusElement.style.background = 'rgba(16, 185, 129, 0.3)';

            // 更新其他状态信息
            updateConversationInfo(response);
        } else {
            userIdStatusElement.textContent = '未获取到';
            userIdStatusElement.style.background = 'rgba(239, 68, 68, 0.3)';
        }
    } catch (error) {
        console.error('检查状态失败:', error);
        userIdStatusElement.textContent = '检测失败';
        userIdStatusElement.style.background = 'rgba(239, 68, 68, 0.3)';

        // 如果是因为content script未加载，显示提示
        if (error.message && error.message.includes('Could not establish connection')) {
            userIdStatusElement.textContent = '插件未激活';
            userIdStatusElement.title = '请刷新页面或访问Claude聊天页面';
        }
    }
}

function updateConversationInfo(status) {
    const conversationStatusElement = document.getElementById('conversation-status');

    if (status.isInChatPage && status.currentUUID) {
        conversationStatusElement.textContent = '对话中';
        conversationStatusElement.style.background = 'rgba(16, 185, 129, 0.3)';
        conversationStatusElement.title = `UUID: ${status.currentUUID}`;
    } else if (status.isInChatPage) {
        conversationStatusElement.textContent = '聊天页面';
        conversationStatusElement.style.background = 'rgba(251, 191, 36, 0.3)';
    } else {
        conversationStatusElement.textContent = '非对话页面';
        conversationStatusElement.style.background = 'rgba(239, 68, 68, 0.3)';
    }
}

function bindEvents() {
    // 打开可视化查看器
    document.getElementById('open-viewer').addEventListener('click', () => {
        const viewerUrl = chrome.runtime.getURL('viewer.html');
        chrome.tabs.create({ url: viewerUrl });
        window.close();
    });

    // 打开存储管理
    document.getElementById('open-manager').addEventListener('click', () => {
        const managerUrl = chrome.runtime.getURL('manager.html');
        chrome.tabs.create({ url: managerUrl });
        window.close();
    });

    // 导出当前对话
    document.getElementById('export-current').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_CURRENT' });
            showMessage('导出请求已发送', 'success');
        } catch (error) {
            showMessage('导出失败：' + error.message, 'error');
        }
    });

    // 调试信息
    document.getElementById('debug-info').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_DEBUG' });
        } catch (error) {
            showMessage('无法获取调试信息', 'error');
        }
    });
}

function showMessage(message, type = 'info') {
    // 创建临时消息显示
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 2000);
}
