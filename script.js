const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskPriorityInput = document.getElementById("task-priority");
const taskDueDateInput = document.getElementById("task-due-date");
const taskDescriptionInput = document.getElementById("task-description");
const taskRemarkInput = document.getElementById("task-remark");
const taskActionRemark1Input = document.getElementById("task-action-remark-1");
const taskActionRemark2Input = document.getElementById("task-action-remark-2");
const taskActionRemark3Input = document.getElementById("task-action-remark-3");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const taskFilter = document.getElementById("task-filter");

const storageKey = "simple-task-manager-tasks";
let tasks = loadTasks();
let activeFilter = "all";

renderTasks();

taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = taskTitleInput.value.trim();

  if (!title) {
    return;
  }

  const newTask = {
    id: crypto.randomUUID(),
    title,
    priority: taskPriorityInput.value,
    dueDate: taskDueDateInput.value,
    description: taskDescriptionInput.value.trim(),
    remark: taskRemarkInput.value.trim(),
    actionRemarks: collectActionRemarks(),
    completed: false,
    timeline: [createTimelineEntry("Task created")],
  };

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
      dueDateBadge.textContent = `Due: ${formatDate(task.dueDate)}`;
      meta.appendChild(dueDateBadge);
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

  details.appendChild(createTextSection("Remark", task.remark || "No remark added."));

  const actionSectionTitle = document.createElement("p");
  actionSectionTitle.className = "details-title";
  actionSectionTitle.textContent = "Action Remarks";
  details.appendChild(actionSectionTitle);

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

function createTextSection(title, text) {
  const wrapper = document.createElement("div");
  const sectionTitle = document.createElement("p");
  sectionTitle.className = "details-title";
  sectionTitle.textContent = title;

  const sectionText = document.createElement("p");
  sectionText.className = "detail-text";
  sectionText.textContent = text;

  wrapper.appendChild(sectionTitle);
  wrapper.appendChild(sectionText);
  return wrapper;
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
    description: task.description || "",
    remark: task.remark || "",
    actionRemarks: Array.isArray(task.actionRemarks) ? task.actionRemarks.slice(0, 3) : [],
    completed: Boolean(task.completed),
    timeline: Array.isArray(task.timeline) && task.timeline.length > 0
      ? task.timeline
      : [createTimelineEntry("Task record created")],
  };
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

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
      console.error("Service worker registration failed:", error);
    });
  });
}
