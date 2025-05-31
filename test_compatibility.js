// 测试新旧JSON格式兼容性的脚本

// 旧格式示例数据
const oldFormatData = {
    "uuid": "old-format-test",
    "name": "旧格式测试对话",
    "created_at": "2025-05-30T10:00:00Z",
    "updated_at": "2025-05-30T10:05:00Z",
    "chat_messages": [
        {
            "uuid": "msg-old-1",
            "sender": "human",
            "text": "这是旧格式的用户消息",
            "created_at": "2025-05-30T10:00:00Z"
        },
        {
            "uuid": "msg-old-2",
            "sender": "assistant", 
            "text": "这是旧格式的AI回复消息",
            "created_at": "2025-05-30T10:01:00Z"
        }
    ]
};

// 新格式示例数据
const newFormatData = {
    "uuid": "new-format-test",
    "name": "新格式测试对话",
    "created_at": "2025-05-31T10:00:00Z",
    "updated_at": "2025-05-31T10:05:00Z",
    "settings": {
        "preview_feature_uses_artifacts": true
    },
    "chat_messages": [
        {
            "uuid": "msg-new-1",
            "sender": "human",
            "content": [
                {
                    "type": "text",
                    "text": "这是新格式的用户消息，支持多种内容类型"
                }
            ],
            "created_at": "2025-05-31T10:00:00Z"
        },
        {
            "uuid": "msg-new-2",
            "sender": "assistant",
            "content": [
                {
                    "type": "text", 
                    "text": "这是新格式的AI回复，可以包含工具使用"
                },
                {
                    "type": "tool_use",
                    "name": "code_execution",
                    "input": {
                        "code": "print('Hello World')"
                    }
                },
                {
                    "type": "tool_result",
                    "content": [
                        {
                            "type": "text",
                            "text": "Hello World"
                        }
                    ]
                }
            ],
            "created_at": "2025-05-31T10:01:00Z"
        }
    ]
};

// 混合格式数据（部分消息是旧格式，部分是新格式）
const mixedFormatData = {
    "uuid": "mixed-format-test",
    "name": "混合格式测试对话",
    "created_at": "2025-05-30T10:00:00Z",
    "updated_at": "2025-05-31T10:05:00Z",
    "chat_messages": [
        {
            "uuid": "msg-mixed-1",
            "sender": "human",
            "text": "这是旧格式的消息",
            "created_at": "2025-05-30T10:00:00Z"
        },
        {
            "uuid": "msg-mixed-2",
            "sender": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "这是新格式的回复"
                }
            ],
            "created_at": "2025-05-31T10:01:00Z"
        }
    ]
};

// 测试函数
function testFormatCompatibility() {
    console.log('🧪 开始测试格式兼容性...');
    
    // 测试数据集
    const testCases = [
        { name: '旧格式', data: oldFormatData },
        { name: '新格式', data: newFormatData },
        { name: '混合格式', data: mixedFormatData }
    ];
    
    testCases.forEach(testCase => {
        console.log(`\n📋 测试 ${testCase.name}:`);
        
        try {
            // 模拟数据解析
            const result = analyzeMessageFormat(testCase.data);
            console.log(`✅ ${testCase.name} 解析成功:`, result);
        } catch (error) {
            console.error(`❌ ${testCase.name} 解析失败:`, error.message);
        }
    });
}

// 分析消息格式
function analyzeMessageFormat(data) {
    const analysis = {
        uuid: data.uuid,
        name: data.name,
        messageCount: data.chat_messages?.length || 0,
        formats: [],
        hasTools: false,
        hasAttachments: false
    };
    
    if (data.chat_messages) {
        data.chat_messages.forEach((message, index) => {
            let format = 'unknown';
            
            if (message.content && Array.isArray(message.content)) {
                format = 'new';
                // 检查工具使用
                const hasToolUse = message.content.some(block => 
                    block.type === 'tool_use' || block.type === 'tool_result'
                );
                if (hasToolUse) analysis.hasTools = true;
            } else if (message.text) {
                format = 'old';
            }
            
            analysis.formats.push({
                index: index,
                uuid: message.uuid,
                sender: message.sender,
                format: format
            });
            
            // 检查附件
            if (message.attachments?.length || message.files?.length) {
                analysis.hasAttachments = true;
            }
        });
    }
    
    return analysis;
}

// 生成测试JSON文件
function generateTestFiles() {
    const testFiles = [
        { name: 'test_old_format.json', data: oldFormatData },
        { name: 'test_new_format.json', data: newFormatData },
        { name: 'test_mixed_format.json', data: mixedFormatData }
    ];
    
    testFiles.forEach(file => {
        const blob = new Blob([JSON.stringify(file.data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    console.log('📁 测试文件已生成并下载');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testFormatCompatibility = testFormatCompatibility;
    window.generateTestFiles = generateTestFiles;
    window.oldFormatData = oldFormatData;
    window.newFormatData = newFormatData;
    window.mixedFormatData = mixedFormatData;
    
    console.log('🔧 兼容性测试工具已加载');
    console.log('运行 testFormatCompatibility() 来测试格式兼容性');
    console.log('运行 generateTestFiles() 来生成测试文件');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testFormatCompatibility,
        analyzeMessageFormat,
        oldFormatData,
        newFormatData,
        mixedFormatData
    };
}
