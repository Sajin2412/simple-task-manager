const storageKey = "crt-document-upload-fy26";
const questionArea = document.getElementById("question-area");
const stepLabel = document.getElementById("step-label");
const requiredLabel = document.getElementById("required-label");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const submissionList = document.getElementById("submission-list");
const emptyState = document.getElementById("empty-state");
const downloadButton = document.getElementById("download-button");

const questions = [
  {
    id: "institute",
    label: "Institute/College Name",
    type: "text",
    icon: "⌘",
    placeholder: "Sajin College",
    required: true,
  },
  {
    id: "student",
    label: "Student Name",
    type: "text",
    icon: "👤",
    placeholder: "Enter student name",
    required: true,
  },
  {
    id: "mobile",
    label: "Student Mobile Number",
    type: "tel",
    icon: "☎",
    placeholder: "Enter mobile number",
    required: true,
  },
  {
    id: "invoice",
    label: "Invoice Number",
    type: "text",
    icon: "□",
    placeholder: "Enter invoice number",
    required: true,
  },
  {
    id: "serial",
    label: "Product Serial Number",
    type: "text",
    icon: "⌗",
    placeholder: "Enter product serial number",
    required: true,
  },
  {
    id: "category",
    label: "CRT Claim Category",
    type: "select",
    icon: "▾",
    required: true,
    options: ["Student Offer", "Education Purchase", "Document Correction", "Re-upload Request"],
  },
  {
    id: "document",
    label: "Upload CRT Supporting Document",
    type: "file",
    icon: "⇪",
    required: true,
  },
  {
    id: "remark",
    label: "Remarks",
    type: "textarea",
    icon: "✎",
    placeholder: "Enter any additional CRT remarks",
    required: false,
  },
  {
    id: "review",
    label: "Review & Submit",
    type: "review",
    required: false,
  },
];

let currentStep = 0;
let formData = {};
let submissions = loadSubmissions();

prevButton.addEventListener("click", goToPreviousStep);
nextButton.addEventListener("click", goToNextStep);
downloadButton.addEventListener("click", downloadCsv);

renderQuestion();
renderSubmissions();

function renderQuestion() {
  const question = questions[currentStep];
  questionArea.innerHTML = "";
  stepLabel.textContent = `Step ${currentStep + 1} of ${questions.length}`;
  requiredLabel.textContent = question.required ? "Required" : "Optional";
  prevButton.disabled = currentStep === 0;
  nextButton.textContent = currentStep === questions.length - 1 ? "Submit →" : "Next →";

  const label = document.createElement("label");
  label.className = "question-label";
  label.textContent = question.label;

  if (question.required) {
    const star = document.createElement("span");
    star.className = "required-star";
    star.textContent = " *";
    label.appendChild(star);
  }

  questionArea.appendChild(label);

  if (question.type === "review") {
    questionArea.appendChild(renderReview());
  } else {
    questionArea.appendChild(renderInput(question));
  }

  const message = document.createElement("p");
  message.id = "validation-message";
  message.className = "validation-message";
  questionArea.appendChild(message);

  const input = questionArea.querySelector("input, select, textarea");
  if (input && question.type !== "file") {
    input.focus();
  }
}

function renderInput(question) {
  const shell = document.createElement("div");
  shell.className = question.type === "textarea"
    ? "field-shell textarea-field"
    : question.type === "file"
    ? "field-shell upload-field"
    : "field-shell";

  const icon = document.createElement("span");
  icon.className = "field-icon";
  icon.textContent = question.icon || "";
  shell.appendChild(icon);

  if (question.type === "select") {
    const select = document.createElement("select");
    select.id = question.id;
    question.options.forEach(function (optionText) {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      option.selected = formData[question.id] === optionText;
      select.appendChild(option);
    });
    shell.appendChild(select);
    return shell;
  }

  if (question.type === "textarea") {
    const textarea = document.createElement("textarea");
    textarea.id = question.id;
    textarea.placeholder = question.placeholder || "";
    textarea.value = formData[question.id] || "";
    shell.appendChild(textarea);
    return shell;
  }

  const input = document.createElement("input");
  input.id = question.id;
  input.type = question.type;
  input.placeholder = question.placeholder || "";

  if (question.type === "file") {
    input.accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
  } else {
    input.value = formData[question.id] || "";
  }

  shell.appendChild(input);
  return shell;
}

function renderReview() {
  const list = document.createElement("div");
  list.className = "review-list";

  questions
    .filter(function (question) {
      return question.type !== "review";
    })
    .forEach(function (question) {
      const row = document.createElement("div");
      row.className = "review-row";

      const label = document.createElement("span");
      label.textContent = question.label;

      const value = document.createElement("strong");
      value.textContent = formData[question.id] || "Not added";

      row.appendChild(label);
      row.appendChild(value);
      list.appendChild(row);
    });

  return list;
}

function goToPreviousStep() {
  saveCurrentValue();
  currentStep = Math.max(0, currentStep - 1);
  renderQuestion();
}

function goToNextStep() {
  if (!saveCurrentValue()) {
    return;
  }

  if (currentStep === questions.length - 1) {
    submitEntry();
    return;
  }

  currentStep += 1;
  renderQuestion();
}

function saveCurrentValue() {
  const question = questions[currentStep];

  if (question.type === "review") {
    return true;
  }

  const input = document.getElementById(question.id);
  const value = question.type === "file"
    ? input.files && input.files[0]
      ? input.files[0].name
      : formData[question.id] || ""
    : input.value.trim();

  if (question.required && !value) {
    showValidation("Please fill this field before moving next.");
    return false;
  }

  formData[question.id] = value;
  return true;
}

function showValidation(message) {
  const validation = document.getElementById("validation-message");
  validation.textContent = message;
}

function submitEntry() {
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...formData,
  };

  submissions.unshift(entry);
  persistSubmissions();
  formData = {};
  currentStep = 0;
  renderQuestion();
  renderSubmissions();
}

function renderSubmissions() {
  submissionList.innerHTML = "";
  emptyState.hidden = submissions.length > 0;

  submissions.forEach(function (entry) {
    const card = document.createElement("article");
    card.className = "submission-card";

    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = entry.institute || "CRT Entry";

    const details = document.createElement("p");
    details.textContent = `${entry.student || "Student"} · ${entry.invoice || "No invoice"} · ${entry.category || "No category"}`;

    const documentLine = document.createElement("p");
    documentLine.textContent = `Document: ${entry.document || "Not added"}`;

    content.appendChild(title);
    content.appendChild(details);
    content.appendChild(documentLine);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-entry";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      submissions = submissions.filter(function (savedEntry) {
        return savedEntry.id !== entry.id;
      });
      persistSubmissions();
      renderSubmissions();
    });

    card.appendChild(content);
    card.appendChild(deleteButton);
    submissionList.appendChild(card);
  });
}

function downloadCsv() {
  const headers = ["Institute", "Student", "Mobile", "Invoice", "Serial", "Category", "Document", "Remarks", "Created At"];
  const rows = submissions.map(function (entry) {
    return [
      entry.institute,
      entry.student,
      entry.mobile,
      entry.invoice,
      entry.serial,
      entry.category,
      entry.document,
      entry.remark,
      entry.createdAt,
    ];
  });
  const csv = [headers].concat(rows).map(function (row) {
    return row.map(escapeCsv).join(",");
  }).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `crt-document-upload-fy26-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function loadSubmissions() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch (_error) {
    return [];
  }
}

function persistSubmissions() {
  window.localStorage.setItem(storageKey, JSON.stringify(submissions));
}
