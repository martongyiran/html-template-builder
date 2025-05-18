# HTML Template Builder

A simple Node.js-based static site builder that processes custom HTML templates and assembles pages using placeholders like `<!-->TEMPLATENAME<-->`.

---

## ✨ Features

- Replaces `<!-->TEMPLATENAME<-->` with the contents of `src/TEMPLATENAME.html`
- Recursively resolves nested template placeholders
- Replaces all `BASE_URL` strings with `.env` value or local path (in dev mode)
- Supports `src/pages/*.html` — each becomes a standalone route at `dist/[page-name]/index.html`
- Supports `--dev` and `--watch` modes for local development
- Live-reloads with `browser-sync`
- Easy to extend and customize

---

## 🔧 Setup

```bash
npm install
```
