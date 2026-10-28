# Brand Sutra — Round 2 Feature & Compliance Evidence Manifesto

**Product Name:** Brand Sutra  
**Submission Category:** Autonomous Brand Governance & Compliance Copilot  
**Evaluator Target:** Round 2 Technical & Governance Evaluation  
**System Architecture:** Next.js 16 (Turbopack) • Groq RAG Engine (Qwen / LLaMA 3.3) • Supabase / pgvector • Dynamic Rule Ingestion  

---

## Executive Summary

Brand Sutra is an enterprise AI brand copilot designed to eliminate regulatory violations, greenwashing claims, and brand voice drift in digital marketing and product launch drafts before publication. 

Unlike generic grammar checkers, Brand Sutra grounds audits against **dynamic brand guidelines**, **verified engineering specifications**, and **regulatory standards (FTC, FDA, CMA)** using a hybrid lexical/dense retrieval pipeline.

---

## 1. Feature Demonstration & Visual Evidence

### 1.1 Multi-Brand Governance & Data Isolation
Brand Sutra supports multiple independent brand workspaces. Each brand maintains strictly isolated terminology rules, verified facts, approved wording, drafts, and past reviewer decisions.

![Brand Workspaces Home Page](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/home_page_brands_1793220447941.png)
*Figure 1: Brand Workspaces Home Page showing active workspace indicator, rule count badges, draft counters, and brand removal controls.*

> [!NOTE]
> Workspaces enforce strict tenant isolation. Prohibited terms and lab certifications from Brand A are completely inaccessible to Brand B, preventing cross-tenant guideline leakage.

---

### 1.2 Dual-Pane Live Compliance Dashboard & Sample Drafts
The compliance dashboard pairs an active draft editor with real-time word/character telemetry and quick-load sample draft presets (Risky Launch Copy vs. Compliant Version).

![Initial Dashboard State](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/dashboard_initial_1793220393170.png)
*Figure 2: Dual-Pane Draft Editor with instant brand sample presets, live word counts, review status pills, and toolbar actions.*

---

### 1.3 RAG-Powered Violation Detection with Ground-Truth Citations
When copy is audited, the engine segments the text, executes hybrid retrieval across official guidelines and facts, and generates structured findings with exact quotes, severities, explanations, approved alternatives, and ground-truth evidence citations.

![Audit Results and Findings Breakdown](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/echostream_audit_results_1793220495840.png)
*Figure 3: Finding cards categorized by High, Medium, and Low severity. Each card cites the exact source document, page number, and lab test benchmark.*

#### Evaluated Violations Table
| Flagged Phrase | Issue Type | Severity | Ground-Truth Violation Reason | Approved Alternative |
| :--- | :--- | :--- | :--- | :--- |
| `"revolutionary"` | Terminology | Low | Hyperbolic buzzword breaching grounded brand voice. | `"thoughtfully redesigned"` |
| `"made entirely from recycled plastic"` | Fact Conflict | High | Overstates certified material composite (80% recycled, 20% resin). | `"80% certified post-consumer recycled plastic"` |
| `"75-hour continuous battery"` | Fact Conflict | High | Contradicts verified Hardware Lab Protocol v2.4 (max 48 hours). | `"up to 48 hours of tested battery life"` |
| `"guaranteed unbreakable"` | Terminology | High | Prohibited legal liability; creates false durability warranty. | `"tested for drop resilience up to 2 meters"` |
| `"most eco-friendly audio gear"` | Unverified Claim | Medium | Unsubstantiated superlative claim violating CMA/FTC rules. | `"designed to minimize environmental footprint"` |

---

### 1.4 One-Click Batch Remediation ("Apply All Safe Fixes")
Copywriters can surgically resolve all compliant replacements in a single click. Replacements occur in reverse character-index order to prevent string offset drift.

![Clean and Compliant State](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/clean_and_compliant_dashboard_1793220584557.png)
*Figure 4: Dashboard after batch remediation. Status updates to 'Clean & Compliant' (0 active issues, 100% review progress).*

---

### 1.5 Exportable Compliance Clearance Certificate
Before campaigns can be handed off to clients or publishing channels, marketing and legal teams can generate and export a formal **Compliance Clearance Certificate**.

![Compliance Clearance Certificate Modal](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/certificate_modal_1793220515008.png)
*Figure 5: Compliance Clearance Certificate modal displaying audit verdict, cited lab benchmarks, copy preview, and markdown download buttons.*

---

### 1.6 Guideline Management & Ingestion Engine
Brand Sutra allows importing guidelines via **PDF/DOCX/TXT/JSON document ingestion** or **Direct Manual Rule Entry**.

````carousel
![Rules & Facts Tabs](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/rules_page_tabs_1793220630833.png)
<!-- slide -->
![Prohibited Terms List](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/prohibited_terms_list_1793220675898.png)
<!-- slide -->
![Direct Manual Rule Form](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/ingestion_modal_direct_form_1793220716664.png)
<!-- slide -->
![Document Ingestion Dropzone](C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/ingestion_modal_file_upload_1793220755918.png)
````

---

## 2. Technical Constraints & Governance Safeguards

### Constraint 1: Subword Collision Immunity
- **Constraint**: Prohibited terms must not trigger false positives on innocent subwords (e.g. `"cure"` must not flag `"secure"` or `"procurement"`).
- **Engine Implementation**: Uses regex non-alphanumeric boundaries with lookahead:
  ```typescript
  const regex = new RegExp(`(^|[^a-zA-Z0-9])(${escaped})(?=[^a-zA-Z0-9]|$)`, 'gi');
  ```
- **Verification Status**: Tested and confirmed zero false positives across all documents.

### Constraint 2: Citation Grounding Hierarchy
- **Constraint**: The AI auditor may **only** cite evidence items returned by the retriever. Any hallucinated citation IDs are rejected and dropped.
- **Hierarchy Rule**:
  1. **Factual Claims & Metrics**: Must cite verified facts (`cite-fact-...`). Terminology rules cannot be cited for factual contradictions.
  2. **Vocabulary Violations**: Must cite prohibited terminology rules (`cite-rule-...`).
  3. **Voice Breaches**: Must cite tone pillars (`cite-tone-...`).

### Constraint 3: Review Progress vs. Content Compliance
- **Constraint**: Dismissing or ignoring an issue marks the card as reviewed, but **refuses** to display `"Clean & Compliant"` if the violating phrase remains present in the copy text.
- **Verification Status**: Regression test suite passes with 100% compliance fidelity.

### Constraint 4: Zero Fake Trusted Facts
- **Constraint**: When guidelines lack verified lab numbers or certifications, the parser strictly refuses to synthesize fallback facts.

---

## 3. Test Suite Verification Matrix

All core workflows, edge cases, and safety constraints are validated through automated regression suites:

| Test Suite Script | Scope | Result |
| :--- | :--- | :--- |
| [`scripts/test-usability-and-accuracy.mjs`](file:///c:/Users/divya/OneDrive/Desktop/projects/BRAND%20SUTRA/scripts/test-usability-and-accuracy.mjs) | Word boundaries, multi-occurrence, reverse-index batch fixes | **100% PASS** |
| [`scripts/test-nuvia-skin-regression.mjs`](file:///c:/Users/divya/OneDrive/Desktop/projects/BRAND%20SUTRA/scripts/test-nuvia-skin-regression.mjs) | 25/25 prohibited rules, 7 approved terms, 0 fake facts | **100% PASS** |
| [`scripts/test-four-fixes.mjs`](file:///c:/Users/divya/OneDrive/Desktop/projects/BRAND%20SUTRA/scripts/test-four-fixes.mjs) | Citation correctness, validation, correction safety, fallback | **100% PASS** |
| [`scripts/test-brand-selection-workflow.mjs`](file:///c:/Users/divya/OneDrive/Desktop/projects/BRAND%20SUTRA/scripts/test-brand-selection-workflow.mjs) | Multi-brand workspace isolation, persistence, brand removal | **100% PASS** |
| [`scripts/test-retrieval-quality.mjs`](file:///c:/Users/divya/OneDrive/Desktop/projects/BRAND%20SUTRA/scripts/test-retrieval-quality.mjs) | Dense semantic vector retrieval & precision filtering | **100% PASS** |
| [`scripts/test-compliance-status-bug.mjs`](file:///c:/Users/divya/OneDrive/Desktop/projects/BRAND%20SUTRA/scripts/test-compliance-status-bug.mjs) | Live recalculation preventing false clean compliance | **100% PASS** |
| **Next.js Production Build** | Full TypeScript compilation & Turbopack bundle | **Compiled (0 errors)** |

---

## 4. Live Session Recordings

Autonomous end-to-end browser walkthrough sessions recorded during test execution:

* **Full Compliance Audit & Batch Remediation Walkthrough**:  
  `file:///C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/brand_sutra_demo_1793220362523.webp`
* **Rules & Document Ingestion Walkthrough**:  
  `file:///C:/Users/divya/.gemini/antigravity-ide/brain/6c392f77-efcf-41b6-a7d7-05f931ecf69e/rules_ingestion_demo_1793220610864.webp`
