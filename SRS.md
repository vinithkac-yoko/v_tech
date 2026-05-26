# Software Requirements Specification
## v_tech — AI-Native Self-Evolving Manufacturing ERP

**Version:** 0.2 (Open Questions Partially Resolved)
**Status:** Under Review
**Owner:** vinithkac@yokostyles.com
**Date:** 2026-05-26

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Target Users](#4-target-users)
5. [Core Design Principles](#5-core-design-principles)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Functional Requirements](#7-functional-requirements)
   - 7.1 Onboarding Engine
   - 7.2 AI Orchestrator (Command Bar)
   - 7.3 Dynamic Schema Engine
   - 7.4 Metadata Registry
   - 7.5 Runtime UI Generator
   - 7.6 Core Operational Modules
   - 7.7 Workflow Engine
   - 7.8 Self-Evolution Engine
   - 7.9 Undo / Versioning System
   - 7.10 Multi-tenancy
   - 7.11 Billing & Usage Metering
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Data Architecture](#9-data-architecture)
10. [AI Engine Specification](#10-ai-engine-specification)
11. [MVP Scope — Stage 1 (Months 1–3)](#11-mvp-scope--stage-1-months-13)
12. [Stage 2 & 3 Roadmap](#12-stage-2--3-roadmap)
13. [Risk Register](#13-risk-register)
14. [Tech Stack](#14-tech-stack)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

**v_tech** is an AI-native, schema-less, self-evolving ERP platform designed specifically for manufacturing and fabrication businesses (laser cutting, metalwork, CNC, job shops, etc.).

Unlike traditional ERPs (SAP, ERPNext, Tally) which require businesses to conform to fixed schemas and predefined workflows, v_tech starts with zero assumptions. A business owner describes their operations in plain English. The AI creates the data model, the UI, the workflows, and the automations — all at runtime. As the business grows, the system evolves with it.

**Core thesis:** The reason SMB manufacturers don't use ERP is not cost — it's friction. Current ERPs take months to implement and require consultants. v_tech should be live in one conversation.

---

## 2. Problem Statement

### What's broken today

| Pain | Current Reality |
|---|---|
| Setup takes months | SAP/ERPNext implementations cost ₹5-50L and take 3-12 months |
| Processes don't fit | Every factory has unique workflows. ERPs force factories into their model. |
| No one uses it | After painful setup, workers ignore the ERP and go back to WhatsApp + Excel |
| Can't change it | Adding a custom field or workflow requires a developer or consultant |
| No intelligence | ERPs store data. They don't tell you what's going wrong or what to do next. |

### The gap v_tech fills

```
Traditional ERP: Configure → Use → Stuck
v_tech:          Describe → Use → Evolves
```

---

## 3. Product Vision

> "Tell v_tech what your factory does. It builds your ERP. You run your factory."

A manufacturing business owner should be able to:
1. Open v_tech
2. Have a 5-minute AI conversation describing their business
3. Walk away with a fully operational ERP — forms, dashboards, workflows, reports
4. Change anything by typing a command in natural language
5. Watch the system learn and improve as they use it

**North Star Metric:** Time from signup to first operational record created < 10 minutes.

---

## 4. Target Users

### Primary Persona — The Factory Owner / Ops Manager

| Attribute | Description |
|---|---|
| Name | Ravi / Suresh / Mohammed (SMB manufacturer) |
| Business size | 5–200 employees |
| Industry | Laser cutting, sheet metal, CNC, fabrication, assembly |
| Tech comfort | Uses WhatsApp, Excel, maybe Tally. Zero coding knowledge. |
| Current tools | WhatsApp groups, Excel sheets, physical job cards, Tally for accounts |
| Core frustration | "I don't know where my orders are. I don't know who's doing what." |
| Willingness to pay | ₹3,000–20,000/month if it saves time and reduces errors |

### Secondary Persona — The Floor Supervisor

- Receives tasks from the system
- Updates job status (via mobile)
- Reports material usage and machine downtime
- Does NOT configure the system — only uses it

### Tertiary Persona — The Sales / Admin Person

- Creates quotations and orders
- Follows up with customers
- Generates invoices
- Uses the system as configured by the owner

---

## 5. Core Design Principles

### P1 — Intent First, Schema Later
The user never creates a "table" or "field". They describe what they do. The system figures out the data model.

### P2 — Everything is Reversible
Every AI action (schema creation, workflow generation, field addition) is logged and can be undone. No destructive operations without a recovery path.

### P3 — Metadata is the Source of Truth
No hardcoded tables for business data. All business entities, fields, relations, and UI config live in a metadata registry. The runtime reads this registry to generate everything dynamically.

### P4 — The System Gets Smarter Over Time
After sufficient operational data accumulates, the AI surfaces patterns, bottlenecks, and suggestions. The system is never static.

### P5 — Zero IT Dependency
Any change to the system — new field, new workflow, new report — must be achievable by the business owner through natural language. No developer required.

### P6 — Mobile-First for Floor Workers
Floor supervisors use mobile. All data entry and status updates must work on a basic smartphone browser.

---

## 6. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        v_tech Platform                          │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Next.js    │    │  Command Bar │    │   Mobile View    │  │
│  │   Frontend   │    │  (Cmd+K AI)  │    │  (Floor Worker)  │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                   │                     │             │
│  ┌──────▼───────────────────▼─────────────────────▼──────────┐ │
│  │                    UI Runtime Engine                        │ │
│  │   Reads metadata registry → renders forms/tables/kanban    │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────────┐ │
│  │                   API Layer (Next.js API Routes)            │ │
│  └──┬──────────────┬──────────────┬──────────────┬────────────┘ │
│     │              │              │              │               │
│  ┌──▼───┐    ┌─────▼──┐    ┌─────▼──┐    ┌─────▼────────────┐ │
│  │Schema│    │Workflow│    │ AI     │    │  Self-Evolution  │ │
│  │Engine│    │Engine  │    │Orchestr│    │  Engine          │ │
│  └──┬───┘    └─────┬──┘    └─────┬──┘    └─────┬────────────┘ │
│     │              │              │              │               │
│  ┌──▼──────────────▼──────────────▼──────────────▼────────────┐ │
│  │                      Supabase                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │  Metadata DB  │  │  Records DB  │  │   Event Log      │ │ │
│  │  │  (entities,   │  │  (JSONB      │  │   (audit +       │ │ │
│  │  │   fields,     │  │   records)   │  │    undo log)     │ │ │
│  │  │   relations,  │  │              │  │                  │ │ │
│  │  │   workflows,  │  │              │  │                  │ │ │
│  │  │   ui_config)  │  │              │  │                  │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Claude API         │
                    │   (Anthropic)        │
                    │   Schema gen         │
                    │   Workflow gen       │
                    │   UI config gen      │
                    │   Query answering    │
                    └──────────────────────┘
```

---

## 7. Functional Requirements

---

### 7.1 Onboarding Engine

**Goal:** Convert a plain-English business description into a fully operational app in one session.

#### FR-OB-01: AI Conversation Onboarding
- System initiates a structured interview via chat
- Extracts: business type, core processes, entities, team structure, key workflows
- Example prompts:
  - "What does your factory make?"
  - "Walk me through what happens when you get a customer order"
  - "How many people work with you and what do they do?"
  - "What do you currently track in Excel or on paper?"

#### FR-OB-02: Entity Extraction
- From conversation, AI identifies business entities (Orders, Jobs, Machines, Workers, Materials, etc.)
- Presents extracted entities to user for confirmation before creating anything
- User can add, remove, or rename entities

#### FR-OB-03: Schema Generation
- After confirmation, AI generates:
  - Entity definitions with core fields
  - Field types (text, number, date, dropdown, relation, file, etc.)
  - Relationships between entities
  - Default workflows per entity

#### FR-OB-04: First App Generation
- System creates:
  - A sidebar navigation with one section per entity
  - Default list view and form view per entity
  - A home dashboard with key metrics
- Time target: < 60 seconds from confirmation to live app

#### FR-OB-05: Sample Data Seeding
- System offers to create 3-5 sample records so the user can see a real app
- User can delete sample data or keep it as a template

---

### 7.2 AI Orchestrator — Command Bar

**Goal:** Every interaction with the AI happens through a keyboard-triggered command bar (Cmd+K or `/`).

#### FR-CB-01: Command Bar Activation
- Activated by: Cmd+K (desktop), `/` in any text field, floating button (mobile)
- Opens a modal with a text input

#### FR-CB-02: Natural Language Commands
The command bar must handle all of the following command types:

| Command Type | Example |
|---|---|
| Navigate | "Show me all pending orders" |
| Create record | "Add a new order for Mehta Steel, 50 units, due Friday" |
| Modify schema | "Add a field 'nesting efficiency' to jobs" |
| Query data | "Which operator has the most jobs assigned this week?" |
| Generate report | "Show me revenue by customer for last month" |
| Create workflow | "When an order is approved, automatically create a job and assign to Ravi" |
| Create dashboard | "Build me a dashboard showing daily output per machine" |
| Undo | "Undo that" |
| Explain | "Why is Order #104 delayed?" |

#### FR-CB-03: Intent Classification
- AI classifies intent before acting:
  - READ (query / navigate)
  - WRITE (create / update record)
  - MUTATE_SCHEMA (add/change entity or field)
  - MUTATE_WORKFLOW (add/change automation)
  - MUTATE_UI (change a view or dashboard)
  - ANALYZE (insight request)

#### FR-CB-04: Confirmation for Mutations
- All MUTATE_* actions are shown as a proposed change card before execution
- User sees: "I'm about to add a field 'nesting_efficiency' (decimal) to Jobs. Confirm?"
- Auto-executes after 5 seconds unless cancelled (with visible countdown)
- Every mutation is logged to event log for undo

#### FR-CB-05: Command History
- Last 20 commands are accessible via up-arrow in command bar
- Saves per session and per user

---

### 7.3 Dynamic Schema Engine

**Goal:** Create and evolve data schemas at runtime without developer intervention.

#### FR-SC-01: Entity Creation
- Create new entities dynamically: `entities` table in metadata
- Each entity has: `id`, `tenant_id`, `name`, `display_name`, `icon`, `color`, `created_at`, `created_by`

#### FR-SC-02: Field Creation
- Fields stored in metadata: `id`, `entity_id`, `name`, `display_name`, `type`, `required`, `default_value`, `options` (for dropdowns), `relation_entity_id`, `ui_config` (JSONB), `order`
- Supported field types:
  - `text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`
  - `select` (single), `multi_select`
  - `relation` (link to another entity)
  - `file`, `image`
  - `formula` (computed from other fields)
  - `auto_number` (auto-incrementing ID like JOB-001)
  - `created_at`, `updated_at`, `created_by` (system fields)

#### FR-SC-03: Relation Creation
- Relations stored in metadata with type: `one-to-many`, `many-to-one`, `many-to-many`
- Referential integrity enforced at application layer (not DB foreign keys, to allow schema evolution)

#### FR-SC-04: Field Addition at Runtime
- When a user mentions data that doesn't map to existing fields, system proposes adding a new field
- Example: User types "Add order for Mehta Steel, laser grade: 304 SS 2mm" → system detects "laser grade" is not a field on Orders → proposes adding `material_spec` (text) field

#### FR-SC-05: Schema Versioning
- Every schema change creates a version entry in `schema_versions`
- Rollback is possible to any previous version

---

### 7.4 Metadata Registry

**Goal:** All business logic, UI config, and workflow definitions live in a queryable metadata store — not in code.

#### Metadata Tables

```sql
entities          -- business objects (Orders, Jobs, Workers...)
fields            -- fields per entity
relations         -- links between entities
workflows         -- workflow definitions (DAG JSON)
workflow_steps    -- individual steps in workflows
ui_views          -- saved views (list, kanban, calendar, form)
ui_view_config    -- column visibility, filters, sort, grouping
dashboards        -- dashboard definitions
dashboard_widgets -- individual widgets per dashboard
automations       -- trigger → action definitions
permissions       -- role-based field and entity access
schema_versions   -- history of all schema changes
```

All of these are per-tenant and fully queryable at runtime.

---

### 7.5 Runtime UI Generator

**Goal:** Frontend reads metadata and renders appropriate UI — no hardcoded pages for any entity.

#### FR-UI-01: List View
- Renders a filterable, sortable, paginated table for any entity
- Columns = fields from metadata
- Supports: search, filter by field, sort by field, bulk actions
- Column visibility controlled per user (saved in ui_view_config)

#### FR-UI-02: Form View
- Renders a create/edit form for any entity
- Field order, labels, and types from metadata
- Supports: inline validation, relation pickers, file uploads
- AI can pre-fill fields from natural language input (e.g., "Create order for Mehta Steel due Friday" auto-fills customer and date)

#### FR-UI-03: Kanban View
- Any entity with a `status` select field can be viewed as kanban
- Drag-and-drop between status columns updates the record
- Columns = status field options

#### FR-UI-04: Calendar View
- Any entity with a date field can be viewed as calendar
- Useful for: delivery schedules, maintenance dates, shift planning

#### FR-UI-05: Dashboard Widgets
- Widget types: number card (KPI), bar chart, line chart, pie chart, table, funnel
- All widgets are data-driven from metadata queries
- AI generates dashboard configs from natural language: "Show me output per machine this week"

#### FR-UI-06: Mobile View
- All list and form views render on mobile
- Optimized for: job status updates, material usage logging, task completion
- Offline-friendly: queue mutations when offline, sync when connected

---

### 7.6 Core Operational Modules

These are the manufacturing-specific workflows v_tech must handle out of the box as generated entities. They are not hardcoded but represent the AI's default interpretation for a manufacturing business during onboarding.

#### Module A: Sales & Quotation

| Entity | Key Fields |
|---|---|
| Customer | name, contact, gstin, address |
| Enquiry | customer, description, drawing (file), received_date |
| Quotation | enquiry, line_items (JSONB), total_amount, validity_date, status |
| Sales Order | quotation, confirmed_date, delivery_date, payment_terms |

Workflow: Enquiry → Quotation → Approval → Sales Order

**AI Feature:** Given a drawing or description, AI estimates material, machine time, and labor to generate a quote draft.

#### Module B: Production Planning

| Entity | Key Fields |
|---|---|
| Job | sales_order, job_number (auto), status, machine, operator, start_date, end_date |
| Operation | job, operation_type, machine, estimated_hours, actual_hours, status |
| Machine | name, type, capacity, status |
| Operator | name, skills, shift, current_job |

Workflow: Sales Order → Job Creation → Operation Breakdown → Machine Assignment → Execution → QC → Completion

#### Module C: Inventory & Materials

| Entity | Key Fields |
|---|---|
| Material | name, grade, thickness, unit, current_stock |
| BOM | job, material, required_qty, issued_qty |
| Purchase Order | supplier, material, qty, expected_date, status |
| Stock Movement | material, type (in/out/scrap), qty, reference_job, date |

Workflow: Job Created → BOM Generated → Material Check → Issue or Purchase Trigger → Stock Updated

#### Module D: Dispatch & Delivery

| Entity | Key Fields |
|---|---|
| Delivery Challan | sales_order, items, vehicle, driver, dispatch_date |
| Quality Check | job, inspector, result (pass/fail), notes, checked_at |
| Invoice | sales_order, amount, gst, due_date, payment_status |

Workflow: QC Passed → Challan Created → Dispatched → Invoice Raised → Payment Tracked

#### Module E: Team & Shift Management

| Entity | Key Fields |
|---|---|
| Employee | name, role, department, skills, shift |
| Attendance | employee, date, check_in, check_out, status |
| Shift | name, start_time, end_time, employees |

---

### 7.7 Workflow Engine

**Goal:** Automate multi-step operational flows that are defined by AI and editable by users.

#### FR-WF-01: Workflow Definition Format
Each workflow is stored as a DAG (Directed Acyclic Graph) in JSON:

```json
{
  "id": "wf_001",
  "name": "Order to Job Creation",
  "trigger": {
    "type": "record_status_change",
    "entity": "sales_orders",
    "from_status": "quotation_approved",
    "to_status": "confirmed"
  },
  "steps": [
    {
      "id": "step_1",
      "type": "create_record",
      "entity": "jobs",
      "field_mappings": {
        "sales_order": "{{trigger.record.id}}",
        "job_number": "{{auto_number}}",
        "status": "pending"
      }
    },
    {
      "id": "step_2",
      "type": "send_notification",
      "to": "{{jobs.operator}}",
      "message": "New job {{jobs.job_number}} assigned to you"
    }
  ]
}
```

#### FR-WF-02: Trigger Types
- `record_created` — new record in entity
- `record_updated` — any field change
- `record_status_change` — specific status transition
- `scheduled` — cron-based (daily, weekly)
- `manual` — user-triggered button on a record

#### FR-WF-03: Action Types
- `create_record` — create a related record
- `update_record` — update fields on a record
- `send_notification` — in-app notification
- `send_whatsapp` — WhatsApp message (Phase 2)
- `send_email` — email notification
- `webhook` — call external URL
- `ai_action` — call AI to analyze and decide next step

#### FR-WF-04: Workflow Editor
- Visual DAG editor: nodes are steps, edges are transitions
- Each step is editable
- AI can generate a workflow from natural language description

---

### 7.8 Self-Evolution Engine

**Goal:** The system observes operational data and proactively suggests improvements.

#### FR-EV-01: Automatic Field Addition
- When a user consistently includes data that doesn't map to existing fields (e.g., always adds "surface finish" in job notes), system detects the pattern and proposes: "I notice you always mention surface finish. Want me to add it as a proper field on Jobs?"

#### FR-EV-02: Bottleneck Detection
- System monitors:
  - Average time per operation per machine
  - Jobs that exceed estimated completion time
  - Operators with overloaded queues
- Surfaces insights on dashboard: "Machine #3 (Laser 1) has an average delay of 2.4 days. It is your primary bottleneck."

#### FR-EV-03: Dormant UI Reshaping
- Tracks which views, fields, and sections users never open
- After 30 days, system suggests: "You haven't used the Attendance module in 4 weeks. Want me to hide it?"

#### FR-EV-04: Pattern-Based Automation Suggestions
- After detecting repeated manual sequences (e.g., every time a job is completed, an invoice is manually created), system suggests: "I notice you always create an invoice after dispatch. Want me to automate this?"

#### FR-EV-05: Predictive Alerts
- "Delivery date for Order #104 is in 2 days but the job is only 40% complete."
- "Material SS 304 2mm stock will run out in ~3 days at current consumption rate."

---

### 7.9 Undo / Versioning System

**Goal:** Every AI-generated mutation is recoverable.

#### FR-UN-01: Event Log
Every mutation (schema change, record create/update, workflow change) writes to `event_log`:
```sql
id, tenant_id, user_id, event_type, entity_type, record_id,
before_state (JSONB), after_state (JSONB), created_at, source ('user' | 'ai' | 'automation')
```

#### FR-UN-02: Single-Step Undo
- "Undo" in command bar reverts the last mutation
- Shows what will be reverted before confirming

#### FR-UN-03: Schema Rollback
- Schema changes (entity/field creation, modification) can be rolled back to any previous version
- System warns if rollback will orphan existing data

#### FR-UN-04: Audit Trail UI
- Every record has an activity timeline showing all changes with who/what made them
- AI actions are clearly labeled as AI-generated

---

### 7.10 Multi-tenancy

**Strategy:** Start single-tenant architecture (one customer during development). Add `tenant_id` to all tables from day one so multi-tenancy can be switched on later without schema migration.

#### FR-MT-01: Tenant ID on All Business Tables
- All metadata and records tables have `tenant_id UUID NOT NULL`
- Row-Level Security (RLS) enabled on all tables via Supabase

#### FR-MT-02: Tenant Isolation (Future)
- Phase 1: Single tenant (your own deployment)
- Phase 2: Shared DB multi-tenant with RLS
- Phase 3: Schema-per-tenant for enterprise customers

---

### 7.11 Billing & Usage Metering

**Model:** Usage-based pricing — charge per AI calls consumed and records stored.

#### FR-BL-01: Usage Units
| Unit | What it tracks |
|---|---|
| AI Credits | Each call to Claude API (schema gen, query, insight) |
| Records | Total active records across all entities |
| Automations | Automation runs per month |
| Storage | File attachments (MB) |

#### FR-BL-02: Metering
- Every Claude API call logs: `tenant_id`, `input_tokens`, `output_tokens`, `purpose` (onboarding / command / insight / automation)
- Aggregated daily per tenant

#### FR-BL-03: Usage Dashboard
- Tenant admin sees: AI credits used, records count, automations run this month
- Alert when approaching plan limits

#### FR-BL-04: Pricing Tiers (Proposed)
| Tier | Price | Limits |
|---|---|---|
| Starter | ₹2,999/mo | 500 AI credits, 5,000 records |
| Growth | ₹7,999/mo | 2,000 AI credits, 50,000 records |
| Enterprise | Custom | Unlimited + SLA + dedicated schema |

---

## 8. Non-Functional Requirements

| NFR | Requirement |
|---|---|
| Performance | List views load in < 1.5s for up to 10,000 records |
| AI Response Time | Command bar AI response < 3 seconds for simple commands |
| Uptime | 99.5% monthly uptime target |
| Security | RLS on all tables, JWT auth, no raw SQL exposed to user input |
| Mobile | All core flows usable on 360px screen width |
| Data Integrity | No data loss on schema evolution (additive-only by default) |
| Offline | Mobile form submissions queue offline and sync on reconnect |
| Audit | 100% of mutations logged with before/after state |
| GDPR / Data Privacy | Customer data stored in tenant-isolated partitions |
| Prompt Injection | AI inputs sanitized; user-supplied data never injected raw into system prompts |

---

## 9. Data Architecture

### 9.1 Core Metadata Tables

```sql
-- Tenants
tenants (id, name, industry, plan, created_at)

-- Metadata
entities (id, tenant_id, name, display_name, icon, color, is_system, created_at)
fields (id, tenant_id, entity_id, name, display_name, type, required, default_value, options JSONB, relation_entity_id, ui_config JSONB, sort_order)
relations (id, tenant_id, from_entity_id, to_entity_id, type, from_field_id, to_field_id)

-- Records (Universal)
records (id, tenant_id, entity_id, data JSONB, created_at, updated_at, created_by, deleted_at)
-- data JSONB holds all dynamic field values
-- Indexed: tenant_id, entity_id, (data->>'field_name') GIN index per active field

-- Workflows
workflows (id, tenant_id, name, trigger JSONB, steps JSONB, is_active, created_at)
workflow_runs (id, workflow_id, trigger_record_id, status, started_at, completed_at, error)

-- UI Config
ui_views (id, tenant_id, entity_id, name, view_type, config JSONB, is_default)
dashboards (id, tenant_id, name, layout JSONB)
dashboard_widgets (id, dashboard_id, type, config JSONB, position JSONB)

-- Versioning & Audit
schema_versions (id, tenant_id, entity_id, version, snapshot JSONB, created_at)
event_log (id, tenant_id, user_id, event_type, entity_id, record_id, before_state JSONB, after_state JSONB, source, created_at)

-- Billing
usage_events (id, tenant_id, event_type, units, metadata JSONB, created_at)
```

### 9.2 JSONB Field Strategy

All business record data stored in `records.data JSONB`. Example:

```json
{
  "customer_name": "Mehta Steel Pvt Ltd",
  "order_date": "2026-05-26",
  "delivery_date": "2026-06-10",
  "status": "confirmed",
  "total_amount": 85000,
  "material_spec": "SS 304 2mm",
  "notes": "Urgent — priority job"
}
```

### 9.3 Indexing Strategy
- GIN index on `records.data` for full JSONB queries
- BTREE index on `(tenant_id, entity_id)` for all record fetches
- Partial indexes on common status fields as they stabilize

---

## 10. AI Engine Specification

### 10.1 AI Model
- **Primary:** Claude Sonnet 4.x (claude-sonnet-4-6 or latest)
- **Fallback:** Claude Haiku for low-cost classification tasks (intent detection, field type inference)

### 10.2 Prompt Architecture

#### System Prompt (persistent, loaded with every request)
Contains:
- Role: AI Application Architect for v_tech
- Current tenant context: entities, fields, relations, active workflows
- Rules: never break existing data, additive-first schema changes, always confirm mutations
- Output format: structured JSON with `intent`, `action`, `payload`, `confirmation_message`

#### Context Injection Per Request
Each command bar request includes:
- Current page/entity the user is viewing
- Last 5 user commands (short-term memory)
- Relevant metadata snapshot (entities + fields for current context)

### 10.3 AI Output Contract
Every AI response must conform to:

```json
{
  "intent": "MUTATE_SCHEMA | WRITE | READ | ANALYZE | MUTATE_WORKFLOW | MUTATE_UI",
  "confirmation_message": "Human-readable description of what will happen",
  "action": {
    "type": "create_field | create_record | run_query | ...",
    "payload": {}
  },
  "display": {
    "type": "table | form | insight_card | workflow_diagram | ...",
    "data": {}
  }
}
```

### 10.4 Prompt Injection Prevention
- User-supplied data (record values, file names) are never injected into the system prompt
- Data is passed as structured JSON in a separate `data` block
- System prompt is static; user input only populates the `user_message` field

### 10.5 Token Cost Optimization
- Use prompt caching for the system prompt and tenant metadata (static across a session)
- Use Claude Haiku for: field type inference, record classification, simple intent detection
- Use Claude Sonnet for: schema generation, workflow generation, complex analysis
- Log token usage per call for billing

---

## 11. MVP Scope — Stage 1 (Months 1–3)

The MVP must prove the core thesis: **a factory owner can go from zero to operational in one conversation.**

### In Scope for MVP

| Feature | Priority |
|---|---|
| AI conversational onboarding | P0 |
| Dynamic entity + field creation | P0 |
| Universal records (JSONB store) | P0 |
| Command bar (Cmd+K) | P0 |
| List view (auto-generated) | P0 |
| Form view (auto-generated) | P0 |
| Kanban view (status entities) | P0 |
| Sales Order → Job → Dispatch workflow | P0 |
| Basic inventory tracking | P1 |
| Simple automations (status change triggers) | P1 |
| Home dashboard (KPI cards) | P1 |
| Undo last action | P1 |
| Audit trail per record | P1 |
| Mobile-responsive views | P1 |
| Usage metering (logging only) | P1 |
| Supabase Auth (email + magic link) | P0 |
| WhatsApp notifications (job assignment, status updates) | P1 |
| WhatsApp reply parsing (worker status updates via reply) | P1 |
| GST-compliant invoice PDF generation | P1 |
| Excel export from any list view | P1 |

### Out of Scope for MVP

| Feature | Phase |
|---|---|
| Multi-tenancy (paid customers) | Phase 2 |
| Billing / payment collection | Phase 2 |
| AI quotation from drawing / DXF | Out of scope |
| E-way bill generation | Phase 2 |
| Advanced bottleneck analytics | Phase 3 |
| Self-evolution suggestions | Phase 3 |
| Graph view / relationship explorer | Phase 3 |
| Public API for integrations | Phase 3 |

### MVP Success Criteria
1. Owner can onboard via chat in < 10 minutes
2. Can create an order and track it to dispatch end-to-end
3. Can add a new field to any entity via command bar
4. Can generate a basic "jobs in progress" dashboard via command bar
5. All actions are reversible

---

## 12. Stage 2 & 3 Roadmap

### Stage 2 (Months 4–6) — Growth
- Multi-tenant architecture + self-serve signup
- Billing integration (Razorpay / Stripe)
- WhatsApp notifications for operators
- AI-generated quotation from job description
- Advanced workflow builder (visual DAG editor)
- Field-level permissions per role
- Custom report builder

### Stage 3 (Months 7–12) — Intelligence
- Self-evolution engine (pattern detection, field suggestion)
- Predictive alerts (delivery delays, stock-outs)
- Dormant UI reshaping
- Bottleneck analysis dashboards
- Public REST API per tenant
- Webhooks for external integrations
- AI-powered demand forecasting
- GPT-Vision for drawing/image analysis

---

## 13. Risk Register

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| AI generates incorrect schema | High | Medium | Confirmation step before all mutations; undo system; schema versioning |
| JSONB performance degrades at scale | High | Medium | GIN indexes; migrate hot fields to real columns when patterns stabilize |
| Solo build scope creep | High | High | Strict Stage 1 scope. Build one thing end-to-end before expanding. |
| Users confused by AI-first UX | Medium | Medium | Always show conventional UI alongside AI. Chat augments, not replaces. |
| Claude API downtime | Medium | Low | Graceful degradation: manual CRUD still works when AI is down |
| Schema rollback corrupts data | High | Low | Additive-only schema changes by default; deletion only after confirmation |
| Prompt injection via user data | High | Low | Strict separation of system prompt and user data; never interpolate raw input |
| Competitor copies concept | Medium | Medium | Speed + manufacturing domain depth as moat. File provisional patent. |

---

## 14. Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Fullstack, SSR, great DX |
| UI Components | shadcn/ui + Tailwind | Composable, unstyled base |
| State Management | Zustand | Simple, no boilerplate |
| Data Fetching | TanStack Query | Server state + caching |
| Dynamic Tables | TanStack Table | Headless, metadata-driven |
| Form Generation | React Hook Form + Zod | Validation from metadata types |
| Charts | Recharts | Simple, composable |
| Command Bar | cmdk | Built for Cmd+K pattern |
| Drag & Drop | @dnd-kit | Kanban drag-drop |
| Excel Export | xlsx (SheetJS) | Export any list view to .xlsx |
| PDF Generation | @react-pdf/renderer | GST-compliant invoice PDFs |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| API | Next.js API Routes | Co-located with frontend |
| Database | Supabase (PostgreSQL) | JSONB, RLS, Realtime, Auth |
| Auth | Supabase Auth | Magic link + Google OAuth |
| File Storage | Supabase Storage | Drawings, attachments |
| Background Jobs | Supabase Edge Functions | Automation triggers, AI analysis |
| Realtime | Supabase Realtime | Live updates on floor view |
| WhatsApp | Meta WhatsApp Cloud API | Floor worker notifications + reply parsing |

### AI Layer
| Component | Choice | Reason |
|---|---|---|
| Primary Model | Claude Sonnet (Anthropic) | Best structured output, reasoning |
| Fast/Cheap Model | Claude Haiku | Classification, simple intents |
| SDK | Anthropic Node SDK | Official, streaming support |
| Prompt Caching | Anthropic cache_control | Reduce cost on repeated metadata |

### DevOps
| Component | Choice |
|---|---|
| Frontend Deploy | Vercel |
| Database | Supabase Cloud |
| Monitoring | Vercel Analytics + Supabase logs |
| Error Tracking | Sentry |
| CI/CD | GitHub Actions |

---

## 15. Open Questions

### Resolved

| # | Question | Decision |
|---|---|---|
| 1 | WhatsApp vs in-app for floor workers | **WhatsApp — MVP required.** Floor workers will not open a browser. |
| 2 | GST / Indian accounting compliance | **Yes — GST-compliant invoices from day one.** Target is Indian manufacturers. |
| 3 | DXF / drawing upload for AI quoting | **No.** Manufacturers provide their own cost. AI quoting from drawings is out of scope. |
| 4 | Onboarding depth | **20 questions.** Thorough interview produces a better schema. Worth the time investment. |
| 5 | Data export to Excel | **Yes — MVP required.** Manufacturers will demand this on day one. |

### Implications on MVP scope from resolved decisions

**WhatsApp (MVP):**
- Add WhatsApp Cloud API integration to tech stack
- Workflow actions must support `send_whatsapp` step type from day one
- Floor workers receive job assignments and status prompts via WhatsApp
- Workers can reply via WhatsApp to update job status (e.g., "done" → marks operation complete)
- Requires: Meta Business account, WhatsApp Cloud API credentials per tenant

**GST Invoices (MVP):**
- Invoice entity must include: GSTIN (supplier + customer), HSN/SAC codes, CGST/SGST/IGST split, place of supply
- Generate PDF invoice compliant with GST invoice format
- E-way bill generation is Phase 2
- PDF generation library: `@react-pdf/renderer` or `puppeteer`

**Excel Export (MVP):**
- Every list view has an "Export to Excel" button
- Exports visible columns for current filter/sort state
- Library: `xlsx` (SheetJS)
- Bulk export of full entity data available from settings

### Still Open

1. **Pricing validation:** Need 3 real customer conversations before writing billing code. What do they currently pay for Tally + Excel + WhatsApp chaos combined?

2. **AI failure UX:** When Claude is unavailable or returns a malformed response, what does the user see? Define the fallback experience.

3. **Field type inference:** If user says "add nesting efficiency", should AI guess decimal (0–100) or ask the user?

4. **WhatsApp reply parsing:** How structured must worker replies be? Free text ("done", "finished") vs structured commands ("/done JOB-042")?

---

*End of SRS v0.1 — Under Review*

*Next step: Review open questions, finalize MVP scope, begin implementation.*
