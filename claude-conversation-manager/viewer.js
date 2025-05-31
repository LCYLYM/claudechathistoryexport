// Claude对话可视化查看器

class ConversationViewer {
    constructor() {
        this.currentData = null;
        this.messageTree = new Map();
        this.rootMessages = [];
        this.searchTerm = '';
        this.viewOptions = {
            showTreeView: true,
            showTimestamps: true,
            showTools: true
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromUrl();
    }

    bindEvents() {
        // 上传JSON文件
        document.getElementById('upload-json').addEventListener('click', () => {
            this.selectFile();
        });

        // 全局拖拽支持（即使已经有对话也可以拖拽新文件）
        this.setupGlobalDragDrop();

        // 上传区域拖拽
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.loadFile(files[0]);
                }
            });

            uploadArea.addEventListener('click', () => {
                this.selectFile();
            });
        }

        // 视图选项
        document.getElementById('show-tree-view').addEventListener('change', (e) => {
            this.viewOptions.showTreeView = e.target.checked;
            this.renderConversation();
        });

        document.getElementById('show-timestamps').addEventListener('change', (e) => {
            this.viewOptions.showTimestamps = e.target.checked;
            this.renderConversation();
        });

        document.getElementById('show-tools').addEventListener('change', (e) => {
            this.viewOptions.showTools = e.target.checked;
            this.renderConversation();
        });

        // 搜索
        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // 打开存储管理页面
        document.getElementById('open-storage-manager').addEventListener('click', () => {
            this.openStorageManager();
        });

        // 导出HTML
        document.getElementById('export-html').addEventListener('click', () => {
            this.exportToHtml();
        });

        // 模态框关闭
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // 侧边栏关闭
        document.getElementById('close-sidebar').addEventListener('click', () => {
            this.hideStorageSidebar();
        });

        // 事件委托处理所有按钮点击
        this.setupEventDelegation();
    }

    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const target = e.target;
            const action = target.getAttribute('data-action');

            if (action) {
                e.preventDefault();
                e.stopPropagation();

                switch (action) {
                    case 'close-modal':
                        this.closeModal();
                        break;
                    case 'show-image':
                        const imageUrl = target.getAttribute('data-image-url');
                        const imageName = target.getAttribute('data-image-name');
                        this.showImagePreview(imageUrl, imageName);
                        break;
                    case 'load-stored':
                        const loadConversationId = target.getAttribute('data-conversation-id');
                        this.loadStoredConversation(loadConversationId);
                        break;
                    case 'delete-stored':
                        const deleteConversationId = target.getAttribute('data-conversation-id');
                        this.deleteStoredConversation(deleteConversationId);
                        break;
                }
                return;
            }

            // 处理对话选择器项目点击
            const selectorItem = target.closest('.conversation-selector-item');
            if (selectorItem) {
                const index = parseInt(selectorItem.getAttribute('data-conversation-index'));
                if (!isNaN(index)) {
                    this.loadConversationFromSelector(index);
                }
            }
        });
    }

    selectFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                this.loadFile(e.target.files[0]);
            }
        };
        input.click();
    }

    setupGlobalDragDrop() {
        // 全局拖拽支持
        let dragCounter = 0;

        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            this.showDragOverlay();
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                this.hideDragOverlay();
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            this.hideDragOverlay();

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadFile(files[0]);
            }
        });
    }

    showDragOverlay() {
        let overlay = document.getElementById('drag-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'drag-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(102, 126, 234, 0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: bold;
                backdrop-filter: blur(4px);
            `;
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📁</div>
                    <div>拖拽JSON文件到此处</div>
                    <div style="font-size: 16px; margin-top: 10px; opacity: 0.8;">支持单个对话或导出的多对话文件</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    hideDragOverlay() {
        const overlay = document.getElementById('drag-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    async loadFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // 检查是否是导出的多对话文件
            if (data.type === 'claude_conversations_export' && data.conversations) {
                this.handleMultiConversationImport(data);
            } else {
                this.loadConversationData(data);
            }
        } catch (error) {
            this.showError('文件格式错误: ' + error.message);
        }
    }

    handleMultiConversationImport(exportData) {
        const conversations = exportData.conversations;

        if (conversations.length === 1) {
            // 只有一个对话，直接加载
            this.loadConversationData(conversations[0]);
            this.showToast(`已加载对话: ${conversations[0].name}`, 'success');
        } else {
            // 多个对话，显示选择界面
            this.showConversationSelector(conversations);
        }
    }

    loadFromUrl() {
        // 检查URL参数中是否有数据
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        if (dataParam) {
            try {
                const data = JSON.parse(decodeURIComponent(dataParam));
                this.loadConversationData(data);
            } catch (error) {
                console.error('URL数据解析失败:', error);
            }
        }
    }

    showConversationSelector(conversations) {
        const modal = document.getElementById('details-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = '选择要查看的对话';

        const conversationList = conversations.map((conv, index) => {
            const messageCount = conv.chat_messages ? conv.chat_messages.length : 0;
            const createdAt = new Date(conv.created_at).toLocaleDateString('zh-CN');

            return `
                <div class="conversation-selector-item" data-conversation-index="${index}" style="
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    <div style="font-weight: 600; margin-bottom: 8px;">${conv.name || '未命名对话'}</div>
                    <div style="font-size: 14px; color: #64748b;">
                        <span>📅 ${createdAt}</span>
                        <span style="margin-left: 16px;">💬 ${messageCount} 条消息</span>
                    </div>
                </div>
            `;
        }).join('');

        body.innerHTML = `
            <div style="margin-bottom: 16px;">
                <p>检测到 ${conversations.length} 个对话，请选择要查看的对话：</p>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${conversationList}
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn btn-secondary" data-action="close-modal">取消</button>
            </div>
        `;

        // 保存对话列表供选择使用
        this.pendingConversations = conversations;
        modal.style.display = 'flex';
    }

    loadConversationFromSelector(index) {
        if (this.pendingConversations && this.pendingConversations[index]) {
            const conversation = this.pendingConversations[index];
            this.loadConversationData(conversation);
            this.showToast(`已加载对话: ${conversation.name}`, 'success');
            this.closeModal();
        }
    }

    loadConversationData(data) {
        console.log('🔄 加载对话数据:', data.name);
        this.currentData = data;
        this.buildMessageTree();
        this.renderConversationInfo();
        this.renderConversation();
        this.showConversationContent();

        // 显示导出按钮
        document.getElementById('export-html').style.display = 'inline-flex';
    }

    buildMessageTree() {
        this.messageTree.clear();
        this.rootMessages = [];

        if (!this.currentData.chat_messages) {
            console.log('❌ 没有找到chat_messages');
            return;
        }

        console.log(`📊 开始构建消息树，共 ${this.currentData.chat_messages.length} 条消息`);

        // 首先将所有消息添加到map中
        this.currentData.chat_messages.forEach(message => {
            this.messageTree.set(message.uuid, {
                ...message,
                children: []
            });
        });

        // 然后建立父子关系
        this.currentData.chat_messages.forEach(message => {
            // 检查是否有有效的父消息UUID（排除空值和特殊的根UUID）
            const hasValidParent = message.parent_message_uuid &&
                                 message.parent_message_uuid !== "00000000-0000-4000-8000-000000000000";

            console.log(`🔍 消息 ${message.uuid.substring(0, 8)} (${message.sender}): 父消息=${message.parent_message_uuid}, 有效父消息=${hasValidParent}`);

            if (hasValidParent) {
                const parent = this.messageTree.get(message.parent_message_uuid);
                if (parent) {
                    parent.children.push(message.uuid);
                    console.log(`  ✅ 添加到父消息 ${message.parent_message_uuid.substring(0, 8)} 的子消息`);
                } else {
                    // 如果找不到父消息，将其作为根消息
                    this.rootMessages.push(message.uuid);
                    console.log(`  ⚠️ 父消息不存在，作为根消息处理`);
                }
            } else {
                this.rootMessages.push(message.uuid);
                console.log(`  🌱 作为根消息添加`);
            }
        });

        // 按时间排序
        this.rootMessages.sort((a, b) => {
            const messageA = this.messageTree.get(a);
            const messageB = this.messageTree.get(b);
            return new Date(messageA.created_at) - new Date(messageB.created_at);
        });

        // 为每个节点的子节点排序
        this.messageTree.forEach(message => {
            message.children.sort((a, b) => {
                const messageA = this.messageTree.get(a);
                const messageB = this.messageTree.get(b);
                return new Date(messageA.created_at) - new Date(messageB.created_at);
            });
        });

        console.log(`🌳 消息树构建完成: ${this.rootMessages.length} 个根消息`);
        console.log('根消息列表:', this.rootMessages.map(id => `${id.substring(0, 8)} (${this.messageTree.get(id).sender})`));
    }

    renderConversationInfo() {
        const info = document.getElementById('conversation-info');
        const data = this.currentData;
        
        const createdAt = new Date(data.created_at).toLocaleString('zh-CN');
        const updatedAt = new Date(data.updated_at).toLocaleString('zh-CN');
        const messageCount = data.chat_messages ? data.chat_messages.length : 0;
        
        info.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">对话标题</div>
                    <div class="info-value">${data.name || '未命名对话'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">对话UUID</div>
                    <div class="info-value">${data.uuid}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">创建时间</div>
                    <div class="info-value">${createdAt}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">更新时间</div>
                    <div class="info-value">${updatedAt}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">消息数量</div>
                    <div class="info-value">${messageCount}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">是否收藏</div>
                    <div class="info-value">${data.is_starred ? '是' : '否'}</div>
                </div>
            </div>
        `;

        // 更新标题
        document.getElementById('conversation-title').textContent = data.name || '未命名对话';
    }

    renderConversation() {
        console.log('🎨 开始渲染对话');
        const container = document.getElementById('conversation-tree');

        if (!container) {
            console.error('❌ 找不到conversation-tree容器');
            return;
        }

        container.innerHTML = '';

        console.log(`📝 根消息数量: ${this.rootMessages.length}`);
        if (this.rootMessages.length === 0) {
            console.log('⚠️ 没有根消息，显示提示信息');
            container.innerHTML = '<div class="no-messages">没有找到消息</div>';
            return;
        }

        // 如果有搜索词，过滤消息
        let messagesToRender = this.rootMessages;
        if (this.searchTerm) {
            messagesToRender = this.filterMessagesBySearch();
            console.log(`🔍 搜索过滤后消息数量: ${messagesToRender.length}`);
        }

        if (messagesToRender.length === 0) {
            console.log('⚠️ 过滤后没有消息，显示提示信息');
            container.innerHTML = '<div class="no-messages">没有找到匹配的消息</div>';
            return;
        }

        console.log(`✅ 开始渲染 ${messagesToRender.length} 条消息`);
        messagesToRender.forEach((messageId, index) => {
            console.log(`  渲染消息 ${index + 1}: ${messageId.substring(0, 8)}`);
            this.renderMessageNode(container, messageId, 0);
        });
        console.log('🎨 对话渲染完成');
    }

    filterMessagesBySearch() {
        const matchingMessages = [];

        const searchInMessage = (messageId) => {
            const message = this.messageTree.get(messageId);
            if (!message) return false;

            // 搜索消息内容
            if (message.content) {
                for (const content of message.content) {
                    if (content.type === 'text' && content.text) {
                        if (content.text.toLowerCase().includes(this.searchTerm)) {
                            return true;
                        }
                    }
                }
            }

            // 搜索子消息
            if (message.children) {
                for (const childId of message.children) {
                    if (searchInMessage(childId)) {
                        return true;
                    }
                }
            }

            return false;
        };

        for (const messageId of this.rootMessages) {
            if (searchInMessage(messageId)) {
                matchingMessages.push(messageId);
            }
        }

        return matchingMessages;
    }

    renderMessageNode(container, messageId, depth) {
        const message = this.messageTree.get(messageId);
        if (!message) return;

        const messageElement = this.createMessageElement(message, depth);
        container.appendChild(messageElement);

        // 如果启用树形视图，渲染子消息
        if (this.viewOptions.showTreeView && message.children.length > 0) {
            message.children.forEach(childId => {
                this.renderMessageNode(container, childId, depth + 1);
            });
        }
    }

    createMessageElement(message, depth) {
        const div = document.createElement('div');
        div.className = `message-node ${depth > 0 ? 'branch-indicator' : ''}`;
        div.style.marginLeft = `${depth * 20}px`;

        const senderClass = message.sender === 'human' ? 'sender-human' : 'sender-assistant';
        const senderName = message.sender === 'human' ? '用户' : 'Claude';
        const senderInitial = message.sender === 'human' ? 'U' : 'C';

        const timestamp = this.viewOptions.showTimestamps ? 
            `<div class="message-timestamp">${new Date(message.created_at).toLocaleString('zh-CN')}</div>` : '';

        div.innerHTML = `
            <div class="message-header">
                <div class="message-sender ${senderClass}">
                    <div class="sender-avatar">${senderInitial}</div>
                    <span>${senderName}</span>
                </div>
                ${timestamp}
            </div>
            <div class="message-content" id="content-${message.uuid}">
                ${this.renderMessageContent(message)}
            </div>
        `;

        return div;
    }

    renderMessageContent(message) {
        let contentHtml = '';

        // 处理新格式的content数组（带时间戳的内容块）
        if (message.content && Array.isArray(message.content) && message.content.length > 0) {
            contentHtml = message.content.map(content => {
                return this.renderContentBlock(content, message);
            }).join('');
        }
        // 处理旧格式的text字段
        else if (message.text) {
            contentHtml = this.renderTextContent(message.text);
        }
        else {
            contentHtml = '<div class="content-text">无内容</div>';
        }

        // 渲染附件
        if (message.attachments && message.attachments.length > 0) {
            contentHtml += this.renderAttachments(message.attachments);
        }

        // 渲染文件 (files 和 files_v2)
        if (message.files && message.files.length > 0) {
            contentHtml += this.renderFiles(message.files, 'files');
        }

        if (message.files_v2 && message.files_v2.length > 0) {
            contentHtml += this.renderFiles(message.files_v2, 'files_v2');
        }

        return contentHtml;
    }

    renderAttachments(attachments) {
        return `
            <div class="attachments">
                <div class="attachments-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z"/>
                    </svg>
                    附件
                </div>
                <div class="attachment-list">
                    ${attachments.map(attachment => this.renderAttachmentItem(attachment)).join('')}
                </div>
            </div>
        `;
    }

    renderAttachmentItem(attachment) {
        const fileType = this.getFileType(attachment.file_name || attachment.name || '');
        const fileSize = attachment.file_size ? this.formatBytes(attachment.file_size) : '未知大小';

        return `
            <div class="attachment-item">
                <div class="attachment-icon">
                    ${this.getFileIcon(fileType)}
                </div>
                <div class="attachment-info">
                    <div class="attachment-name">${attachment.file_name || attachment.name || '未知文件'}</div>
                    <div class="attachment-meta">${fileType.toUpperCase()} • ${fileSize}</div>
                </div>
            </div>
        `;
    }

    renderFiles(files, type = 'files') {
        if (!files || files.length === 0) return '';

        return `
            <div class="attachments">
                <div class="attachments-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    文件 (${files.length}) - ${type}
                </div>
                <div class="attachment-list">
                    ${files.map(file => this.renderFileItem(file)).join('')}
                </div>
            </div>
        `;
    }

    renderFileItem(file) {
        const fileName = file.file_name || file.name || '未知文件';
        const fileType = this.getFileType(fileName);
        const fileSize = file.file_size || file.size;
        const formattedSize = fileSize ? this.formatBytes(fileSize) : '未知大小';

        // 处理图片文件
        if (file.file_kind === 'image' || fileType === 'image') {
            const thumbnailUrl = file.thumbnail_url || file.preview_url;
            const previewUrl = file.preview_url || file.thumbnail_url;

            return `
                <div class="attachment-item image-file">
                    <div class="image-preview">
                        ${thumbnailUrl ?
                            `<img src="${thumbnailUrl}" alt="${fileName}" data-action="show-image" data-image-url="${previewUrl || thumbnailUrl}" data-image-name="${fileName}" style="max-width: 100px; max-height: 100px; cursor: pointer; border-radius: 4px;">` :
                            '<div class="image-placeholder">🖼️</div>'
                        }
                    </div>
                    <div class="attachment-info">
                        <div class="attachment-name">${fileName}</div>
                        <div class="attachment-meta">${formattedSize} • 图片</div>
                        ${file.thumbnail_asset ?
                            `<div class="image-dimensions">${file.thumbnail_asset.image_width}×${file.thumbnail_asset.image_height}</div>` :
                            ''
                        }
                    </div>
                </div>
            `;
        }

        // 处理普通文件
        return `
            <div class="attachment-item">
                <div class="attachment-icon">
                    ${this.getFileIcon(fileType)}
                </div>
                <div class="attachment-info">
                    <div class="attachment-name">${fileName}</div>
                    <div class="attachment-meta">${fileType.toUpperCase()} • ${formattedSize}</div>
                    ${file.extracted_content ?
                        `<div class="file-content-preview">
                            <details>
                                <summary>查看内容</summary>
                                <pre style="font-size: 12px; max-height: 200px; overflow-y: auto;">${file.extracted_content.substring(0, 500)}${file.extracted_content.length > 500 ? '...' : ''}</pre>
                            </details>
                        </div>` :
                        ''
                    }
                </div>
            </div>
        `;
    }

    getFileType(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const types = {
            'pdf': 'pdf',
            'doc': 'document', 'docx': 'document',
            'xls': 'spreadsheet', 'xlsx': 'spreadsheet',
            'ppt': 'presentation', 'pptx': 'presentation',
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'svg': 'image',
            'mp4': 'video', 'avi': 'video', 'mov': 'video',
            'mp3': 'audio', 'wav': 'audio',
            'zip': 'archive', 'rar': 'archive', '7z': 'archive',
            'txt': 'text', 'md': 'text',
            'js': 'code', 'html': 'code', 'css': 'code', 'py': 'code'
        };
        return types[ext] || 'file';
    }

    getFileIcon(fileType) {
        const icons = {
            'pdf': '📄',
            'document': '📝',
            'spreadsheet': '📊',
            'presentation': '📋',
            'image': '🖼️',
            'video': '🎥',
            'audio': '🎵',
            'archive': '📦',
            'text': '📄',
            'code': '💻',
            'file': '📁'
        };
        return icons[fileType] || '📁';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    renderContentBlock(content, message) {
        // 添加时间戳信息（如果存在）
        let timestampHtml = '';
        if (this.viewOptions.showTimestamps && content.start_timestamp) {
            const startTime = new Date(content.start_timestamp).toLocaleTimeString('zh-CN');
            const endTime = content.stop_timestamp ?
                new Date(content.stop_timestamp).toLocaleTimeString('zh-CN') : startTime;
            timestampHtml = `<div class="content-timestamp">⏱️ ${startTime}${endTime !== startTime ? ' - ' + endTime : ''}</div>`;
        }

        let contentHtml = '';

        switch (content.type) {
            case 'text':
                contentHtml = this.renderTextContent(content.text);
                break;
            case 'tool_use':
                contentHtml = this.viewOptions.showTools ? this.renderToolUse(content) : '';
                break;
            case 'tool_result':
                contentHtml = this.viewOptions.showTools ? this.renderToolResult(content) : '';
                break;
            case 'knowledge':
                contentHtml = this.renderKnowledge(content);
                break;
            default:
                contentHtml = `<div class="content-unknown">
                    <strong>未知内容类型:</strong> ${content.type}
                    <details style="margin-top: 8px;">
                        <summary>查看原始数据</summary>
                        <pre style="font-size: 12px; background: #f5f5f5; padding: 8px; border-radius: 4px; margin-top: 4px;">${JSON.stringify(content, null, 2)}</pre>
                    </details>
                </div>`;
        }

        return timestampHtml + contentHtml;
    }

    renderTextContent(text) {
        if (!text) return '';

        let html;

        // 检查marked库是否可用
        if (typeof marked !== 'undefined') {
            try {
                html = marked.parse(text);
            } catch (error) {
                console.warn('Marked解析失败，使用纯文本:', error);
                html = this.escapeHtml(text).replace(/\n/g, '<br>');
            }
        } else {
            console.warn('Marked库未加载，使用纯文本渲染');
            html = this.escapeHtml(text).replace(/\n/g, '<br>');
        }

        // 检查DOMPurify是否可用
        let sanitized;
        if (typeof DOMPurify !== 'undefined') {
            try {
                sanitized = DOMPurify.sanitize(html);
            } catch (error) {
                console.warn('DOMPurify清理失败，使用原始HTML:', error);
                sanitized = html;
            }
        } else {
            console.warn('DOMPurify库未加载，跳过HTML清理');
            sanitized = html;
        }

        return `<div class="content-block"><div class="content-text">${sanitized}</div></div>`;
    }

    renderToolUse(toolUse) {
        const toolName = toolUse.name || '未知工具';
        const toolMessage = toolUse.message || '';

        // 特殊处理artifacts工具
        if (toolName === 'artifacts') {
            return this.renderArtifactToolUse(toolUse);
        }

        // 特殊处理web_search工具
        if (toolName === 'web_search') {
            return this.renderWebSearchToolUse(toolUse);
        }

        // 通用工具调用渲染
        const inputJson = JSON.stringify(toolUse.input || {}, null, 2);

        return `
            <div class="content-block">
                <div class="tool-use">
                    <div class="tool-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                        </svg>
                        <span>工具调用</span>
                        <span class="tool-name">${toolName}</span>
                        ${toolMessage ? `<span class="tool-message">${toolMessage}</span>` : ''}
                    </div>
                    <div class="tool-input">${inputJson}</div>
                </div>
            </div>
        `;
    }

    renderArtifactToolUse(toolUse) {
        const input = toolUse.input || {};
        const artifactId = input.id || 'unknown';
        const artifactType = input.type || 'unknown';
        const artifactTitle = input.title || '未命名Artifact';
        const artifactContent = input.content || '';
        const language = input.language || '';

        return `
            <div class="content-block">
                <div class="artifact">
                    <div class="artifact-header">
                        <div class="artifact-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <span>${artifactTitle}</span>
                            <span class="artifact-type">${language || artifactType}</span>
                        </div>
                        <div class="artifact-actions">
                            <button class="artifact-btn" onclick="viewer.viewArtifact('${artifactId}', ${JSON.stringify(input).replace(/"/g, '&quot;')})">
                                查看
                            </button>
                            <button class="artifact-btn" onclick="viewer.downloadArtifact(${JSON.stringify(input).replace(/"/g, '&quot;')})">
                                下载
                            </button>
                        </div>
                    </div>
                    <div class="artifact-preview" id="${artifactId}">
                        <pre><code>${artifactContent.substring(0, 500)}${artifactContent.length > 500 ? '...' : ''}</code></pre>
                    </div>
                </div>
            </div>
        `;
    }

    renderWebSearchToolUse(toolUse) {
        const input = toolUse.input || {};
        const query = input.query || '未知查询';

        return `
            <div class="content-block">
                <div class="tool-use web-search">
                    <div class="tool-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                        </svg>
                        <span>网络搜索</span>
                        <span class="search-query">"${query}"</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderToolResult(toolResult) {
        const toolName = toolResult.name || '未知工具';

        // 特殊处理web_search结果
        if (toolName === 'web_search') {
            return this.renderWebSearchResult(toolResult);
        }

        // 处理通用工具结果
        let resultContent = '';

        if (toolResult.content) {
            if (Array.isArray(toolResult.content)) {
                resultContent = toolResult.content.map(item => {
                    if (item.type === 'text') {
                        return `<div class="result-text">${this.escapeHtml(item.text)}</div>`;
                    } else if (item.type === 'knowledge') {
                        return this.renderKnowledge(item);
                    } else if (item.type === 'artifact') {
                        return this.renderArtifact(item);
                    } else {
                        return `<div class="result-json"><pre>${JSON.stringify(item, null, 2)}</pre></div>`;
                    }
                }).join('');
            } else if (typeof toolResult.content === 'string') {
                resultContent = `<div class="result-text">${this.escapeHtml(toolResult.content)}</div>`;
            } else {
                resultContent = `<div class="result-json"><pre>${JSON.stringify(toolResult.content, null, 2)}</pre></div>`;
            }
        }

        // 处理错误状态
        const isError = toolResult.is_error || false;
        const headerClass = isError ? 'tool-result-header error' : 'tool-result-header';
        const containerClass = isError ? 'tool-result error' : 'tool-result';

        return `
            <div class="content-block">
                <div class="${containerClass}">
                    <div class="${headerClass}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="${isError ? 'M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z' : 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'}"/>
                        </svg>
                        <span>${isError ? '工具错误' : '工具结果'}</span>
                        <span class="tool-name">${toolName}</span>
                    </div>
                    <div class="tool-result-content">${resultContent}</div>
                </div>
            </div>
        `;
    }

    renderWebSearchResult(toolResult) {
        if (!toolResult.content || !Array.isArray(toolResult.content)) {
            return this.renderToolResult(toolResult); // 回退到通用处理
        }

        const searchResults = toolResult.content.filter(item => item.type === 'knowledge');
        const systemMessages = toolResult.content.filter(item => item.type === 'text');

        let resultHtml = '';

        if (searchResults.length > 0) {
            resultHtml += '<div class="search-results">';
            searchResults.forEach(result => {
                resultHtml += this.renderKnowledge(result);
            });
            resultHtml += '</div>';
        }

        if (systemMessages.length > 0) {
            resultHtml += '<div class="system-messages">';
            systemMessages.forEach(msg => {
                resultHtml += `<div class="system-message">${this.escapeHtml(msg.text)}</div>`;
            });
            resultHtml += '</div>';
        }

        return `
            <div class="content-block">
                <div class="tool-result web-search-result">
                    <div class="tool-result-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span>搜索结果</span>
                        <span class="result-count">${searchResults.length} 个结果</span>
                    </div>
                    <div class="tool-result-content">${resultHtml}</div>
                </div>
            </div>
        `;
    }

    renderKnowledge(knowledge) {
        const title = knowledge.title || '无标题';
        const url = knowledge.url || '#';
        const text = knowledge.text || '无内容';
        const metadata = knowledge.metadata || {};
        const siteName = metadata.site_name || '未知网站';
        const faviconUrl = metadata.favicon_url || '';
        const isCitable = knowledge.is_citable !== false;

        return `
            <div class="knowledge-item">
                <div class="knowledge-header">
                    <div class="knowledge-title">
                        ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="site-favicon">` : '🌐'}
                        <a href="${url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(title)}</a>
                        ${isCitable ? '<span class="citable-badge">可引用</span>' : ''}
                    </div>
                    <div class="knowledge-source">${this.escapeHtml(siteName)}</div>
                </div>
                <div class="knowledge-content">
                    <p>${this.escapeHtml(text)}</p>
                </div>
                <div class="knowledge-url">
                    <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
                </div>
            </div>
        `;
    }

    renderArtifact(artifact) {
        const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return `
            <div class="artifact">
                <div class="artifact-header">
                    <div class="artifact-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        <span>${artifact.title || 'Artifact'}</span>
                        <span class="artifact-type">${artifact.type || 'unknown'}</span>
                    </div>
                    <div class="artifact-actions">
                        <button class="artifact-btn" onclick="viewer.viewArtifact('${artifactId}', ${JSON.stringify(artifact).replace(/"/g, '&quot;')})">
                            查看
                        </button>
                        <button class="artifact-btn" onclick="viewer.downloadArtifact(${JSON.stringify(artifact).replace(/"/g, '&quot;')})">
                            下载
                        </button>
                    </div>
                </div>
                <div class="artifact-preview" id="${artifactId}">
                    <pre><code>${artifact.content ? artifact.content.substring(0, 500) + (artifact.content.length > 500 ? '...' : '') : '无内容'}</code></pre>
                </div>
            </div>
        `;
    }

    viewArtifact(artifactId, artifact) {
        const modal = document.getElementById('artifact-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        
        title.textContent = artifact.title || 'Artifact';
        
        if (artifact.type === 'text/html') {
            body.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <button class="btn btn-secondary" onclick="viewer.toggleArtifactView('code')">代码视图</button>
                    <button class="btn btn-secondary" onclick="viewer.toggleArtifactView('preview')">预览视图</button>
                </div>
                <div id="artifact-code" style="display: block;">
                    <pre><code>${artifact.content || ''}</code></pre>
                </div>
                <div id="artifact-preview" style="display: none;">
                    <iframe srcdoc="${(artifact.content || '').replace(/"/g, '&quot;')}" style="width: 100%; height: 400px; border: 1px solid #e2e8f0; border-radius: 6px;"></iframe>
                </div>
            `;
        } else {
            body.innerHTML = `<pre><code>${artifact.content || ''}</code></pre>`;
        }
        
        modal.style.display = 'flex';
    }

    toggleArtifactView(view) {
        const codeView = document.getElementById('artifact-code');
        const previewView = document.getElementById('artifact-preview');
        
        if (view === 'code') {
            codeView.style.display = 'block';
            previewView.style.display = 'none';
        } else {
            codeView.style.display = 'none';
            previewView.style.display = 'block';
        }
    }

    downloadArtifact(artifact) {
        const blob = new Blob([artifact.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${artifact.title || 'artifact'}.${this.getFileExtension(artifact.type)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getFileExtension(type) {
        const extensions = {
            'text/html': 'html',
            'text/css': 'css',
            'text/javascript': 'js',
            'application/json': 'json',
            'text/markdown': 'md'
        };
        return extensions[type] || 'txt';
    }

    showImagePreview(imageUrl, fileName) {
        const modal = document.getElementById('artifact-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = fileName || '图片预览';
        body.innerHTML = `
            <div style="text-align: center;">
                <img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="margin-top: 16px;">
                    <a href="${imageUrl}" target="_blank" class="btn btn-secondary">在新窗口打开</a>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('artifact-modal').style.display = 'none';
    }

    showConversationContent() {
        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('conversation-content').style.display = 'flex';
    }

    performSearch() {
        this.searchTerm = document.getElementById('search-input').value.toLowerCase();
        this.renderConversation();
    }

    async showStorageSidebar() {
        const sidebar = document.getElementById('storage-sidebar');
        const content = document.getElementById('sidebar-content');

        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_CONVERSATIONS' });
            const conversations = response.conversations || [];

            if (conversations.length === 0) {
                content.innerHTML = '<div class="no-conversations">暂无保存的对话</div>';
            } else {
                content.innerHTML = conversations.map(conv => `
                    <div class="conversation-item" data-id="${conv.id}">
                        <div class="conversation-title">${conv.name || '未命名对话'}</div>
                        <div class="conversation-meta">
                            <div class="conversation-date">${new Date(conv.savedAt).toLocaleDateString('zh-CN')}</div>
                            <div class="conversation-domain">${conv.domain}</div>
                        </div>
                        <div class="conversation-actions">
                            <button class="btn btn-small" data-action="load-stored" data-conversation-id="${conv.id}">加载</button>
                            <button class="btn btn-small btn-danger" data-action="delete-stored" data-conversation-id="${conv.id}">删除</button>
                        </div>
                    </div>
                `).join('');
            }

            sidebar.classList.add('show');
        } catch (error) {
            console.error('获取存储对话失败:', error);
            content.innerHTML = '<div class="error">获取对话失败</div>';
        }
    }

    async loadStoredConversation(conversationId) {
        try {
            const result = await chrome.storage.local.get(conversationId);
            const data = result[conversationId];
            if (data) {
                this.loadConversationData(data);
                this.hideStorageSidebar();
            }
        } catch (error) {
            this.showError('加载对话失败: ' + error.message);
        }
    }

    async deleteStoredConversation(conversationId) {
        if (confirm('确定要删除这个对话吗？')) {
            try {
                await chrome.runtime.sendMessage({
                    type: 'DELETE_CONVERSATION',
                    conversationId: conversationId.replace('conversation_', '')
                });
                this.showStorageSidebar(); // 刷新列表
            } catch (error) {
                this.showError('删除对话失败: ' + error.message);
            }
        }
    }

    hideStorageSidebar() {
        document.getElementById('storage-sidebar').classList.remove('show');
    }

    openStorageManager() {
        const managerUrl = chrome.runtime.getURL('manager.html');
        window.open(managerUrl, '_blank', 'width=1200,height=800');
    }

    exportToHtml() {
        if (!this.currentData) return;
        
        const html = this.generateHtmlExport();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_conversation_${this.currentData.uuid.substring(0, 8)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateHtmlExport() {
        const conversationHtml = document.getElementById('conversation-tree').innerHTML;
        const infoHtml = document.getElementById('conversation-info').innerHTML;
        const messageCount = this.currentData.chat_messages ? this.currentData.chat_messages.length : 0;
        const createdAt = new Date(this.currentData.created_at).toLocaleDateString('zh-CN');
        const exportTime = new Date().toLocaleString('zh-CN');

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.currentData.name || '未命名对话'} - Claude对话导出</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }

        .export-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .export-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .export-header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .export-header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin-bottom: 20px;
        }

        .export-meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        .meta-item {
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
        }

        .export-content {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }

        .conversation-info {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }

        .message-node {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 20px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .message-node:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
        }

        .sender-human {
            color: #667eea;
            font-weight: 600;
        }

        .sender-assistant {
            color: #764ba2;
            font-weight: 600;
        }

        .sender-avatar {
            display: inline-block;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            line-height: 32px;
            font-weight: bold;
            margin-right: 10px;
        }

        .message-timestamp {
            font-size: 0.85em;
            color: #64748b;
        }

        .content-text {
            line-height: 1.8;
            color: #374151;
        }

        .content-text h1, .content-text h2, .content-text h3 {
            margin: 16px 0 8px 0;
            color: #1e293b;
        }

        .content-text code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }

        .content-text pre {
            background: #1e293b;
            color: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
        }

        .tool-use, .tool-result {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
        }

        .tool-header {
            font-weight: 600;
            color: #0369a1;
            margin-bottom: 8px;
        }

        .export-footer {
            text-align: center;
            padding: 30px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .footer-logo {
            font-size: 2em;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .export-container {
                padding: 10px;
            }

            .export-header {
                padding: 20px;
            }

            .export-header h1 {
                font-size: 1.8em;
            }

            .export-meta {
                gap: 15px;
            }

            .export-content {
                padding: 20px;
            }
        }

        @media print {
            body {
                background: white;
            }

            .export-header {
                background: #667eea !important;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="export-container">
        <header class="export-header">
            <h1>🐟 Claude对话导出</h1>
            <div class="subtitle">${this.currentData.name || '未命名对话'}</div>
            <div class="export-meta">
                <div class="meta-item">📅 创建时间: ${createdAt}</div>
                <div class="meta-item">💬 消息数量: ${messageCount}</div>
                <div class="meta-item">⏰ 导出时间: ${exportTime}</div>
            </div>
        </header>

        <div class="export-content">
            <div class="conversation-info">${infoHtml}</div>
            <div class="conversation-tree">${conversationHtml}</div>
        </div>

        <footer class="export-footer">
            <div class="footer-logo">🐟✨</div>
            <p><strong>Made with ❤️ by Claude对话管理中心</strong></p>
            <p style="color: #64748b; margin-top: 10px;">让每一次对话都值得珍藏</p>
            <p style="color: #64748b; margin-top: 15px; font-size: 0.9em;">
                <a href="https://github.com/LCYLYM/claudechathistoryexport" target="_blank" style="color: #667eea; text-decoration: none;">
                    🔗 GitHub项目地址
                </a>
            </p>
        </footer>
    </div>
</body>
</html>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showToast('错误: ' + message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `viewer-toast viewer-toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-size: 14px;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// 初始化查看器
const viewer = new ConversationViewer();

// 全局函数供HTML调用
window.viewer = viewer;
