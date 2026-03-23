const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authModeSelect = document.getElementById("auth-mode");
const authMessage = document.getElementById("auth-message");
const userEmail = document.getElementById("user-email");
const appMessage = document.getElementById("app-message");
const logoutButton = document.getElementById("logout-button");
const summaryTotal = document.getElementById("summary-total");
const summaryPending = document.getElementById("summary-pending");
const summaryCompleted = document.getElementById("summary-completed");
const summaryOverdue = document.getElementById("summary-overdue");
const exportReportButton = document.getElementById("export-report-button");
const reminderCount = document.getElementById("reminder-count");
const reminderList = document.getElementById("reminder-list");
const reminderEmpty = document.getElementById("reminder-empty");

const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskPriorityInput = document.getElementById("task-priority");
const taskDueDateInput = document.getElementById("task-due-date");
const taskDueTimeInput = document.getElementById("task-due-time");
const taskReminderEnabledInput = document.getElementById("task-reminder-enabled");
const taskDescriptionInput = document.getElementById("task-description");
const taskRemarkInput = document.getElementById("task-remark");
const taskHierarchyInput = document.getElementById("task-hierarchy");
const taskActionRemark1Input = document.getElementById("task-action-remark-1");
const taskActionRemark2Input = document.getElementById("task-action-remark-2");
const taskActionRemark3Input = document.getElementById("task-action-remark-3");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const taskFilter = document.getElementById("task-filter");
const enableRemindersButton = document.getElementById("enable-reminders");
const csvImportInput = document.getElementById("csv-import");

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

let supabaseClient = null;
let currentUser = null;
let tasks = [];
let activeFilter = "all";

initializeApp();

async function initializeApp() {
  if (!supabaseUrl || !supabaseAnonKey || !window.supabase) {
    authMessage.textContent = "Supabase is not configured yet. Follow the README setup steps first.";
    return;
  }

  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

  authForm.addEventListener("submit", handleAuthSubmit);
  logoutButton.addEventListener("click", handleLogout);
  taskForm.addEventListener("submit", handleTaskSubmit);
  taskFilter.addEventListener("change", function () {
    activeFilter = taskFilter.value;
    renderTasks();
  });
  exportReportButton.addEventListener("click", exportTaskReport);
  enableRemindersButton.addEventListener("click", requestNotificationPermission);
  csvImportInput.addEventListener("change", handleCsvImport);

  updateReminderButton();
  startReminderChecker();

  const sessionResult = await supabaseClient.auth.getSession();
  await applySession(sessionResult.data.session);

  supabaseClient.auth.onAuthStateChange(function (_event, session) {
    applySession(session);
  });
}

async function applySession(session) {
  currentUser = session ? session.user : null;

  if (!currentUser) {
    authSection.hidden = false;
    appSection.hidden = true;
    userEmail.textContent = "";
    tasks = [];
    clearAppMessage();
    renderTasks();
    return;
  }

  authSection.hidden = true;
  appSection.hidden = false;
  userEmail.textContent = currentUser.email || "";
  await loadTasks();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabaseClient) {
    return;
  }

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const mode = authModeSelect.value;

  if (!email || !password) {
    authMessage.textContent = "Please enter email and password.";
    return;
  }

  authMessage.textContent = "Please wait...";

  let result;

  if (mode === "signup") {
    result = await supabaseClient.auth.signUp({ email, password });
  } else {
    result = await supabaseClient.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    authMessage.textContent = result.error.message;
    return;
  }

  if (mode === "signup" && !result.data.session) {
    authMessage.textContent = "Signup successful. Please check your email if confirmation is enabled.";
    return;
  }

  authMessage.textContent = "";
  authForm.reset();
}

async function handleLogout() {
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
}

async function loadTasks() {
  if (!supabaseClient || !currentUser) {
    return;
  }

  const result = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    showAppMessage(`Could not load tasks: ${result.error.message}`);
    emptyState.hidden = false;
    emptyState.textContent = "Could not load tasks. Please check Supabase setup.";
    return;
  }

  tasks = result.data.map(normalizeTask);
  clearAppMessage();
  emptyState.textContent = "No tasks to show right now.";
  renderTasks();
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
    hierarchy: taskData.hierarchy || "",
    actionRemarks: Array.isArray(taskData.actionRemarks) ? taskData.actionRemarks.slice(0, 3) : [],
    completed: false,
    timeline: [createTimelineEntry(taskData.timelineText || "Task created")],
  };
}

async function handleTaskSubmit(event) {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  const dueDate = taskDueDateInput.value.trim();
  const dueTime = taskDueTimeInput.value.trim();
  const description = taskDescriptionInput.value.trim();
  const remark = taskRemarkInput.value.trim();
  const hierarchy = taskHierarchyInput.value.trim();
  const actionRemarks = collectActionRemarks();

  if (!title || !currentUser) {
    return;
  }

  if (!dueDate || !dueTime || !description) {
    showAppMessage("Please fill in all required fields.");
    return;
  }

  const newTask = createTask({
    title,
    priority: taskPriorityInput.value,
    dueDate,
    dueTime,
    reminderEnabled: taskReminderEnabledInput.checked,
    description,
    remark,
    hierarchy,
    actionRemarks,
    timelineText: "Task created",
  });

  const result = await supabaseClient
    .from("tasks")
    .insert(prepareTaskForDatabase(newTask))
    .select()
    .single();

  if (result.error) {
    showAppMessage(`Could not add task: ${result.error.message}`);
    window.alert(`Could not add task: ${result.error.message}`);
    return;
  }

  clearAppMessage();
  tasks.unshift(normalizeTask(result.data));
  renderTasks();
  taskForm.reset();
  taskPriorityInput.value = "Medium";
  taskTitleInput.focus();
}

function renderTasks() {
  taskList.innerHTML = "";
  renderSummary();
  renderReminderCenter();
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
    checkbox.addEventListener("change", async function () {
      task.completed = checkbox.checked;
      task.timeline.unshift(
        createTimelineEntry(task.completed ? "Marked as completed" : "Marked as active")
      );
      await saveTask(task);
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

    meta.appendChild(createBadge(`badge priority-${task.priority.toLowerCase()}`, `${task.priority} Priority`));

    if (task.dueDate) {
      meta.appendChild(
        createBadge(
          "badge due-date",
          `Due: ${formatDate(task.dueDate)}${task.dueTime ? `, ${formatTime(task.dueTime)}` : ""}`
        )
      );
    }

    if (task.reminderEnabled && task.dueDate && task.dueTime) {
      meta.appendChild(createBadge("badge reminder", "Reminder: 15 min before"));
    }

    if (isTaskOverdue(task)) {
      meta.appendChild(createBadge("badge overdue", "Overdue"));
    } else if (isTaskDueSoon(task)) {
      meta.appendChild(createBadge("badge upcoming", "Due soon"));
    }

    if (task.hierarchy) {
      meta.appendChild(createBadge("badge hierarchy", `Hierarchy: ${task.hierarchy}`));
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

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "edit-button";
    completeButton.textContent = task.completed ? "Mark Active" : "Complete";
    completeButton.addEventListener("click", async function () {
      task.completed = !task.completed;
      task.timeline.unshift(
        createTimelineEntry(task.completed ? "Marked as completed" : "Marked as active")
      );
      await saveTask(task);
      renderTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deleteTask(task.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(completeButton);
    actions.appendChild(deleteButton);

    listItem.appendChild(checkbox);
    listItem.appendChild(content);
    listItem.appendChild(actions);
    taskList.appendChild(listItem);
  });
}

function renderSummary() {
  const total = tasks.length;
  const completed = tasks.filter(function (task) {
    return task.completed;
  }).length;
  const pending = tasks.filter(function (task) {
    return !task.completed;
  }).length;
  const overdue = tasks.filter(function (task) {
    return isTaskOverdue(task);
  }).length;

  summaryTotal.textContent = String(total);
  summaryPending.textContent = String(pending);
  summaryCompleted.textContent = String(completed);
  summaryOverdue.textContent = String(overdue);
}

function renderReminderCenter() {
  reminderList.innerHTML = "";

  const reminderTasks = tasks
    .filter(function (task) {
      return !task.completed && task.dueDate && task.dueTime;
    })
    .filter(function (task) {
      return isTaskOverdue(task) || isTaskDueSoon(task);
    })
    .sort(function (firstTask, secondTask) {
      return getTaskDeadline(firstTask).getTime() - getTaskDeadline(secondTask).getTime();
    });

  reminderCount.textContent = `${reminderTasks.length} alert${reminderTasks.length === 1 ? "" : "s"}`;

  if (reminderTasks.length === 0) {
    reminderEmpty.hidden = false;
    return;
  }

  reminderEmpty.hidden = true;

  reminderTasks.forEach(function (task) {
    const item = document.createElement("li");
    item.className = `reminder-item${isTaskOverdue(task) ? " overdue" : ""}`;

    const content = document.createElement("div");

    const title = document.createElement("p");
    title.className = "reminder-title";
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.className = "reminder-meta";
    meta.textContent = `${formatDate(task.dueDate)} at ${formatTime(task.dueTime)}`;

    content.appendChild(title);
    content.appendChild(meta);

    const status = document.createElement("span");
    status.className = "reminder-status";
    status.textContent = isTaskOverdue(task)
      ? "Overdue"
      : `Due in ${formatMinutesUntilDue(task)}`;

    item.appendChild(content);
    item.appendChild(status);
    reminderList.appendChild(item);
  });
}

function exportTaskReport() {
  const now = new Date();
  const total = tasks.length;
  const completed = tasks.filter(function (task) {
    return task.completed;
  }).length;
  const pending = tasks.filter(function (task) {
    return !task.completed;
  }).length;
  const overdue = tasks.filter(function (task) {
    return isTaskOverdue(task);
  }).length;
  const summaryRow = `
    <tr>
      <td>${escapeHtml(formatExportDateTime(now))}</td>
      <td>${escapeHtml(String(total))}</td>
      <td>${escapeHtml(String(pending))}</td>
      <td>${escapeHtml(String(completed))}</td>
      <td>${escapeHtml(String(overdue))}</td>
    </tr>
  `;

  const taskRows = tasks.length === 0
    ? `
      <tr>
        <td colspan="12">No tasks available.</td>
      </tr>
    `
    : tasks.map(function (task, index) {
      return `
        <tr>
          <td>${escapeHtml(String(index + 1))}</td>
          <td>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(task.completed ? "Completed" : "Pending")}</td>
          <td>${escapeHtml(task.priority)}</td>
          <td>${escapeHtml(task.dueDate ? formatDate(task.dueDate) : "")}</td>
          <td>${escapeHtml(task.dueTime ? formatTime(task.dueTime) : "")}</td>
          <td>${escapeHtml(task.reminderEnabled ? "15 minutes before deadline" : "Off")}</td>
          <td>${escapeHtml(task.description || "No description added.")}</td>
          <td>${escapeHtml(task.remark || "No remark added.")}</td>
          <td>${escapeHtml(task.hierarchy || "No hierarchy added.")}</td>
          <td>${escapeHtml(task.actionRemarks.length > 0 ? task.actionRemarks.join(" | ") : "No action remarks added.")}</td>
          <td>${escapeHtml(task.timeline.length > 0 ? formatTimelineEntry(task.timeline[0]) : "No timeline record.")}</td>
        </tr>
      `;
    }).join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <meta name="ProgId" content="Excel.Sheet">
        <meta name="Generator" content="SINI Task Management">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #cffafe; font-weight: 700; }
          .sheet-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .section-title { font-size: 14px; font-weight: 700; color: #0e7490; margin: 18px 0 8px; }
        </style>
      </head>
      <body>
        <div class="sheet-title">SINI Task Management Report</div>
        <div class="section-title">Dashboard Summary</div>
        <table>
          <thead>
            <tr>
              <th>Report Generated At</th>
              <th>Total Tasks</th>
              <th>Pending Tasks</th>
              <th>Completed Tasks</th>
              <th>Overdue Tasks</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRow}
          </tbody>
        </table>
        <div class="section-title">Task Details</div>
        <table>
          <thead>
            <tr>
              <th>Task Number</th>
              <th>Task Name</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Due Time</th>
              <th>Reminder</th>
              <th>Description</th>
              <th>Remark</th>
              <th>Hierarchy</th>
              <th>Action Remarks</th>
              <th>Latest Timeline</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([`\uFEFF${workbook}`], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  const fileDate = buildFileDate(now);

  downloadLink.href = url;
  downloadLink.download = `sini-task-report-${fileDate}.xls`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
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

  const actionTitle = document.createElement("p");
  actionTitle.className = "details-title";
  actionTitle.textContent = "Action Remarks";

  const actionEditButton = document.createElement("button");
  actionEditButton.type = "button";
  actionEditButton.className = "edit-button small-edit-button";
  actionEditButton.textContent = "Edit";
  actionEditButton.addEventListener("click", function () {
    editTaskNotes(task.id);
  });

  actionHeader.appendChild(actionTitle);
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
    item.textContent = `${entry.text} - ${formatTimelineTime(entry.time)}`;
    timelineList.appendChild(item);
  });

  details.appendChild(timelineList);
  return details;
}

async function editTask(taskId) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  const updatedTitle = window.prompt("Edit task name:", task.title);
  if (updatedTitle === null) return;

  const cleanedTitle = updatedTitle.trim();
  if (!cleanedTitle) {
    window.alert("Task name cannot be empty.");
    return;
  }

  const updatedPriority = window.prompt("Edit priority: High, Medium, or Low", task.priority);
  if (updatedPriority === null) return;

  const cleanedPriority = formatPriority(updatedPriority);
  if (!cleanedPriority) {
    window.alert("Please enter High, Medium, or Low.");
    return;
  }

  const updatedDueDate = window.prompt(
    "Edit due date in YYYY-MM-DD format. Leave empty to remove it.",
    task.dueDate
  );
  if (updatedDueDate === null) return;

  const cleanedDueDate = updatedDueDate.trim();
  if (cleanedDueDate && !isValidDate(cleanedDueDate)) {
    window.alert("Please use the YYYY-MM-DD date format.");
    return;
  }

  const updatedDueTime = window.prompt(
    "Edit due time in HH:MM format. Leave empty to remove it.",
    task.dueTime || ""
  );
  if (updatedDueTime === null) return;

  const cleanedDueTime = updatedDueTime.trim();
  if (cleanedDueTime && !isValidTime(cleanedDueTime)) {
    window.alert("Please use the HH:MM time format.");
    return;
  }

  const updatedReminderEnabled = window.prompt(
    "Reminder before deadline? Type yes or no.",
    task.reminderEnabled ? "yes" : "no"
  );
  if (updatedReminderEnabled === null) return;

  const cleanedReminderEnabled = parseReminderChoice(updatedReminderEnabled);
  if (cleanedReminderEnabled === null) {
    window.alert("Please type yes or no for reminder.");
    return;
  }

  const updatedDescription = window.prompt("Edit description:", task.description || "");
  if (updatedDescription === null) return;

  const updatedRemark = window.prompt("Edit remark:", task.remark || "");
  if (updatedRemark === null) return;

  const updatedHierarchy = window.prompt("Edit hierarchy:", task.hierarchy || "");
  if (updatedHierarchy === null) return;

  const updatedActionRemarks = window.prompt(
    "Edit action remarks. Use commas between items. Maximum 3.",
    task.actionRemarks.join(", ")
  );
  if (updatedActionRemarks === null) return;

  task.title = cleanedTitle;
  task.priority = cleanedPriority;
  task.dueDate = cleanedDueDate;
  task.dueTime = cleanedDueTime;
  task.reminderEnabled = cleanedReminderEnabled;
  task.reminderSentAt = "";
  task.description = updatedDescription.trim();
  task.remark = updatedRemark.trim();
  task.hierarchy = updatedHierarchy.trim();
  task.actionRemarks = parseActionRemarks(updatedActionRemarks);
  task.timeline.unshift(createTimelineEntry("Task details edited"));

  await saveTask(task);
  renderTasks();
}

async function editTaskNotes(taskId) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  const updatedRemark = window.prompt("Edit remark:", task.remark || "");
  if (updatedRemark === null) return;

  const updatedActionRemarks = window.prompt(
    "Edit action remarks. Use commas between items. Maximum 3.",
    task.actionRemarks.join(", ")
  );
  if (updatedActionRemarks === null) return;

  task.remark = updatedRemark.trim();
  task.actionRemarks = parseActionRemarks(updatedActionRemarks);
  task.timeline.unshift(createTimelineEntry("Remarks updated"));
  await saveTask(task);
  renderTasks();
}

async function saveTask(task) {
  const result = await supabaseClient
    .from("tasks")
    .update(prepareTaskForDatabase(task))
    .eq("id", task.id);

  if (result.error) {
    showAppMessage(`Could not update task: ${result.error.message}`);
    window.alert(`Could not update task: ${result.error.message}`);
  }
}

async function deleteTask(taskId) {
  const result = await supabaseClient.from("tasks").delete().eq("id", taskId);

  if (result.error) {
    showAppMessage(`Could not delete task: ${result.error.message}`);
    window.alert(`Could not delete task: ${result.error.message}`);
    return;
  }

  clearAppMessage();
  tasks = tasks.filter(function (task) {
    return task.id !== taskId;
  });
  renderTasks();
}

function handleCsvImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  importCsvFile(file);
  csvImportInput.value = "";
}

function importCsvFile(file) {
  const reader = new FileReader();

  reader.onload = async function () {
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

    const result = await supabaseClient
      .from("tasks")
      .insert(importedTasks.map(prepareTaskForDatabase))
      .select();

    if (result.error) {
      showAppMessage(`Could not import tasks: ${result.error.message}`);
      window.alert(`Could not import tasks: ${result.error.message}`);
      return;
    }

    clearAppMessage();
    tasks = result.data.map(normalizeTask).concat(tasks);
    renderTasks();
    window.alert(`${result.data.length} tasks imported successfully.`);
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
    hierarchy: rowData.hierarchy || "",
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

function createBadge(className, text) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function formatReportDueLine(task) {
  if (!task.dueDate) {
    return "No due date";
  }

  return `${formatDate(task.dueDate)}${task.dueTime ? ` at ${formatTime(task.dueTime)}` : ""}`;
}

function formatTimelineEntry(entry) {
  return `${entry.text} - ${formatTimelineTime(entry.time)}`;
}

function formatExportDateTime(date) {
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeHtml(value) {
  const text = String(value ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFileDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}${minutes}`;
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

function collectActionRemarks() {
  return [
    taskActionRemark1Input.value.trim(),
    taskActionRemark2Input.value.trim(),
    taskActionRemark3Input.value.trim(),
  ].filter(function (item) {
    return item;
  });
}

function prepareTaskForDatabase(task) {
  return {
    id: task.id,
    user_id: currentUser.id,
    title: task.title,
    priority: task.priority,
    due_date: task.dueDate || null,
    due_time: task.dueTime || null,
    reminder_enabled: task.reminderEnabled,
    reminder_sent_at: task.reminderSentAt || null,
    description: task.description,
    remark: task.remark,
    hierarchy: task.hierarchy,
    action_remarks: task.actionRemarks,
    completed: task.completed,
    timeline: task.timeline,
  };
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || "",
    priority: task.priority || "Medium",
    dueDate: task.due_date || task.dueDate || "",
    dueTime: task.due_time || task.dueTime || "",
    reminderEnabled: Boolean(task.reminder_enabled ?? task.reminderEnabled),
    reminderSentAt: task.reminder_sent_at || task.reminderSentAt || "",
    description: task.description || "",
    remark: task.remark || "",
    hierarchy: task.hierarchy || "",
    actionRemarks: Array.isArray(task.action_remarks)
      ? task.action_remarks.slice(0, 3)
      : Array.isArray(task.actionRemarks)
      ? task.actionRemarks.slice(0, 3)
      : [],
    completed: Boolean(task.completed),
    timeline: Array.isArray(task.timeline) && task.timeline.length > 0
      ? task.timeline
      : [createTimelineEntry("Task record created")],
  };
}

function createTaskBaseTime() {
  return new Date().toISOString();
}

function createTimelineEntry(text) {
  return {
    text,
    time: createTaskBaseTime(),
  };
}

function formatPriority(priorityValue) {
  const value = priorityValue.trim().toLowerCase();

  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  if (value === "low") return "Low";
  return "";
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

function parseReminderChoice(value) {
  const cleanedValue = value.trim().toLowerCase();
  if (cleanedValue === "yes") return true;
  if (cleanedValue === "no") return false;
  return null;
}

function isValidDate(dateString) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

function isValidTime(timeString) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeString);
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

function formatTimelineTime(timeValue) {
  const date = new Date(timeValue);

  if (Number.isNaN(date.getTime())) {
    return timeValue;
  }

  return date.toLocaleString();
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
    saveTask(task);
  });
}

function shouldSendReminder(task, now) {
  if (!task.reminderEnabled || task.completed || !task.dueDate || !task.dueTime || task.reminderSentAt) {
    return false;
  }

  const dueTime = getTaskDeadline(task);
  if (!dueTime) {
    return false;
  }

  const reminderTime = dueTime.getTime() - 15 * 60 * 1000;
  return now >= reminderTime && now < dueTime.getTime();
}

function isTaskOverdue(task) {
  if (task.completed || !task.dueDate || !task.dueTime) {
    return false;
  }

  const deadline = getTaskDeadline(task);
  return Boolean(deadline && Date.now() > deadline.getTime());
}

function isTaskDueSoon(task) {
  if (task.completed || !task.dueDate || !task.dueTime) {
    return false;
  }

  const deadline = getTaskDeadline(task);

  if (!deadline) {
    return false;
  }

  const difference = deadline.getTime() - Date.now();
  return difference > 0 && difference <= 60 * 60 * 1000;
}

function formatMinutesUntilDue(task) {
  const deadline = getTaskDeadline(task);

  if (!deadline) {
    return "soon";
  }

  const difference = deadline.getTime() - Date.now();
  const minutes = Math.max(1, Math.ceil(difference / 60000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function getTaskDeadline(task) {
  const dateParts = task.dueDate.split("-").map(function (value) {
    return Number(value);
  });
  const timeParts = task.dueTime.split(":").map(function (value) {
    return Number(value);
  });

  if (dateParts.length !== 3 || timeParts.length < 2) {
    return null;
  }

  const deadline = new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0],
    timeParts[1],
    0,
    0
  );

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }
  return deadline;
}

function sendTaskReminder(task) {
  const body = `${task.title} is due at ${formatTime(task.dueTime)}.`;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then(function (registration) {
        registration.showNotification("Task Reminder", {
          body,
          tag: task.id,
        });
      })
      .catch(function () {
        new Notification("Task Reminder", { body });
      });
    return;
  }

  new Notification("Task Reminder", { body });
}

function showAppMessage(message) {
  appMessage.textContent = message;
  appMessage.hidden = false;
}

function clearAppMessage() {
  appMessage.textContent = "";
  appMessage.hidden = true;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
      console.error("Service worker registration failed:", error);
    });
  });
}
