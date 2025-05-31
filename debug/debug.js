// Claude Debug Tool
class DebugTool {
    constructor() {
        this.debugData = {
            userIds: [],
            logs: [],
            errors: [],
            performance: {},
            storage: {},
            system: {}
        };
        this.easterEggClicks = 0;
        
        this.init();
    }

    async init() {
        console.log('🔧 调试工具初始化中...');
        
        this.setupEventListeners();
        await this.collectDebugData();
        this.renderDebugInfo();
        this.hideLoading();
        
        console.log('✅ 调试工具初始化完成');
    }

    setupEventListeners() {
        // 刷新数据
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });

        // 导出调试报告
        document.getElementById('export-debug-btn').addEventListener('click', () => {
            this.exportDebugReport();
        });

        // 测试用户ID
        document.getElementById('test-userids-btn').addEventListener('click', () => {
            this.showUserIdTestModal();
        });

        // 用户ID测试按钮
        document.getElementById('test-userid1').addEventListener('click', () => {
            this.testUserId(0);
        });

        document.getElementById('test-userid2').addEventListener('click', () => {
            this.testUserId(1);
        });

        document.getElementById('manual-userid').addEventListener('click', () => {
            this.showUserIdTestModal();
        });

        // 运行测试
        document.getElementById('run-test-btn').addEventListener('click', () => {
            this.runUserIdTest();
        });

        // 清空日志
        document.getElementById('clear-logs-btn').addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('clear-errors-btn').addEventListener('click', () => {
            this.clearErrors();
        });

        // 实验性功能
        document.getElementById('debug-mode').addEventListener('change', (e) => {
            this.toggleDebugMode(e.target.checked);
        });

        document.getElementById('auto-export').addEventListener('change', (e) => {
            this.toggleAutoExport(e.target.checked);
        });

        document.getElementById('enhanced-ui').addEventListener('change', (e) => {
            this.toggleEnhancedUI(e.target.checked);
        });

        // 彩蛋触发
        document.querySelector('.title-icon').addEventListener('click', () => {
            this.handleEasterEggClick();
        });

        // 监听来自content script的消息
        window.addEventListener('message', (event) => {
            if (event.data.type === 'DEBUG_DATA') {
                this.debugData = { ...this.debugData, ...event.data.data };
                this.renderDebugInfo();
            }
        });
    }

    async collectDebugData() {
        try {
            // 收集系统信息
            await this.collectSystemInfo();
            
            // 收集用户ID信息
            await this.collectUserIdInfo();
            
            // 收集存储信息
            await this.collectStorageInfo();
            
            // 收集性能信息
            this.collectPerformanceInfo();
            
            // 从background获取调试信息
            try {
                const response = await chrome.runtime.sendMessage({ type: 'GET_DEBUG_INFO' });
                if (response?.success) {
                    this.debugData = { ...this.debugData, ...response.debugInfo };
                }
            } catch (error) {
                console.warn('无法从background获取调试信息:', error);
            }
            
        } catch (error) {
            console.error('收集调试数据失败:', error);
            this.debugData.errors.push({
                timestamp: new Date().toISOString(),
                message: '收集调试数据失败: ' + error.message
            });
        }
    }

    async collectSystemInfo() {
        this.debugData.system = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            extensionId: chrome.runtime?.id || '未知',
            manifestVersion: chrome.runtime?.getManifest?.()?.manifest_version || '未知'
        };
    }

    async collectUserIdInfo() {
        try {
            // 从chrome.storage获取用户ID
            const result = await chrome.storage.local.get('userIds');
            this.debugData.userIds = result.userIds || [];
            
            // 尝试从当前页面获取用户ID
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                try {
                    const response = await chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'GET_USER_IDS'
                    });
                    if (response?.userIds) {
                        this.debugData.userIds = [...new Set([...this.debugData.userIds, ...response.userIds])];
                    }
                } catch (error) {
                    console.warn('无法从content script获取用户ID:', error);
                }
            }
        } catch (error) {
            console.error('收集用户ID信息失败:', error);
        }
    }

    async collectStorageInfo() {
        try {
            const result = await chrome.storage.local.get(null);
            const conversations = Object.keys(result).filter(key => key.startsWith('conversation_'));
            
            let totalSize = 0;
            conversations.forEach(key => {
                const size = new Blob([JSON.stringify(result[key])]).size;
                totalSize += size;
            });

            this.debugData.storage = {
                totalKeys: Object.keys(result).length,
                conversationCount: conversations.length,
                totalSize: totalSize,
                userIdsCount: result.userIds?.length || 0,
                lastUpdate: new Date().toISOString()
            };
        } catch (error) {
            console.error('收集存储信息失败:', error);
        }
    }

    collectPerformanceInfo() {
        if (window.performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            const memory = performance.memory;
            
            this.debugData.performance = {
                loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0,
                domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : 0,
                memoryUsed: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
                memoryLimit: memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : 0,
                timestamp: Date.now()
            };
        }
    }

    renderDebugInfo() {
        this.renderSystemInfo();
        this.renderUserIdInfo();
        this.renderStorageInfo();
        this.renderPerformanceInfo();
        this.updateStatusIndicators();
    }

    renderSystemInfo() {
        const container = document.getElementById('system-info');
        const system = this.debugData.system;
        
        container.innerHTML = `
            <div class="info-item">
                <div class="info-label">浏览器</div>
                <div class="info-value">${this.getBrowserName()}</div>
            </div>
            <div class="info-item">
                <div class="info-label">平台</div>
                <div class="info-value">${system.platform || '未知'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">语言</div>
                <div class="info-value">${system.language || '未知'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">在线状态</div>
                <div class="info-value ${system.onLine ? 'success' : 'error'}">${system.onLine ? '在线' : '离线'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">扩展ID</div>
                <div class="info-value">${system.extensionId}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Manifest版本</div>
                <div class="info-value">${system.manifestVersion}</div>
            </div>
        `;
    }

    renderUserIdInfo() {
        const container = document.getElementById('userid-list');
        const userIds = this.debugData.userIds;
        
        if (userIds.length === 0) {
            container.innerHTML = '<div class="info-item"><div class="info-value error">未发现用户ID</div></div>';
            return;
        }

        container.innerHTML = userIds.map((userId, index) => `
            <div class="userid-item">
                <div class="userid-info">
                    <div class="userid-value">${userId}</div>
                    <div class="userid-source">用户ID #${index + 1}</div>
                </div>
                <button class="test-btn" onclick="debugTool.testUserId(${index})">测试</button>
            </div>
        `).join('');
    }

    renderStorageInfo() {
        const container = document.getElementById('storage-info');
        const storage = this.debugData.storage;
        
        container.innerHTML = `
            <div class="storage-item">
                <div class="storage-number">${storage.conversationCount || 0}</div>
                <div class="storage-label">保存的对话</div>
            </div>
            <div class="storage-item">
                <div class="storage-number">${storage.totalKeys || 0}</div>
                <div class="storage-label">存储键总数</div>
            </div>
            <div class="storage-item">
                <div class="storage-number">${this.formatFileSize(storage.totalSize || 0)}</div>
                <div class="storage-label">占用空间</div>
            </div>
            <div class="storage-item">
                <div class="storage-number">${storage.userIdsCount || 0}</div>
                <div class="storage-label">用户ID数量</div>
            </div>
        `;
    }

    renderPerformanceInfo() {
        const container = document.getElementById('performance-grid');
        const perf = this.debugData.performance;
        
        container.innerHTML = `
            <div class="performance-item">
                <div class="performance-value">${perf.loadTime || 0}ms</div>
                <div class="performance-label">页面加载时间</div>
            </div>
            <div class="performance-item">
                <div class="performance-value">${perf.domContentLoaded || 0}ms</div>
                <div class="performance-label">DOM加载时间</div>
            </div>
            <div class="performance-item">
                <div class="performance-value">${perf.memoryUsed || 0}MB</div>
                <div class="performance-label">内存使用</div>
            </div>
            <div class="performance-item">
                <div class="performance-value">${perf.memoryLimit || 0}MB</div>
                <div class="performance-label">内存限制</div>
            </div>
        `;
    }

    updateStatusIndicators() {
        // 系统状态
        const systemStatus = document.getElementById('system-status');
        const systemDot = systemStatus.querySelector('.status-dot');
        const systemText = systemStatus.querySelector('.status-text');
        
        if (this.debugData.system.onLine) {
            systemDot.className = 'status-dot success';
            systemText.textContent = '系统正常';
        } else {
            systemDot.className = 'status-dot error';
            systemText.textContent = '系统离线';
        }

        // 用户ID状态
        const useridStatus = document.getElementById('userid-status');
        const useridDot = useridStatus.querySelector('.status-dot');
        const useridText = useridStatus.querySelector('.status-text');
        
        if (this.debugData.userIds.length > 0) {
            useridDot.className = 'status-dot success';
            useridText.textContent = `已发现 ${this.debugData.userIds.length} 个用户ID`;
        } else {
            useridDot.className = 'status-dot error';
            useridText.textContent = '未发现用户ID';
        }

        // 存储状态
        const storageStatus = document.getElementById('storage-status');
        const storageDot = storageStatus.querySelector('.status-dot');
        const storageText = storageStatus.querySelector('.status-text');
        
        const conversationCount = this.debugData.storage.conversationCount || 0;
        if (conversationCount > 0) {
            storageDot.className = 'status-dot success';
            storageText.textContent = `${conversationCount} 个对话已保存`;
        } else {
            storageDot.className = 'status-dot warning';
            storageText.textContent = '暂无保存的对话';
        }
    }

    async testUserId(index) {
        const userId = this.debugData.userIds[index];
        if (!userId) {
            this.showToast('用户ID不存在', 'error');
            return;
        }

        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('/chat/')) {
                this.showToast('请在Claude对话页面进行测试', 'warning');
                return;
            }

            // 提取对话UUID
            const uuidMatch = tab.url.match(/\/chat\/([a-zA-Z0-9-]+)/);
            if (!uuidMatch) {
                this.showToast('无法从URL提取对话UUID', 'error');
                return;
            }

            const conversationId = uuidMatch[1];
            const domain = new URL(tab.url).origin;
            const apiUrl = `${domain}/api/organizations/${userId}/chat_conversations/${conversationId}`;

            this.showToast('正在测试用户ID...', 'info');

            // 测试API请求
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                this.showToast(`用户ID #${index + 1} 测试成功！`, 'success');
                this.addLog(`用户ID测试成功: ${userId.substring(0, 8)}...`);
            } else {
                this.showToast(`用户ID #${index + 1} 测试失败 (${response.status})`, 'error');
                this.addLog(`用户ID测试失败: ${userId.substring(0, 8)}... - ${response.status}`);
            }
        } catch (error) {
            console.error('测试用户ID失败:', error);
            this.showToast('测试失败: ' + error.message, 'error');
            this.addError('用户ID测试失败: ' + error.message);
        }
    }

    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return '未知浏览器';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showUserIdTestModal() {
        document.getElementById('userid-test-modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('userid-test-modal').style.display = 'none';
    }

    async runUserIdTest() {
        const input = document.getElementById('test-userid-input');
        const userId = input.value.trim();

        if (!userId) {
            this.showToast('请输入用户ID', 'warning');
            return;
        }

        const resultsContainer = document.getElementById('test-results');
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div>正在测试...</div>';

        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('/chat/')) {
                resultsContainer.innerHTML = '<div style="color: var(--warning-color);">请在Claude对话页面进行测试</div>';
                return;
            }

            // 提取对话UUID
            const uuidMatch = tab.url.match(/\/chat\/([a-zA-Z0-9-]+)/);
            if (!uuidMatch) {
                resultsContainer.innerHTML = '<div style="color: var(--danger-color);">无法从URL提取对话UUID</div>';
                return;
            }

            const conversationId = uuidMatch[1];
            const domain = new URL(tab.url).origin;
            const apiUrl = `${domain}/api/organizations/${userId}/chat_conversations/${conversationId}`;

            // 测试API请求
            const startTime = Date.now();
            const response = await fetch(apiUrl);
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            let resultHTML = `
                <div><strong>测试结果:</strong></div>
                <div>用户ID: ${userId}</div>
                <div>API URL: ${apiUrl}</div>
                <div>响应状态: ${response.status} ${response.statusText}</div>
                <div>响应时间: ${responseTime}ms</div>
            `;

            if (response.ok) {
                const data = await response.json();
                resultHTML += `
                    <div style="color: var(--accent-color);"><strong>✅ 测试成功！</strong></div>
                    <div>对话名称: ${data.name || '未命名'}</div>
                    <div>消息数量: ${data.chat_messages?.length || 0}</div>
                `;

                // 保存有效的用户ID
                if (!this.debugData.userIds.includes(userId)) {
                    this.debugData.userIds.push(userId);
                    await chrome.storage.local.set({ userIds: this.debugData.userIds });
                }
            } else {
                resultHTML += `<div style="color: var(--danger-color);"><strong>❌ 测试失败</strong></div>`;
            }

            resultsContainer.innerHTML = resultHTML;
        } catch (error) {
            resultsContainer.innerHTML = `
                <div style="color: var(--danger-color);">
                    <strong>❌ 测试出错</strong><br>
                    ${error.message}
                </div>
            `;
        }
    }

    addLog(message) {
        this.debugData.logs.push({
            timestamp: new Date().toISOString(),
            message: message
        });
        this.renderLogs();
    }

    addError(message) {
        this.debugData.errors.push({
            timestamp: new Date().toISOString(),
            message: message
        });
        this.renderErrors();
    }

    renderLogs() {
        const container = document.getElementById('logs-container');
        const logs = this.debugData.logs;

        if (logs.length === 0) {
            container.innerHTML = '<div class="logs-empty">暂无网络请求日志</div>';
            return;
        }

        container.innerHTML = logs.slice(-50).map(log => `
            <div class="log-item">
                <span class="log-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }

    renderErrors() {
        const container = document.getElementById('errors-container');
        const errors = this.debugData.errors;

        if (errors.length === 0) {
            container.innerHTML = '<div class="errors-empty">暂无错误日志</div>';
            return;
        }

        container.innerHTML = errors.slice(-20).map(error => `
            <div class="error-item">
                <span class="error-timestamp">${new Date(error.timestamp).toLocaleTimeString()}</span>
                <span class="error-message">${error.message}</span>
            </div>
        `).join('');
    }

    clearLogs() {
        this.debugData.logs = [];
        this.renderLogs();
        this.showToast('日志已清空', 'success');
    }

    clearErrors() {
        this.debugData.errors = [];
        this.renderErrors();
        this.showToast('错误日志已清空', 'success');
    }

    async refreshData() {
        this.showLoading();
        await this.collectDebugData();
        this.renderDebugInfo();
        this.hideLoading();
        this.showToast('数据已刷新', 'success');
    }

    exportDebugReport() {
        const report = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            debugData: this.debugData
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_debug_report_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('调试报告已导出', 'success');
    }

    toggleDebugMode(enabled) {
        localStorage.setItem('claude-debug-mode', enabled);
        this.showToast(`调试模式已${enabled ? '启用' : '禁用'}`, 'info');
    }

    toggleAutoExport(enabled) {
        localStorage.setItem('claude-auto-export', enabled);
        this.showToast(`自动导出已${enabled ? '启用' : '禁用'}`, 'info');
    }

    toggleEnhancedUI(enabled) {
        localStorage.setItem('claude-enhanced-ui', enabled);
        this.showToast(`增强UI已${enabled ? '启用' : '禁用'}`, 'info');
    }

    handleEasterEggClick() {
        this.easterEggClicks++;
        if (this.easterEggClicks >= 5) {
            this.showEasterEgg();
            this.easterEggClicks = 0;
        }
    }

    showEasterEgg() {
        document.getElementById('easter-egg-area').style.display = 'flex';
    }

    hideEasterEgg() {
        document.getElementById('easter-egg-area').style.display = 'none';
    }

    showToast(message, type = 'info') {
        // 创建简单的提示
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? 'var(--danger-color)' :
                        type === 'success' ? 'var(--accent-color)' :
                        type === 'warning' ? 'var(--warning-color)' : 'var(--info-color)'};
            color: white;
            padding: 12px 20px;
            border-radius: var(--radius-md);
            font-size: 14px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            box-shadow: var(--shadow-lg);
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    showLoading() {
        document.getElementById('loading-state').style.display = 'flex';
        document.getElementById('debug-content').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('debug-content').style.display = 'block';
    }
}

// 初始化调试工具
const debugTool = new DebugTool();

// 暴露到全局作用域
window.debugTool = debugTool;

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
