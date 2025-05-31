// Claude对话存储管理器

class ConversationManager {
    constructor() {
        this.conversations = [];
        this.filteredConversations = [];
        this.searchTerm = '';
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadConversations();
        this.updateStats();
        this.renderConversations();
    }

    bindEvents() {
        // 搜索
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterConversations();
            this.renderConversations();
        });

        // 刷新
        document.getElementById('refresh').addEventListener('click', () => {
            this.loadConversations();
        });

        // 导出全部
        document.getElementById('export-all').addEventListener('click', () => {
            this.exportAll();
        });

        // 清空全部
        document.getElementById('clear-all').addEventListener('click', () => {
            this.clearAll();
        });

        // 模态框关闭
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击模态框外部关闭
        document.getElementById('details-modal').addEventListener('click', (e) => {
            if (e.target.id === 'details-modal') {
                this.closeModal();
            }
        });
    }

    async loadConversations() {
        const container = document.getElementById('conversations-container');
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>正在加载对话数据...</p>
            </div>
        `;

        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_CONVERSATIONS' });
            this.conversations = response.conversations || [];
            this.filterConversations();
            this.updateStats();
            this.renderConversations();
        } catch (error) {
            console.error('加载对话失败:', error);
            this.showError('加载对话失败: ' + error.message);
        }
    }

    filterConversations() {
        if (!this.searchTerm) {
            this.filteredConversations = [...this.conversations];
        } else {
            this.filteredConversations = this.conversations.filter(conv => 
                (conv.name || '').toLowerCase().includes(this.searchTerm) ||
                (conv.summary || '').toLowerCase().includes(this.searchTerm) ||
                (conv.domain || '').toLowerCase().includes(this.searchTerm)
            );
        }
    }

    updateStats() {
        const totalConversations = this.conversations.length;
        const totalMessages = this.conversations.reduce((sum, conv) => 
            sum + (conv.chat_messages ? conv.chat_messages.length : 0), 0);
        
        const totalSize = this.conversations.reduce((sum, conv) => 
            sum + JSON.stringify(conv).length, 0);
        
        const lastSaved = this.conversations.length > 0 ? 
            Math.max(...this.conversations.map(conv => new Date(conv.savedAt).getTime())) : 0;

        document.getElementById('total-conversations').textContent = totalConversations;
        document.getElementById('total-messages').textContent = totalMessages;
        document.getElementById('storage-size').textContent = this.formatBytes(totalSize);
        document.getElementById('last-saved').textContent = lastSaved ? 
            this.formatRelativeTime(lastSaved) : '无';
    }

    renderConversations() {
        const container = document.getElementById('conversations-container');
        
        if (this.filteredConversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
                    </svg>
                    <h3>${this.searchTerm ? '没有找到匹配的对话' : '暂无保存的对话'}</h3>
                    <p>${this.searchTerm ? '尝试使用不同的搜索词' : '开始使用Claude插件保存对话吧'}</p>
                </div>
            `;
            return;
        }

        const conversationsHtml = this.filteredConversations.map(conv => 
            this.renderConversationCard(conv)
        ).join('');

        container.innerHTML = `<div class="conversations-grid">${conversationsHtml}</div>`;
    }

    renderConversationCard(conversation) {
        const messageCount = conversation.chat_messages ? conversation.chat_messages.length : 0;
        const createdAt = new Date(conversation.created_at).toLocaleDateString('zh-CN');
        const savedAt = new Date(conversation.savedAt).toLocaleDateString('zh-CN');
        const size = this.formatBytes(JSON.stringify(conversation).length);

        return `
            <div class="conversation-card" onclick="manager.showDetails('${conversation.id}')">
                <div class="conversation-title">${conversation.name || '未命名对话'}</div>
                <div class="conversation-meta">
                    <span>保存于 ${savedAt}</span>
                    <span class="conversation-domain">${conversation.domain || 'unknown'}</span>
                </div>
                <div class="conversation-stats">
                    <span>📅 ${createdAt}</span>
                    <span>💬 ${messageCount} 条消息</span>
                    <span>📦 ${size}</span>
                </div>
                <div class="conversation-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-small btn-secondary" onclick="manager.viewConversation('${conversation.id}')">
                        查看
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="manager.exportConversation('${conversation.id}')">
                        导出
                    </button>
                    <button class="btn btn-small btn-danger" onclick="manager.deleteConversation('${conversation.id}')">
                        删除
                    </button>
                </div>
            </div>
        `;
    }

    showDetails(conversationId) {
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        if (!conversation) return;

        const modal = document.getElementById('details-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = conversation.name || '未命名对话';

        const messageCount = conversation.chat_messages ? conversation.chat_messages.length : 0;
        const createdAt = new Date(conversation.created_at).toLocaleString('zh-CN');
        const updatedAt = new Date(conversation.updated_at).toLocaleString('zh-CN');
        const savedAt = new Date(conversation.savedAt).toLocaleString('zh-CN');
        const size = this.formatBytes(JSON.stringify(conversation).length);

        body.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px; color: #1e293b;">基本信息</h4>
                <div style="display: grid; gap: 8px;">
                    <div><strong>UUID:</strong> <code>${conversation.uuid}</code></div>
                    <div><strong>域名:</strong> ${conversation.domain}</div>
                    <div><strong>创建时间:</strong> ${createdAt}</div>
                    <div><strong>更新时间:</strong> ${updatedAt}</div>
                    <div><strong>保存时间:</strong> ${savedAt}</div>
                    <div><strong>消息数量:</strong> ${messageCount}</div>
                    <div><strong>文件大小:</strong> ${size}</div>
                    <div><strong>是否收藏:</strong> ${conversation.is_starred ? '是' : '否'}</div>
                </div>
            </div>
            
            ${conversation.summary ? `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 12px; color: #1e293b;">摘要</h4>
                    <p style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #667eea;">
                        ${conversation.summary}
                    </p>
                </div>
            ` : ''}
            
            <div>
                <h4 style="margin-bottom: 12px; color: #1e293b;">操作</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="manager.viewConversation('${conversation.id}')">
                        在查看器中打开
                    </button>
                    <button class="btn btn-secondary" onclick="manager.exportConversation('${conversation.id}')">
                        导出JSON
                    </button>
                    <button class="btn btn-danger" onclick="manager.deleteConversation('${conversation.id}')">
                        删除对话
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    viewConversation(conversationId) {
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        if (!conversation) return;

        const viewerUrl = chrome.runtime.getURL('viewer.html');
        const dataParam = encodeURIComponent(JSON.stringify(conversation));
        window.open(`${viewerUrl}?data=${dataParam}`, '_blank');
    }

    exportConversation(conversationId) {
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        if (!conversation) return;

        const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_${conversation.uuid.substring(0, 8)}_${new Date(conversation.savedAt).toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async deleteConversation(conversationId) {
        if (!confirm('确定要删除这个对话吗？此操作无法撤销。')) {
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'DELETE_CONVERSATION',
                conversationId: conversationId.replace('conversation_', '')
            });
            
            await this.loadConversations();
            this.closeModal();
        } catch (error) {
            console.error('删除对话失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    async exportAll() {
        if (this.conversations.length === 0) {
            alert('没有可导出的对话');
            return;
        }

        const exportData = {
            exportTime: new Date().toISOString(),
            version: '2.0.0',
            conversations: this.conversations
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_conversations_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async clearAll() {
        if (!confirm('确定要清空所有保存的对话吗？此操作无法撤销。')) {
            return;
        }

        if (!confirm('这将删除所有 ' + this.conversations.length + ' 个对话，确定继续吗？')) {
            return;
        }

        try {
            // 删除所有对话
            for (const conv of this.conversations) {
                await chrome.runtime.sendMessage({
                    type: 'DELETE_CONVERSATION',
                    conversationId: conv.id.replace('conversation_', '')
                });
            }
            
            await this.loadConversations();
        } catch (error) {
            console.error('清空失败:', error);
            alert('清空失败: ' + error.message);
        }
    }

    closeModal() {
        document.getElementById('details-modal').style.display = 'none';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
        return '刚刚';
    }

    showError(message) {
        const container = document.getElementById('conversations-container');
        container.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
                </svg>
                <h3>加载失败</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="manager.loadConversations()">重试</button>
            </div>
        `;
    }
}

// 初始化管理器
const manager = new ConversationManager();

// 全局函数供HTML调用
window.manager = manager;
