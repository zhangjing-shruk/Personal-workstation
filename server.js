const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 配置文件路径
const configPath = path.join(__dirname, 'config.json');

// 创建默认配置文件（如果不存在）
if (!fs.existsSync(configPath)) {
    const defaultConfig = {
        "deepseek": {
            "apiKey": "your-deepseek-api-key-here",
            "baseUrl": "https://api.deepseek.com"
        },
        "kimi": {
            "apiKey": "your-kimi-api-key-here",
            "baseUrl": "https://api.moonshot.cn"
        }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('已创建配置文件 config.json，请填入你的API密钥');
}

// 读取配置
let config = {};
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('读取配置文件失败:', error.message);
}

// AI查询接口
app.post('/api/ai-query', async (req, res) => {
    try {
        const { model, query } = req.body;
        
        if (!query || !model) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        let response;
        
        if (model === 'deepseek') {
            response = await callDeepSeekAPI(query);
        } else if (model === 'kimi') {
            response = await callKimiAPI(query);
        } else {
            return res.status(400).json({ error: '不支持的模型' });
        }
        
        res.json({ response });
        
    } catch (error) {
        console.error('AI查询错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// DeepSeek API调用
async function callDeepSeekAPI(query) {
    const apiKey = config.deepseek?.apiKey;
    
    if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
        throw new Error('请在config.json中配置DeepSeek API密钥');
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`DeepSeek API错误: ${response.status} - ${errorData}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        throw new Error(`DeepSeek API调用失败: ${error.message}`);
    }
}

// Kimi API调用
async function callKimiAPI(query) {
    const apiKey = config.kimi?.apiKey;
    
    if (!apiKey || apiKey === 'your-kimi-api-key-here') {
        throw new Error('请在config.json中配置Kimi API密钥');
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k',
                messages: [
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Kimi API错误: ${response.status} - ${errorData}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        throw new Error(`Kimi API调用失败: ${error.message}`);
    }
}

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 配置检查接口
app.get('/api/config-status', (req, res) => {
    const status = {
        deepseek: config.deepseek?.apiKey && config.deepseek.apiKey !== 'your-deepseek-api-key-here',
        kimi: config.kimi?.apiKey && config.kimi.apiKey !== 'your-kimi-api-key-here'
    };
    
    res.json(status);
});

// 项目管理API接口
const tasksPath = path.join(__dirname, 'tasks.json');

// 初始化任务数据文件
if (!fs.existsSync(tasksPath)) {
    fs.writeFileSync(tasksPath, JSON.stringify([]));
}

// 读取任务数据
function readTasks() {
    try {
        const data = fs.readFileSync(tasksPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取任务数据失败:', error.message);
        return [];
    }
}

// 保存任务数据
function saveTasks(tasks) {
    try {
        fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
        return true;
    } catch (error) {
        console.error('保存任务数据失败:', error.message);
        return false;
    }
}

// 获取所有任务
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = readTasks();
        res.json(tasks);
    } catch (error) {
        console.error('获取任务列表失败:', error);
        res.status(500).json({ error: '获取任务列表失败' });
    }
});

// 创建新任务
app.post('/api/tasks', (req, res) => {
    try {
        const { name, description, assignee, dueDate, status = 'todo' } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: '任务名称不能为空' });
        }
        
        const tasks = readTasks();
        const newTask = {
            id: Date.now().toString(),
            name,
            description: description || '',
            assignee: assignee || '',
            dueDate: dueDate || '',
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        
        if (saveTasks(tasks)) {
            res.status(201).json(newTask);
        } else {
            res.status(500).json({ error: '保存任务失败' });
        }
    } catch (error) {
        console.error('创建任务失败:', error);
        res.status(500).json({ error: '创建任务失败' });
    }
});

// 更新任务
app.put('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, assignee, dueDate, status } = req.body;
        
        const tasks = readTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: '任务不存在' });
        }
        
        // 更新任务信息
        if (name !== undefined) tasks[taskIndex].name = name;
        if (description !== undefined) tasks[taskIndex].description = description;
        if (assignee !== undefined) tasks[taskIndex].assignee = assignee;
        if (dueDate !== undefined) tasks[taskIndex].dueDate = dueDate;
        if (status !== undefined) tasks[taskIndex].status = status;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        
        if (saveTasks(tasks)) {
            res.json(tasks[taskIndex]);
        } else {
            res.status(500).json({ error: '更新任务失败' });
        }
    } catch (error) {
        console.error('更新任务失败:', error);
        res.status(500).json({ error: '更新任务失败' });
    }
});

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const tasks = readTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: '任务不存在' });
        }
        
        tasks.splice(taskIndex, 1);
        
        if (saveTasks(tasks)) {
            res.status(204).send();
        } else {
            res.status(500).json({ error: '删除任务失败' });
        }
    } catch (error) {
        console.error('删除任务失败:', error);
        res.status(500).json({ error: '删除任务失败' });
    }
});

// 提供主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 个人工作台服务器已启动`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`⚙️  配置文件: ${configPath}`);
    
    // 检查配置状态
    const hasDeepSeek = config.deepseek?.apiKey && config.deepseek.apiKey !== 'your-deepseek-api-key-here';
    const hasKimi = config.kimi?.apiKey && config.kimi.apiKey !== 'your-kimi-api-key-here';
    
    console.log(`\n📋 API配置状态:`);
    console.log(`   DeepSeek: ${hasDeepSeek ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   Kimi: ${hasKimi ? '✅ 已配置' : '❌ 未配置'}`);
    
    if (!hasDeepSeek || !hasKimi) {
        console.log(`\n⚠️  请编辑 config.json 文件，填入你的API密钥以启用AI功能`);
    }
    
    console.log(`\n💡 使用说明:`);
    console.log(`   1. 在浏览器中打开 http://localhost:${PORT}`);
    console.log(`   2. 编辑 config.json 文件配置API密钥`);
    console.log(`   3. 重启服务器以应用新配置`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 服务器正在关闭...');
    process.exit(0);
});

module.exports = app;