# Simple Task Manager

This is a very small personal task management web app made with:

- HTML
- CSS
- JavaScript

## Features

- Add a new task
- Choose priority: High, Medium, or Low
- Add a due date
- Edit an existing task
- Add a description for detailed explanation
- Add one remark and up to 3 action remarks
- Mark tasks as completed
- Delete tasks
- Filter tasks by status or priority
- Keep a simple timeline record for each task
- View all tasks in a clean list

## How to run

### Option 1: Easiest way

1. Open the project folder.
2. Double-click `index.html`.
3. The app will open in your web browser.

### Option 2: Run a local server

If you have Python installed, open Terminal in this folder and run:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Use it on iPhone

To use this on your iPhone, the app should be hosted online.

Simple steps:

1. Put the project on GitHub.
2. Enable GitHub Pages for the repository.
3. Open the GitHub Pages link in Safari on your iPhone.
4. Tap `Share`.
5. Tap `Add to Home Screen`.

After that, it will behave more like a simple app on your phone.

## Very simple hosting option: GitHub Pages

1. Create a GitHub account if you do not already have one.
2. Click `New repository`.
3. Name it something like `simple-task-manager`.
4. Keep it `Public`.
5. Click `Create repository`.
6. Upload these files:
   - `index.html`
   - `style.css`
   - `script.js`
   - `manifest.webmanifest`
   - `service-worker.js`
   - `README.md`
7. In GitHub, open the repository `Settings`.
8. Open `Pages`.
9. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
10. Click `Save`.
11. Wait 1 to 3 minutes.
12. GitHub will show your website link.

Open that link on your iPhone in Safari.

## If you want to upload using Terminal

Run these commands one by one after you create the empty GitHub repository:

```bash
cd "/Users/mac/Documents/SI - Codex"
git add .
git commit -m "Initial task manager app"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the URL GitHub gives you.

Example:

```bash
git remote add origin https://github.com/your-name/simple-task-manager.git
```

## How it works

- `index.html` creates the page structure
- `style.css` makes the app look clean and simple
- `script.js` handles adding, completing, deleting, and saving tasks
- `manifest.webmanifest` helps the app install on phones
- `service-worker.js` helps the app load like a simple offline-friendly web app

## New beginner-friendly upgrades

- Click `Edit` to change the task name, priority, or due date
- Use the `Filter` dropdown to quickly view certain tasks
- The design has a slightly more polished look, but still stays simple

## Saving data

Tasks are saved in your browser using `localStorage`, so they stay there even if you refresh the page.
