# 个人工作台

一个集成记事本、待办事项和AI搜索功能的个人Web应用。

## 功能特性

### 📝 记事本
- ✅ 创建和编辑笔记
- ✅ 富文本支持（标题、内容）
- ✅ 图片插入功能
- ✅ 关键词搜索
- ✅ 自动保存（每30秒）
- ✅ 本地存储持久化

### ✅ 待办事项
- ✅ 项目分类管理（大标题）
- ✅ 任务列表（小标题）
- ✅ 任务状态切换
- ✅ 实时编辑项目和任务名称
- ✅ 删除项目和任务
- ✅ 本地存储持久化

### 🤖 AI搜索
- ✅ 支持DeepSeek和Kimi模型
- ✅ 实时对话界面
- ✅ 聊天历史记录
- ✅ 安全的API密钥管理
- ✅ 错误处理和加载状态

## 快速开始

### 1. 安装依赖

```bash
npm run setup
```

或者分步安装：

```bash
npm install
```

### 2. 配置API密钥

首次运行会自动创建 `config.json` 文件，请编辑该文件并填入你的API密钥：

```json
{
  "deepseek": {
    "apiKey": "your-deepseek-api-key-here",
    "baseUrl": "https://api.deepseek.com"
  },
  "kimi": {
    "apiKey": "your-kimi-api-key-here",
    "baseUrl": "https://api.moonshot.cn"
  }
}
```

#### 获取API密钥

**DeepSeek API:**
1. 访问 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 注册账号并登录
3. 在API密钥页面创建新的密钥
4. 将密钥复制到 `config.json` 中

**Kimi API:**
1. 访问 [Moonshot AI开放平台](https://platform.moonshot.cn/)
2. 注册账号并登录
3. 在API密钥页面创建新的密钥
4. 将密钥复制到 `config.json` 中

### 3. 启动应用

```bash
npm start
```

开发模式（自动重启）：

```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 使用说明

### 记事本功能

1. **创建笔记**：点击"新建笔记"按钮
2. **编辑笔记**：在右侧编辑器中输入标题和内容
3. **保存笔记**：点击"保存"按钮或等待自动保存
4. **插入图片**：选择图片文件，会在内容中插入图片标记
5. **搜索笔记**：在搜索框中输入关键词
6. **删除笔记**：选择笔记后点击"删除"按钮

### 待办事项功能

1. **创建项目**：点击"新建项目"按钮，输入项目名称
2. **添加任务**：在项目中点击"添加任务"按钮
3. **编辑名称**：直接点击项目或任务名称进行编辑
4. **完成任务**：勾选任务前的复选框
5. **删除项目/任务**：点击对应的删除按钮

### AI搜索功能

1. **选择模型**：在下拉菜单中选择DeepSeek或Kimi
2. **输入问题**：在输入框中输入你的问题
3. **发送查询**：点击"发送"按钮或按回车键
4. **查看回复**：AI的回复会显示在聊天界面中
5. **历史记录**：所有对话都会自动保存

## 技术架构

### 前端
- **HTML5 + CSS3**：现代化的响应式界面
- **原生JavaScript**：轻量级，无框架依赖
- **LocalStorage**：本地数据持久化

### 后端
- **Node.js + Express**：轻量级Web服务器
- **CORS支持**：跨域请求处理
- **安全的API代理**：保护API密钥不暴露在前端

### 数据存储
- **浏览器LocalStorage**：笔记、待办事项、AI历史
- **JSON配置文件**：API密钥和设置

## 文件结构

```
个人工作台/
├── index.html          # 主页面
├── app.js             # 前端JavaScript逻辑
├── server.js          # 后端服务器
├── package.json       # 项目配置和依赖
├── config.json        # API配置（自动生成）
└── README.md          # 说明文档
```

## 安全说明

- ✅ API密钥存储在服务器端，不会暴露给前端
- ✅ 所有数据存储在本地，保护隐私
- ✅ 支持HTTPS部署
- ⚠️ 建议在私人网络环境中使用

## 部署选项

### 本地部署（推荐）
直接在本地运行，数据完全私有。

### 云服务器部署
可以部署到云服务器，但需要注意：
- 配置HTTPS
- 设置访问控制
- 定期备份数据

### Docker部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

构建和运行：

```bash
docker build -t personal-web-app .
docker run -p 3000:3000 -v $(pwd)/config.json:/app/config.json personal-web-app
```

## 常见问题

### Q: AI功能不工作？
A: 请检查：
1. `config.json` 中的API密钥是否正确
2. 网络连接是否正常
3. API账户是否有足够的额度

### Q: 数据会丢失吗？
A: 数据存储在浏览器的LocalStorage中，除非清除浏览器数据，否则不会丢失。建议定期导出重要数据。

### Q: 如何备份数据？
A: 可以在浏览器开发者工具中查看LocalStorage，手动复制数据。未来版本会添加导入导出功能。

### Q: 支持多用户吗？
A: 当前版本是单用户设计，每个浏览器实例独立存储数据。

## 更新日志

### v1.0.0 (2024-01-XX)
- ✅ 基础记事本功能
- ✅ 待办事项管理
- ✅ AI搜索集成
- ✅ 响应式设计
- ✅ 本地数据存储

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License - 详见LICENSE文件

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建GitHub Issue
- 发送邮件到：your-email@example.com

---

**享受你的个人工作台！** 🚀