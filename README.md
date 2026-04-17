# DevToools

Lightweight, privacy-first developer utilities that run entirely in the browser. Your data never leaves your machine.

## ✨ Features

### JSON Formatter

- Paste or upload JSON and instantly view a pretty-printed, syntax-highlighted tree
- Collapse / expand individual nodes or the entire tree at once
- Copy the formatted output or minified version with a single click
- Shows live stats (character count, byte size, line count)

### Text Diff

- Compare two blocks of text side by side
- Switch between **line-level** and **word-level** diff modes
- Additions and removals are clearly highlighted with color coding

### Base64 Encoder / Decoder

- Encode any UTF-8 string to Base64 or decode Base64 back to text
- Full Unicode support
- One-click copy of results

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| UI Components | [Radix UI](https://www.radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| Build Tool | [Vite](https://vitejs.dev) |
| Deployment | [Cloudflare Workers](https://workers.cloudflare.com) via [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+ (or [Bun](https://bun.sh))
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/bchmsl/devtoools.git
cd devtoools

# Install dependencies
npm install
```

### Development

```bash
# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in your terminal).

### Build

```bash
# Production build
npm run build

# Preview the production build locally
npm run preview
```

### Linting & Formatting

```bash
# Lint with ESLint
npm run lint

# Format with Prettier
npm run format
```

## 🌐 Deployment

The project is pre-configured for **Cloudflare Workers**. To deploy:

```bash
npx wrangler deploy
```

See [`wrangler.jsonc`](wrangler.jsonc) for the worker configuration.

## 📁 Project Structure

```
src/
├── assets/            # Static assets (logo, images)
├── components/        # Feature & UI components
│   ├── ui/            # shadcn/ui primitives
│   ├── Base64Tool.tsx # Base64 encoder/decoder
│   ├── JsonFormatter.tsx # JSON formatter with tree view
│   ├── JsonView.tsx   # Collapsible JSON tree renderer
│   ├── TextDiff.tsx   # Side-by-side text diff
│   └── ThemeToggle.tsx # Dark/light theme switcher
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── routes/            # TanStack Router file-based routes
│   ├── __root.tsx     # Root layout
│   └── index.tsx      # Home page (tool tabs)
├── router.tsx         # Router configuration
└── styles.css         # Global styles & CSS variables
```

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please make sure your code passes linting (`npm run lint`) and is formatted (`npm run format`) before submitting.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
