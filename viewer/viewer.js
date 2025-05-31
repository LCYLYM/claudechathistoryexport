// Claude Conversation Viewer
class ConversationViewer {
    constructor() {
        this.conversationData = null;
        this.messageTree = new Map();
        this.currentBranch = [];
        this.displayOptions = {
            showTimestamps: true,
            showAttachments: true,
            showTools: true,
            showMetadata: true,
            renderMarkdown: true
        };
        this.theme = 'light';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadTheme();
        this.setupMarkdown();
        console.log('🎨 对话查看器初始化完成');
    }

    setupEventListeners() {
        // 文件加载
        document.getElementById('load-file-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadFile(file);
        });

        // 控制按钮
        document.getElementById('tree-view-btn').addEventListener('click', () => {
            this.toggleBranchView();
        });

        document.getElementById('export-html-btn').addEventListener('click', () => {
            this.exportToHTML();
        });

        // 侧边栏切换
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // 显示选项
        Object.keys(this.displayOptions).forEach(option => {
            const checkbox = document.getElementById(option.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (checkbox) {
                checkbox.checked = this.displayOptions[option];
                checkbox.addEventListener('change', (e) => {
                    this.displayOptions[option] = e.target.checked;
                    this.renderConversation();
                });
            }
        });

        // 主题切换
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTheme(e.target.dataset.theme);
            });
        });

        // 模态框
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') this.closeModal();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadFile(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    setupMarkdown() {
        // 配置marked
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });
        }

        // 配置Mermaid
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: this.theme === 'dark' ? 'dark' : 'default'
            });
        }
    }

    async loadFile(file) {
        if (!file.name.endsWith('.json')) {
            this.showError('请选择JSON文件');
            return;
        }

        this.showLoading();

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            this.loadJsonData(data);
        } catch (error) {
            console.error('加载文件失败:', error);
            this.showError('加载失败: ' + error.message);
            this.hideLoading();
        }
    }

    loadJsonData(data) {
        try {
            // 验证数据格式
            if (!this.validateConversationData(data)) {
                throw new Error('无效的对话数据格式');
            }

            this.conversationData = data;
            this.buildMessageTree();
            this.renderConversation();
            this.updateStats();
            this.hideLoading();

            // 启用导出按钮
            document.getElementById('export-html-btn').disabled = false;

            console.log('✅ 对话数据加载成功', data);
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('加载失败: ' + error.message);
            this.hideLoading();
        }
    }

    validateConversationData(data) {
        return data && 
               typeof data === 'object' && 
               data.uuid && 
               Array.isArray(data.chat_messages);
    }

    buildMessageTree() {
        this.messageTree.clear();
        
        // 构建消息树结构
        this.conversationData.chat_messages.forEach(message => {
            const parentId = message.parent_message_uuid;
            
            if (!this.messageTree.has(parentId)) {
                this.messageTree.set(parentId, []);
            }
            this.messageTree.get(parentId).push(message);
        });

        // 找到主分支路径
        this.currentBranch = this.findMainBranch();
    }

    findMainBranch() {
        const branch = [];
        let currentId = '00000000-0000-4000-8000-000000000000'; // 根节点
        
        while (this.messageTree.has(currentId)) {
            const children = this.messageTree.get(currentId);
            if (children.length === 0) break;
            
            // 选择第一个子节点（主分支）
            const nextMessage = children[0];
            branch.push(nextMessage);
            currentId = nextMessage.uuid;
        }
        
        return branch;
    }

    renderConversation() {
        const container = document.getElementById('conversation-container');
        const uploadArea = document.getElementById('upload-area');
        
        if (!this.conversationData) return;

        // 隐藏上传区域，显示对话内容
        uploadArea.style.display = 'none';
        container.style.display = 'block';
        container.classList.add('fade-in');

        // 渲染对话头部
        this.renderConversationHeader();
        
        // 渲染分支导航（如果有多分支）
        this.renderBranchNavigation();
        
        // 渲染消息列表
        this.renderMessages();
    }

    renderConversationHeader() {
        const header = document.getElementById('conversation-header');
        const data = this.conversationData;
        
        const createdAt = new Date(data.created_at).toLocaleString('zh-CN');
        const updatedAt = new Date(data.updated_at).toLocaleString('zh-CN');
        
        header.innerHTML = `
            <div class="conversation-title">${data.name || '未命名对话'}</div>
            <div class="conversation-meta">
                <div class="meta-item">
                    <div class="meta-label">对话ID</div>
                    <div class="meta-value">${data.uuid}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">创建时间</div>
                    <div class="meta-value">${createdAt}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">更新时间</div>
                    <div class="meta-value">${updatedAt}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">消息数量</div>
                    <div class="meta-value">${data.chat_messages.length}</div>
                </div>
                ${data.summary ? `
                <div class="meta-item">
                    <div class="meta-label">摘要</div>
                    <div class="meta-value">${data.summary}</div>
                </div>
                ` : ''}
            </div>
        `;
    }

    renderBranchNavigation() {
        const navigation = document.getElementById('branch-navigation');
        const treeContainer = document.getElementById('branch-tree');
        
        // 检查是否有多分支
        const hasBranches = Array.from(this.messageTree.values()).some(children => children.length > 1);
        
        if (!hasBranches) {
            navigation.style.display = 'none';
            return;
        }

        navigation.style.display = 'block';
        
        // 生成分支树可视化
        const treeHTML = this.generateBranchTree();
        treeContainer.innerHTML = treeHTML;
    }

    generateBranchTree() {
        // 简化的分支树生成
        let html = '';
        const visited = new Set();
        
        const renderNode = (messageId, depth = 0) => {
            if (visited.has(messageId)) return '';
            visited.add(messageId);
            
            const indent = '  '.repeat(depth);
            const children = this.messageTree.get(messageId) || [];
            
            if (children.length === 0) return '';
            
            children.forEach((child, index) => {
                const isLast = index === children.length - 1;
                const prefix = isLast ? '└─ ' : '├─ ';
                const sender = child.sender === 'human' ? '👤' : '🤖';
                const preview = this.getMessagePreview(child);
                
                html += `<div class="branch-node" data-message-id="${child.uuid}">
                    ${indent}${prefix}${sender} ${preview}
                </div>`;
                
                html += renderNode(child.uuid, depth + 1);
            });
        };
        
        renderNode('00000000-0000-4000-8000-000000000000');
        return html;
    }

    getMessagePreview(message) {
        // 兼容新旧格式
        let content;
        if (message.content && Array.isArray(message.content)) {
            content = message.content[0];
        } else if (message.text) {
            // 旧格式兼容
            return message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text;
        }

        if (!content) return '空消息';

        if (content.type === 'text') {
            const text = content.text || '';
            return text.length > 50 ? text.substring(0, 50) + '...' : text;
        } else if (content.type === 'tool_use') {
            return `🔧 ${content.name || content.input?.name || '工具使用'}`;
        } else if (content.type === 'tool_result') {
            return `📋 工具结果`;
        }

        return content.type || '未知类型';
    }

    renderMessages() {
        const container = document.getElementById('messages-container');
        const messages = this.currentBranch;
        
        container.innerHTML = '';
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        messageDiv.dataset.messageId = message.uuid;
        
        // 消息头部
        const header = this.createMessageHeader(message);
        messageDiv.appendChild(header);
        
        // 消息内容
        const content = this.createMessageContent(message);
        messageDiv.appendChild(content);
        
        // 附件
        if (this.displayOptions.showAttachments && (message.attachments?.length || message.files?.length)) {
            const attachments = this.createAttachmentsElement(message);
            messageDiv.appendChild(attachments);
        }
        
        return messageDiv;
    }

    createMessageHeader(message) {
        const header = document.createElement('div');
        header.className = 'message-header';
        
        const senderIcon = message.sender === 'human' ? '👤' : '🤖';
        const senderName = message.sender === 'human' ? '用户' : 'Claude';
        
        let timestampHTML = '';
        if (this.displayOptions.showTimestamps && message.created_at) {
            const timestamp = new Date(message.created_at).toLocaleString('zh-CN');
            timestampHTML = `<div class="message-timestamp">${timestamp}</div>`;
        }
        
        header.innerHTML = `
            <div class="message-sender">
                <div class="sender-icon ${message.sender}">${senderIcon}</div>
                <span>${senderName}</span>
            </div>
            ${timestampHTML}
        `;
        
        return header;
    }

    createMessageContent(message) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // 兼容新旧格式
        if (message.content && Array.isArray(message.content)) {
            // 新格式：content数组
            if (message.content.length === 0) {
                contentDiv.innerHTML = '<div class="content-text">空消息</div>';
                return contentDiv;
            }

            message.content.forEach(block => {
                const blockElement = this.createContentBlock(block);
                contentDiv.appendChild(blockElement);
            });
        } else if (message.text) {
            // 旧格式：直接text字段
            const textBlock = this.createTextBlock(message.text);
            contentDiv.appendChild(textBlock);
        } else {
            // 空消息
            contentDiv.innerHTML = '<div class="content-text">空消息</div>';
        }

        return contentDiv;
    }

    createContentBlock(block) {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'content-block';
        
        switch (block.type) {
            case 'text':
                blockDiv.appendChild(this.createTextContent(block));
                break;
            case 'tool_use':
                if (this.displayOptions.showTools) {
                    blockDiv.appendChild(this.createToolUseContent(block));
                }
                break;
            case 'tool_result':
                if (this.displayOptions.showTools) {
                    blockDiv.appendChild(this.createToolResultContent(block));
                }
                break;
            default:
                blockDiv.innerHTML = `<div class="content-text">未知内容类型: ${block.type}</div>`;
        }
        
        return blockDiv;
    }

    createTextContent(block) {
        const textDiv = document.createElement('div');
        textDiv.className = 'content-text';
        
        let text = block.text || '';
        
        if (this.displayOptions.renderMarkdown && typeof marked !== 'undefined') {
            try {
                text = marked.parse(text);
                textDiv.innerHTML = text;
            } catch (error) {
                console.warn('Markdown解析失败:', error);
                textDiv.textContent = block.text;
            }
        } else {
            textDiv.textContent = text;
        }
        
        // 处理Mermaid图表
        if (this.displayOptions.renderMarkdown && typeof mermaid !== 'undefined') {
            const mermaidBlocks = textDiv.querySelectorAll('code.language-mermaid');
            mermaidBlocks.forEach((block, index) => {
                const id = `mermaid-${Date.now()}-${index}`;
                const div = document.createElement('div');
                div.id = id;
                div.className = 'mermaid';
                div.textContent = block.textContent;
                block.parentNode.replaceChild(div, block.parentNode);
                
                mermaid.render(id, block.textContent).then(result => {
                    div.innerHTML = result.svg;
                });
            });
        }
        
        return textDiv;
    }

    createTextBlock(text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'content-text';

        if (this.displayOptions.renderMarkdown && typeof marked !== 'undefined') {
            try {
                textDiv.innerHTML = marked.parse(text);
            } catch (error) {
                console.warn('Markdown解析失败:', error);
                textDiv.textContent = text;
            }
        } else {
            textDiv.textContent = text;
        }

        return textDiv;
    }

    createToolUseContent(block) {
        const toolDiv = document.createElement('div');
        toolDiv.className = 'tool-use';
        
        const toolName = block.name || '未知工具';
        const toolInput = block.input ? JSON.stringify(block.input, null, 2) : '';
        
        toolDiv.innerHTML = `
            <div class="tool-header">
                <svg class="tool-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                </svg>
                <span>工具使用: ${toolName}</span>
            </div>
            ${toolInput ? `<div class="tool-input">${toolInput}</div>` : ''}
        `;
        
        return toolDiv;
    }

    createToolResultContent(block) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'tool-result';
        
        let resultText = '';
        if (block.content && Array.isArray(block.content)) {
            resultText = block.content.map(item => item.text || '').join('\n');
        } else if (typeof block.content === 'string') {
            resultText = block.content;
        }
        
        const isError = block.is_error ? ' (错误)' : '';
        
        resultDiv.innerHTML = `
            <div class="tool-header">
                <svg class="tool-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,14.5V19H13V14.5H11M11,5V12.5H13V5H11Z"/>
                </svg>
                <span>工具结果${isError}</span>
            </div>
            <div class="tool-input">${resultText}</div>
        `;
        
        return resultDiv;
    }

    createAttachmentsElement(message) {
        const attachmentsDiv = document.createElement('div');
        attachmentsDiv.className = 'attachments';
        
        const attachments = [...(message.attachments || []), ...(message.files || [])];
        
        if (attachments.length === 0) return attachmentsDiv;
        
        attachmentsDiv.innerHTML = `
            <div class="attachments-title">📎 附件 (${attachments.length})</div>
            <div class="attachment-list">
                ${attachments.map(att => `
                    <div class="attachment-item" onclick="viewer.showAttachment('${att.id || att.file_uuid}')">
                        <svg class="attachment-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        <span>${att.file_name || att.name || '未知文件'}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        return attachmentsDiv;
    }

    updateStats() {
        const statsGrid = document.getElementById('stats-grid');
        if (!this.conversationData) return;

        const data = this.conversationData;
        const messages = data.chat_messages;

        const humanMessages = messages.filter(m => m.sender === 'human').length;
        const assistantMessages = messages.filter(m => m.sender === 'assistant').length;
        const toolUses = messages.reduce((count, m) => {
            return count + (m.content?.filter(c => c.type === 'tool_use').length || 0);
        }, 0);
        const attachments = messages.reduce((count, m) => {
            return count + ((m.attachments?.length || 0) + (m.files?.length || 0));
        }, 0);

        const branches = Array.from(this.messageTree.values()).filter(children => children.length > 1).length;

        statsGrid.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">总消息数</span>
                <span class="stat-value">${messages.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">用户消息</span>
                <span class="stat-value">${humanMessages}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">AI回复</span>
                <span class="stat-value">${assistantMessages}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">工具使用</span>
                <span class="stat-value">${toolUses}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">附件数量</span>
                <span class="stat-value">${attachments}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">分支数量</span>
                <span class="stat-value">${branches}</span>
            </div>
        `;
    }

    toggleBranchView() {
        const navigation = document.getElementById('branch-navigation');
        const isVisible = navigation.style.display !== 'none';
        navigation.style.display = isVisible ? 'none' : 'block';

        const btn = document.getElementById('tree-view-btn');
        btn.textContent = isVisible ? '显示分支' : '隐藏分支';
    }

    toggleSidebar() {
        const sidebar = document.getElementById('viewer-sidebar');
        sidebar.classList.toggle('hidden');
    }

    setTheme(theme) {
        this.theme = theme;

        // 移除所有主题按钮的active类
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 添加active类到当前主题按钮
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');

        // 应用主题
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        // 保存主题设置
        localStorage.setItem('claude-viewer-theme', theme);

        // 更新Mermaid主题
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                theme: theme === 'dark' ? 'dark' : 'default'
            });
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('claude-viewer-theme') || 'light';
        this.setTheme(savedTheme);
    }

    showAttachment(attachmentId) {
        // 显示附件详情的模态框
        const attachment = this.findAttachment(attachmentId);
        if (!attachment) return;

        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = `附件: ${attachment.file_name || attachment.name || '未知文件'}`;

        body.innerHTML = `
            <div class="attachment-details">
                <div class="detail-item">
                    <strong>文件名:</strong> ${attachment.file_name || attachment.name || '未知'}
                </div>
                <div class="detail-item">
                    <strong>文件大小:</strong> ${this.formatFileSize(attachment.file_size || 0)}
                </div>
                <div class="detail-item">
                    <strong>文件类型:</strong> ${attachment.file_type || '未知'}
                </div>
                <div class="detail-item">
                    <strong>创建时间:</strong> ${new Date(attachment.created_at).toLocaleString('zh-CN')}
                </div>
                ${attachment.extracted_content ? `
                <div class="detail-item">
                    <strong>提取内容:</strong>
                    <pre style="margin-top: 0.5rem; padding: 1rem; background: var(--background-color); border-radius: var(--radius-md); white-space: pre-wrap;">${attachment.extracted_content}</pre>
                </div>
                ` : ''}
                ${attachment.preview_url ? `
                <div class="detail-item">
                    <strong>预览:</strong>
                    <img src="${attachment.preview_url}" alt="预览" style="max-width: 100%; margin-top: 0.5rem; border-radius: var(--radius-md);">
                </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'flex';
    }

    findAttachment(attachmentId) {
        for (const message of this.conversationData.chat_messages) {
            const attachments = [...(message.attachments || []), ...(message.files || [])];
            const found = attachments.find(att => (att.id || att.file_uuid) === attachmentId);
            if (found) return found;
        }
        return null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    exportToHTML() {
        if (!this.conversationData) return;

        const html = this.generateHTMLExport();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `claude_conversation_${this.conversationData.uuid.substring(0, 8)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateHTMLExport() {
        const data = this.conversationData;
        const messages = this.currentBranch;

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name || '未命名对话'} - Claude对话导出</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 2rem; }
        .title { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .meta { color: #64748b; font-size: 0.875rem; }
        .message { margin-bottom: 2rem; padding: 1rem; border-radius: 8px; }
        .message.human { background: #f1f5f9; border-left: 4px solid #3b82f6; }
        .message.assistant { background: #f0fdf4; border-left: 4px solid #22c55e; }
        .sender { font-weight: bold; margin-bottom: 0.5rem; }
        .content { white-space: pre-wrap; }
        .tool-use { background: #667eea; color: white; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
        .timestamp { color: #64748b; font-size: 0.75rem; margin-top: 0.5rem; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${data.name || '未命名对话'}</div>
        <div class="meta">
            导出时间: ${new Date().toLocaleString('zh-CN')} |
            对话ID: ${data.uuid} |
            消息数量: ${messages.length}
        </div>
    </div>
    <div class="messages">
        ${messages.map(message => `
            <div class="message ${message.sender}">
                <div class="sender">${message.sender === 'human' ? '👤 用户' : '🤖 Claude'}</div>
                <div class="content">${this.getMessageText(message)}</div>
                ${this.displayOptions.showTimestamps && message.created_at ? `
                <div class="timestamp">${new Date(message.created_at).toLocaleString('zh-CN')}</div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    }

    getMessageText(message) {
        // 兼容新旧格式
        if (message.content && Array.isArray(message.content)) {
            // 新格式：content数组
            if (message.content.length === 0) return '空消息';

            return message.content.map(block => {
                switch (block.type) {
                    case 'text':
                        return block.text || '';
                    case 'tool_use':
                        return `<div class="tool-use">🔧 工具使用: ${block.name}</div>`;
                    case 'tool_result':
                        return `<div class="tool-use">📋 工具结果</div>`;
                    default:
                        return `[${block.type}]`;
                }
            }).join('\n');
        } else if (message.text) {
            // 旧格式：直接text字段
            return message.text;
        } else {
            return '空消息';
        }
    }

    showLoading() {
        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('loading-state').style.display = 'flex';
        document.getElementById('conversation-container').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
    }

    showError(message) {
        const uploadArea = document.getElementById('upload-area');
        uploadArea.innerHTML = `
            <div class="upload-content">
                <div class="upload-icon">⚠️</div>
                <h3>加载失败</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                    重新尝试
                </button>
            </div>
        `;
        uploadArea.style.display = 'flex';
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('conversation-container').style.display = 'none';
    }
}

// 初始化查看器
const viewer = new ConversationViewer();

// 暴露到全局作用域
window.viewer = viewer;
