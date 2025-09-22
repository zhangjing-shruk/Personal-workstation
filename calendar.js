/**
 * 日历功能 - 个人工作台
 * 支持月视图、周视图、事件管理
 */

// 全局变量
let currentDate = new Date();
let currentView = 'month';
let calendarEvents = [];
let selectedDate = null;
let editingEvent = null;

// 初始化日历
document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 初始化日历功能...');
    
    // 从本地存储加载事件
    loadCalendarEvents();
    
    // 渲染日历
    renderCalendar();
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyboardEvents);
    
    // 添加窗口大小改变监听
    window.addEventListener('resize', handleResize);
    
    console.log('✅ 日历功能初始化完成');
});

// 加载日历事件
function loadCalendarEvents() {
    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
        calendarEvents = JSON.parse(savedEvents);
        console.log(`📋 已加载 ${calendarEvents.length} 个事件`);
    } else {
        // 添加一些示例事件
        const sampleEvents = [
            {
                id: '1',
                title: '项目会议',
                description: '讨论新项目的需求和计划',
                date: getTodayDateString(),
                startTime: '10:00',
                endTime: '11:30',
                type: 'meeting',
                allDay: false,
                completed: false
            },
            {
                id: '2',
                title: '完成报告',
                description: '完成月度工作总结报告',
                date: getTodayDateString(),
                type: 'task',
                allDay: true,
                completed: false
            }
        ];
        calendarEvents = sampleEvents;
        saveCalendarEvents();
    }
}

// 保存日历事件
function saveCalendarEvents() {
    localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
}

// 获取今天的日期字符串
function getTodayDateString() {
    const today = new Date();
    return formatDateString(today);
}

// 格式化日期字符串
function formatDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 格式化日期显示
function formatDateDisplay(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
}

// 获取月份的天数
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// 获取月份第一天是星期几
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

// 渲染日历
function renderCalendar() {
    if (currentView === 'month') {
        renderMonthView();
    } else if (currentView === 'week') {
        renderWeekView();
    }
    
    // 更新标题
    updateCalendarTitle();
}

// 渲染月视图
function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 获取月份信息
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // 获取上个月的天数
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // 添加上个月的日期
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, month - 1, year, true);
        calendarDays.appendChild(dayElement);
    }
    
    // 添加当前月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, month, year, false);
        calendarDays.appendChild(dayElement);
    }
    
    // 添加下个月的日期
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, month + 1, year, true);
        calendarDays.appendChild(dayElement);
    }
}

// 渲染周视图
function renderWeekView() {
    const weekGrid = document.getElementById('weekGrid');
    weekGrid.innerHTML = '';
    
    // 获取当前周的开始日期（周日）
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    // 添加时间列头
    weekGrid.appendChild(createTimeSlotHeader());
    
    // 添加星期列头
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const header = createWeekDayHeader(date, weekdays[i]);
        weekGrid.appendChild(header);
    }
    
    // 添加时间槽和事件
    for (let hour = 0; hour < 24; hour++) {
        // 时间标签
        const timeSlot = createTimeSlot(hour);
        weekGrid.appendChild(timeSlot);
        
        // 每天的时间槽
        for (let day = 0; day < 7; day++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + day);
            const timeSlot = createWeekTimeSlot(date, hour);
            weekGrid.appendChild(timeSlot);
        }
    }
}

// 创建日期元素
function createDayElement(day, month, year, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // 检查是否是今天
    const today = new Date();
    const currentDateObj = new Date(year, month, day);
    if (isSameDay(currentDateObj, today)) {
        dayElement.classList.add('today');
    }
    
    // 日期数字
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    // 事件容器
    const dayEvents = document.createElement('div');
    dayEvents.className = 'day-events';
    
    // 获取该日期的事件
    const dateString = formatDateString(currentDateObj);
    const dayEventsList = getEventsForDate(dateString);
    
    // 显示事件
    dayEventsList.forEach(event => {
        const eventElement = createDayEventElement(event);
        dayEvents.appendChild(eventElement);
    });
    
    dayElement.appendChild(dayEvents);
    
    // 添加点击事件
    dayElement.addEventListener('click', function() {
        selectDate(currentDateObj);
    });
    
    return dayElement;
}

// 创建时间槽头部
function createTimeSlotHeader() {
    const header = document.createElement('div');
    header.className = 'time-slot';
    header.style.background = 'rgba(139, 92, 246, 0.1)';
    header.style.fontWeight = '600';
    header.textContent = '时间';
    return header;
}

// 创建周日头部
function createWeekDayHeader(date, weekday) {
    const header = document.createElement('div');
    header.className = 'week-day-header';
    header.innerHTML = `
        <div style="font-size: 14px;">${weekday}</div>
        <div style="font-size: 12px; opacity: 0.8;">${date.getDate()}日</div>
    `;
    return header;
}

// 创建时间槽
function createTimeSlot(hour) {
    const slot = document.createElement('div');
    slot.className = 'time-slot';
    slot.textContent = `${hour.toString().padStart(2, '0')}:00`;
    return slot;
}

// 创建周视图时间槽
function createWeekTimeSlot(date, hour) {
    const slot = document.createElement('div');
    slot.className = 'week-day-slot';
    
    const dateString = formatDateString(date);
    const hourEvents = getEventsForDateAndHour(dateString, hour);
    
    hourEvents.forEach(event => {
        const eventElement = createWeekEventElement(event);
        slot.appendChild(eventElement);
    });
    
    // 添加点击事件
    slot.addEventListener('click', function() {
        const slotDate = new Date(date);
        slotDate.setHours(hour);
        selectTimeSlot(slotDate, hour);
    });
    
    return slot;
}

// 创建日期事件元素
function createDayEventElement(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'day-event';
    if (event.completed) {
        eventElement.classList.add('completed');
    }
    
    eventElement.textContent = event.title;
    eventElement.title = event.description || event.title;
    
    // 添加点击事件
    eventElement.addEventListener('click', function(e) {
        e.stopPropagation();
        editEvent(event);
    });
    
    return eventElement;
}

// 创建周视图事件元素
function createWeekEventElement(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'week-event';
    if (event.completed) {
        eventElement.classList.add('completed');
    }
    
    const timeText = event.allDay ? '全天' : `${event.startTime}-${event.endTime}`;
    eventElement.textContent = `${timeText} ${event.title}`;
    eventElement.title = event.description || event.title;
    
    // 添加点击事件
    eventElement.addEventListener('click', function(e) {
        e.stopPropagation();
        editEvent(event);
    });
    
    return eventElement;
}

// 获取指定日期的事件
function getEventsForDate(dateString) {
    return calendarEvents.filter(event => event.date === dateString);
}

// 获取指定日期和时间的事件
function getEventsForDateAndHour(dateString, hour) {
    return calendarEvents.filter(event => {
        if (event.date !== dateString) return false;
        if (event.allDay) return true;
        
        const startHour = parseInt(event.startTime.split(':')[0]);
        const endHour = parseInt(event.endTime.split(':')[0]);
        return hour >= startHour && hour < endHour;
    });
}

// 选择日期
function selectDate(date) {
    // 移除之前的选中状态
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 添加选中状态
    const dayElements = document.querySelectorAll('.calendar-day');
    dayElements.forEach(el => {
        const dayNumber = parseInt(el.querySelector('.day-number').textContent);
        const currentDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
        
        if (isSameDay(currentDateObj, date) && !el.classList.contains('other-month')) {
            el.classList.add('selected');
        }
    });
    
    selectedDate = date;
    showEventModal(date);
}

// 选择时间槽
function selectTimeSlot(date, hour) {
    selectedDate = date;
    showEventModal(date, hour);
}

// 显示事件模态框
function showEventModal(date, hour = null) {
    selectedDate = date;
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('eventModalTitle');
    
    // 设置标题
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    modalTitle.textContent = hour !== null ? `${dateStr} ${hour}:00` : dateStr;
    
    // 显示该日期的事件
    renderEventsList(date);
    
    // 显示模态框
    modal.classList.add('show');
    
    // 重置表单
    resetEventForm();
}

// 关闭事件模态框
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.classList.remove('show');
    editingEvent = null;
}

// 渲染事件列表
function renderEventsList(date) {
    const eventsList = document.getElementById('eventsList');
    const dateString = formatDateString(date);
    const dayEvents = getEventsForDate(dateString);
    
    eventsList.innerHTML = '';
    
    if (dayEvents.length === 0) {
        eventsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                    <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1"/>
                </svg>
                <p style="margin-top: 10px;">暂无事件安排</p>
            </div>
        `;
        return;
    }
    
    // 按时间排序
    dayEvents.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        if (a.allDay && b.allDay) return 0;
        return a.startTime.localeCompare(b.startTime);
    });
    
    dayEvents.forEach(event => {
        const eventItem = createEventListItem(event);
        eventsList.appendChild(eventItem);
    });
}

// 创建事件列表项
function createEventListItem(event) {
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    
    const timeText = event.allDay ? '全天' : `${event.startTime} - ${event.endTime}`;
    const typeIcon = getEventTypeIcon(event.type);
    
    eventItem.innerHTML = `
        <div class="event-info">
            <div class="event-title">${typeIcon} ${event.title}</div>
            <div class="event-time">${timeText}</div>
            ${event.description ? `<div style="font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-top: 2px;">${event.description}</div>` : ''}
        </div>
        <div class="event-actions">
            <button class="event-action-btn" onclick="toggleEventComplete('${event.id}')" title="${event.completed ? '标记为未完成' : '标记为完成'}">
                ${event.completed ? '↩️' : '✅'}
            </button>
            <button class="event-action-btn" onclick="editEvent('${event.id}')" title="编辑">✏️</button>
            <button class="event-action-btn" onclick="deleteEvent('${event.id}')" title="删除">🗑️</button>
        </div>
    `;
    
    return eventItem;
}

// 获取事件类型图标
function getEventTypeIcon(type) {
    const icons = {
        task: '📋',
        meeting: '👥',
        reminder: '🔔',
        personal: '👤',
        work: '💼'
    };
    return icons[type] || '📅';
}

// 显示添加事件表单
function showAddEventForm() {
    const form = document.getElementById('addEventForm');
    const saveBtn = document.getElementById('saveEventBtn');
    
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    saveBtn.style.display = form.style.display === 'none' ? 'none' : 'block';
    
    if (form.style.display === 'block') {
        // 自动填充一些默认值
        document.getElementById('eventTitle').focus();
        
        // 如果不是全天事件，设置默认时间
        const allDayCheckbox = document.getElementById('eventAllDay');
        if (!allDayCheckbox.checked) {
            const now = new Date();
            const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
            
            document.getElementById('eventStartTime').value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            document.getElementById('eventEndTime').value = `${nextHour.getHours().toString().padStart(2, '0')}:${nextHour.getMinutes().toString().padStart(2, '0')}`;
        }
    }
}

// 保存事件
function saveEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const type = document.getElementById('eventType').value;
    const allDay = document.getElementById('eventAllDay').checked;
    
    if (!title) {
        alert('请输入事件标题');
        document.getElementById('eventTitle').focus();
        return;
    }
    
    if (!allDay && (!startTime || !endTime)) {
        alert('请输入开始和结束时间');
        return;
    }
    
    if (!allDay && startTime >= endTime) {
        alert('结束时间必须晚于开始时间');
        return;
    }
    
    const dateString = formatDateString(selectedDate);
    
    if (editingEvent) {
        // 编辑现有事件
        const eventIndex = calendarEvents.findIndex(e => e.id === editingEvent.id);
        if (eventIndex !== -1) {
            calendarEvents[eventIndex] = {
                ...editingEvent,
                title,
                description,
                startTime,
                endTime,
                type,
                allDay,
                date: dateString
            };
        }
    } else {
        // 创建新事件
        const newEvent = {
            id: Date.now().toString(),
            title,
            description,
            date: dateString,
            startTime,
            endTime,
            type,
            allDay,
            completed: false
        };
        
        calendarEvents.push(newEvent);
    }
    
    // 保存事件
    saveCalendarEvents();
    
    // 重新渲染日历
    renderCalendar();
    
    // 重新渲染事件列表
    renderEventsList(selectedDate);
    
    // 重置表单
    resetEventForm();
    
    console.log(`✅ 事件已保存: ${title}`);
}

// 编辑事件
function editEvent(eventId) {
    const event = calendarEvents.find(e => e.id === eventId);
    if (!event) return;
    
    editingEvent = event;
    
    // 填充表单
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventStartTime').value = event.startTime || '';
    document.getElementById('eventEndTime').value = event.endTime || '';
    document.getElementById('eventType').value = event.type || 'task';
    document.getElementById('eventAllDay').checked = event.allDay || false;
    
    // 显示表单
    showAddEventForm();
    
    // 更新保存按钮文本
    document.getElementById('saveEventBtn').textContent = '更新事件';
}

// 切换事件完成状态
function toggleEventComplete(eventId) {
    const event = calendarEvents.find(e => e.id === eventId);
    if (!event) return;
    
    event.completed = !event.completed;
    saveCalendarEvents();
    renderCalendar();
    renderEventsList(selectedDate);
    
    console.log(`✅ 事件状态已更新: ${event.title} - ${event.completed ? '已完成' : '未完成'}`);
}

// 删除事件
function deleteEvent(eventId) {
    if (!confirm('确定要删除这个事件吗？')) return;
    
    const eventIndex = calendarEvents.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return;
    
    const event = calendarEvents[eventIndex];
    calendarEvents.splice(eventIndex, 1);
    
    saveCalendarEvents();
    renderCalendar();
    renderEventsList(selectedDate);
    
    console.log(`🗑️ 事件已删除: ${event.title}`);
}

// 重置事件表单
function resetEventForm() {
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventStartTime').value = '';
    document.getElementById('eventEndTime').value = '';
    document.getElementById('eventType').value = 'task';
    document.getElementById('eventAllDay').checked = false;
    
    document.getElementById('addEventForm').style.display = 'none';
    document.getElementById('saveEventBtn').style.display = 'none';
    document.getElementById('saveEventBtn').textContent = '保存事件';
    
    editingEvent = null;
}

// 更新日历标题
function updateCalendarTitle() {
    const title = document.getElementById('calendarTitle');
    
    if (currentView === 'month') {
        title.textContent = formatDateDisplay(currentDate);
    } else if (currentView === 'week') {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        title.textContent = `${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日 - ${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`;
    }
}

// 切换到上个月
function previousPeriod() {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() - 7);
    }
    renderCalendar();
}

// 切换到下个月
function nextPeriod() {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
    }
    renderCalendar();
}

// 回到今天
function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

// 切换视图
function switchView(view) {
    currentView = view;
    
    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // 切换视图显示
    document.getElementById('monthView').classList.toggle('active', view === 'month');
    document.getElementById('weekView').classList.toggle('active', view === 'week');
    
    renderCalendar();
}

// 检查是否为同一天
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 处理键盘事件
function handleKeyboardEvents(e) {
    // 如果模态框打开，优先处理模态框内的键盘事件
    const modal = document.getElementById('eventModal');
    if (modal.classList.contains('show')) {
        if (e.key === 'Escape') {
            closeEventModal();
        }
        return;
    }
    
    // 全局快捷键
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            previousPeriod();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextPeriod();
            break;
        case 't':
        case 'T':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                goToToday();
            }
            break;
        case 'n':
        case 'N':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (selectedDate) {
                    showEventModal(selectedDate);
                }
            }
            break;
        case 'm':
        case 'M':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                switchView('month');
            }
            break;
        case 'w':
        case 'W':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                switchView('week');
            }
            break;
    }
}

// 处理窗口大小改变
function handleResize() {
    // 可以在这里添加响应式逻辑
    console.log('📱 窗口大小已改变');
}

// 添加事件监听器（全天事件切换）
document.addEventListener('DOMContentLoaded', function() {
    const allDayCheckbox = document.getElementById('eventAllDay');
    if (allDayCheckbox) {
        allDayCheckbox.addEventListener('change', function() {
            const startTimeInput = document.getElementById('eventStartTime');
            const endTimeInput = document.getElementById('eventEndTime');
            
            if (this.checked) {
                startTimeInput.disabled = true;
                endTimeInput.disabled = true;
                startTimeInput.value = '';
                endTimeInput.value = '';
            } else {
                startTimeInput.disabled = false;
                endTimeInput.disabled = false;
            }
        });
    }
});

// 导出功能（供其他模块使用）
window.CalendarAPI = {
    getEvents: function() {
        return [...calendarEvents];
    },
    addEvent: function(event) {
        calendarEvents.push(event);
        saveCalendarEvents();
        renderCalendar();
    },
    getEventsForDate: function(dateString) {
        return getEventsForDate(dateString);
    },
    goToDate: function(date) {
        currentDate = new Date(date);
        renderCalendar();
    }
};