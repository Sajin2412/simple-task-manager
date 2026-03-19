const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskPriorityInput = document.getElementById("task-priority");
const taskDueDateInput = document.getElementById("task-due-date");
const taskDueTimeInput = document.getElementById("task-due-time");
const taskReminderEnabledInput = document.getElementById("task-reminder-enabled");
const taskDescriptionInput = document.getElementById("task-description");
const taskRemarkInput = document.getElementById("task-remark");
const taskActionRemark1Input = document.getElementById("task-action-remark-1");
const taskActionRemark2Input = document.getElementById("task-action-remark-2");
const taskActionRemark3Input = document.getElementById("task-action-remark-3");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const taskFilter = document.getElementById("task-filter");
const enableRemindersButton = document.getElementById("enable-reminders");
const csvImportInput = document.getElementById("csv-import");

const storageKey = "simple-task-manager-tasks";
let tasks = loadTasks();
let activeFilter = "all";

renderTasks();
updateReminderButton();
startReminderChecker();

taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = taskTitleInput.value.trim();

  if (!title) {
    return;
  }

  const newTask = createTask({
    title,
    priority: taskPriorityInput.value,
    dueDate: taskDueDateInput.value,
    dueTime: taskDueTimeInput.value,
    reminderEnabled: taskReminderEnabledInput.checked,
    description: taskDescriptionInput.value.trim(),
    remark: taskRemarkInput.value.trim(),
    actionRemarks: collectActionRemarks(),
    timelineText: "Task created",
  });

  tasks.unshift(newTask);
  saveTasks();
  renderTasks();
  taskForm.reset();
  taskPriorityInput.value = "Medium";
  taskTitleInput.focus();
});

taskFilter.addEventListener("change", function () {
  activeFilter = taskFilter.value;
  renderTasks();
});

enableRemindersButton.addEventListener("click", function () {
  requestNotificationPermission();
});

csvImportInput.addEventListener("change", function (event) {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  importCsvFile(file);
  csvImportInput.value = "";
});

function loadTasks() {
  const savedTasks = localStorage.getItem(storageKey);

  if (!savedTasks) {
    return [];
  }

  try {
    return JSON.parse(savedTasks).map(normalizeTask);
  } catch (error) {
    console.error("Could not load tasks:", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function createTask(taskData) {
  return {
    id: crypto.randomUUID(),
    title: taskData.title,
    priority: taskData.priority || "Medium",
    dueDate: taskData.dueDate || "",
    dueTime: taskData.dueTime || "",
    reminderEnabled: Boolean(taskData.reminderEnabled),
    reminderSentAt: "",
    description: taskData.description || "",
    remark: taskData.remark || "",
    actionRemarks: Array.isArray(taskData.actionRemarks) ? taskData.actionRemarks.slice(0, 3) : [],
    completed: false,
    timeline: [createTimelineEntry(taskData.timelineText || "Task created")],
  };
}

function renderTasks() {
  taskList.innerHTML = "";
  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    emptyState.hidden = false;
    taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
    return;
  }

  emptyState.hidden = true;
  taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

  filteredTasks.forEach(function (task) {
    const listItem = document.createElement("li");
    listItem.className = `task-item${task.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.className = "task-checkbox";
    checkbox.addEventListener("change", function () {
      task.completed = checkbox.checked;
      task.timeline.unshift(
        createTimelineEntry(task.completed ? "Marked as completed" : "Marked as active")
      );
      saveTasks();
      renderTasks();
    });

    const content = document.createElement("div");

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "No description added.";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const priorityBadge = document.createElement("span");
    priorityBadge.className = `badge priority-${task.priority.toLowerCase()}`;
    priorityBadge.textContent = `${task.priority} Priority`;
    meta.appendChild(priorityBadge);

    if (task.dueDate) {
      const dueDateBadge = document.createElement("span");
      dueDateBadge.className = "badge due-date";
      dueDateBadge.textContent = `Due: ${formatDate(task.dueDate)}${task.dueTime ? `, ${formatTime(task.dueTime)}` : ""}`;
      meta.appendChild(dueDateBadge);
    }

    if (task.reminderEnabled && task.dueDate && task.dueTime) {
      const reminderBadge = document.createElement("span");
      reminderBadge.className = "badge reminder";
      reminderBadge.textContent = "Reminder: 15 min before";
      meta.appendChild(reminderBadge);
    }

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(meta);
    content.appendChild(renderDetailsBlock(task));

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      editTask(task.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      tasks = tasks.filter(function (savedTask) {
        return savedTask.id !== task.id;
      });

      saveTasks();
      renderTasks();
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    listItem.appendChild(checkbox);
    listItem.appendChild(content);
    listItem.appendChild(actions);
    taskList.appendChild(listItem);
  });
}

function getFilteredTasks() {
  return tasks.filter(function (task) {
    if (activeFilter === "active") {
      return !task.completed;
    }

    if (activeFilter === "completed") {
      return task.completed;
    }

    if (activeFilter === "high" || activeFilter === "medium" || activeFilter === "low") {
      return task.priority.toLowerCase() === activeFilter;
    }

    return true;
  });
}

function editTask(taskId) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  const updatedTitle = window.prompt("Edit task name:", task.title);

  if (updatedTitle === null) {
    return;
  }

  const cleanedTitle = updatedTitle.trim();

  if (!cleanedTitle) {
    window.alert("Task name cannot be empty.");
    return;
  }

  const updatedPriority = window.prompt(
    "Edit priority: High, Medium, or Low",
    task.priority
  );

  if (updatedPriority === null) {
    return;
  }

  const cleanedPriority = formatPriority(updatedPriority);

  if (!cleanedPriority) {
    window.alert("Please enter High, Medium, or Low.");
    return;
  }

  const updatedDueDate = window.prompt(
    "Edit due date in YYYY-MM-DD format. Leave empty to remove it.",
    task.dueDate
  );

  if (updatedDueDate === null) {
    return;
  }

  const cleanedDueDate = updatedDueDate.trim();

  if (cleanedDueDate && !isValidDate(cleanedDueDate)) {
    window.alert("Please use the YYYY-MM-DD date format.");
    return;
  }

  const updatedDueTime = window.prompt(
    "Edit due time in HH:MM format. Leave empty to remove it.",
    task.dueTime || ""
  );

  if (updatedDueTime === null) {
    return;
  }

  const cleanedDueTime = updatedDueTime.trim();

  if (cleanedDueTime && !isValidTime(cleanedDueTime)) {
    window.alert("Please use the HH:MM time format.");
    return;
  }

  const updatedReminderEnabled = window.prompt(
    "Reminder before deadline? Type yes or no.",
    task.reminderEnabled ? "yes" : "no"
  );

  if (updatedReminderEnabled === null) {
    return;
  }

  const cleanedReminderEnabled = parseReminderChoice(updatedReminderEnabled);

  if (cleanedReminderEnabled === null) {
    window.alert("Please type yes or no for reminder.");
    return;
  }

  const updatedDescription = window.prompt("Edit description:", task.description || "");

  if (updatedDescription === null) {
    return;
  }

  const updatedRemark = window.prompt("Edit remark:", task.remark || "");

  if (updatedRemark === null) {
    return;
  }

  const updatedActionRemarks = window.prompt(
    "Edit action remarks. Use commas between items. Maximum 3.",
    task.actionRemarks.join(", ")
  );

  if (updatedActionRemarks === null) {
    return;
  }

  task.title = cleanedTitle;
  task.priority = cleanedPriority;
  task.dueDate = cleanedDueDate;
  task.dueTime = cleanedDueTime;
  task.reminderEnabled = cleanedReminderEnabled;
  task.reminderSentAt = "";
  task.description = updatedDescription.trim();
  task.remark = updatedRemark.trim();
  task.actionRemarks = parseActionRemarks(updatedActionRemarks);
  task.timeline.unshift(createTimelineEntry("Task details edited"));
  saveTasks();
  renderTasks();
}

function collectActionRemarks() {
  return [
    taskActionRemark1Input.value.trim(),
    taskActionRemark2Input.value.trim(),
    taskActionRemark3Input.value.trim(),
  ].filter(function (item) {
    return item;
  });
}

function importCsvFile(file) {
  const reader = new FileReader();

  reader.onload = function () {
    const text = String(reader.result || "");
    const rows = parseCsv(text);

    if (rows.length < 2) {
      window.alert("The CSV file is empty or missing data.");
      return;
    }

    const headers = rows[0].map(function (header) {
      return header.trim();
    });

    const importedTasks = rows
      .slice(1)
      .map(function (row) {
        return buildTaskFromCsvRow(headers, row);
      })
      .filter(function (task) {
        return task !== null;
      });

    if (importedTasks.length === 0) {
      window.alert("No valid tasks were found in the CSV file.");
      return;
    }

    tasks = importedTasks.concat(tasks);
    saveTasks();
    renderTasks();
    window.alert(`${importedTasks.length} tasks imported successfully.`);
  };

  reader.onerror = function () {
    window.alert("Could not read the CSV file.");
  };

  reader.readAsText(file);
}

function buildTaskFromCsvRow(headers, row) {
  const rowData = {};

  headers.forEach(function (header, index) {
    rowData[header] = (row[index] || "").trim();
  });

  if (!rowData.title) {
    return null;
  }

  const priority = formatPriority(rowData.priority || "Medium") || "Medium";
  const dueDate = rowData.dueDate && isValidDate(rowData.dueDate) ? rowData.dueDate : "";
  const dueTime = rowData.dueTime && isValidTime(rowData.dueTime) ? rowData.dueTime : "";

  return createTask({
    title: rowData.title,
    priority,
    dueDate,
    dueTime,
    reminderEnabled: Boolean(dueDate && dueTime),
    description: rowData.description || "",
    remark: rowData.remark || "",
    actionRemarks: [
      rowData.actionRemark1 || "",
      rowData.actionRemark2 || "",
      rowData.actionRemark3 || "",
    ].filter(function (item) {
      return item;
    }),
    timelineText: "Imported from CSV",
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(value);

      if (row.some(function (cell) {
        return cell.trim() !== "";
      })) {
        rows.push(row);
      }

      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);

  if (row.some(function (cell) {
    return cell.trim() !== "";
  })) {
    rows.push(row);
  }

  return rows;
}

function parseActionRemarks(value) {
  return value
    .split(",")
    .map(function (item) {
      return item.trim();
    })
    .filter(function (item) {
      return item;
    })
    .slice(0, 3);
}

function renderDetailsBlock(task) {
  const details = document.createElement("div");
  details.className = "details-block";

  const remarksHeader = document.createElement("div");
  remarksHeader.className = "details-header";

  const remarksTitle = document.createElement("p");
  remarksTitle.className = "details-title";
  remarksTitle.textContent = "Remarks";

  const remarksEditButton = document.createElement("button");
  remarksEditButton.type = "button";
  remarksEditButton.className = "edit-button small-edit-button";
  remarksEditButton.textContent = "Edit";
  remarksEditButton.addEventListener("click", function () {
    editTaskNotes(task.id);
  });

  remarksHeader.appendChild(remarksTitle);
  remarksHeader.appendChild(remarksEditButton);
  details.appendChild(remarksHeader);

  const remarkText = document.createElement("p");
  remarkText.className = "detail-text";
  remarkText.textContent = task.remark || "No remark added.";
  details.appendChild(remarkText);

  const actionHeader = document.createElement("div");
  actionHeader.className = "details-header";

  const actionSectionTitle = document.createElement("p");
  actionSectionTitle.className = "details-title";
  actionSectionTitle.textContent = "Action Remarks";

  const actionEditButton = document.createElement("button");
  actionEditButton.type = "button";
  actionEditButton.className = "edit-button small-edit-button";
  actionEditButton.textContent = "Edit";
  actionEditButton.addEventListener("click", function () {
    editTaskNotes(task.id);
  });

  actionHeader.appendChild(actionSectionTitle);
  actionHeader.appendChild(actionEditButton);
  details.appendChild(actionHeader);

  if (task.actionRemarks.length > 0) {
    const actionList = document.createElement("ul");
    actionList.className = "remark-list";

    task.actionRemarks.forEach(function (remark) {
      const item = document.createElement("li");
      item.textContent = remark;
      actionList.appendChild(item);
    });

    details.appendChild(actionList);
  } else {
    const noActions = document.createElement("p");
    noActions.className = "detail-text";
    noActions.textContent = "No action remarks added.";
    details.appendChild(noActions);
  }

  const timelineTitle = document.createElement("p");
  timelineTitle.className = "details-title";
  timelineTitle.textContent = "Timeline Record";
  details.appendChild(timelineTitle);

  const timelineList = document.createElement("ul");
  timelineList.className = "timeline-list";

  task.timeline.forEach(function (entry) {
    const item = document.createElement("li");
    item.textContent = `${entry.text} - ${entry.time}`;
    timelineList.appendChild(item);
  });

  details.appendChild(timelineList);
  return details;
}

function createTimelineEntry(text) {
  return {
    text,
    time: new Date().toLocaleString(),
  };
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || "",
    priority: task.priority || "Medium",
    dueDate: task.dueDate || "",
    dueTime: task.dueTime || "",
    reminderEnabled: Boolean(task.reminderEnabled),
    reminderSentAt: task.reminderSentAt || "",
    description: task.description || "",
    remark: task.remark || "",
    actionRemarks: Array.isArray(task.actionRemarks) ? task.actionRemarks.slice(0, 3) : [],
    completed: Boolean(task.completed),
    timeline: Array.isArray(task.timeline) && task.timeline.length > 0
      ? task.timeline
      : [createTimelineEntry("Task record created")],
  };
}

function editTaskNotes(taskId) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  const updatedRemark = window.prompt("Edit remark:", task.remark || "");

  if (updatedRemark === null) {
    return;
  }

  const updatedActionRemarks = window.prompt(
    "Edit action remarks. Use commas between items. Maximum 3.",
    task.actionRemarks.join(", ")
  );

  if (updatedActionRemarks === null) {
    return;
  }

  task.remark = updatedRemark.trim();
  task.actionRemarks = parseActionRemarks(updatedActionRemarks);
  task.timeline.unshift(createTimelineEntry("Remarks updated"));
  saveTasks();
  renderTasks();
}

function formatPriority(priorityValue) {
  const value = priorityValue.trim().toLowerCase();

  if (value === "high") {
    return "High";
  }

  if (value === "medium") {
    return "Medium";
  }

  if (value === "low") {
    return "Low";
  }

  return "";
}

function isValidDate(dateString) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

function isValidTime(timeString) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeString);
}

function parseReminderChoice(value) {
  const cleanedValue = value.trim().toLowerCase();

  if (cleanedValue === "yes") {
    return true;
  }

  if (cleanedValue === "no") {
    return false;
  }

  return null;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeString) {
  const date = new Date(`2000-01-01T${timeString}:00`);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    window.alert("This browser does not support notifications.");
    return;
  }

  Notification.requestPermission().then(function () {
    updateReminderButton();
  });
}

function updateReminderButton() {
  if (!("Notification" in window)) {
    enableRemindersButton.textContent = "Notifications Not Supported";
    enableRemindersButton.disabled = true;
    return;
  }

  if (Notification.permission === "granted") {
    enableRemindersButton.textContent = "Notifications Enabled";
    enableRemindersButton.disabled = true;
    return;
  }

  enableRemindersButton.textContent = "Enable Notifications";
  enableRemindersButton.disabled = false;
}

function startReminderChecker() {
  checkTaskReminders();
  window.setInterval(checkTaskReminders, 30000);
}

function checkTaskReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const now = Date.now();

  tasks.forEach(function (task) {
    if (!shouldSendReminder(task, now)) {
      return;
    }

    sendTaskReminder(task);
    task.reminderSentAt = new Date().toISOString();
    task.timeline.unshift(createTimelineEntry("15 minute reminder sent"));
  });

  saveTasks();
}

function shouldSendReminder(task, now) {
  if (!task.reminderEnabled || task.completed || !task.dueDate || !task.dueTime || task.reminderSentAt) {
    return false;
  }

  const dueTime = getTaskDeadline(task);

  if (!dueTime) {
    return false;
  }

  const fifteenMinutesBefore = dueTime.getTime() - 15 * 60 * 1000;
  return now >= fifteenMinutesBefore && now < dueTime.getTime();
}

function getTaskDeadline(task) {
  const deadline = new Date(`${task.dueDate}T${task.dueTime}:00`);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  return deadline;
}

function sendTaskReminder(task) {
  const body = task.dueTime
    ? `${task.title} is due at ${formatTime(task.dueTime)}.`
    : `${task.title} is due soon.`;

  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(function (registration) {
      registration.showNotification("Task Reminder", {
        body,
        tag: task.id,
      });
    }).catch(function () {
      new Notification("Task Reminder", { body });
    });
    return;
  }

  new Notification("Task Reminder", { body });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
      console.error("Service worker registration failed:", error);
    });
  });
}
