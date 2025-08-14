# AI Council — Product Requirements Document (PRD)

## Introductory Narrative
AI Council is an interactive, configurable multi-persona collaboration platform that orchestrates expert AI personas through a deterministic state-machine flow to analyze, ideate, and develop concepts from multiple professional perspectives. Users provide a topic, challenge, or creative brief, then a panel of configurable expert personas (e.g., Creative Visionary, Technical Specialist, Market Analyst, UX Designer) collaborate in structured rounds to explore possibilities, analyze feasibility, and synthesize actionable insights.

Whether developing a "mobile game about space wizards in cosmic combat with alien gods" or exploring complex business strategies, users can assemble custom panels combining domain experts like Lovecraft fiction specialists, science fiction researchers, and astrophysicists alongside business analysts and UX designers. The platform facilitates both creative ideation and analytical discussion through the same flexible framework.

The application targets rapid exploration of creative concepts, strategic planning, collaborative research, and multi-perspective analysis. It emphasizes clarity (moderation, summaries), transparency (debug logs), and flexibility (editable personas and flow configuration) while supporting both creative ideation and analytical evaluation.

---

## Goals & Non-Goals
- Goals
  - Provide a configurable, multi-persona AI collaboration platform with deterministic flows
    - Number of expert personas
    - Definition of those personas
      - Subject matter experts across diverse fields
      - Creative professionals and technical specialists  
      - Business strategists and market analysts
      - Researchers and academic specialists
    - Goal of the collaboration
      - Creative concept development and refinement
      - Strategic analysis and planning
      - Multi-perspective research exploration
      - Feasibility assessment and validation
      - Consensus building and synthesis
    - Length of the collaboration
      - Pre-defined number of rounds for focused sessions
      - Extended rounds for complex creative development
  - Capture readable transcripts and actionable deliverables (reports, briefs, roadmaps) that can be saved to a Neon Postgres database or downloaded
  - Enable in-UI editing of Persona prompts (name/role/task) and flow sequence
    - Optional full "human in the loop" mode where users can edit persona responses before continuing
    - Optional learning system that can learn from user edits and improve persona responses over time
  - Offer import/export of configurations (JSON) for sharing workflows and workflow templates
  - Provide pre-built workflow templates (blueprints) for common use cases that can be instantiated as user workflows:
    - Creative project ideation and development
    - Product strategy and business planning
    - Research collaboration and peer review
    - Educational exploration and analysis
  - Maintain a debug log for state transitions and processing visibility
- Non-Goals
  - Full user management, roles, or access control in v1
  - Advanced analytics or heavy data warehousing
  - Advanced long-running job orchestration or streaming tokens (initial MVP can be request/response per step)
  - Real-time collaborative editing (async collaboration only)
  - Note: Basic persistence using a Neon Postgres database for configurations and transcripts IS in scope for MVP

---

## Users & Use Cases
- Users
  - Creative professionals (game designers, writers, artists)
  - Business strategists and product managers
  - Entrepreneurs and innovators
  - Researchers and academics
  - Educators and students
  - Content creators and consultants
  
- Primary Use Cases
  - **Creative Project Development**: Explore creative concepts through expert collaboration
    - Game design and narrative development
    - Product concept ideation
    - Creative writing and storytelling
    - Art and design projects
  - **Strategic Business Planning**: Multi-perspective business analysis
    - Market entry strategies
    - Product roadmap development  
    - Competitive analysis
    - Investment decisions
  - **Research Collaboration**: Academic and professional research support
    - Literature review and analysis
    - Methodology development
    - Peer review simulation
    - Grant proposal development
  - **Educational Applications**: Learning through expert discussion simulation
    - Critical thinking development
    - Multi-disciplinary analysis
    - Case study exploration
    - Knowledge synthesis
  - **Innovation Workshops**: Structured ideation and evaluation
    - Concept generation and refinement
    - Feasibility assessment
    - Implementation planning
    - Risk analysis

---

## Current Functionality (Enhanced Multi-Persona Platform)
- Core Concepts
  - **Expert Personas**: Configurable AI specialists with distinct roles, expertise, and analytical approaches. Expandable beyond default academic personas to include creative professionals, business experts, and technical specialists.
  - **Collaborative Flows**: `stateFlow` arrays defining expert interaction sequences optimized for different outcomes (creative ideation, strategic planning, research analysis).
  - **Discussion Sessions**: Multi-round collaborations with structured progression from initial exploration through synthesis and actionable recommendations.
  - **Insight Extraction**: Automated capture of key insights, creative concepts, strategic recommendations, and implementation plans.
  - **Final Synthesis**: Specialized synthesis personas produce comprehensive analysis, creative briefs, strategic plans, or research summaries.

- UX & Interactions
  - **Project/Topic Input**: Support for creative briefs, strategic questions, research topics, and analytical challenges
  - **Expert Panel Configuration**: Visual persona management with role-based templates and custom expert creation
  - **Collaboration Flow Design**: Drag-and-drop flow editor with pre-built workflow templates for different use cases
  - **Session Management**: Start/continue controls adapted for collaborative rather than adversarial interactions
  - **Multi-Format Outputs**: Generate creative briefs, strategic plans, research summaries, and implementation roadmaps
  - **Workflow Template Library**: Reusable blueprints for common scenarios (creative development, business strategy, research collaboration)

- Integration Architecture
  - Server-side LLM integration through secure API proxy (`/api/complete`)
  - Database persistence for collaborative sessions, expert configurations, user workflows, and reusable workflow templates
  - Import/export system for sharing successful collaboration patterns

---

## Enhanced Functional Requirements
1. **Project Initiation & Expert Assembly**
   - Users enter creative briefs, strategic challenges, or research topics
   - System initializes collaboration with appropriate expert panel
   - Support for both workflow template-based and custom expert selection

2. **Structured Collaboration Execution**
   - Expert personas contribute specialized insights in configured sequence
   - Each expert builds on previous contributions while maintaining their domain focus
   - "Synthesizer" personas extract key insights and maintain session coherence

3. **Adaptive Flow Control**
   - Continue controls allow organic development of ideas
   - Users can extend collaboration for deeper exploration
   - Support for both structured (workflow template-derived) and exploratory (custom) sessions

4. **Comprehensive Analysis & Deliverables**
   - System compiles expert insights into actionable deliverables
   - Output formats adapted to session type (creative brief, strategic plan, research summary)
   - Export capabilities for different stakeholder needs

5. **Expert Persona Management**
   - Extensive library of professional personas across disciplines
   - In-UI persona editing with role-specific templates
   - Validation for persona expertise alignment and session appropriateness

6. **Collaboration Flow Design**
   - Visual flow editor with template categories (creative, strategic, research, educational)
   - Pre-validated flows for common professional scenarios
   - Custom flow creation with guidance and best practices

7. **Workflow Templates & Sharing**
   - Professional workflow templates (blueprints) for different industries and use cases
   - Community sharing of successful collaboration patterns
   - Import/export with metadata for context and usage guidelines

8. **Enhanced Reporting & Documentation**
   - Multiple output formats optimized for different professional contexts
   - Integration-ready exports (JSON, markdown, structured data)
   - Professional formatting for stakeholder presentation

9. **Advanced Session Management**
   - Session persistence with resumption capability
   - Branching support for exploring alternative approaches
   - Collaboration history and pattern analysis

---

## Non-Functional Requirements
- **Performance**: Support for complex multi-expert sessions with extended collaboration rounds
- **Reliability**: Robust handling of diverse persona types and interaction patterns
- **Security**: Enterprise-grade security for sensitive creative and strategic content
- **Data Persistence**: Professional-grade session storage with backup and recovery
- **Accessibility**: Full accessibility compliance for professional use
- **Scalability**: Support for large expert panels and extended collaboration sessions

---

## Enhanced Data Model
- **PersonaConfig**: { id, name, role, task, expertise_domain, professional_context, specialization }
- **CollaborationSession**: Enhanced from DebateLogEntry to support creative and strategic outcomes
- **SessionMessage**: { persona, content, timestamp, round, insight_type, creative_contribution }
- **ProfessionalFlow**: Enhanced flow configurations with industry context and outcome types
- **SessionDeliverables**: Structured outputs (creative_brief, strategic_plan, research_summary, implementation_roadmap)

**Enhanced Database Schema (Neon Postgres):**
- **expert_personas** (id PK, name, role, task, expertise_domain, industry_context, created_at, updated_at)
- **workflow_templates** (id PK, name, description, category, nodes JSONB, edges JSONB, created_at, updated_at)
- **workflows** (id PK, name, description, template_id FK nullable, nodes JSONB, edges JSONB, created_at, updated_at)
- **collaboration_sessions** (id PK, title, session_type, workflow_id FK, started_at, completed_at, deliverables JSONB, created_at)
- **session_contributions** (id PK, session_id FK, persona_name, expertise_domain, round, content TEXT, insight_type, timestamp)
- **session_deliverables** (id PK, session_id FK, deliverable_type, content TEXT, format, created_at)

---

## Key Screens & User Experience
- **Home/Project Initiation**
  - Creative brief or strategic challenge input
  - Template selection (Creative Project, Business Strategy, Research Collaboration)
  - Custom expert panel assembly
  
- **Collaboration Management**
  - Expert panel overview with expertise mapping
  - Session flow visualization and control
  - Real-time insight capture and synthesis
  
- **Expert Configuration**
  - Professional persona library organized by domain
  - Custom expert creation with role validation
  - Expertise mapping and collaboration optimization
  
- **Workflow Template Management**
  - Professional workflow templates by industry and use case (as blueprints)
  - Template customization and sharing; instantiate as user workflows
  - Success metrics and outcome tracking
  
- **Deliverable Generation**
  - Multi-format output generation (briefs, plans, summaries)
  - Professional presentation formatting
  - Stakeholder-specific versions and perspectives

---

## Enhanced State Machine Architecture
- **Collaboration Flow**: `expertFlow: number[]` defining specialist interaction sequences
- **Session Progression**: Calculation adapted for iterative development vs. adversarial rounds
- **Context Evolution**: Rich context passing supporting creative development and strategic building
- **Synthesis Integration**: Regular consolidation points for maintaining coherent direction
- **Deliverable Generation**: Automated creation of professional outputs at session milestones

---

## Professional Templates & Workflows

### Creative Development Templates
1. **Game/Interactive Media Development**
   - Creative Visionary → Technical Architect → Market Analyst → UX Designer → Project Synthesizer
2. **Content Creation & Storytelling**  
   - Narrative Designer → Subject Matter Expert → Audience Analyst → Production Specialist → Creative Director
3. **Product Design Innovation**
   - Design Thinker → Technical Feasibility Expert → Market Researcher → User Advocate → Innovation Synthesizer

### Strategic Business Templates
1. **Market Entry & Expansion**
   - Market Strategist → Competitive Analyst → Financial Modeler → Operations Planner → Strategic Synthesizer
2. **Product Strategy Development**
   - Customer Advocate → Technology Strategist → Business Model Analyst → Go-to-Market Expert → Strategy Integrator
3. **Innovation & R&D Planning**
   - Innovation Catalyst → Technical Feasibility Expert → Market Opportunity Analyst → Resource Planner → Innovation Director

### Research & Analysis Templates
1. **Academic Research Collaboration**
   - Literature Specialist → Methodology Expert → Statistical Analyst → Peer Reviewer → Research Synthesizer
2. **Policy Analysis & Development**
   - Policy Researcher → Stakeholder Advocate → Implementation Specialist → Impact Analyst → Policy Synthesizer
3. **Technology Assessment**
   - Technical Expert → Market Analyst → Risk Assessor → Implementation Planner → Technology Evaluator

---

## Technology Stack & Architecture
**Recommended Stack**: Next.js + Tailwind + Neon Postgres (unchanged)
- **Enhanced API Routes**: 
  - `/api/collaboration` for session management
  - `/api/expert-personas` for professional persona management
  - `/api/workflow-templates` for workflow template management
  - `/api/deliverables` for output generation and formatting

**Professional Integration Features**:
- Export compatibility with professional tools (Google Workspace, Microsoft 365, Slack)
- Template sharing and collaboration communities
- Analytics for collaboration effectiveness and outcome quality

---

## Delivery Plan & Enhanced Milestones
1. **Terminology & Vision Update**: Global transformation from debate to collaboration terminology (1 day)
2. **Professional Persona Library**: Expanded expert personas across creative, business, and research domains (1 day)
3. **Template System Implementation**: Pre-built professional workflows with industry context (1-2 days)
4. **Enhanced UI/UX**: Professional interface supporting creative and strategic workflows (1 day)
5. **Deliverable System**: Multi-format professional output generation (1 day)
6. **Testing & Validation**: Comprehensive testing of creative and strategic workflows (1 day)

---

## Future Professional Enhancements
- **Industry-Specific Versions**: Specialized versions for gaming, consulting, research, education
- **Advanced Collaboration Features**: Branching sessions, alternative exploration, consensus tracking
- **Professional Integrations**: Direct export to project management tools, presentation software
- **Community Features**: Template marketplace, collaboration pattern sharing, expert persona contributions
- **Advanced Analytics**: Collaboration effectiveness metrics, outcome prediction, optimization recommendations

---

## Success Metrics & Professional Validation
- **User Engagement**: Session completion rates, template adoption, expert persona usage patterns
- **Professional Outcomes**: Quality of deliverables, stakeholder satisfaction, implementation success rates
- **Platform Growth**: Template community development, cross-industry adoption, professional endorsements
- **Innovation Impact**: Novel collaboration patterns, creative breakthrough facilitation, strategic insight generation

---

## Risk Mitigation & Professional Considerations
- **Content Quality**: Professional validation of expert personas and collaboration templates
- **Industry Relevance**: Regular updates to maintain current professional practices and terminology
- **Scalability**: Architecture supporting diverse professional domains and collaboration complexity
- **Professional Ethics**: Appropriate handling of sensitive creative and strategic content
- **Competitive Analysis**: Differentiation from existing collaboration and ideation tools

This enhanced PRD positions AI Council as a versatile professional collaboration platform serving creative industries, strategic business planning, academic research, and educational applications while maintaining its core strength in structured multi-perspective analysis.