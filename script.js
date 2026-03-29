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
const focusCount = document.getElementById("focus-count");
const focusList = document.getElementById("focus-list");
const focusEmpty = document.getElementById("focus-empty");
const focusProgressLabel = document.getElementById("focus-progress-label");
const focusProgressBar = document.getElementById("focus-progress-bar");
const taskConfirmModal = document.getElementById("task-confirm-modal");
const taskConfirmSummary = document.getElementById("task-confirm-summary");
const taskConfirmCancelButton = document.getElementById("task-confirm-cancel");
const taskConfirmSaveButton = document.getElementById("task-confirm-save");
const taskConfirmCloseButton = document.getElementById("task-confirm-close");

const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskPriorityInput = document.getElementById("task-priority");
const taskDueDateInput = document.getElementById("task-due-date");
const taskDueTimeInput = document.getElementById("task-due-time");
const taskReminderEnabledInput = document.getElementById("task-reminder-enabled");
const taskDescriptionInput = document.getElementById("task-description");
const taskRemarkInput = document.getElementById("task-remark");
const taskHierarchyInput = document.getElementById("task-hierarchy");
const taskRecurrenceInput = document.getElementById("task-recurrence");
const taskActionRemark1Input = document.getElementById("task-action-remark-1");
const taskActionRemark2Input = document.getElementById("task-action-remark-2");
const taskActionRemark3Input = document.getElementById("task-action-remark-3");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const taskFilter = document.getElementById("task-filter");
const taskSearchInput = document.getElementById("task-search");
const taskSort = document.getElementById("task-sort");
const enableRemindersButton = document.getElementById("enable-reminders");
const csvImportInput = document.getElementById("csv-import");

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

let supabaseClient = null;
let currentUser = null;
let tasks = [];
let activeFilter = "all";
let activeSearchTerm = "";
let activeSort = "newest";
let pinnedFocusTaskIds = [];
let pendingTaskDraft = null;

initializeApp();

async function initializeApp() {
  closeTaskConfirmModal();

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
  taskSearchInput.addEventListener("input", function () {
    activeSearchTerm = taskSearchInput.value.trim().toLowerCase();
    renderTasks();
  });
  taskSort.addEventListener("change", function () {
    activeSort = taskSort.value;
    renderTasks();
  });
  exportReportButton.addEventListener("click", exportTaskReport);
  taskConfirmCancelButton.addEventListener("click", closeTaskConfirmModal);
  taskConfirmSaveButton.addEventListener("click", savePendingTask);
  taskConfirmCloseButton.addEventListener("click", closeTaskConfirmModal);
  taskConfirmModal.addEventListener("click", function (event) {
    if (event.target === taskConfirmModal) {
      closeTaskConfirmModal();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !taskConfirmModal.hidden) {
      closeTaskConfirmModal();
    }
  });
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
    closeTaskConfirmModal();
    authSection.hidden = false;
    appSection.hidden = true;
    userEmail.textContent = "";
    tasks = [];
    pinnedFocusTaskIds = [];
    clearAppMessage();
    renderTasks();
    return;
  }

  authSection.hidden = true;
  appSection.hidden = false;
  userEmail.textContent = currentUser.email || "";
  loadPinnedFocusTasks();
  await loadTasks();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  closeTaskConfirmModal();

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
    createdAt: createTaskBaseTime(),
    title: taskData.title,
    priority: taskData.priority || "Medium",
    dueDate: taskData.dueDate || "",
    dueTime: taskData.dueTime || "",
    reminderEnabled: Boolean(taskData.reminderEnabled),
    reminderSentAt: "",
    description: taskData.description || "",
    remark: taskData.remark || "",
    hierarchy: taskData.hierarchy || "",
    recurrenceRule: normalizeRecurrenceRule(taskData.recurrenceRule) || "none",
    recurrenceLastGeneratedAt: "",
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
  const recurrenceRule = taskRecurrenceInput.value;
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
    recurrenceRule,
    actionRemarks,
    timelineText: "Task created",
  });
  openTaskConfirmModal(newTask);
}

function renderTasks() {
  taskList.innerHTML = "";
  renderSummary();
  renderReminderCenter();
  renderFocusSection();
  const filteredTasks = getVisibleTasks();

  if (filteredTasks.length === 0) {
    emptyState.hidden = false;
    taskCount.textContent = buildTaskCountText(filteredTasks.length);
    return;
  }

  emptyState.hidden = true;
  taskCount.textContent = buildTaskCountText(filteredTasks.length);

  filteredTasks.forEach(function (task) {
    const listItem = document.createElement("li");
    listItem.className = `task-item${task.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.className = "task-checkbox";
    checkbox.addEventListener("change", async function () {
      task.completed = checkbox.checked;
      const timelineEntry = createTimelineEntry(task.completed ? "Marked as completed" : "Marked as active");
      task.timeline.unshift(timelineEntry);
      await saveTask(task);
      if (task.completed) {
        await maybeCreateNextRecurringTask(task, timelineEntry.time);
      }
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

    if (task.recurrenceRule !== "none") {
      meta.appendChild(createBadge("badge recurrence", `Repeats: ${formatRecurrenceRule(task.recurrenceRule)}`));
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
      const timelineEntry = createTimelineEntry(task.completed ? "Marked as completed" : "Marked as active");
      task.timeline.unshift(timelineEntry);
      await saveTask(task);
      if (task.completed) {
        await maybeCreateNextRecurringTask(task, timelineEntry.time);
      }
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

function renderFocusSection() {
  focusList.innerHTML = "";

  const focusTasks = getFocusTasks();
  const completedFocusTasks = focusTasks.filter(function (task) {
    return task.completed;
  }).length;
  const focusPercent = focusTasks.length === 0
    ? 0
    : Math.round((completedFocusTasks / focusTasks.length) * 100);

  focusCount.textContent = `${focusTasks.length} focus task${focusTasks.length === 1 ? "" : "s"}`;
  focusProgressLabel.textContent = `${completedFocusTasks} of ${focusTasks.length} done`;
  focusProgressBar.style.width = `${focusPercent}%`;

  if (focusTasks.length === 0) {
    focusEmpty.hidden = false;
    return;
  }

  focusEmpty.hidden = true;

  focusTasks.forEach(function (task) {
    const item = document.createElement("li");
    item.className = `focus-item${isTaskOverdue(task) ? " overdue" : ""}${task.completed ? " completed" : ""}`;

    const head = document.createElement("div");
    head.className = "focus-item-head";

    const content = document.createElement("div");

    const title = document.createElement("p");
    title.className = "focus-title";
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.className = "focus-meta";
    meta.textContent = buildFocusMeta(task);

    const badges = document.createElement("div");
    badges.className = "task-meta";
    badges.appendChild(createBadge(`badge priority-${task.priority.toLowerCase()}`, `${task.priority} Priority`));

    if (isTaskOverdue(task)) {
      badges.appendChild(createBadge("badge overdue", "Overdue"));
    } else if (isTaskDueToday(task)) {
      badges.appendChild(createBadge("badge upcoming", "Due Today"));
    }

    if (isTaskPinned(task)) {
      badges.appendChild(createBadge("badge reminder", "Pinned"));
    }

    if (task.recurrenceRule !== "none") {
      badges.appendChild(createBadge("badge recurrence", formatRecurrenceRule(task.recurrenceRule)));
    }

    if (hasStartedWork(task)) {
      badges.appendChild(createBadge("badge focus-started", "Started"));
    }

    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(badges);

    const actions = document.createElement("div");
    actions.className = "focus-actions";
    actions.appendChild(createFocusActionDropdown(task));

    head.appendChild(content);
    head.appendChild(actions);
    item.appendChild(head);
    focusList.appendChild(item);
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

function openTaskConfirmModal(task) {
  pendingTaskDraft = task;
  taskConfirmSummary.innerHTML = "";

  [
    ["Task Name", task.title],
    ["Priority", task.priority],
    ["Due Date", task.dueDate ? formatDate(task.dueDate) : "Not set"],
    ["Due Time", task.dueTime ? formatTime(task.dueTime) : "Not set"],
    ["Reminder", task.reminderEnabled ? "15 minutes before deadline" : "Off"],
    ["Repeat", formatRecurrenceRule(task.recurrenceRule)],
    ["Description", task.description || "No description added."],
    ["Remark", task.remark || "No remark added."],
    ["Hierarchy", task.hierarchy || "No hierarchy added."],
    ["Action Remarks", task.actionRemarks.length > 0 ? task.actionRemarks.join("\n") : "No action remarks added."],
  ].forEach(function (entry) {
    const row = document.createElement("div");
    row.className = "confirm-row";

    const label = document.createElement("p");
    label.className = "confirm-label";
    label.textContent = entry[0];

    const value = document.createElement("p");
    value.className = "confirm-value";
    value.textContent = entry[1];

    row.appendChild(label);
    row.appendChild(value);
    taskConfirmSummary.appendChild(row);
  });

  taskConfirmModal.hidden = false;
}

function closeTaskConfirmModal() {
  pendingTaskDraft = null;
  taskConfirmSummary.innerHTML = "";
  taskConfirmModal.hidden = true;
}

async function savePendingTask() {
  if (!pendingTaskDraft || !supabaseClient) {
    return;
  }

  const result = await supabaseClient
    .from("tasks")
    .insert(prepareTaskForDatabase(pendingTaskDraft))
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
  taskRecurrenceInput.value = "none";
  taskTitleInput.focus();
  closeTaskConfirmModal();
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
        <td colspan="13">No tasks available.</td>
      </tr>
    `
    : tasks.map(function (task, index) {
      const latestTimelineEntry = getLatestVisibleTimelineEntry(task);
      return `
        <tr>
          <td>${escapeHtml(String(index + 1))}</td>
          <td>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(task.completed ? "Completed" : "Pending")}</td>
          <td>${escapeHtml(task.priority)}</td>
          <td>${escapeHtml(task.dueDate ? formatDate(task.dueDate) : "")}</td>
          <td>${escapeHtml(task.dueTime ? formatTime(task.dueTime) : "")}</td>
          <td>${escapeHtml(formatRecurrenceRule(task.recurrenceRule))}</td>
          <td>${escapeHtml(task.reminderEnabled ? "15 minutes before deadline" : "Off")}</td>
          <td>${escapeHtml(task.description || "No description added.")}</td>
          <td>${escapeHtml(task.remark || "No remark added.")}</td>
          <td>${escapeHtml(task.hierarchy || "No hierarchy added.")}</td>
          <td>${escapeHtml(task.actionRemarks.length > 0 ? task.actionRemarks.join(" | ") : "No action remarks added.")}</td>
          <td>${escapeHtml(latestTimelineEntry ? formatTimelineEntry(latestTimelineEntry) : "No timeline record.")}</td>
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
        <meta name="Generator" content="Sajin Task Management">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #cffafe; font-weight: 700; }
          .sheet-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .section-title { font-size: 14px; font-weight: 700; color: #0e7490; margin: 18px 0 8px; }
        </style>
      </head>
      <body>
        <div class="sheet-title">Sajin Task Management Report</div>
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
              <th>Repeat</th>
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

  const recurrenceTitle = document.createElement("p");
  recurrenceTitle.className = "details-title";
  recurrenceTitle.textContent = "Repeat Schedule";
  details.appendChild(recurrenceTitle);

  const recurrenceText = document.createElement("p");
  recurrenceText.className = "detail-text";
  recurrenceText.textContent = formatRecurrenceRule(task.recurrenceRule);
  details.appendChild(recurrenceText);

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

  getVisibleTimelineEntries(task).forEach(function (entry) {
    const item = document.createElement("li");
    item.textContent = `${entry.text} - ${formatTimelineTime(entry.time)}`;
    timelineList.appendChild(item);
  });

  if (timelineList.children.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No timeline record.";
    timelineList.appendChild(item);
  }

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

  const updatedRecurrenceRule = window.prompt(
    "Repeat setting: none, daily, weekdays, weekly, or monthly.",
    task.recurrenceRule || "none"
  );
  if (updatedRecurrenceRule === null) return;

  const cleanedRecurrenceRule = normalizeRecurrenceRule(updatedRecurrenceRule);
  if (!cleanedRecurrenceRule) {
    window.alert("Please enter none, daily, weekdays, weekly, or monthly.");
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
  task.hierarchy = updatedHierarchy.trim();
  task.recurrenceRule = cleanedRecurrenceRule;
  if (cleanedRecurrenceRule === "none") {
    task.recurrenceLastGeneratedAt = "";
  }
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
  pinnedFocusTaskIds = pinnedFocusTaskIds.filter(function (id) {
    return id !== taskId;
  });
  persistPinnedFocusTaskIds();
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
    recurrenceRule: normalizeRecurrenceRule(rowData.repeat || rowData.recurrence || "none") || "none",
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

function getVisibleTimelineEntries(task) {
  return task.timeline.filter(function (entry) {
    return !(entry && entry.systemType);
  });
}

function getLatestVisibleTimelineEntry(task) {
  const visibleEntries = getVisibleTimelineEntries(task);
  return visibleEntries.length > 0 ? visibleEntries[0] : null;
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

function getVisibleTasks() {
  return tasks
    .filter(function (task) {
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
    })
    .filter(function (task) {
      if (!activeSearchTerm) {
        return true;
      }

      const searchableFields = [
        task.title,
        task.description,
        task.remark,
        task.hierarchy,
        task.priority,
        formatRecurrenceRule(task.recurrenceRule),
        task.dueDate,
        task.dueTime,
        task.actionRemarks.join(" "),
      ];

      return searchableFields.join(" ").toLowerCase().includes(activeSearchTerm);
    })
    .sort(compareTasksForActiveSort);
}

function buildTaskCountText(visibleCount) {
  if (visibleCount === tasks.length) {
    return `${visibleCount} task${visibleCount === 1 ? "" : "s"}`;
  }

  return `${visibleCount} of ${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
}

function getFocusTasks() {
  return tasks
    .filter(function (task) {
      return isTaskInFocus(task);
    })
    .sort(compareFocusTasks);
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
    timeline: buildPersistedTimeline(task),
  };
}

function normalizeTask(task) {
  const timeline = Array.isArray(task.timeline) && task.timeline.length > 0
    ? task.timeline
    : [createTimelineEntry("Task record created")];
  const recurrenceConfig = getSystemTimelineEntry(timeline, "recurrence-config");
  const recurrenceState = getSystemTimelineEntry(timeline, "recurrence-state");

  return {
    id: task.id || crypto.randomUUID(),
    createdAt: task.created_at || task.createdAt || createTaskBaseTime(),
    title: task.title || "",
    priority: task.priority || "Medium",
    dueDate: task.due_date || task.dueDate || "",
    dueTime: task.due_time || task.dueTime || "",
    reminderEnabled: Boolean(task.reminder_enabled ?? task.reminderEnabled),
    reminderSentAt: task.reminder_sent_at || task.reminderSentAt || "",
    description: task.description || "",
    remark: task.remark || "",
    hierarchy: task.hierarchy || "",
    recurrenceRule: normalizeRecurrenceRule(recurrenceConfig && recurrenceConfig.rule) || "none",
    recurrenceLastGeneratedAt: recurrenceState && recurrenceState.generatedAt
      ? recurrenceState.generatedAt
      : "",
    actionRemarks: Array.isArray(task.action_remarks)
      ? task.action_remarks.slice(0, 3)
      : Array.isArray(task.actionRemarks)
      ? task.actionRemarks.slice(0, 3)
      : [],
    completed: Boolean(task.completed),
    timeline,
  };
}

function loadPinnedFocusTasks() {
  pinnedFocusTaskIds = readPinnedFocusTaskIds();
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

function normalizeRecurrenceRule(value) {
  const cleanedValue = String(value || "").trim().toLowerCase();

  if (!cleanedValue || cleanedValue === "none" || cleanedValue === "does not repeat") {
    return "none";
  }

  if (cleanedValue === "daily") return "daily";
  if (cleanedValue === "weekdays") return "weekdays";
  if (cleanedValue === "weekly") return "weekly";
  if (cleanedValue === "monthly") return "monthly";
  return "";
}

function formatRecurrenceRule(rule) {
  if (rule === "daily") return "Daily";
  if (rule === "weekdays") return "Weekdays";
  if (rule === "weekly") return "Weekly";
  if (rule === "monthly") return "Monthly";
  return "Does not repeat";
}

function getSystemTimelineEntry(timeline, systemType) {
  if (!Array.isArray(timeline)) {
    return null;
  }

  return timeline.find(function (entry) {
    return entry && entry.systemType === systemType;
  }) || null;
}

function buildPersistedTimeline(task) {
  let timeline = Array.isArray(task.timeline) ? task.timeline.slice() : [];

  timeline = upsertSystemTimelineEntry(
    timeline,
    "recurrence-config",
    task.recurrenceRule !== "none" ? { rule: task.recurrenceRule } : null
  );

  timeline = upsertSystemTimelineEntry(
    timeline,
    "recurrence-state",
    task.recurrenceRule !== "none" && task.recurrenceLastGeneratedAt
      ? { generatedAt: task.recurrenceLastGeneratedAt }
      : null
  );

  return timeline;
}

function upsertSystemTimelineEntry(timeline, systemType, data) {
  const filteredTimeline = timeline.filter(function (entry) {
    return !(entry && entry.systemType === systemType);
  });

  if (!data) {
    return filteredTimeline;
  }

  return [
    Object.assign(
      {
        text: systemType,
        time: createTaskBaseTime(),
        systemType,
      },
      data
    ),
  ].concat(filteredTimeline);
}

function formatPriority(priorityValue) {
  const value = priorityValue.trim().toLowerCase();

  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  if (value === "low") return "Low";
  return "";
}

function compareTasksForActiveSort(firstTask, secondTask) {
  if (activeSort === "oldest") {
    return getTaskCreatedTime(firstTask) - getTaskCreatedTime(secondTask);
  }

  if (activeSort === "due-soon") {
    return compareDeadline(firstTask, secondTask, "asc");
  }

  if (activeSort === "due-late") {
    return compareDeadline(firstTask, secondTask, "desc");
  }

  if (activeSort === "priority-high") {
    return getPriorityRank(secondTask.priority) - getPriorityRank(firstTask.priority);
  }

  if (activeSort === "priority-low") {
    return getPriorityRank(firstTask.priority) - getPriorityRank(secondTask.priority);
  }

  if (activeSort === "title-az") {
    return firstTask.title.localeCompare(secondTask.title);
  }

  if (activeSort === "title-za") {
    return secondTask.title.localeCompare(firstTask.title);
  }

  return getTaskCreatedTime(secondTask) - getTaskCreatedTime(firstTask);
}

function getPriorityRank(priority) {
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  return 1;
}

function compareDeadline(firstTask, secondTask, direction) {
  const firstHasDeadline = Boolean(firstTask.dueDate);
  const secondHasDeadline = Boolean(secondTask.dueDate);

  if (!firstHasDeadline && !secondHasDeadline) {
    return compareTasksForFallback(firstTask, secondTask, direction);
  }

  if (!firstHasDeadline) {
    return 1;
  }

  if (!secondHasDeadline) {
    return -1;
  }

  const firstDeadline = getTaskDeadlineTimestamp(firstTask);
  const secondDeadline = getTaskDeadlineTimestamp(secondTask);

  if (firstDeadline === secondDeadline) {
    return compareTasksForFallback(firstTask, secondTask, direction);
  }

  return direction === "asc"
    ? firstDeadline - secondDeadline
    : secondDeadline - firstDeadline;
}

function compareTasksForFallback(firstTask, secondTask, direction) {
  return direction === "asc"
    ? getTaskCreatedTime(firstTask) - getTaskCreatedTime(secondTask)
    : getTaskCreatedTime(secondTask) - getTaskCreatedTime(firstTask);
}

function getTaskDeadlineTimestamp(task) {
  if (!task.dueDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  const deadline = getTaskDeadline(task);
  return deadline ? deadline.getTime() : Number.MAX_SAFE_INTEGER;
}

function getTaskCreatedTime(task) {
  const createdTime = new Date(task.createdAt || "").getTime();
  return Number.isNaN(createdTime) ? 0 : createdTime;
}

function compareFocusTasks(firstTask, secondTask) {
  if (firstTask.completed !== secondTask.completed) {
    return firstTask.completed ? 1 : -1;
  }

  if (isTaskOverdue(firstTask) !== isTaskOverdue(secondTask)) {
    return isTaskOverdue(firstTask) ? -1 : 1;
  }

  if (isTaskPinned(firstTask) !== isTaskPinned(secondTask)) {
    return isTaskPinned(firstTask) ? -1 : 1;
  }

  return compareDeadline(firstTask, secondTask, "asc");
}

function isTaskInFocus(task) {
  return isTaskPinned(task) || isTaskOverdue(task) || isTaskDueToday(task);
}

function isTaskPinned(task) {
  return pinnedFocusTaskIds.includes(task.id);
}

function isTaskDueToday(task) {
  if (!task.dueDate || task.completed) {
    return false;
  }

  const today = new Date();
  const todayKey = buildDateInputValue(today);
  return task.dueDate === todayKey;
}

function hasStartedWork(task) {
  return task.timeline.some(function (entry) {
    return entry.text === "Started work on task";
  });
}

function buildFocusMeta(task) {
  const dueLine = task.dueDate
    ? `Due ${formatDate(task.dueDate)}${task.dueTime ? ` at ${formatTime(task.dueTime)}` : ""}`
    : "No due date yet";

  if (task.completed) {
    return `${dueLine} • Completed`;
  }

  if (isTaskOverdue(task)) {
    return `${dueLine} • Past deadline`;
  }

  if (isTaskDueToday(task)) {
    return `${dueLine} • Planned for today`;
  }

  if (isTaskPinned(task)) {
    return `${dueLine} • Manually pinned`;
  }

  return dueLine;
}

function createFocusActionDropdown(task) {
  const wrapper = document.createElement("label");
  wrapper.className = "focus-dropdown-label";

  const text = document.createElement("span");
  text.className = "focus-dropdown-text";
  text.textContent = "Quick Action";

  const select = document.createElement("select");
  select.className = "focus-action-select";

  [
    ["", "Choose action"],
    [isTaskPinned(task) ? "unpin" : "pin", isTaskPinned(task) ? "Unpin from Focus" : "Pin to Focus"],
    ["start", "Start Work"],
    ["plus-15", "Postpone +15 min"],
    ["tomorrow", "Move to Tomorrow"],
    ["next-week", "Move to Next Week"],
  ].forEach(function (entry) {
    const option = document.createElement("option");
    option.value = entry[0];
    option.textContent = entry[1];
    select.appendChild(option);
  });

  select.addEventListener("change", async function () {
    if (!select.value) {
      return;
    }

    await handleFocusActionSelection(task.id, select.value);
    select.value = "";
  });

  wrapper.appendChild(text);
  wrapper.appendChild(select);
  return wrapper;
}

async function handleFocusActionSelection(taskId, action) {
  if (action === "pin" || action === "unpin") {
    toggleFocusPin(taskId);
    return;
  }

  if (action === "start") {
    await startWorkOnTask(taskId);
    return;
  }

  if (action === "plus-15") {
    await postponeTask(taskId, 15);
    return;
  }

  if (action === "tomorrow") {
    await moveTaskToDayOffset(taskId, 1);
    return;
  }

  if (action === "next-week") {
    await moveTaskToDayOffset(taskId, 7);
  }
}

function toggleFocusPin(taskId) {
  if (pinnedFocusTaskIds.includes(taskId)) {
    pinnedFocusTaskIds = pinnedFocusTaskIds.filter(function (id) {
      return id !== taskId;
    });
  } else {
    pinnedFocusTaskIds = [taskId].concat(pinnedFocusTaskIds);
  }

  persistPinnedFocusTaskIds();
  renderTasks();
}

async function startWorkOnTask(taskId) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  task.timeline.unshift(createTimelineEntry("Started work on task"));
  await saveTask(task);
  renderTasks();
}

async function postponeTask(taskId, minuteOffset) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  const baseDate = getTaskDeadline(task) || new Date();
  const nextDate = new Date(baseDate.getTime() + minuteOffset * 60000);
  updateTaskDeadline(task, nextDate, `Postponed by ${minuteOffset} minutes`);
  await saveTask(task);
  renderTasks();
}

async function moveTaskToDayOffset(taskId, dayOffset) {
  const task = tasks.find(function (savedTask) {
    return savedTask.id === taskId;
  });

  if (!task) {
    return;
  }

  const baseDate = getTaskDeadline(task) || new Date();
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + dayOffset);
  updateTaskDeadline(task, nextDate, dayOffset === 1 ? "Moved to tomorrow" : "Moved to next week");
  await saveTask(task);
  renderTasks();
}

function updateTaskDeadline(task, nextDate, timelineText) {
  task.dueDate = buildDateInputValue(nextDate);
  task.dueTime = buildTimeInputValue(nextDate);
  task.reminderSentAt = "";
  task.timeline.unshift(createTimelineEntry(timelineText));
}

async function maybeCreateNextRecurringTask(task, completionTime) {
  if (task.recurrenceRule === "none" || task.recurrenceLastGeneratedAt === completionTime) {
    return;
  }

  const nextTask = buildNextRecurringTask(task);

  if (!nextTask) {
    return;
  }

  const result = await supabaseClient
    .from("tasks")
    .insert(prepareTaskForDatabase(nextTask))
    .select()
    .single();

  if (result.error) {
    showAppMessage(`Could not create the next recurring task: ${result.error.message}`);
    window.alert(`Could not create the next recurring task: ${result.error.message}`);
    return;
  }

  task.recurrenceLastGeneratedAt = completionTime;
  task.timeline.unshift(createTimelineEntry(`Next ${formatRecurrenceRule(task.recurrenceRule).toLowerCase()} task created`));
  await saveTask(task);
  tasks.unshift(normalizeTask(result.data));
}

function buildNextRecurringTask(task) {
  const nextDeadline = calculateNextRecurringDeadline(task);

  if (!nextDeadline) {
    return null;
  }

  return createTask({
    title: task.title,
    priority: task.priority,
    dueDate: buildDateInputValue(nextDeadline),
    dueTime: buildTimeInputValue(nextDeadline),
    reminderEnabled: task.reminderEnabled,
    description: task.description,
    remark: task.remark,
    hierarchy: task.hierarchy,
    recurrenceRule: task.recurrenceRule,
    actionRemarks: task.actionRemarks.slice(),
    timelineText: `Created from ${formatRecurrenceRule(task.recurrenceRule).toLowerCase()} recurrence`,
  });
}

function calculateNextRecurringDeadline(task) {
  const baseDate = getTaskDeadline(task);

  if (!baseDate) {
    return null;
  }

  const nextDate = new Date(baseDate);

  if (task.recurrenceRule === "daily") {
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  }

  if (task.recurrenceRule === "weekdays") {
    nextDate.setDate(nextDate.getDate() + 1);

    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  if (task.recurrenceRule === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  }

  if (task.recurrenceRule === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  return null;
}

function readPinnedFocusTaskIds() {
  const storageKey = getPinnedFocusStorageKey();

  if (!storageKey) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (_error) {
    return [];
  }
}

function persistPinnedFocusTaskIds() {
  const storageKey = getPinnedFocusStorageKey();

  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(pinnedFocusTaskIds));
  } catch (_error) {
    return;
  }
}

function getPinnedFocusStorageKey() {
  if (!currentUser || !currentUser.id) {
    return "";
  }

  return `sajin-focus-pins-${currentUser.id}`;
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

function buildDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTimeInputValue(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
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
