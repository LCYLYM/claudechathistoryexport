// 测试数据生成器
function generateTestData() {
    return {
        "uuid": "test-" + Math.random().toString(36).substr(2, 9),
        "name": "测试对话 - " + new Date().toLocaleString(),
        "summary": "这是一个测试对话",
        "created_at": new Date().toISOString(),
        "updated_at": new Date().toISOString(),
        "settings": {
            "preview_feature_uses_artifacts": true
        },
        "is_starred": Math.random() > 0.5,
        "current_leaf_message_uuid": "test-leaf-" + Math.random().toString(36).substr(2, 9),
        "chat_messages": [
            {
                "uuid": "msg-1-" + Math.random().toString(36).substr(2, 9),
                "text": "",
                "content": [
                    {
                        "start_timestamp": new Date().toISOString(),
                        "stop_timestamp": new Date().toISOString(),
                        "type": "text",
                        "text": "你好！这是一个测试消息。请帮我演示一下你的功能。",
                        "citations": []
                    }
                ],
                "sender": "human",
                "index": 0,
                "created_at": new Date().toISOString(),
                "updated_at": new Date().toISOString(),
                "truncated": false,
                "attachments": [],
                "files": [],
                "files_v2": [],
                "sync_sources": [],
                "parent_message_uuid": "00000000-0000-4000-8000-000000000000"
            },
            {
                "uuid": "msg-2-" + Math.random().toString(36).substr(2, 9),
                "text": "",
                "content": [
                    {
                        "start_timestamp": new Date().toISOString(),
                        "stop_timestamp": new Date().toISOString(),
                        "type": "text",
                        "text": "你好！我很高兴为您演示我的功能。\n\n## 我可以帮助您：\n\n1. **回答问题** - 各种主题的问答\n2. **编写代码** - 多种编程语言\n3. **文本处理** - 翻译、总结、改写\n4. **创意写作** - 故事、诗歌、文案\n\n让我为您创建一个简单的代码示例：",
                        "citations": []
                    },
                    {
                        "start_timestamp": new Date().toISOString(),
                        "stop_timestamp": new Date().toISOString(),
                        "type": "tool_use",
                        "name": "artifacts",
                        "input": {
                            "id": "test_code",
                            "type": "application/vnd.ant.code",
                            "title": "测试代码示例",
                            "command": "create",
                            "content": "def greet(name):\n    \"\"\"友好的问候函数\"\"\"\n    return f\"你好, {name}! 欢迎使用Claude对话管理器！\"\n\n# 测试函数\nprint(greet(\"用户\"))\nprint(\"这是一个测试代码示例 🐟\")",
                            "language": "python",
                            "version_uuid": "test-version-" + Math.random().toString(36).substr(2, 9)
                        },
                        "message": "artifacts"
                    },
                    {
                        "type": "tool_result",
                        "name": "artifacts",
                        "content": [
                            {
                                "type": "text",
                                "text": "代码已创建成功！",
                                "uuid": "result-" + Math.random().toString(36).substr(2, 9)
                            }
                        ],
                        "is_error": false
                    },
                    {
                        "start_timestamp": new Date().toISOString(),
                        "stop_timestamp": new Date().toISOString(),
                        "type": "text",
                        "text": "\n这个示例展示了：\n- Python函数定义\n- 文档字符串\n- f-string格式化\n- 函数调用\n\n还有什么我可以帮助您的吗？ 🐟",
                        "citations": []
                    }
                ],
                "sender": "assistant",
                "index": 1,
                "created_at": new Date().toISOString(),
                "updated_at": new Date().toISOString(),
                "truncated": false,
                "stop_reason": "stop_sequence",
                "attachments": [],
                "files": [],
                "files_v2": [],
                "sync_sources": [],
                "parent_message_uuid": "msg-1-" + Math.random().toString(36).substr(2, 9)
            },
            {
                "uuid": "msg-3-" + Math.random().toString(36).substr(2, 9),
                "text": "",
                "content": [
                    {
                        "start_timestamp": new Date().toISOString(),
                        "stop_timestamp": new Date().toISOString(),
                        "type": "text",
                        "text": "很棒！现在请展示一下数学计算功能。",
                        "citations": []
                    }
                ],
                "sender": "human",
                "index": 2,
                "created_at": new Date().toISOString(),
                "updated_at": new Date().toISOString(),
                "truncated": false,
                "attachments": [],
                "files": [],
                "files_v2": [],
                "sync_sources": [],
                "parent_message_uuid": "msg-2-" + Math.random().toString(36).substr(2, 9)
            },
            {
                "uuid": "msg-4-" + Math.random().toString(36).substr(2, 9),
                "text": "",
                "content": [
                    {
                        "start_timestamp": new Date().toISOString(),
                        "stop_timestamp": new Date().toISOString(),
                        "type": "text",
                        "text": "当然！让我为您演示一些数学计算：\n\n## 基础计算\n- 2 + 3 = 5\n- 10 × 7 = 70\n- 100 ÷ 4 = 25\n\n## 高级数学\n- √16 = 4\n- 2³ = 8\n- π ≈ 3.14159\n\n## 统计示例\n假设有数据集：[1, 2, 3, 4, 5]\n- 平均值：3\n- 中位数：3\n- 标准差：≈1.58\n\n我还可以解方程、计算积分、处理矩阵等复杂数学问题！\n\n需要我计算什么特定的数学问题吗？ 🔢",
                        "citations": []
                    }
                ],
                "sender": "assistant",
                "index": 3,
                "created_at": new Date().toISOString(),
                "updated_at": new Date().toISOString(),
                "truncated": false,
                "stop_reason": "stop_sequence",
                "attachments": [],
                "files": [],
                "files_v2": [],
                "sync_sources": [],
                "parent_message_uuid": "msg-3-" + Math.random().toString(36).substr(2, 9)
            }
        ]
    };
}

// 生成多个测试对话
function generateMultipleTestData(count = 3) {
    const conversations = [];
    for (let i = 0; i < count; i++) {
        conversations.push(generateTestData());
    }
    return conversations;
}

// 导出测试数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateTestData, generateMultipleTestData };
}
