# HTML Template Builder v1.0.0

A simple Node.js-based static site builder that processes custom HTML templates and assembles pages using placeholders like `<!-->TEMPLATENAME<-->`.

---

## ✨ Features

- ✅ Replaces `<!-->TEMPLATENAME<-->` with the contents of `src/TEMPLATENAME.html`
- 🔁 Recursively resolves nested template placeholders
- 📦 Supports parameter injection in templates via:
  ```html
  <!-->TEMPLATE:::param1:::(((value))):::param2:::(((value2)))<-->
  ```
  With placeholders like `:::param1:::` inside `TEMPLATE.html`
- 🌐 Replaces all `BASE_URL` strings with `.env` value or local path (in dev mode)
- 📁 Processes all `src/pages/*.html` into `dist/[page-name]/index.html`
- 🧩 Full support for `src/assets` → copied to `dist/assets`
- 🛠️ `--dev` and `--watch` modes for local development
- 🔄 Live-reloading via `browser-sync`
- 🧰 Easy to extend and customize

---

## 🔧 Setup

```bash
npm install
```

---

## 🚀 Build

```bash
npm run build
```

This will:

- Process `src/index.html` and `src/pages/*.html`
- Resolve all template placeholders (recursively)
- Replace `BASE_URL` strings
- Copy `src/assets` to `dist/assets`
- Output to `dist/`

---

## 💻 Development Mode

```bash
npm run dev
```

This will:

- Start a local server at `http://localhost:3000`
- Watch for file changes in `src/`
- Automatically rebuild and reload the browser
- Replace `BASE_URL` with local relative path (so links/images work locally)

---

## 🧩 Template Syntax

### Basic Template:

```html
<!-->HEADER<-->
```

Injects contents of `src/header.html`

### Recursive Nesting:

```html
<!-->LAYOUT<-->
<!-- inside layout.html: <!-->HEADER<-->
<!-->FOOTER<-->
-->
```

### Parameterized Template:

```html
<!-->CARD:::title:::(((My Title))):::desc:::(((Some description)))<-->
```

With `src/card.html`:

```html
<div class="card">
	<h2>:::title:::</h2>
	<p>:::desc:::</p>
</div>
```

---

## 🌱 Environment Variables

`.env` file:

```env
BASE_URL=https://example.com/
```

Used in build mode to replace all `BASE_URL` occurrences in HTML.

---

## 📁 Project Structure

```
src/
  index.html
  assets/
    ...
  pages/
    about.html
  components/
    header.html
    footer.html
dist/
  index.html
  about/index.html
  assets/
```

---

## 🛠️ Scripts

| Command         | Description                      |
| --------------- | -------------------------------- |
| `npm run build` | Builds all pages for production  |
| `npm run dev`   | Starts live dev server + watcher |

---
