// Claude Storage Manager
class StorageManager {
    constructor() {
        this.conversations = [];
        this.filteredConversations = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentSort = 'date-desc';
        this.searchQuery = '';
        this.selectedConversation = null;
        
        this.init();
    }

    async init() {
        console.log('📚 存储管理器初始化中...');
        
        this.setupEventListeners();
        await this.loadConversations();
        this.updateStats();
        this.renderConversations();
        
        console.log('✅ 存储管理器初始化完成');
    }

    setupEventListeners() {
        // 搜索
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterAndSort();
        });

        // 排序
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndSort();
        });

        // 工具栏按钮
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('export-all-btn').addEventListener('click', () => {
            this.exportAllConversations();
        });

        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.confirmClearAll();
        });

        // 文件导入
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileImport(e.target.files);
        });

        // 分页
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderConversations();
            }
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredConversations.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderConversations();
            }
        });

        // 模态框
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal-view').addEventListener('click', () => {
            this.viewConversation();
        });

        document.getElementById('modal-export').addEventListener('click', () => {
            this.exportConversation();
        });

        document.getElementById('modal-delete').addEventListener('click', () => {
            this.confirmDeleteConversation();
        });

        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteConversation();
        });

        // 点击模态框外部关闭
        document.getElementById('conversation-modal').addEventListener('click', (e) => {
            if (e.target.id === 'conversation-modal') this.closeModal();
        });
    }

    async loadConversations() {
        try {
            // 从chrome.storage获取所有对话
            const result = await chrome.storage.local.get(null);
            this.conversations = [];
            
            Object.keys(result).forEach(key => {
                if (key.startsWith('conversation_')) {
                    const conversation = result[key];
                    // 添加一些计算属性
                    conversation.size = this.calculateConversationSize(conversation);
                    conversation.messageCount = conversation.data?.chat_messages?.length || 0;
                    conversation.preview = this.generatePreview(conversation);
                    this.conversations.push(conversation);
                }
            });

            this.filterAndSort();
            this.hideLoading();
            
            console.log(`📚 已加载 ${this.conversations.length} 个对话`);
        } catch (error) {
            console.error('加载对话失败:', error);
            this.showToast('加载对话失败: ' + error.message, 'error');
            this.hideLoading();
        }
    }

    calculateConversationSize(conversation) {
        const jsonString = JSON.stringify(conversation.data || {});
        return new Blob([jsonString]).size;
    }

    generatePreview(conversation) {
        const messages = conversation.data?.chat_messages || [];
        if (messages.length === 0) return '空对话';
        
        // 找到第一条用户消息
        const firstUserMessage = messages.find(m => m.sender === 'human');
        if (firstUserMessage && firstUserMessage.content?.[0]?.text) {
            const text = firstUserMessage.content[0].text;
            return text.length > 150 ? text.substring(0, 150) + '...' : text;
        }
        
        return '无预览内容';
    }

    filterAndSort() {
        // 过滤
        this.filteredConversations = this.conversations.filter(conv => {
            if (!this.searchQuery) return true;
            
            const searchIn = [
                conv.title || '',
                conv.preview || '',
                conv.data?.name || '',
                conv.id || ''
            ].join(' ').toLowerCase();
            
            return searchIn.includes(this.searchQuery);
        });

        // 排序
        this.filteredConversations.sort((a, b) => {
            switch (this.currentSort) {
                case 'date-desc':
                    return new Date(b.savedAt) - new Date(a.savedAt);
                case 'date-asc':
                    return new Date(a.savedAt) - new Date(b.savedAt);
                case 'name-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'name-desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'size-desc':
                    return b.size - a.size;
                case 'size-asc':
                    return a.size - b.size;
                default:
                    return 0;
            }
        });

        this.currentPage = 1;
        this.renderConversations();
    }

    renderConversations() {
        const container = document.getElementById('conversations-grid');
        const emptyState = document.getElementById('empty-state');
        const pagination = document.getElementById('pagination');

        if (this.filteredConversations.length === 0) {
            container.style.display = 'none';
            pagination.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.style.display = 'grid';

        // 分页计算
        const totalPages = Math.ceil(this.filteredConversations.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageConversations = this.filteredConversations.slice(startIndex, endIndex);

        // 渲染对话卡片
        container.innerHTML = pageConversations.map(conv => this.createConversationCard(conv)).join('');

        // 更新分页
        this.updatePagination(totalPages);

        // 绑定卡片点击事件
        container.querySelectorAll('.conversation-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-menu')) {
                    const conversationId = card.dataset.conversationId;
                    this.showConversationDetails(conversationId);
                }
            });
        });
    }

    createConversationCard(conversation) {
        const savedAt = new Date(conversation.savedAt).toLocaleString('zh-CN');
        const createdAt = conversation.data?.created_at ? 
            new Date(conversation.data.created_at).toLocaleString('zh-CN') : '未知';
        
        return `
            <div class="conversation-card" data-conversation-id="${conversation.id}">
                <div class="card-header">
                    <div class="card-title">${conversation.title || '未命名对话'}</div>
                    <button class="card-menu" onclick="manager.showCardMenu(event, '${conversation.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="card-meta">
                    <div class="meta-item">
                        <div class="meta-label">保存时间</div>
                        <div class="meta-value">${savedAt}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">创建时间</div>
                        <div class="meta-value">${createdAt}</div>
                    </div>
                </div>
                
                <div class="card-preview">${conversation.preview}</div>
                
                <div class="card-stats">
                    <div class="card-tags">
                        <span class="card-tag">${conversation.messageCount} 条消息</span>
                        ${conversation.data?.settings?.preview_feature_uses_artifacts ? 
                            '<span class="card-tag">包含工具</span>' : ''}
                    </div>
                    <div class="card-size">${this.formatFileSize(conversation.size)}</div>
                </div>
            </div>
        `;
    }

    updatePagination(totalPages) {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const pageInfo = document.getElementById('page-info');

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
        pageInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
    }

    updateStats() {
        const totalCount = this.conversations.length;
        const totalSize = this.conversations.reduce((sum, conv) => sum + conv.size, 0);

        document.getElementById('total-conversations').textContent = totalCount;
        document.getElementById('total-size').textContent = this.formatFileSize(totalSize);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showConversationDetails(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        this.selectedConversation = conversation;
        
        const modal = document.getElementById('conversation-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = conversation.title || '未命名对话';
        
        const data = conversation.data || {};
        const messages = data.chat_messages || [];
        const humanMessages = messages.filter(m => m.sender === 'human').length;
        const assistantMessages = messages.filter(m => m.sender === 'assistant').length;
        
        body.innerHTML = `
            <div class="conversation-details">
                <div class="detail-section">
                    <h4>基本信息</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>对话ID:</strong> ${conversation.id}
                        </div>
                        <div class="detail-item">
                            <strong>标题:</strong> ${conversation.title || '未命名对话'}
                        </div>
                        <div class="detail-item">
                            <strong>保存时间:</strong> ${new Date(conversation.savedAt).toLocaleString('zh-CN')}
                        </div>
                        <div class="detail-item">
                            <strong>创建时间:</strong> ${data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : '未知'}
                        </div>
                        <div class="detail-item">
                            <strong>更新时间:</strong> ${data.updated_at ? new Date(data.updated_at).toLocaleString('zh-CN') : '未知'}
                        </div>
                        <div class="detail-item">
                            <strong>文件大小:</strong> ${this.formatFileSize(conversation.size)}
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>对话统计</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>总消息数:</strong> ${messages.length}
                        </div>
                        <div class="detail-item">
                            <strong>用户消息:</strong> ${humanMessages}
                        </div>
                        <div class="detail-item">
                            <strong>AI回复:</strong> ${assistantMessages}
                        </div>
                        <div class="detail-item">
                            <strong>是否收藏:</strong> ${data.is_starred ? '是' : '否'}
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>内容预览</h4>
                    <div class="content-preview">
                        ${conversation.preview}
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    showCardMenu(event, conversationId) {
        event.stopPropagation();
        // 简化版：直接显示详情
        this.showConversationDetails(conversationId);
    }

    viewConversation() {
        if (!this.selectedConversation) return;

        // 打开查看器并传递数据
        const viewerUrl = chrome.runtime.getURL('viewer/viewer.html');
        const newWindow = window.open(viewerUrl, '_blank', 'width=1200,height=800');

        // 等待窗口加载完成后传递数据
        setTimeout(() => {
            newWindow.postMessage({
                type: 'loadData',
                data: this.selectedConversation.data
            }, '*');
        }, 1000);

        this.closeModal();
    }

    exportConversation() {
        if (!this.selectedConversation) return;
        
        const data = this.selectedConversation.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_${this.selectedConversation.id.substring(0, 8)}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('对话导出成功！', 'success');
        this.closeModal();
    }

    confirmDeleteConversation() {
        if (!this.selectedConversation) return;
        
        document.getElementById('confirm-message').textContent = 
            `确定要删除对话"${this.selectedConversation.title || '未命名对话'}"吗？此操作无法撤销。`;
        document.getElementById('confirm-modal').style.display = 'flex';
    }

    async deleteConversation() {
        if (!this.selectedConversation) return;
        
        try {
            // 从chrome.storage删除
            await chrome.storage.local.remove(`conversation_${this.selectedConversation.id}`);
            
            // 从本地数组删除
            this.conversations = this.conversations.filter(c => c.id !== this.selectedConversation.id);
            
            this.filterAndSort();
            this.updateStats();
            this.closeConfirmModal();
            this.closeModal();
            
            this.showToast('对话删除成功！', 'success');
        } catch (error) {
            console.error('删除对话失败:', error);
            this.showToast('删除失败: ' + error.message, 'error');
        }
    }

    async handleFileImport(files) {
        if (!files || files.length === 0) return;

        const importedCount = { success: 0, failed: 0 };

        for (const file of files) {
            try {
                if (!file.name.endsWith('.json')) {
                    importedCount.failed++;
                    continue;
                }

                const text = await file.text();
                const data = JSON.parse(text);

                // 验证数据格式
                if (!this.validateConversationData(data)) {
                    importedCount.failed++;
                    continue;
                }

                // 创建对话记录
                const conversation = {
                    id: data.uuid,
                    title: data.name || '导入的对话',
                    data: data,
                    savedAt: new Date().toISOString(),
                    userId: 'imported'
                };

                // 保存到chrome.storage
                await chrome.storage.local.set({
                    [`conversation_${conversation.id}`]: conversation
                });

                importedCount.success++;
            } catch (error) {
                console.error('导入文件失败:', file.name, error);
                importedCount.failed++;
            }
        }

        // 重新加载对话列表
        await this.loadConversations();
        this.updateStats();

        // 显示结果
        const message = `导入完成！成功: ${importedCount.success}，失败: ${importedCount.failed}`;
        this.showToast(message, importedCount.failed > 0 ? 'warning' : 'success');
    }

    validateConversationData(data) {
        return data &&
               typeof data === 'object' &&
               data.uuid &&
               Array.isArray(data.chat_messages);
    }

    async exportAllConversations() {
        if (this.conversations.length === 0) {
            this.showToast('没有可导出的对话', 'warning');
            return;
        }

        try {
            // 创建包含所有对话的ZIP文件（简化版：导出为单个JSON）
            const exportData = {
                exportTime: new Date().toISOString(),
                version: '2.0.0',
                conversations: this.conversations.map(conv => conv.data)
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

            this.showToast(`成功导出 ${this.conversations.length} 个对话！`, 'success');
        } catch (error) {
            console.error('导出失败:', error);
            this.showToast('导出失败: ' + error.message, 'error');
        }
    }

    confirmClearAll() {
        if (this.conversations.length === 0) {
            this.showToast('没有可清空的对话', 'warning');
            return;
        }

        document.getElementById('confirm-message').textContent =
            `确定要清空所有 ${this.conversations.length} 个对话吗？此操作无法撤销！`;
        document.getElementById('confirm-modal').style.display = 'flex';

        // 修改确认按钮的行为
        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => this.clearAllConversations();
    }

    async clearAllConversations() {
        try {
            // 删除所有对话相关的存储
            const keysToRemove = this.conversations.map(conv => `conversation_${conv.id}`);
            await chrome.storage.local.remove(keysToRemove);

            // 清空本地数组
            this.conversations = [];
            this.filteredConversations = [];

            this.renderConversations();
            this.updateStats();
            this.closeConfirmModal();

            this.showToast('所有对话已清空！', 'success');
        } catch (error) {
            console.error('清空失败:', error);
            this.showToast('清空失败: ' + error.message, 'error');
        }
    }

    closeModal() {
        document.getElementById('conversation-modal').style.display = 'none';
        this.selectedConversation = null;
    }

    closeConfirmModal() {
        document.getElementById('confirm-modal').style.display = 'none';
        // 恢复确认按钮的默认行为
        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.onclick = () => this.deleteConversation();
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const content = document.getElementById('toast-content');

        content.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
    }
}

// 初始化存储管理器
const manager = new StorageManager();

// 暴露到全局作用域
window.manager = manager;

// 监听来自查看器的消息
window.addEventListener('message', (event) => {
    if (event.data.type === 'REQUEST_CONVERSATION_DATA') {
        // 如果查看器请求数据，发送选中的对话数据
        if (manager.selectedConversation) {
            event.source.postMessage({
                type: 'CONVERSATION_DATA',
                data: manager.selectedConversation.data
            }, '*');
        }
    }
});
