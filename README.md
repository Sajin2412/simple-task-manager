# Simple Task Manager

This is a very small personal task management web app made with:

- HTML
- CSS
- JavaScript
- Supabase

## Features

- Add a new task
- Choose priority: High, Medium, or Low
- Add a due date
- Add a due time
- Edit an existing task
- Add a description for detailed explanation
- Add one remark and up to 3 action remarks
- Add hierarchy like `Work > Project > Task`
- Import many tasks at once from Excel-saved CSV
- Sign up and log in with email and password
- Sync the same tasks on iPhone and Mac
- Mark tasks as completed
- Delete tasks
- Filter tasks by status or priority
- Get browser reminders 15 minutes before deadline while the app is open
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

## Supabase setup

To make login and sync work, do these steps once.

### 1. Create a Supabase project

1. Go to [Supabase](https://supabase.com)
2. Create an account
3. Create a new project
4. Wait until the project is ready

### 2. Create the tasks table

In Supabase, open the SQL Editor and run this:

```sql
create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  priority text not null default 'Medium',
  due_date date,
  due_time time,
  reminder_enabled boolean not null default false,
  reminder_sent_at timestamptz,
  description text not null default '',
  remark text not null default '',
  hierarchy text not null default '',
  action_remarks jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

### 3. Turn on row security

Run this in SQL Editor:

```sql
alter table public.tasks enable row level security;

create policy "Users can view their own tasks"
on public.tasks
for select
using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
on public.tasks
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
on public.tasks
for update
using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
on public.tasks
for delete
using (auth.uid() = user_id);
```

### 4. Allow email login

1. In Supabase, open `Authentication`
2. Open `Providers`
3. Make sure `Email` is enabled

### 5. Add your project keys to the app

1. In Supabase, open `Project Settings`
2. Open `API`
3. Copy:
   - `Project URL`
   - `anon public key`
4. In this project folder, open [supabase-config.js](/Users/mac/Documents/SI%20-%20Codex/supabase-config.js)
5. Replace the empty values with your real Supabase keys

Example:

```js
window.SUPABASE_URL = "https://your-project-id.supabase.co";
window.SUPABASE_ANON_KEY = "your-anon-key";
```

## Use it on iPhone

To use this on your iPhone, the app should be hosted online.

Simple steps:

1. Put the project on GitHub.
2. Enable GitHub Pages for the repository.
3. Open the GitHub Pages link in Safari on your iPhone.
4. Tap `Share`.
5. Tap `Add to Home Screen`.

After that, it will behave more like a simple app on your phone.

Important reminder note:

- This version can show reminders while the app is open and notifications are allowed
- It is not a full background push notification system yet
- For guaranteed reminders even when the app is closed, the next step would be adding a backend service

## Bulk import from Excel

The simplest way is:

1. Create your tasks in Excel
2. Use these column names in the first row:
   - `title`
   - `priority`
   - `dueDate`
   - `dueTime`
   - `description`
   - `remark`
   - `hierarchy`
   - `actionRemark1`
   - `actionRemark2`
   - `actionRemark3`
3. Save the file as `CSV`
4. In the app, use `Bulk Import From Excel`
5. Select the CSV file

Example:

```text
title,priority,dueDate,dueTime,description,remark,hierarchy,actionRemark1,actionRemark2,actionRemark3
Pay rent,High,2026-03-25,09:00,Monthly house rent,Do before morning,Home > Finance > Rent,Check account balance,Send transfer,Save receipt
```

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
   - `supabase-config.js`
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
- `supabase-config.js` connects the app to your Supabase project

## New beginner-friendly upgrades

- Click `Edit` to change the task name, priority, or due date
- Use the `Filter` dropdown to quickly view certain tasks
- The design has a slightly more polished look, but still stays simple

## Saving data

Tasks are now saved in Supabase, so the same account can use the same tasks on different devices.
