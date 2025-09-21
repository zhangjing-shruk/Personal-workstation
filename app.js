// 全局变量
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let aiHistory = JSON.parse(localStorage.getItem('aiHistory')) || [];
let aiConversations = JSON.parse(localStorage.getItem('aiConversations')) || [];
let currentConversationId = null;
let conversationIdCounter = parseInt(localStorage.getItem('conversationIdCounter')) || 1;
let currentNoteId = null;
let noteIdCounter = parseInt(localStorage.getItem('noteIdCounter')) || 1;
let todoIdCounter = parseInt(localStorage.getItem('todoIdCounter')) || 1;
let autoSaveTimer = null;

// 初始化四个项目的待办数据结构
let todoProjects = JSON.parse(localStorage.getItem('todoProjects')) || [
    { id: 0, title: '', tasks: [] },
    { id: 1, title: '', tasks: [] },
    { id: 2, title: '', tasks: [] },
    { id: 3, title: '', tasks: [] }
];

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
    loadTodos();
    loadAiHistory();
    loadAiConversations();
    
    // 如果没有选中的笔记且有笔记存在，自动选择第一个笔记
    if (!currentNoteId && notes.length > 0) {
        selectNote(notes[0].id);
    }
    
    // 如果没有选中的对话且有对话存在，自动选择第一个对话
    if (!currentConversationId && aiConversations.length > 0) {
        selectConversation(aiConversations[0].id);
    }
    
    // 侧边栏切换功能
    document.querySelectorAll('.sidebar-tab').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName, this);
        });
    });
    
    // 为记事本内容添加事件监听器
    const noteContent = document.getElementById('noteContent');
    const noteTitle = document.getElementById('noteTitle');
    
    if (noteContent) {
        noteContent.addEventListener('input', function() {
            updateWordCount();
            scheduleAutoSave();
        });
    }
    
    if (noteTitle) {
        noteTitle.addEventListener('input', function() {
            scheduleAutoSave();
        });
    }
 });
 
 // 插入图片
 function insertImage() {
    const input = document.getElementById('imageInput');
    const file = input.files[0];
    
    if (file) {
        // 检查文件大小（限制为5MB）
        if (file.size > 5 * 1024 * 1024) {
            showNotification('图片文件过大，请选择小于5MB的图片');
            input.value = '';
            return;
        }
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            showNotification('请选择有效的图片文件');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imageData = e.target.result;
                
                // 检查base64数据是否有效
                if (!imageData || !imageData.startsWith('data:image/')) {
                    throw new Error('无效的图片数据');
                }
                
                // 如果图片数据过大，进行压缩
                if (imageData.length > 1024 * 1024) { // 1MB
                    compressImage(imageData, file.name, function(compressedData) {
                        if (compressedData) {
                            insertImageElement(compressedData, file.name);
                        } else {
                            insertImageElement(imageData, file.name);
                        }
                    });
                } else {
                    insertImageElement(imageData, file.name);
                }
                
            } catch (error) {
                console.error('插入图片时出错:', error);
                showNotification('插入图片失败，请重试');
            }
        };
        reader.readAsDataURL(file);
        
        // 清空文件输入框
        input.value = '';
    }
}

// 图片压缩函数
function compressImage(imageData, fileName, callback) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // 计算压缩后的尺寸
            let { width, height } = img;
            const maxWidth = 1200;
            const maxHeight = 1200;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为base64，质量为0.8
            const compressedData = canvas.toDataURL('image/jpeg', 0.8);
            callback(compressedData);
        };
        
        img.onerror = function() {
            console.error('图片压缩失败');
            callback(null);
        };
        
        img.src = imageData;
    } catch (error) {
        console.error('图片压缩过程出错:', error);
        callback(null);
    }
}

// 插入图片元素的函数
function insertImageElement(imageData, fileName) {
    try {
        const noteContent = document.getElementById('noteContent');
        
        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.style.position = 'relative';
        imageContainer.style.display = 'inline-block';
        imageContainer.style.margin = '10px 0';
        imageContainer.style.maxWidth = '100%';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = fileName;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.transition = 'transform 0.2s ease';
        
        // 设置初始缩放比例
        let currentScale = 1;
        img.dataset.scale = currentScale;
        
        // 创建缩放控制容器
        const controlsContainer = document.createElement('div');
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.top = '5px';
        controlsContainer.style.right = '5px';
        controlsContainer.style.background = 'rgba(0, 0, 0, 0.7)';
        controlsContainer.style.borderRadius = '4px';
        controlsContainer.style.padding = '2px';
        controlsContainer.style.display = 'none';
        controlsContainer.style.zIndex = '10';
        
        // 创建放大按钮
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.style.background = 'transparent';
        zoomInBtn.style.border = 'none';
        zoomInBtn.style.color = 'white';
        zoomInBtn.style.cursor = 'pointer';
        zoomInBtn.style.padding = '2px 6px';
        zoomInBtn.style.fontSize = '14px';
        zoomInBtn.title = '放大图片';
        
        // 创建缩小按钮
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '-';
        zoomOutBtn.style.background = 'transparent';
        zoomOutBtn.style.border = 'none';
        zoomOutBtn.style.color = 'white';
        zoomOutBtn.style.cursor = 'pointer';
        zoomOutBtn.style.padding = '2px 6px';
        zoomOutBtn.style.fontSize = '14px';
        zoomOutBtn.title = '缩小图片';
        
        // 创建重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '⟲';
        resetBtn.style.background = 'transparent';
        resetBtn.style.border = 'none';
        resetBtn.style.color = 'white';
        resetBtn.style.cursor = 'pointer';
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '12px';
        resetBtn.title = '重置大小';
        
        // 添加缩放功能
        function updateImageScale(scale) {
            currentScale = Math.max(0.2, Math.min(3, scale));
            img.style.transform = `scale(${currentScale})`;
            img.dataset.scale = currentScale;
            
            // 触发自动保存
            const inputEvent = new Event('input', { bubbles: true });
            noteContent.dispatchEvent(inputEvent);
        }
        
        // 绑定按钮事件
        zoomInBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageScale(currentScale + 0.2);
        };
        
        zoomOutBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageScale(currentScale - 0.2);
        };
        
        resetBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageScale(1);
        };
        
        // 鼠标悬停显示控制按钮
         imageContainer.onmouseenter = () => {
             controlsContainer.style.display = 'block';
         };
         
         imageContainer.onmouseleave = () => {
             controlsContainer.style.display = 'none';
         };
         
         // 添加拖拽功能
         addDragFunctionality(imageContainer);
        
        // 添加图片加载错误处理
        img.onerror = function() {
            console.error('图片加载失败:', imageData.substring(0, 100) + '...');
            const errorText = document.createElement('div');
            errorText.textContent = `[图片加载失败: ${fileName}]`;
            errorText.style.color = '#999';
            errorText.style.fontStyle = 'italic';
            errorText.style.padding = '10px';
            errorText.style.border = '1px dashed #ccc';
            imageContainer.parentNode.replaceChild(errorText, imageContainer);
        };
        
        // 组装控制容器
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(resetBtn);
        controlsContainer.appendChild(zoomInBtn);
        
        // 组装图片容器
        imageContainer.appendChild(img);
        imageContainer.appendChild(controlsContainer);
        
        // 获取当前选择或光标位置
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // 确保插入位置在noteContent内
            if (noteContent.contains(range.commonAncestorContainer) || range.commonAncestorContainer === noteContent) {
                // 在当前位置插入图片容器
                range.deleteContents();
                range.insertNode(imageContainer);
                
                // 在图片后添加换行
                const br = document.createElement('br');
                range.setStartAfter(imageContainer);
                range.insertNode(br);
                
                // 设置光标到图片后
                range.setStartAfter(br);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // 如果没有有效选择，在内容末尾插入
                noteContent.appendChild(imageContainer);
                noteContent.appendChild(document.createElement('br'));
            }
        } else {
            // 如果没有选择，在内容末尾插入
            noteContent.appendChild(imageContainer);
            noteContent.appendChild(document.createElement('br'));
        }
        
        // 手动触发input事件以激活自动保存
        const inputEvent = new Event('input', { bubbles: true });
        noteContent.dispatchEvent(inputEvent);
        
        showNotification('图片已插入，鼠标悬停可调整大小');
    } catch (error) {
        console.error('插入图片时出错:', error);
        showNotification('插入图片失败，请重试');
    }
}

// 恢复图片缩放状态并为现有图片添加缩放控制
function restoreImageScales() {
    const noteContent = document.getElementById('noteContent');
    const images = noteContent.querySelectorAll('img');
    
    images.forEach(img => {
        // 如果图片已经有容器，跳过
        if (img.parentElement && img.parentElement.classList.contains('image-container')) {
            return;
        }
        
        // 为现有图片添加缩放控制
        addImageControls(img);
    });
}

// 通用拖拽功能函数
function addDragFunctionality(element) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialX = 0;
    let initialY = 0;
    
    // 设置元素为可拖拽
    element.style.cursor = 'move';
    element.draggable = false; // 禁用默认拖拽
    
    // 鼠标按下开始拖拽
    element.onmousedown = (e) => {
        // 如果点击的是控制按钮，不启动拖拽
        if (e.target.tagName === 'BUTTON') {
            return;
        }
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        // 获取当前位置
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        // 设置拖拽样式
        element.style.position = 'absolute';
        element.style.zIndex = '1000';
        element.style.left = initialX + 'px';
        element.style.top = initialY + 'px';
        
        e.preventDefault();
    };
    
    // 鼠标移动时拖拽
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        element.style.left = (initialX + deltaX) + 'px';
        element.style.top = (initialY + deltaY) + 'px';
        
        e.preventDefault();
    };
    
    // 鼠标释放结束拖拽
    const handleMouseUp = (e) => {
        if (!isDragging) return;
        
        isDragging = false;
        
        // 恢复正常样式
        element.style.position = 'relative';
        element.style.zIndex = 'auto';
        element.style.left = 'auto';
        element.style.top = 'auto';
        
        // 触发自动保存
        const noteContent = document.getElementById('noteContent');
        const inputEvent = new Event('input', { bubbles: true });
        noteContent.dispatchEvent(inputEvent);
        
        // 移除事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // 添加全局事件监听器
    element.addEventListener('mousedown', () => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

// 为图片添加缩放控制功能
function addImageControls(img) {
    try {
        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        imageContainer.style.position = 'relative';
        imageContainer.style.display = 'inline-block';
        imageContainer.style.margin = '10px 0';
        imageContainer.style.maxWidth = '100%';
        
        // 获取或设置缩放比例
        let currentScale = parseFloat(img.dataset.scale) || 1;
        
        // 设置图片样式
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.transition = 'transform 0.2s ease';
        img.style.transform = `scale(${currentScale})`;
        img.dataset.scale = currentScale;
        
        // 创建缩放控制容器
        const controlsContainer = document.createElement('div');
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.top = '5px';
        controlsContainer.style.right = '5px';
        controlsContainer.style.background = 'rgba(0, 0, 0, 0.7)';
        controlsContainer.style.borderRadius = '4px';
        controlsContainer.style.padding = '2px';
        controlsContainer.style.display = 'none';
        controlsContainer.style.zIndex = '10';
        
        // 创建放大按钮
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.style.background = 'transparent';
        zoomInBtn.style.border = 'none';
        zoomInBtn.style.color = 'white';
        zoomInBtn.style.cursor = 'pointer';
        zoomInBtn.style.padding = '2px 6px';
        zoomInBtn.style.fontSize = '14px';
        zoomInBtn.title = '放大图片';
        
        // 创建缩小按钮
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '-';
        zoomOutBtn.style.background = 'transparent';
        zoomOutBtn.style.border = 'none';
        zoomOutBtn.style.color = 'white';
        zoomOutBtn.style.cursor = 'pointer';
        zoomOutBtn.style.padding = '2px 6px';
        zoomOutBtn.style.fontSize = '14px';
        zoomOutBtn.title = '缩小图片';
        
        // 创建重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '⟲';
        resetBtn.style.background = 'transparent';
        resetBtn.style.border = 'none';
        resetBtn.style.color = 'white';
        resetBtn.style.cursor = 'pointer';
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '12px';
        resetBtn.title = '重置大小';
        
        // 添加缩放功能
        function updateImageScale(scale) {
            currentScale = Math.max(0.2, Math.min(3, scale));
            img.style.transform = `scale(${currentScale})`;
            img.dataset.scale = currentScale;
            
            // 触发自动保存
            const noteContent = document.getElementById('noteContent');
            const inputEvent = new Event('input', { bubbles: true });
            noteContent.dispatchEvent(inputEvent);
        }
        
        // 绑定按钮事件
        zoomInBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageScale(currentScale + 0.2);
        };
        
        zoomOutBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageScale(currentScale - 0.2);
        };
        
        resetBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImageScale(1);
        };
        
        // 鼠标悬停显示控制按钮
        imageContainer.onmouseenter = () => {
            controlsContainer.style.display = 'block';
        };
        
        imageContainer.onmouseleave = () => {
            controlsContainer.style.display = 'none';
        };
        
        // 添加拖拽功能
        addDragFunctionality(imageContainer);
        
        // 组装控制容器
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(resetBtn);
        controlsContainer.appendChild(zoomInBtn);
        
        // 将图片包装在容器中
        img.parentNode.insertBefore(imageContainer, img);
        imageContainer.appendChild(img);
        imageContainer.appendChild(controlsContainer);
        
    } catch (error) {
        console.error('添加图片控制时出错:', error);
    }
}
 
 // 点击外部关闭颜色选择器
 document.addEventListener('click', function(e) {
     const colorPicker = document.getElementById('colorPicker');
     const colorButton = document.querySelector('.btn-icon[onclick="showColorPicker()"]');
     
     if (colorPicker && !colorPicker.contains(e.target) && e.target !== colorButton) {
         colorPicker.style.display = 'none';
     }
 });

// 标签页切换
function switchTab(tabName, clickedButton) {
    console.log('switchTab called with:', tabName);
    
    // 隐藏所有标签页内容
    const allContents = document.querySelectorAll('.tab-content');
    console.log('Found tab-content elements:', allContents.length);
    allContents.forEach(content => {
        content.classList.remove('active');
        console.log('Removed active from:', content.id);
    });
    
    // 移除所有标签页的激活状态
    const allTabs = document.querySelectorAll('.sidebar-tab');
    console.log('Found sidebar-tab elements:', allTabs.length);
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示选中的标签页
    const targetContent = document.getElementById(tabName);
    console.log('Target content element:', targetContent);
    if (targetContent) {
        targetContent.classList.add('active');
        console.log('Added active to:', tabName);
    } else {
        console.error('Target content not found:', tabName);
    }
    
    // 激活点击的按钮
    if (clickedButton) {
        clickedButton.classList.add('active');
        console.log('Activated button');
    } else {
        console.log('No button provided');
    }
    
    // 处理侧边栏背景：如果切换到非番茄钟标签页，恢复侧边栏原始样式
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && tabName !== 'pomodoro') {
        // 恢复侧边栏原始样式
        sidebar.style.background = 'rgba(255, 255, 255, 0.15)';
        sidebar.style.backdropFilter = 'blur(20px)';
        sidebar.style.transition = 'all 0.8s ease-in-out';
    } else if (sidebar && tabName === 'pomodoro') {
        // 如果切换到番茄钟标签页，检查是否有保存的主题并恢复
        const savedTheme = localStorage.getItem('currentPomodoroTheme');
        if (savedTheme) {
            try {
                const theme = JSON.parse(savedTheme);
                if (theme.background) {
                    const gradientMatch = theme.background.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
                    if (gradientMatch) {
                        const color1 = gradientMatch[1].trim();
                        const color2 = gradientMatch[2].trim();
                        const color3 = gradientMatch[3].trim();
                        sidebar.style.background = `linear-gradient(135deg, ${color1}80, ${color2}80, ${color3}80)`;
                        sidebar.style.backdropFilter = 'blur(20px)';
                        sidebar.style.transition = 'all 0.8s ease-in-out';
                    }
                }
            } catch (e) {
                console.error('Error parsing saved theme:', e);
            }
        }
    }
}

// ==================== 记事本功能 ====================

// 加载笔记列表
function loadNotes() {
    const notesList = document.getElementById('notesList');
    const notesCount = document.getElementById('notesCount');
    const emptyState = document.getElementById('emptyState');
    
    // 更新笔记计数
    if (notesCount) {
        notesCount.textContent = `${notes.length} 条笔记`;
    }
    
    // 显示/隐藏空状态
    if (notes.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (notesList) notesList.style.padding = '0';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (notesList) notesList.style.padding = '15px';
    }
    
    // 清空列表
    notesList.innerHTML = '';
    
    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        if (note.id === currentNoteId) {
            noteItem.classList.add('active');
        }
        noteItem.onclick = () => selectNote(note.id);
        
        const title = note.title || '无标题';
        // 创建临时元素来提取纯文本，避免HTML标签和base64数据干扰
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        const preview = textContent.substring(0, 80) + (textContent.length > 80 ? '...' : '');
        const updatedDate = new Date(note.updatedAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        noteItem.innerHTML = `
            <h4>${title}</h4>
            <p>${preview}</p>
            <div class="note-meta">
                <span>${updatedDate}</span>
                <span>${note.content.length} 字</span>
            </div>
            <button class="delete-note-btn" onclick="deleteNoteById(${note.id})" title="删除笔记">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
            </button>
        `;
        
        notesList.appendChild(noteItem);
    });
}

// 选择笔记
function selectNote(noteId) {
    // 如果当前有选中的笔记且不是要选择的笔记，先保存当前笔记
    if (currentNoteId && currentNoteId !== noteId) {
        saveNote(true); // 静默保存当前笔记
    }
    
    currentNoteId = noteId;
    const note = notes.find(n => n.id === noteId);
    
    if (note) {
        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteContent').innerHTML = note.content || '';
        
        // 恢复图片缩放状态
        restoreImageScales();
        
        // 更新字数统计
        updateWordCount();
        
        // 更新最后保存时间
        updateLastSaved(note.updatedAt);
        
        // 重新加载笔记列表以更新选中状态
        loadNotes();
    }
}

// 排序功能
let currentSortBy = 'updated';

// 排序功能
function sortNotes() {
    notes.sort((a, b) => {
        switch (currentSortBy) {
            case 'updated':
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            case 'created':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'title':
                return (a.title || '无标题').localeCompare(b.title || '无标题');
            default:
                return 0;
        }
    });
    
    loadNotes();
}



// 字数统计
function updateWordCount() {
    const content = document.getElementById('noteContent').textContent || '';
    const wordCount = content.length;
    const wordCountElement = document.getElementById('wordCount');
    if (wordCountElement) {
        wordCountElement.textContent = `${wordCount} 字`;
    }
}

// 更新最后保存时间
function updateLastSaved(timestamp) {
    const lastSavedElement = document.getElementById('lastSaved');
    if (lastSavedElement && timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        let timeText = '';
        if (diff < 60000) {
            timeText = '刚刚保存';
        } else if (diff < 3600000) {
            timeText = `${Math.floor(diff / 60000)} 分钟前保存`;
        } else if (diff < 86400000) {
            timeText = `${Math.floor(diff / 3600000)} 小时前保存`;
        } else {
            timeText = date.toLocaleDateString('zh-CN');
        }
        
        lastSavedElement.textContent = timeText;
    }
}



// 文本格式化功能
function formatText(format) {
    const editor = document.getElementById('noteContent');
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
            switch (format) {
                case 'bold':
                    toggleBold(range, selectedText);
                    break;
                default:
                    // 其他格式化功能保持原样
                    let formattedElement = document.createTextNode(selectedText);
                    range.deleteContents();
                    range.insertNode(formattedElement);
            }
            
            editor.focus();
            
            // 触发自动保存
            scheduleAutoSave();
            updateWordCount();
        }
    }
}

// 切换加粗功能
function toggleBold(range, selectedText) {
    const selection = window.getSelection();
    
    // 检查选中文本是否已经被加粗标签包围
    const commonAncestor = range.commonAncestorContainer;
    let isBold = false;
    let boldElement = null;
    
    // 检查选中内容是否在加粗标签内
    let parent = commonAncestor;
    while (parent && parent !== document.getElementById('noteContent')) {
        if (parent.nodeType === Node.ELEMENT_NODE && 
            (parent.tagName === 'B' || parent.tagName === 'STRONG' || 
             (parent.style && parent.style.fontWeight === 'bold'))) {
            isBold = true;
            boldElement = parent;
            break;
        }
        parent = parent.parentNode;
    }
    
    // 如果选中的是完整的加粗元素内容
    if (!isBold && commonAncestor.nodeType === Node.ELEMENT_NODE) {
        const element = commonAncestor;
        if ((element.tagName === 'B' || element.tagName === 'STRONG' || 
             (element.style && element.style.fontWeight === 'bold')) &&
            selectedText === element.textContent) {
            isBold = true;
            boldElement = element;
        }
    }
    
    if (isBold && boldElement) {
        // 如果已经加粗，则移除加粗效果
        const textNode = document.createTextNode(boldElement.textContent);
        boldElement.parentNode.replaceChild(textNode, boldElement);
        
        // 重新设置选择范围
        const newRange = document.createRange();
        newRange.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        // 如果没有加粗，则添加加粗效果
        const boldElement = document.createElement('b');
        boldElement.textContent = selectedText;
        
        range.deleteContents();
        range.insertNode(boldElement);
        
        // 选中新插入的加粗文本
        const newRange = document.createRange();
        newRange.selectNodeContents(boldElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}

// 自动保存功能
function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    autoSaveTimer = setTimeout(() => {
        if (currentNoteId) {
            saveNote(true); // true 表示自动保存
        }
    }, 2000); // 2秒后自动保存
}

// 显示颜色选择器
function showColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    const isVisible = colorPicker.style.display === 'block';
    
    // 隐藏所有其他下拉菜单
    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.style.display = 'none';
    });
    
    // 切换当前颜色选择器的显示状态
    colorPicker.style.display = isVisible ? 'none' : 'block';
}

// 应用文字颜色
function applyTextColor(color) {
    const editor = document.getElementById('noteContent');
    
    // 检查编辑器是否存在
    if (!editor) {
        console.error('找不到文本编辑器');
        return;
    }
    
    // 获取当前选中的文本
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
        console.log('请先选择要改变颜色的文字');
        return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
        // 创建带颜色的span元素
        const span = document.createElement('span');
        span.style.color = color;
        span.textContent = selectedText;
        
        // 替换选中的文本
        range.deleteContents();
        range.insertNode(span);
        
        // 清除选择
        selection.removeAllRanges();
        
        // 隐藏颜色选择器
        document.getElementById('colorPicker').style.display = 'none';
        
        // 触发自动保存
        scheduleAutoSave();
        updateWordCount();
    } else {
        // 如果没有选中文字，隐藏颜色选择器
        document.getElementById('colorPicker').style.display = 'none';
    }
}



// 创建新笔记
function createNote() {
    const newNote = {
        id: noteIdCounter++,
        title: '',
        content: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notes.unshift(newNote);
    currentNoteId = newNote.id;
    
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').innerHTML = '';
    
    saveNotesToStorage();
    loadNotes();
    selectNote(newNote.id);
}

// 保存笔记
function saveNote(isAutoSave = false) {
    if (!currentNoteId) {
        createNote();
        return;
    }
    
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.title = document.getElementById('noteTitle').value;
        note.content = document.getElementById('noteContent').innerHTML;
        note.updatedAt = new Date().toISOString();
        
        saveNotesToStorage();
        loadNotes();
        
        // 更新字数统计和最后保存时间
        updateWordCount();
        updateLastSaved(note.updatedAt);
        
        // 显示保存成功提示（自动保存时不显示）
        if (!isAutoSave) {
            showNotification('笔记已保存');
        }
    }
}

// 删除笔记
function deleteNote() {
    if (!currentNoteId) return;
    
    if (confirm('确定要删除这条笔记吗？')) {
        notes = notes.filter(n => n.id !== currentNoteId);
        currentNoteId = null;
        
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').innerHTML = '';
        
        saveNotesToStorage();
        loadNotes();
        
        showNotification('笔记已删除');
    }
}

// 根据ID删除笔记
function deleteNoteById(noteId) {
    event.stopPropagation(); // 阻止事件冒泡，避免触发选择笔记
    
    notes = notes.filter(note => note.id !== noteId);
    
    // 如果删除的是当前笔记，清空编辑器或选择其他笔记
    if (currentNoteId === noteId) {
        if (notes.length > 0) {
            selectNote(notes[0].id);
        } else {
            currentNoteId = null;
            document.getElementById('noteTitle').value = '';
            document.getElementById('noteContent').innerHTML = '';
        }
    }
    
    saveNotesToStorage();
    loadNotes();
    showNotification('笔记已删除');
}

// 搜索笔记
function searchNotes() {
    const searchTerm = document.getElementById('searchNotes').value.toLowerCase();
    const notesList = document.getElementById('notesList');
    const notesCount = document.getElementById('notesCount');
    const emptyState = document.getElementById('emptyState');
    
    if (searchTerm === '') {
        loadNotes();
        return;
    }
    
    const filteredNotes = notes.filter(note => 
        (note.title && note.title.toLowerCase().includes(searchTerm)) ||
        (note.content && note.content.toLowerCase().includes(searchTerm))
    );
    
    // 更新笔记计数
    if (notesCount) {
        notesCount.textContent = `${filteredNotes.length} 条笔记`;
    }
    
    // 显示/隐藏空状态
    if (filteredNotes.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                </svg>
                <p>没有找到匹配的笔记</p>
                <p>尝试使用其他关键词搜索</p>
            `;
        }
        if (notesList) notesList.style.padding = '0';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (notesList) notesList.style.padding = '15px';
    }
    
    // 清空现有笔记项
    notesList.innerHTML = '';
    
    // 渲染搜索结果
    filteredNotes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        if (note.id === currentNoteId) {
            noteElement.classList.add('active');
        }
        noteElement.onclick = () => selectNote(note.id);
        
        const preview = note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '');
        const updatedDate = new Date(note.updatedAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 高亮搜索关键词
        const highlightText = (text, term) => {
            if (!term) return text;
            const regex = new RegExp(`(${term})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };
        
        const highlightedTitle = highlightText(note.title || '无标题', searchTerm);
        const highlightedPreview = highlightText(preview, searchTerm);
        
        noteElement.innerHTML = `
            <h4>${highlightedTitle}</h4>
            <p>${highlightedPreview}</p>
            <div class="note-meta">
                <span>${updatedDate}</span>
                <span>${note.content.length} 字</span>
            </div>
            <button class="delete-note-btn" onclick="deleteNoteById(${note.id})" title="删除笔记">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
            </button>
        `;
        
        notesList.appendChild(noteElement);
    });
}



// 保存笔记到本地存储
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('noteIdCounter', noteIdCounter.toString());
}

// ==================== 待办事项功能 ====================

// 加载待办事项
function loadTodos() {
    const todoGrid = document.getElementById('todoGrid');
    
    // 清空现有的项目卡片（保留前4个默认卡片）
    const existingCards = todoGrid.querySelectorAll('.todo-project-card');
    for (let i = 4; i < existingCards.length; i++) {
        existingCards[i].remove();
    }
    
    // 如果有超过4个项目，动态创建额外的卡片
    for (let i = 4; i < todoProjects.length; i++) {
        const newProjectCard = document.createElement('div');
        newProjectCard.className = 'todo-project-card';
        newProjectCard.innerHTML = `
            <div class="project-title-container">
                <input type="text" class="project-title-input" placeholder="项目标题..." onchange="updateProjectTitle(${i}, this.value)">
                <button class="delete-project-btn" onclick="deleteProject(${i})" title="删除项目">🗑️</button>
            </div>
            <div class="project-tasks-container">
                <div class="task-list" id="taskList${i}"></div>
                <div class="add-task-container">
                    <input type="text" class="add-task-input" placeholder="添加新任务..." onkeypress="handleAddTask(event, ${i})">
                    <button class="add-task-btn" onclick="addTask(${i})" title="添加任务">➕</button>
                </div>
            </div>
        `;
        todoGrid.appendChild(newProjectCard);
    }
    
    // 更新所有项目的内容
    for (let i = 0; i < todoProjects.length; i++) {
        const project = todoProjects[i];
        const titleInputs = document.querySelectorAll('.project-title-input');
        const tasksList = document.getElementById(`taskList${i}`);
        
        if (titleInputs[i]) {
            titleInputs[i].value = project.title;
        }
        
        if (tasksList) {
            tasksList.innerHTML = '';
            project.tasks.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = `todo-task ${task.completed ? 'completed' : ''}`;
                taskDiv.innerHTML = `
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${i}, ${task.id})"></div>
                    <span class="task-text" contenteditable="true" onblur="updateTaskTitle(${i}, ${task.id}, this.textContent)">${task.title}</span>
                `;
                tasksList.appendChild(taskDiv);
            });
        }
    }
}

// 添加任务
function addTask(projectIndex) {
    const inputs = document.querySelectorAll('.add-task-input');
    const input = inputs[projectIndex];
    const title = input.value.trim();
    
    if (title) {
        const newTask = {
            id: todoIdCounter++,
            title: title,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        todoProjects[projectIndex].tasks.push(newTask);
        input.value = '';
        saveTodoProjectsToStorage();
        loadTodos();
        
        showNotification('任务已添加');
    }
}

// 切换任务状态
function toggleTask(projectIndex, taskId) {
    const project = todoProjects[projectIndex];
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTodoProjectsToStorage();
        loadTodos();
    }
}

// 更新项目标题
function updateProjectTitle(projectIndex, newTitle) {
    if (newTitle.trim()) {
        todoProjects[projectIndex].title = newTitle.trim();
        saveTodoProjectsToStorage();
    }
}

// 更新任务标题
function updateTaskTitle(projectIndex, taskId, newTitle) {
    const project = todoProjects[projectIndex];
    const task = project.tasks.find(t => t.id === taskId);
    if (task && newTitle.trim()) {
        task.title = newTitle.trim();
        saveTodoProjectsToStorage();
    }
}

// 处理任务输入框回车事件
function handleAddTask(event, projectIndex) {
    if (event.key === 'Enter') {
        addTask(projectIndex);
    }
}

// 保存待办事项到本地存储
function saveTodoProjectsToStorage() {
    localStorage.setItem('todoProjects', JSON.stringify(todoProjects));
}

// 创建新项目
function createProject() {
    const newProjectIndex = todoProjects.length;
    const newProject = {
        id: newProjectIndex,
        title: '',
        tasks: []
    };
    
    todoProjects.push(newProject);
    
    // 创建新的项目卡片HTML
    const todoGrid = document.getElementById('todoGrid');
    const newProjectCard = document.createElement('div');
    newProjectCard.className = 'todo-project-card';
    newProjectCard.innerHTML = `
        <div class="project-title-container">
            <input type="text" class="project-title-input" placeholder="项目标题..." onchange="updateProjectTitle(${newProjectIndex}, this.value)">
            <button class="delete-project-btn" onclick="deleteProject(${newProjectIndex})" title="删除项目">🗑️</button>
        </div>
        <div class="project-tasks-container">
            <div class="task-list" id="taskList${newProjectIndex}"></div>
            <div class="add-task-container">
                <input type="text" class="add-task-input" placeholder="添加新任务..." onkeypress="handleAddTask(event, ${newProjectIndex})">
                <button class="add-task-btn" onclick="addTask(${newProjectIndex})" title="添加任务">➕</button>
            </div>
        </div>
    `;
    
    todoGrid.appendChild(newProjectCard);
    saveTodoProjectsToStorage();
    
    // 聚焦到新项目的标题输入框
      const titleInput = newProjectCard.querySelector('.project-title-input');
      titleInput.focus();
  }
  
  // 删除项目
  function deleteProject(projectIndex) {
      if (todoProjects.length <= 1) {
          showCustomAlert('提示', '至少需要保留一个项目！');
          return;
      }
      
      showCustomConfirm('确认删除', '确定要删除这个项目吗？这将删除项目中的所有任务。', () => {
          // 从数据中删除项目
          todoProjects.splice(projectIndex, 1);
          
          // 重新分配ID
          todoProjects.forEach((project, index) => {
              project.id = index;
          });
          
          // 重新加载待办列表
          loadTodos();
          
          // 保存到本地存储
          saveTodoProjectsToStorage();
      });
  }
  
  // 自定义确认弹窗
  function showCustomConfirm(title, message, onConfirm) {
      const modal = document.createElement('div');
      modal.className = 'custom-modal';
      modal.innerHTML = `
          <div class="modal-content">
              <div class="modal-title">${title}</div>
              <div class="modal-message">${message}</div>
              <div class="modal-buttons">
                  <button class="modal-btn modal-btn-cancel">取消</button>
                  <button class="modal-btn modal-btn-confirm">确认</button>
              </div>
          </div>
      `;
      
      document.body.appendChild(modal);
      
      // 显示弹窗
      setTimeout(() => {
          modal.classList.add('show');
      }, 10);
      
      // 绑定事件
      const cancelBtn = modal.querySelector('.modal-btn-cancel');
      const confirmBtn = modal.querySelector('.modal-btn-confirm');
      
      const closeModal = () => {
          modal.classList.remove('show');
          setTimeout(() => {
              document.body.removeChild(modal);
          }, 300);
      };
      
      cancelBtn.onclick = closeModal;
      confirmBtn.onclick = () => {
          closeModal();
          onConfirm();
      };
      
      // 点击背景关闭
      modal.onclick = (e) => {
          if (e.target === modal) {
              closeModal();
          }
      };
  }
  
  // 自定义提示弹窗
  function showCustomAlert(title, message) {
      const modal = document.createElement('div');
      modal.className = 'custom-modal';
      modal.innerHTML = `
          <div class="modal-content">
              <div class="modal-title">${title}</div>
              <div class="modal-message">${message}</div>
              <div class="modal-buttons">
                  <button class="modal-btn modal-btn-cancel">确定</button>
              </div>
          </div>
      `;
      
      document.body.appendChild(modal);
      
      // 显示弹窗
      setTimeout(() => {
          modal.classList.add('show');
      }, 10);
      
      // 绑定事件
      const okBtn = modal.querySelector('.modal-btn-cancel');
      
      const closeModal = () => {
          modal.classList.remove('show');
          setTimeout(() => {
              document.body.removeChild(modal);
          }, 300);
      };
      
      okBtn.onclick = closeModal;
      
      // 点击背景关闭
      modal.onclick = (e) => {
          if (e.target === modal) {
              closeModal();
          }
      };
  }

// ==================== AI搜索功能 ====================

// 处理AI输入框回车事件
function handleAiKeyPress(event) {
    if (event.key === 'Enter') {
        sendAiQuery();
    }
}

// 发送AI查询
async function sendAiQuery() {
    const input = document.getElementById('aiInput');
    const model = document.getElementById('aiModel').value;
    const query = input.value.trim();
    
    if (!query) return;
    
    // 添加用户消息到聊天界面
    addMessageToChat('user', query);
    
    // 清空输入框
    input.value = '';
    
    // 显示加载状态
    const loadingMessage = addMessageToChat('ai', '正在思考中...');
    
    try {
        // 这里需要替换为实际的API调用
        const response = await callAiApi(model, query);
        
        // 移除加载消息
        loadingMessage.remove();
        
        // 添加AI回复
        addMessageToChat('ai', response);
        
        // 保存到历史记录
        aiHistory.push({
            timestamp: new Date().toISOString(),
            model: model,
            query: query,
            response: response
        });
        
        saveAiHistoryToStorage();
        
        // 保存到对话记录
        saveCurrentConversation(query, response);
        
    } catch (error) {
        // 移除加载消息
        loadingMessage.remove();
        
        // 显示错误消息
        addMessageToChat('ai', '抱歉，发生了错误：' + error.message);
    }
}

// 调用AI API
async function callAiApi(model, query) {
    try {
        const response = await fetch('/api/ai-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                query: query
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API调用失败');
        }
        
        const data = await response.json();
        return data.response;
        
    } catch (error) {
        // 如果是网络错误或服务器未启动，提供友好的错误信息
        if (error.message.includes('fetch')) {
            throw new Error('无法连接到服务器，请确保后端服务正在运行');
        }
        throw error;
    }
}

// 添加消息到聊天界面
function addMessageToChat(sender, message) {
    const chatDiv = document.getElementById('aiChat');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const senderName = sender === 'user' ? '你' : 'AI助手';
    messageDiv.innerHTML = `<strong>${senderName}:</strong> ${message}`;
    
    chatDiv.appendChild(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    
    return messageDiv;
}

// 加载AI历史记录
function loadAiHistory() {
    const chatDiv = document.getElementById('aiChat');
    
    // 清空现有内容（除了欢迎消息）
    const welcomeMessage = chatDiv.querySelector('.message.ai');
    chatDiv.innerHTML = '';
    if (welcomeMessage) {
        chatDiv.appendChild(welcomeMessage);
    }
    
    // 加载历史记录
    aiHistory.forEach(item => {
        addMessageToChat('user', item.query);
        addMessageToChat('ai', item.response);
    });
}

// 保存AI历史记录到本地存储
function saveAiHistoryToStorage() {
    localStorage.setItem('aiHistory', JSON.stringify(aiHistory));
}

// ==================== 通用功能 ====================

// 显示通知
function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(196, 181, 253, 0.9);
        color: #4c1d95;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
        z-index: 1000;
        font-weight: 500;
        font-size: 18px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(168, 85, 247, 0.3);
        animation: fadeInScale 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: center;
        min-width: 180px;
        letter-spacing: 0.3px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 2.5秒后开始淡出动画
    setTimeout(() => {
        notification.style.animation = 'fadeOutScale 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 600);
    }, 2500);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInScale {
        0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
    
    @keyframes fadeOutScale {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.02);
            opacity: 0.8;
        }
        100% {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);



// 自动保存功能
setInterval(() => {
    if (currentNoteId) {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            const currentTitle = document.getElementById('noteTitle').value;
            const currentContent = document.getElementById('noteContent').innerHTML;
            
            if (note.title !== currentTitle || note.content !== currentContent) {
                saveNote(true); // 自动保存
            }
        }
    }
}, 30000); // 每30秒自动保存一次

// ==================== 润色标题功能 ====================

// 润色标题函数
async function polishTitle() {
    const noteContent = document.getElementById('noteContent');
    const noteTitle = document.getElementById('noteTitle');
    
    if (!noteContent || !noteTitle) {
        showNotification('无法找到笔记内容或标题输入框');
        return;
    }
    
    const content = noteContent.textContent || noteContent.innerText;
    
    if (!content.trim()) {
        showNotification('请先输入笔记内容');
        return;
    }
    
    // 显示加载状态
    const polishBtn = document.querySelector('.polish-title-btn');
    const originalText = polishBtn.innerHTML;
    polishBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path>
        </svg>
        生成中...
    `;
    polishBtn.disabled = true;
    
    try {
        // 构建AI提示词
        const prompt = `请根据以下笔记内容，生成一个简洁、准确、有吸引力的标题。标题应该：
1. 概括笔记的核心内容
2. 长度控制在10-20个字符
3. 使用简洁明了的语言
4. 避免使用特殊符号

笔记内容：
${content.substring(0, 500)}${content.length > 500 ? '...' : ''}

请直接返回标题，不要包含其他解释文字。`;
        
        // 调用AI API生成标题
         const response = await callAiApi('deepseek', prompt);
        
        if (response && response.trim()) {
            // 清理生成的标题（移除引号、换行等）
            const generatedTitle = response.trim()
                .replace(/^["'「『]|["'」』]$/g, '') // 移除首尾引号
                .replace(/\n|\r/g, '') // 移除换行符
                .substring(0, 50); // 限制长度
            
            // 设置标题
            noteTitle.value = generatedTitle;
            
            // 触发input事件以保存更改
            const inputEvent = new Event('input', { bubbles: true });
            noteTitle.dispatchEvent(inputEvent);
            
            showNotification('标题生成成功！');
        } else {
            showNotification('标题生成失败，请重试');
        }
    } catch (error) {
        console.error('润色标题失败:', error);
        showNotification('标题生成失败，请检查网络连接');
    } finally {
        // 恢复按钮状态
        polishBtn.innerHTML = originalText;
        polishBtn.disabled = false;
    }
}

// ==================== AI对话记录管理 ====================

// 加载对话记录列表
function loadAiConversations() {
    const conversationsList = document.querySelector('.ai-conversations-list');
    const conversationsCount = document.querySelector('.conversations-count');
    
    if (!conversationsList) return;
    
    conversationsList.innerHTML = '';
    
    if (aiConversations.length === 0) {
        conversationsList.innerHTML = '<div style="text-align: center; color: #8b5cf6; opacity: 0.7; padding: 20px;">暂无对话记录</div>';
        if (conversationsCount) {
            conversationsCount.textContent = '0 个对话';
        }
        return;
    }
    
    // 按时间倒序排列
    const sortedConversations = [...aiConversations].sort((a, b) => new Date(b.updated) - new Date(a.updated));
    
    sortedConversations.forEach(conversation => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        if (conversation.id === currentConversationId) {
            conversationItem.classList.add('active');
        }
        
        const title = conversation.title || '新对话';
        const preview = conversation.messages.length > 0 ? 
            conversation.messages[conversation.messages.length - 1].content.substring(0, 50) + '...' : 
            '暂无消息';
        const messageCount = conversation.messages.length;
        const updatedTime = new Date(conversation.updated).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        conversationItem.innerHTML = `
            <h4>${title}</h4>
            <p>${preview}</p>
            <div class="conversation-meta">
                <span>${messageCount} 条消息</span>
                <span>${updatedTime}</span>
            </div>
            <button class="delete-conversation-btn" onclick="deleteConversationById(${conversation.id})" title="删除对话">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
            </button>
        `;
        
        conversationItem.addEventListener('click', (e) => {
            // 如果点击的是删除按钮，不触发选择对话
            if (e.target.closest('.delete-conversation-btn')) {
                return;
            }
            selectConversation(conversation.id);
        });
        
        conversationsList.appendChild(conversationItem);
    });
    
    if (conversationsCount) {
        conversationsCount.textContent = `${aiConversations.length} 个对话`;
    }
}

// 选择对话
function selectConversation(conversationId) {
    currentConversationId = conversationId;
    
    // 更新UI选中状态
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const conversation = aiConversations.find(c => c.id === conversationId);
    if (conversation) {
        const sortedConversations = [...aiConversations].sort((a, b) => new Date(b.updated) - new Date(a.updated));
        const conversationIndex = sortedConversations.indexOf(conversation);
        const selectedItem = document.querySelector(`.conversation-item:nth-child(${conversationIndex + 1})`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
    }
    
    // 加载对话内容
    loadConversationMessages(conversationId);
}

// 加载对话消息
function loadConversationMessages(conversationId) {
    const conversation = aiConversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    const chatDiv = document.getElementById('aiChat');
    chatDiv.innerHTML = '';
    
    // 添加欢迎消息
    addMessageToChat('ai', '你好！我是你的AI助手，有什么可以帮助你的吗？');
    
    // 加载对话消息
    conversation.messages.forEach(message => {
        addMessageToChat(message.sender, message.content);
    });
}

// 创建新对话
function createNewConversation() {
    const newConversation = {
        id: conversationIdCounter++,
        title: `对话 ${conversationIdCounter - 1}`,
        messages: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    };
    
    aiConversations.unshift(newConversation);
    saveAiConversationsToStorage();
    localStorage.setItem('conversationIdCounter', conversationIdCounter.toString());
    
    loadAiConversations();
    selectConversation(newConversation.id);
    
    showNotification('已创建新对话');
}

// 保存当前对话消息
function saveCurrentConversation(userMessage, aiResponse) {
    if (!currentConversationId) {
        // 如果没有当前对话，创建新对话
        createNewConversation();
    }
    
    const conversation = aiConversations.find(c => c.id === currentConversationId);
    if (!conversation) return;
    
    // 添加用户消息
    conversation.messages.push({
        sender: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
    });
    
    // 添加AI回复
    conversation.messages.push({
        sender: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString()
    });
    
    // 更新对话标题（使用第一条用户消息的前20个字符）
    if (conversation.messages.length === 2) {
        conversation.title = userMessage.substring(0, 20) + (userMessage.length > 20 ? '...' : '');
    }
    
    conversation.updated = new Date().toISOString();
    
    saveAiConversationsToStorage();
    loadAiConversations();
}

// 保存对话记录到本地存储
function saveAiConversationsToStorage() {
    localStorage.setItem('aiConversations', JSON.stringify(aiConversations));
}

// 根据ID删除对话记录
function deleteConversationById(conversationId) {
    event.stopPropagation(); // 阻止事件冒泡，避免触发选择对话
    
    if (confirm('确定要删除这个对话记录吗？')) {
        aiConversations = aiConversations.filter(conversation => conversation.id !== conversationId);
        
        // 如果删除的是当前对话，清空聊天界面或选择其他对话
        if (currentConversationId === conversationId) {
            if (aiConversations.length > 0) {
                selectConversation(aiConversations[0].id);
            } else {
                currentConversationId = null;
                const chatDiv = document.getElementById('aiChat');
                chatDiv.innerHTML = '';
                addMessageToChat('ai', '你好！我是你的AI助手，有什么可以帮助你的吗？');
            }
        }
        
        saveAiConversationsToStorage();
        loadAiConversations();
        showNotification('对话记录已删除');
    }
}

// 添加新对话按钮事件监听
document.addEventListener('DOMContentLoaded', function() {
    const addConversationBtn = document.querySelector('.add-conversation-btn');
    if (addConversationBtn) {
        addConversationBtn.addEventListener('click', createNewConversation);
    }
});

// 番茄钟功能
let pomodoroTimer = null;
let pomodoroTime = 25 * 60; // 默认25分钟
let originalTime = 25 * 60;
let isPaused = false;
let isRunning = false;
let focusRecords = JSON.parse(localStorage.getItem('focusRecords')) || [];
let currentStatsPeriod = 'day';

// 开始番茄钟
function startPomodoro() {
    const focusTimeSelect = document.getElementById('focusTime');
    const selectedTime = parseInt(focusTimeSelect.value);
    
    pomodoroTime = selectedTime * 60;
    originalTime = selectedTime * 60;
    isRunning = true;
    isPaused = false;
    
    updatePomodoroDisplay();
    updatePomodoroButtons();
    
    pomodoroTimer = setInterval(() => {
        if (!isPaused) {
            pomodoroTime--;
            updatePomodoroDisplay();
            
            if (pomodoroTime <= 0) {
                completeFocusSession();
            }
        }
    }, 1000);
    
    document.getElementById('pomodoroStatus').textContent = '专注进行中...';
}

// 暂停番茄钟
function pausePomodoro() {
    isPaused = true;
    updatePomodoroButtons();
    document.getElementById('pomodoroStatus').textContent = '已暂停';
}

// 继续番茄钟
function resumePomodoro() {
    isPaused = false;
    updatePomodoroButtons();
    document.getElementById('pomodoroStatus').textContent = '专注进行中...';
}

// 重置番茄钟
function resetPomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    isRunning = false;
    isPaused = false;
    pomodoroTime = originalTime;
    
    updatePomodoroDisplay();
    updatePomodoroButtons();
    document.getElementById('pomodoroStatus').textContent = '准备开始专注';
}

// 完成专注会话
function completeFocusSession() {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    isRunning = false;
    isPaused = false;
    
    // 记录专注时长
    const focusMinutes = originalTime / 60;
    const record = {
        id: Date.now(),
        duration: focusMinutes,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    
    focusRecords.push(record);
    saveFocusRecordsToStorage();
    
    // 重置界面
    pomodoroTime = originalTime;
    updatePomodoroDisplay();
    updatePomodoroButtons();
    document.getElementById('pomodoroStatus').textContent = '专注完成！';
    
    // 更新统计和记录
    updateFocusStats();
    loadFocusRecords();
    
    // 显示完成通知
    showNotification(`🍅 专注完成！你刚刚专注了 ${focusMinutes} 分钟`);
    
    // 播放提示音（如果浏览器支持）
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.play();
    } catch (e) {
        // 忽略音频播放错误
    }
}

// 更新番茄钟显示
function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTime / 60);
    const seconds = pomodoroTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('pomodoroTime').textContent = timeString;
}

// 更新按钮状态
function updatePomodoroButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timeSelector = document.getElementById('timeSelector');
    
    if (!isRunning) {
        // 未开始状态
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        timeSelector.style.display = 'flex';
    } else if (isPaused) {
        // 暂停状态
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-block';
        resetBtn.style.display = 'inline-block';
        timeSelector.style.display = 'none';
    } else {
        // 运行状态
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        resumeBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
        timeSelector.style.display = 'none';
    }
}

// 切换统计周期
function switchStatsPeriod(period) {
    currentStatsPeriod = period;
    
    // 更新标签页状态
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    updateFocusStats();
}

// 更新专注统计
function updateFocusStats() {
    const now = new Date();
    let startDate, endDate, periodLabel;
    
    switch (currentStatsPeriod) {
        case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            periodLabel = '今日';
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            startDate = weekStart;
            endDate = new Date(weekStart);
            endDate.setDate(weekStart.getDate() + 7);
            periodLabel = '本周';
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            periodLabel = '本月';
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            periodLabel = '今年';
            break;
    }
    
    // 筛选时间范围内的记录
    const periodRecords = focusRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate < endDate;
    });
    
    // 计算统计数据
    const totalMinutes = periodRecords.reduce((sum, record) => sum + record.duration, 0);
    const totalCount = periodRecords.length;
    
    // 更新显示
    document.querySelector('.stat-item:first-child .stat-label').textContent = `${periodLabel}专注`;
    document.getElementById('todayFocus').textContent = `${totalMinutes}分钟`;
    document.getElementById('todayCount').textContent = `${totalCount}次`;
}

// 加载专注记录
function loadFocusRecords() {
    const recordsList = document.getElementById('recordsList');
    const recordsCount = document.getElementById('recordsCount');
    const emptyState = document.getElementById('recordsEmptyState');
    
    if (focusRecords.length === 0) {
        emptyState.style.display = 'block';
        recordsCount.textContent = '0 条记录';
        return;
    }
    
    emptyState.style.display = 'none';
    recordsCount.textContent = `${focusRecords.length} 条记录`;
    
    // 按时间倒序排列
    const sortedRecords = [...focusRecords].sort((a, b) => b.timestamp - a.timestamp);
    
    recordsList.innerHTML = sortedRecords.map(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="record-item">
                <div class="record-date">${dateStr}</div>
                <div class="record-duration"><span style="filter: hue-rotate(270deg) saturate(1.5);">🍅</span> ${record.duration} 分钟</div>
            </div>
        `;
    }).join('');
}

// 保存专注记录到本地存储
function saveFocusRecordsToStorage() {
    localStorage.setItem('focusRecords', JSON.stringify(focusRecords));
}

// 初始化番茄钟页面
function initPomodoro() {
    updatePomodoroDisplay();
    updatePomodoroButtons();
    updateFocusStats();
    loadFocusRecords();
}

// 页面加载时初始化番茄钟
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保DOM完全加载
    setTimeout(() => {
        if (document.getElementById('pomodoroTime')) {
            initPomodoro();
            
            // 添加时间选择器的事件监听器
            const focusTimeSelect = document.getElementById('focusTime');
            if (focusTimeSelect) {
                focusTimeSelect.addEventListener('change', function() {
                    // 只有在未运行状态下才更新时间显示
                    if (!isRunning) {
                        const selectedTime = parseInt(this.value);
                        pomodoroTime = selectedTime * 60;
                        originalTime = selectedTime * 60;
                        updatePomodoroDisplay();
                    }
                });
            }
        }
    }, 100);
});

// 侧边栏面板功能
function toggleStatsSidebar() {
    const sidebar = document.getElementById('statsSidebar');
    if (sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
    } else {
        sidebar.classList.add('show');
        updateFocusStats(); // 更新统计数据
    }
}

function toggleRecordsSidebar() {
    const sidebar = document.getElementById('recordsSidebar');
    if (sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
    } else {
        sidebar.classList.add('show');
        loadFocusRecords(); // 更新记录数据
    }
}

// 点击页面其他地方关闭侧边栏
document.addEventListener('click', function(e) {
    const statsSidebar = document.getElementById('statsSidebar');
    const recordsSidebar = document.getElementById('recordsSidebar');
    const statsBtn = document.querySelector('[onclick="toggleStatsSidebar()"]');
    const recordsBtn = document.querySelector('[onclick="toggleRecordsSidebar()"]');
    
    // 如果点击的不是侧边栏内容、按钮或其子元素，则关闭侧边栏
    if (statsSidebar && !statsSidebar.contains(e.target) && statsBtn && !statsBtn.contains(e.target) && statsSidebar.classList.contains('show')) {
        statsSidebar.classList.remove('show');
    }
    if (recordsSidebar && !recordsSidebar.contains(e.target) && recordsBtn && !recordsBtn.contains(e.target) && recordsSidebar.classList.contains('show')) {
        recordsSidebar.classList.remove('show');
    }
});

// 兼容旧的函数名（如果其他地方还在使用）
function toggleStatsModal() {
    toggleStatsSidebar();
}

function toggleRecordsModal() {
    toggleRecordsSidebar();
}

// 马卡龙色系渐变背景变色功能
function changeBackgroundColor() {
    const macaronColors = [
        {
            colors: ['#FFB6C1', '#FFC0CB', '#FFE4E1'], // 粉色系
            textColor: '#2C3E50' // 深色文字
        },
        {
            colors: ['#E6E6FA', '#DDA0DD', '#D8BFD8'], // 紫色系
            textColor: '#2C3E50' // 深色文字
        },
        {
            colors: ['#B0E0E6', '#87CEEB', '#87CEFA'], // 蓝色系
            textColor: '#2C3E50' // 深色文字
        },
        {
            colors: ['#98FB98', '#90EE90', '#F0FFF0'], // 绿色系
            textColor: '#2C3E50' // 深色文字
        },
        {
            colors: ['#FFFFE0', '#FFFACD', '#F5DEB3'], // 黄色系
            textColor: '#2C3E50' // 深色文字
        },
        {
            colors: ['#FFE4B5', '#FFDAB9', '#FFEFD5'], // 橙色系
            textColor: '#2C3E50' // 深色文字
        },
        {
            colors: ['#4A90E2', '#5BA3F5', '#6BB6FF'], // 深蓝色系
            textColor: '#FFFFFF' // 白色文字
        },
        {
            colors: ['#8E44AD', '#9B59B6', '#AF7AC5'], // 深紫色系
            textColor: '#FFFFFF' // 白色文字
        },
        {
            colors: ['#27AE60', '#2ECC71', '#58D68D'], // 深绿色系
            textColor: '#FFFFFF' // 白色文字
        },
        {
            colors: ['#E67E22', '#F39C12', '#F8C471'], // 深橙色系
            textColor: '#FFFFFF' // 白色文字
        }
    ];
    
    const randomColorScheme = macaronColors[Math.floor(Math.random() * macaronColors.length)];
    const angle = Math.floor(Math.random() * 360);
    
    const gradient = `linear-gradient(${angle}deg, ${randomColorScheme.colors[0]}, ${randomColorScheme.colors[1]}, ${randomColorScheme.colors[2]})`;
    
    // 检查当前是否在番茄钟标签页
    const activePomodoroTab = document.querySelector('.sidebar-tab[data-tab="pomodoro"].active');
    
    // 对番茄钟的两个div区域和侧边栏同时变色
    const pomodoroTab = document.querySelector('#pomodoro');
    const pomodoroSection = document.querySelector('.pomodoro-section');
    const sidebar = document.querySelector('.sidebar');
    
    if (pomodoroTab && pomodoroSection) {
        // 为两个div区域都应用相同的背景
        [pomodoroTab, pomodoroSection].forEach(element => {
            element.style.background = gradient;
            element.style.backgroundAttachment = 'fixed';
            element.style.color = randomColorScheme.textColor;
            element.style.transition = 'all 0.8s ease-in-out';
        });
        
        // 只有在番茄钟界面时才为侧边栏应用渐变背景
        if (sidebar && activePomodoroTab) {
            sidebar.style.background = `linear-gradient(135deg, ${randomColorScheme.colors[0]}80, ${randomColorScheme.colors[1]}80, ${randomColorScheme.colors[2]}80)`;
            sidebar.style.backdropFilter = 'blur(20px)';
            sidebar.style.transition = 'all 0.8s ease-in-out';
        }
        
        // 更新所有文字元素的颜色，但保持按钮原有样式
        const textElements = pomodoroSection.querySelectorAll('*');
        textElements.forEach(element => {
            // 只更新普通文字元素，不影响按钮和选择框
            if (!element.classList.contains('pomodoro-btn') && 
                !element.classList.contains('pomodoro-side-btn') && 
                !element.classList.contains('color-change-btn') &&
                !element.tagName.toLowerCase().includes('button') &&
                !element.tagName.toLowerCase().includes('select') &&
                !element.tagName.toLowerCase().includes('option')) {
                element.style.color = randomColorScheme.textColor;
                element.style.transition = 'color 0.8s ease-in-out';
            }
        });
        
        // 保存当前主题到localStorage
        localStorage.setItem('currentPomodoroTheme', JSON.stringify({
            background: gradient,
            textColor: randomColorScheme.textColor
        }));
    }
}

// 页面加载时恢复保存的番茄钟区域主题
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('currentPomodoroTheme');
    if (savedTheme) {
        try {
            const theme = JSON.parse(savedTheme);
            const pomodoroTab = document.querySelector('#pomodoro');
            const pomodoroSection = document.querySelector('.pomodoro-section');
            const sidebar = document.querySelector('.sidebar');
            
            if (pomodoroTab && pomodoroSection) {
                // 为两个div区域都恢复相同的背景
                [pomodoroTab, pomodoroSection].forEach(element => {
                    element.style.background = theme.background;
                    element.style.backgroundAttachment = 'fixed';
                    element.style.color = theme.textColor;
                    element.style.transition = 'all 0.8s ease-in-out';
                });
                
                // 检查当前是否在番茄钟标签页
                const activePomodoroTab = document.querySelector('.sidebar-tab[data-tab="pomodoro"].active');
                
                // 只有在番茄钟界面时才为侧边栏恢复渐变背景
                if (sidebar && theme.background && activePomodoroTab) {
                    // 从保存的渐变中提取颜色并添加透明度
                    const gradientMatch = theme.background.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
                    if (gradientMatch) {
                        const color1 = gradientMatch[1].trim();
                        const color2 = gradientMatch[2].trim();
                        const color3 = gradientMatch[3].trim();
                        sidebar.style.background = `linear-gradient(135deg, ${color1}80, ${color2}80, ${color3}80)`;
                        sidebar.style.backdropFilter = 'blur(20px)';
                        sidebar.style.transition = 'all 0.8s ease-in-out';
                    }
                }
                
                // 恢复文字颜色
                const textElements = pomodoroSection.querySelectorAll('*');
                textElements.forEach(element => {
                    if (!element.classList.contains('pomodoro-btn') && 
                        !element.classList.contains('pomodoro-side-btn') && 
                        !element.classList.contains('color-change-btn') &&
                        !element.tagName.toLowerCase().includes('button') &&
                        !element.tagName.toLowerCase().includes('select') &&
                        !element.tagName.toLowerCase().includes('option')) {
                        element.style.color = theme.textColor;
                        element.style.transition = 'color 0.8s ease-in-out';
                    }
                });
            }
        } catch (e) {
            console.log('恢复主题失败:', e);
        }
    }
});

// ==================== 项目管理功能 ====================

// 项目管理全局变量
let projectTasks = JSON.parse(localStorage.getItem('projectTasks')) || [];
let taskIdCounter = parseInt(localStorage.getItem('taskIdCounter')) || 1;
let currentEditingTask = null;

// 初始化项目管理
function initProjectManagement() {
    loadProjectTasks();
    updateTaskCounts();
    
    // 添加项目管理标签页切换监听
    const projectTab = document.querySelector('.sidebar-tab[data-tab="project"]');
    if (projectTab) {
        projectTab.addEventListener('click', function() {
            loadProjectTasks();
        });
    }
}

// 加载项目任务
function loadProjectTasks() {
    const todoList = document.getElementById('todoList');
    const progressList = document.getElementById('progressList');
    const doneList = document.getElementById('doneList');
    
    if (!todoList || !progressList || !doneList) return;
    
    // 清空现有内容
    todoList.innerHTML = '';
    progressList.innerHTML = '';
    doneList.innerHTML = '';
    
    // 按状态分组任务
    const todoTasks = projectTasks.filter(task => task.status === 'todo');
    const progressTasks = projectTasks.filter(task => task.status === 'in_progress');
    const doneTasks = projectTasks.filter(task => task.status === 'done');
    
    // 渲染任务
    renderTaskList(todoList, todoTasks);
    renderTaskList(progressList, progressTasks);
    renderTaskList(doneList, doneTasks);
    
    // 更新任务计数
    updateTaskCounts();
    
    // 显示/隐藏空状态
    toggleEmptyState('todoList', todoTasks.length === 0);
    toggleEmptyState('progressList', progressTasks.length === 0);
    toggleEmptyState('doneList', doneTasks.length === 0);
}

// 渲染任务列表
function renderTaskList(container, tasks) {
    tasks.forEach(task => {
        const taskCard = createTaskCard(task);
        container.appendChild(taskCard);
    });
}

// 创建任务卡片
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    
    // 检查是否过期
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    
    // 为待办任务添加复选框
    const checkboxHtml = task.status === 'todo' ? `
        <div class="task-checkbox-container">
            <input type="checkbox" class="task-checkbox" id="checkbox-${task.id}" onchange="completeTask(${task.id})">
            <label for="checkbox-${task.id}" class="task-checkbox-label"></label>
        </div>
    ` : '';
    
    card.innerHTML = `
        <div class="task-card-header">
            ${checkboxHtml}
            <h4 class="task-name">${escapeHtml(task.name)}</h4>
            <div class="task-actions">
                <button class="task-action-btn" onclick="editTask(${task.id})" title="编辑">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                    </svg>
                </button>
                <button class="task-action-btn" onclick="deleteTaskById(${task.id})" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                </button>
            </div>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
            ${task.assignee ? `<span class="task-assignee">${escapeHtml(task.assignee)}</span>` : '<span></span>'}
            ${task.dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">${formatDate(task.dueDate)}</span>` : '<span></span>'}
        </div>
    `;
    
    // 添加拖拽事件
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    return card;
}

// 显示任务模态框
function showTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('deleteTaskBtn');
    const form = document.getElementById('taskForm');
    
    if (!modal) return;
    
    currentEditingTask = task;
    
    if (task) {
        modalTitle.textContent = '编辑任务';
        deleteBtn.style.display = 'inline-block';
        
        // 填充表单数据
        document.getElementById('taskName').value = task.name || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskAssignee').value = task.assignee || '';
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskStatus').value = task.status || 'todo';
    } else {
        modalTitle.textContent = '新建任务';
        deleteBtn.style.display = 'none';
        form.reset();
    }
    
    modal.style.display = 'flex';
}

// 隐藏任务模态框
function hideTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
        currentEditingTask = null;
    }
}

// 保存任务
function saveTask() {
    const name = document.getElementById('taskName').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const assignee = document.getElementById('taskAssignee').value.trim();
    const dueDate = document.getElementById('taskDueDate').value;
    const status = document.getElementById('taskStatus').value;
    
    if (!name) {
        showNotification('请输入任务名称');
        return;
    }
    
    const taskData = {
        name,
        description,
        assignee,
        dueDate,
        status,
        updatedAt: new Date().toISOString()
    };
    
    if (currentEditingTask) {
        // 更新现有任务
        const taskIndex = projectTasks.findIndex(t => t.id === currentEditingTask.id);
        if (taskIndex !== -1) {
            projectTasks[taskIndex] = { ...projectTasks[taskIndex], ...taskData };
        }
    } else {
        // 创建新任务
        const newTask = {
            id: taskIdCounter++,
            ...taskData,
            createdAt: new Date().toISOString()
        };
        projectTasks.push(newTask);
        localStorage.setItem('taskIdCounter', taskIdCounter.toString());
    }
    
    saveProjectTasksToStorage();
    loadProjectTasks();
    hideTaskModal();
    showNotification(currentEditingTask ? '任务更新成功' : '任务创建成功');
}

// 编辑任务
function editTask(taskId) {
    const task = projectTasks.find(t => t.id === taskId);
    if (task) {
        showTaskModal(task);
    }
}

// 删除任务
function deleteTask() {
    if (!currentEditingTask) return;
    
    showCustomConfirm(
        '确认删除',
        `确定要删除任务「${currentEditingTask.name}」吗？`,
        () => {
            deleteTaskById(currentEditingTask.id);
            hideTaskModal();
        }
    );
}

// 根据ID删除任务
function deleteTaskById(taskId) {
    const taskIndex = projectTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        projectTasks.splice(taskIndex, 1);
        saveProjectTasksToStorage();
        loadProjectTasks();
        showNotification('任务删除成功');
    }
}

// 完成任务
function completeTask(taskId) {
    const task = projectTasks.find(t => t.id === taskId);
    if (task && task.status === 'todo') {
        task.status = 'done';
        saveProjectTasksToStorage();
        loadProjectTasks();
        updateTaskCounts();
        
        // 显示完成提示
        showNotification('任务已完成！');
    }
}

// 更新任务计数
function updateTaskCounts() {
    const todoCount = document.getElementById('todoCount');
    const progressCount = document.getElementById('progressCount');
    const doneCount = document.getElementById('doneCount');
    
    if (todoCount) todoCount.textContent = projectTasks.filter(t => t.status === 'todo').length;
    if (progressCount) progressCount.textContent = projectTasks.filter(t => t.status === 'in_progress').length;
    if (doneCount) doneCount.textContent = projectTasks.filter(t => t.status === 'done').length;
}

// 切换空状态显示
function toggleEmptyState(listId, isEmpty) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const emptyState = list.querySelector('.empty-column');
    if (isEmpty && !emptyState) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-column';
        
        let icon, text;
        switch (listId) {
            case 'todoList':
                icon = 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z';
                text = '暂无待办任务';
                break;
            case 'progressList':
                icon = 'M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z';
                text = '暂无进行中任务';
                break;
            case 'doneList':
                icon = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
                text = '暂无已完成任务';
                break;
        }
        
        emptyDiv.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                <path d="${icon}"/>
            </svg>
            <p>${text}</p>
        `;
        
        list.appendChild(emptyDiv);
    } else if (!isEmpty && emptyState) {
        emptyState.remove();
    }
}

// 拖拽功能
let draggedTask = null;

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTask = null;
}

function allowDrop(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 添加拖拽悬停效果
    const column = e.currentTarget.closest('.kanban-column');
    if (column && draggedTask) {
        column.classList.add('drag-over');
    }
}

function dropTask(e) {
    e.preventDefault();
    
    const column = e.currentTarget.closest('.kanban-column');
    if (column) {
        column.classList.remove('drag-over');
    }
    
    if (!draggedTask) return;
    
    const taskId = parseInt(draggedTask.dataset.taskId);
    const newStatus = e.currentTarget.closest('.kanban-column').dataset.status;
    
    // 更新任务状态
    const task = projectTasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        
        saveProjectTasksToStorage();
        loadProjectTasks();
        showNotification('任务状态更新成功');
    }
}

// 移除拖拽悬停效果
document.addEventListener('dragleave', function(e) {
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.classList.remove('drag-over');
    }
});

// 保存项目任务到本地存储
function saveProjectTasksToStorage() {
    localStorage.setItem('projectTasks', JSON.stringify(projectTasks));
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今天';
    } else if (diffDays === 1) {
        return '明天';
    } else if (diffDays === -1) {
        return '昨天';
    } else if (diffDays > 1) {
        return `${diffDays}天后`;
    } else {
        return `${Math.abs(diffDays)}天前`;
    }
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 点击模态框外部关闭
document.addEventListener('click', function(e) {
    const modal = document.getElementById('taskModal');
    if (modal && e.target === modal) {
        hideTaskModal();
    }
});

// 初始化项目管理功能
document.addEventListener('DOMContentLoaded', function() {
    initProjectManagement();
});

// 扩展原有的switchTab函数以支持项目管理
const originalSwitchTabFunction = window.switchTab;
if (originalSwitchTabFunction) {
    window.switchTab = function(tabName, clickedButton) {
        originalSwitchTabFunction(tabName, clickedButton);
        
        if (tabName === 'project') {
            // 延迟加载确保DOM已渲染
            setTimeout(() => {
                loadProjectTasks();
            }, 100);
        }
    };
}