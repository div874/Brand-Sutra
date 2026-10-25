# Brand Sutra (Inkloom AI)

> **A simple way to check brand content before it goes live.**  
> Pre-publish brand voice, terminology, and fact consistency verification platform.

---

## 📌 Round 1 — Product Plan

- **Participant**: Divyansh Chandra
- **Institution**: NMIMS Navi Mumbai
- **Repository**: [https://github.com/div874/Brand-Sutra](https://github.com/div874/Brand-Sutra)

---

## 🎯 The Problem

Teams publish content through employees, freelancers, agencies, and generative AI tools. When multiple stakeholders create copy:
- Brand voice fluctuates unpredictably.
- Outdated metrics or unapproved claims slip through into live marketing materials.
- Reviewers spend excessive time manually cross-referencing brand books and audit documents.

**Brand Sutra** solves this by flagging tone drift, prohibited terms, and fact conflicts against verified sources *before* publishing—assisting human reviewers rather than replacing their judgment.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 | Interactive dual-pane editor, brand rules viewer, audit log |
| **Icons & UI** | Lucide React | High-contrast accessible indicators, badges, and workflow actions |
| **State & Storage** | React Context + LocalStorage Persistence | Real-time edits, role switcher, suggestion acceptance, review comments |
| **Rule Engine** | Deterministic Regex + LLM Verification Pipeline | Instant prohibited term detection & trusted fact verification |

---

## 🚀 Key Features

1. **Brand Profile & Guidelines Hub**:
   - **Tone Guidelines**: Core voice principles, "Do" and "Don't" practical examples.
   - **Terminology Rules**: Prohibited buzzwords/claims with explanations and approved alternatives.
   - **Trusted Facts Repository**: Verified company statistics linked to official source documents.

2. **Interactive Content Checking**:
   - Live split-view draft editor.
   - Category-coded findings: `Tone Mismatch`, `Prohibited Term`, `Fact Conflict`, `Needs Verification`.
   - Explanations stating **"Why this matters"** instead of an arbitrary quality score.
   - Surgical **1-Click "Apply Edit"** to replace inaccurate copy without rewriting the author's work.

3. **Creator & Reviewer Collaborative Workflow**:
   - Built-in **Role Switcher** (`Creator` vs `Reviewer`).
   - Reviewer actions: **Approve Draft** or **Request Changes** with structured notes.
   - In-app threaded review comments.

4. **Compliance & Audit Log**:
   - Immutable timeline of actions (status transitions, accepted fixes, ignored warnings, and feedback).

---

## 🛠️ Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/div874/Brand-Sutra.git
cd Brand-Sutra

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
