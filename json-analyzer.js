// JSON结构分析工具
function analyzeJsonStructure(jsonData, path = '', depth = 0, maxDepth = 3) {
    const analysis = {
        fields: new Set(),
        types: new Map(),
        examples: new Map(),
        structure: {}
    };

    if (depth > maxDepth) return analysis;

    function analyzeValue(value, currentPath) {
        const type = Array.isArray(value) ? 'array' : typeof value;
        analysis.fields.add(currentPath);
        analysis.types.set(currentPath, type);

        // 保存示例值
        if (type === 'string' || type === 'number' || type === 'boolean') {
            analysis.examples.set(currentPath, value);
        } else if (type === 'array' && value.length > 0) {
            analysis.examples.set(currentPath, `Array[${value.length}]`);
            // 分析数组第一个元素
            if (typeof value[0] === 'object' && value[0] !== null) {
                const subAnalysis = analyzeJsonStructure(value[0], `${currentPath}[0]`, depth + 1, maxDepth);
                Object.assign(analysis.structure, subAnalysis.structure);
                subAnalysis.fields.forEach(f => analysis.fields.add(f));
                subAnalysis.types.forEach((v, k) => analysis.types.set(k, v));
                subAnalysis.examples.forEach((v, k) => analysis.examples.set(k, v));
            }
        } else if (type === 'object' && value !== null) {
            analysis.examples.set(currentPath, 'Object');
            for (const [key, val] of Object.entries(value)) {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                analyzeValue(val, newPath);
            }
        }
    }

    if (typeof jsonData === 'object' && jsonData !== null) {
        for (const [key, value] of Object.entries(jsonData)) {
            const currentPath = path ? `${path}.${key}` : key;
            analyzeValue(value, currentPath);
        }
    }

    return analysis;
}

// 格式化分析结果
function formatAnalysis(analysis) {
    const result = [];
    result.push('=== JSON结构分析 ===\n');
    
    const sortedFields = Array.from(analysis.fields).sort();
    
    for (const field of sortedFields) {
        const type = analysis.types.get(field);
        const example = analysis.examples.get(field);
        
        result.push(`字段: ${field}`);
        result.push(`类型: ${type}`);
        if (example !== undefined) {
            const exampleStr = typeof example === 'string' && example.length > 100 
                ? example.substring(0, 100) + '...' 
                : String(example);
            result.push(`示例: ${exampleStr}`);
        }
        result.push('---');
    }
    
    return result.join('\n');
}

// 分析多个JSON文件
async function analyzeMultipleJsonFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
        try {
            console.log(`分析文件: ${filePath}`);
            // 这里需要实际读取文件内容
            // 在浏览器环境中，我们需要用fetch或其他方式
            results.push({
                file: filePath,
                status: 'pending',
                analysis: null
            });
        } catch (error) {
            results.push({
                file: filePath,
                status: 'error',
                error: error.message
            });
        }
    }
    
    return results;
}

// 导出分析工具
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeJsonStructure,
        formatAnalysis,
        analyzeMultipleJsonFiles
    };
} else {
    window.JsonAnalyzer = {
        analyzeJsonStructure,
        formatAnalysis,
        analyzeMultipleJsonFiles
    };
}

console.log('JSON分析工具已加载');
