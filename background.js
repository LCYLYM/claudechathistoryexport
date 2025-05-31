// Claude对话管理中心 - Background Service Worker

let capturedUserIds = new Map(); // 存储每个标签页的用户ID
let conversationData = new Map(); // 存储对话数据

// 监听网络请求拦截用户ID
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        const url = details.url;
        const organizationsMatch = url.match(/api\/organizations\/([a-zA-Z0-9-]+)/);

        if (organizationsMatch && organizationsMatch[1]) {
            const userId = organizationsMatch[1];
            const tabId = details.tabId;

            if (tabId && tabId > 0) {
                capturedUserIds.set(tabId, userId);
                console.log("🎯 拦截到用户ID:", userId, "标签页:", tabId);

                // 发送消息给content script
                chrome.tabs.sendMessage(tabId, {
                    type: 'USER_ID_CAPTURED',
                    userId: userId,
                    url: url
                }).catch((error) => {
                    console.log("发送消息失败:", error);
                });
            }
        }
    },
    {
        urls: ["*://*/*"]
    }
);

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    
    switch (request.type) {
        case 'GET_USER_ID':
            const userId = capturedUserIds.get(tabId);
            sendResponse({ userId: userId });
            break;
            
        case 'SET_USER_ID':
            if (tabId && request.userId) {
                capturedUserIds.set(tabId, request.userId);
                console.log("📝 手动设置用户ID:", request.userId);
            }
            sendResponse({ success: true });
            break;
            
        case 'SAVE_CONVERSATION':
            // 保存对话数据到storage
            const conversationId = request.data.uuid;
            chrome.storage.local.set({
                [`conversation_${conversationId}`]: {
                    ...request.data,
                    savedAt: new Date().toISOString(),
                    domain: sender.tab?.url ? new URL(sender.tab.url).origin : 'unknown'
                }
            }).then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // 保持消息通道开放
            
        case 'GET_CONVERSATIONS':
            // 获取所有保存的对话
            chrome.storage.local.get(null).then(items => {
                const conversations = Object.entries(items)
                    .filter(([key]) => key.startsWith('conversation_'))
                    .map(([key, value]) => ({ id: key, ...value }));
                sendResponse({ conversations });
            });
            return true;
            
        case 'DELETE_CONVERSATION':
            chrome.storage.local.remove(`conversation_${request.conversationId}`).then(() => {
                sendResponse({ success: true });
            });
            return true;
    }
});

// 清理关闭的标签页
chrome.tabs.onRemoved.addListener((tabId) => {
    capturedUserIds.delete(tabId);
    conversationData.delete(tabId);
});

// 安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
    console.log("🚀 Claude对话管理中心已安装");
});
