const questionArea = document.getElementById("question-area");
const stepLabel = document.getElementById("step-label");
const requiredLabel = document.getElementById("required-label");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

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
    maxLength: 10,
    pattern: "^[0-9]{10}$",
    validationMessage: "Please enter a valid 10 digit mobile number.",
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
    maxSizeMb: 8,
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
let isCompleted = false;

prevButton.addEventListener("click", goToPreviousStep);
nextButton.addEventListener("click", goToNextStep);

renderQuestion();

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

  if (question.id === "mobile") {
    input.inputMode = "numeric";
    input.maxLength = question.maxLength;
    input.pattern = "[0-9]{10}";
    input.addEventListener("input", function () {
      input.value = input.value.replace(/\D/g, "").slice(0, 10);
    });
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

async function goToPreviousStep() {
  await saveCurrentValue({ validateRequired: false });
  currentStep = Math.max(0, currentStep - 1);
  renderQuestion();
}

async function goToNextStep() {
  if (isCompleted) {
    resetForm();
    return;
  }

  if (!(await saveCurrentValue({ validateRequired: true }))) {
    return;
  }

  if (currentStep === questions.length - 1) {
    await submitEntry();
    return;
  }

  currentStep += 1;
  renderQuestion();
}

async function saveCurrentValue(options) {
  const question = questions[currentStep];
  const shouldValidateRequired = !options || options.validateRequired !== false;

  if (question.type === "review") {
    return true;
  }

  const input = document.getElementById(question.id);
  let value = input.value.trim();

  if (question.type === "file") {
    const file = input.files && input.files[0] ? input.files[0] : null;

    if (!file && formData[question.id]) {
      return true;
    }

    if (!file) {
      value = "";
    } else {
      const maxBytes = (question.maxSizeMb || 8) * 1024 * 1024;

      if (file.size > maxBytes) {
        showValidation(`Please upload a file up to ${question.maxSizeMb || 8} MB.`);
        return false;
      }

      const fileData = await readFileAsBase64(file);
      formData.document = file.name;
      formData.documentMimeType = file.type || "application/octet-stream";
      formData.documentBase64 = fileData.base64;
      value = file.name;
    }
  }

  if (shouldValidateRequired && question.required && !value) {
    showValidation("Please fill this field before moving next.");
    return false;
  }

  if (question.pattern && !new RegExp(question.pattern).test(value)) {
    showValidation(question.validationMessage || "Please enter a valid value.");
    return false;
  }

  if (question.type !== "file") {
    formData[question.id] = value;
  }

  return true;
}

function showValidation(message) {
  const validation = document.getElementById("validation-message");
  validation.textContent = message;
}

async function submitEntry() {
  const entry = {
    submittedAt: new Date().toLocaleString(),
    institute: formData.institute || "",
    student: formData.student || "",
    mobile: formData.mobile || "",
    invoice: formData.invoice || "",
    serial: formData.serial || "",
    category: formData.category || "",
    document: formData.document || "",
    documentMimeType: formData.documentMimeType || "",
    documentBase64: formData.documentBase64 || "",
    remark: formData.remark || "",
  };

  nextButton.disabled = true;
  nextButton.textContent = "Submitting...";

  const submitted = await sendToGoogleSheet(entry);

  if (!submitted) {
    nextButton.disabled = false;
    nextButton.textContent = "Submit →";
    return;
  }

  showSuccess();
}

async function sendToGoogleSheet(entry) {
  const googleSheetUrl = window.CRT_GOOGLE_SHEET_WEB_APP_URL || "";

  if (!googleSheetUrl) {
    showValidation("Google Sheet is not connected yet. Paste your Apps Script Web App URL in google-sheet-config.js.");
    return false;
  }

  try {
    await fetch(googleSheetUrl, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(entry),
    });
    return true;
  } catch (_error) {
    showValidation("Could not send data to Google Sheet. Please check the Apps Script Web App URL.");
    return false;
  }
}

function showSuccess() {
  questionArea.innerHTML = "";
  stepLabel.textContent = "Completed";
  requiredLabel.textContent = "Submitted";
  prevButton.disabled = true;
  nextButton.textContent = "New Entry →";
  nextButton.disabled = false;
  isCompleted = true;

  const title = document.createElement("p");
  title.className = "question-label";
  title.textContent = "CRT form submitted successfully";

  const message = document.createElement("p");
  message.className = "success-message";
  message.textContent = "Your CRT document upload form entry has been sent to the online Google Sheet.";

  questionArea.appendChild(title);
  questionArea.appendChild(message);
}

function resetForm() {
  formData = {};
  currentStep = 0;
  isCompleted = false;
  renderQuestion();
}

function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function () {
      const result = String(reader.result || "");
      resolve({
        base64: result.includes(",") ? result.split(",").pop() : result,
      });
    };

    reader.onerror = function () {
      reject(reader.error);
    };

    reader.readAsDataURL(file);
  });
}
