# AI Council User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Feature Documentation](#feature-documentation)
4. [Advanced Usage](#advanced-usage)
5. [Technical Reference](#technical-reference)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Getting Started

### What is AI Council?

AI Council is a sophisticated multi-persona discussion simulator that orchestrates debates or creative brainstorming sessions between different AI personas to explore topics from multiple perspectives. Think of it as hosting a structured panel discussion where each participant has a unique role, expertise, and viewpoint - but instead of human panelists, you're working with AI personas designed to represent different analytical approaches.

The application is built on a deterministic state-machine flow, meaning discussions follow predictable patterns while still generating dynamic, insightful content. Whether you're a researcher exploring complex topics, an educator teaching critical thinking, or a content creator developing well-rounded perspectives, AI Council provides a structured framework for comprehensive analysis.

### Key Benefits

- **Multi-perspective Analysis**: Examine topics through different lenses simultaneously
- **Structured Discourse**: Organized, round-based discussions with clear progression
- **Configurable Personas**: Customize AI participants to match your needs
- **Visual Flow Design**: Drag-and-drop interface for creating discussion structures
- **Comprehensive Reporting**: Generate detailed reports in multiple formats
- **Persistent Storage**: Save and revisit debates with full database integration
- **Import/Export**: Share configurations with colleagues or students

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for AI completions
- JavaScript enabled
- Minimum 1GB RAM recommended
- Screen resolution 1024x768 or higher

### Quick Start Tutorial (5 Minutes)

Let's create your first AI Council disdussion:

#### Step 1: Enter a Topic
1. Navigate to the main AI Council interface
2. In the topic input field, enter: "Should artificial intelligence be regulated by government oversight?"
3. This gives our AI personas something concrete to discuss

#### Step 2: Review Default Setup
The application comes with three pre-configured personas:
- **Empathy Advocate**: Considers human impact and ethical implications
- **Moderator**: Summarizes points and ensures clarity
- **Skeptical Academic**: Challenges assumptions with evidence-based analysis

The default flow runs: Empathy → Moderator → Skeptic → Moderator (repeated for 2 rounds)

#### Step 3: Start the Discussion
1. Click the "Start Debate" button
2. Watch as each persona contributes their perspective
3. Click "Continue" after each response to advance to the next step
4. The moderator will extract key bullet points throughout

#### Step 4: Review Results
1. After completion, a final analysis is generated
2. Click "Generate Report" to see a comprehensive summary
3. Use "Copy Report" to save the discussion
4. The debug log shows the internal workings

**Congratulations!** You've just completed your first AI Council discussion. The entire process typically takes 3-5 minutes depending on topic complexity.

---

## Core Concepts

Understanding these fundamental concepts will help you master AI Council's capabilities:

### Personas: The Discussion Participants

Personas are the heart of AI Council - they're AI participants with distinct roles, perspectives, and analytical approaches. Each persona has:

#### Basic Properties
- **Name**: A descriptive identifier (e.g., "Skeptical Academic")
- **Role**: A brief description of their perspective (e.g., "Evidence-based challenger")
- **Task**: Detailed instructions for their contributions (e.g., "Challenge assumptions with peer-reviewed evidence")

#### Advanced Properties
- **System Prompt**: Custom instructions for advanced persona behavior
- **Parameters**: Key-value pairs for specialized configuration
- **Response Style**: How they frame their contributions

#### Persona Types
The application supports various persona archetypes:

**Analytical Personas:**
- Technical Expert: Domain-specific knowledge
- Data Analyst: Statistical and quantitative focus
- Research Scientist: Peer-review and methodology focus

**Perspective Personas:**
- Empathy Advocate: Human impact consideration
- Skeptical Academic: Critical analysis and evidence
- Practical Implementer: Real-world feasibility focus

**Facilitation Personas:**
- Moderator: Summarization and organization
- Devil's Advocate: Intentional counterarguments
- Synthesizer: Finding common ground

### Flows: The Discussion Structure

Flows define how personas interact in sequence. Think of it as choreographing a structured debate:

#### Flow Components
- **State Array**: Ordered list of persona IDs to execute
- **Round Structure**: How many complete cycles to run
- **Context Passing**: How information flows between personas

#### Example Flow Patterns

**Linear Analysis:**
```
[Expert] → [Critic] → [Synthesizer] → [Final Analysis]
```
Good for: Technical topics requiring expert input followed by critical review

**Dialectical Discussion:**
```
[Position A] → [Position B] → [Moderator] → [Position A] → [Position B] → [Final Analysis]
```
Good for: Controversial topics with clear opposing viewpoints

**Multi-stakeholder Review:**
```
[Technical] → [Ethical] → [Economic] → [Moderator] → [Synthesis]
```
Good for: Policy decisions affecting multiple stakeholder groups

### Context Passing: Information Flow

Context passing is how personas build upon each other's contributions:

#### Linear Context
Each persona receives the previous persona's output as input. This creates:
- Building conversations where ideas develop progressively
- Natural flow from one perspective to another
- Accumulated knowledge throughout the discussion

#### Round-based Context
Information accumulates across multiple rounds:
- First round establishes baseline perspectives
- Subsequent rounds allow personas to respond to each other
- Final analysis incorporates all previous contributions

### Analysis System: Extracting Insights

The analysis system processes persona contributions to extract structured insights:

#### Bullet Point Extraction
The moderator automatically identifies key points using pattern recognition:
- Detects bullet markers (•, -, *, numbered lists)
- Extracts concise statement summaries
- Maintains a cumulative list throughout the discussion

#### Final Analysis Generation
After debate completion, a specialized analysis process:
- Reviews all persona contributions
- Identifies consensus points and disagreements
- Extracts outstanding questions
- Generates actionable recommendations
- Creates an executive summary

---

## Feature Documentation

### Debate Arena: The Main Interface

The Debate Arena is your primary workspace for creating and managing discussions.

#### Topic Management
**Topic Input Field**
- Located at the top of the interface
- Supports topics up to 1000 characters
- Best practice: Use clear, specific questions or statements
- Examples of effective topics:
  - "How should universities adapt to remote learning?"
  - "What are the ethical implications of gene editing in humans?"
  - "Should social media platforms be liable for user-generated content?"

**Topic Validation**
The system automatically:
- Sanitizes input for security
- Validates length constraints
- Provides suggestions for unclear topics

#### Debate Controls
**Start Debate Button**
- Initializes a new debate session
- Creates the first user message with the topic
- Begins executing the configured flow
- Disables modification of core settings during execution

**Continue Button**
- Advances to the next step in the flow
- Appears after each persona completes their contribution
- Shows preview of next persona in sequence
- Maintains debate state between steps

**Reset Button**
- Clears all current debate data
- Returns to initial configuration state
- Preserves persona and flow settings
- Asks for confirmation to prevent accidental resets

#### Message Display
The transcript area shows:
- **Persona Attribution**: Clear identification of each contributor
- **Timestamp**: When each contribution was made
- **Round Information**: Current round and step position
- **Content Formatting**: Proper rendering of markdown and structure

#### Status Indicators
- **Current Step**: Shows which persona is active
- **Progress Bar**: Visual indication of completion percentage
- **Round Counter**: Current round and total planned rounds
- **Error States**: Clear indication of any issues

### Persona Editor: Managing Discussion Participants

The Persona Editor provides comprehensive tools for creating and customizing AI participants.

#### Persona List Interface
**Display Features:**
- Grid view of all available personas
- Quick preview of name, role, and task
- Visual indicators for active/inactive status
- Drag-and-drop reordering capabilities

**Management Actions:**
- **Create New**: Add fresh personas with guided setup
- **Edit Existing**: Modify any persona property
- **Duplicate**: Copy personas for quick variations
- **Delete**: Remove unused personas (with confirmation)

#### Persona Form: Detailed Configuration
**Required Fields:**

*Name Field:*
- 1-100 characters
- Should be descriptive and unique
- Examples: "Environmental Scientist", "Economic Policy Expert"

*Role Field:*
- 1-200 characters
- Brief description of their perspective
- Examples: "Sustainability advocate", "Cost-benefit analyst"

*Task Field:*
- 1-500 characters
- Detailed instructions for their contributions
- Should specify what kind of analysis or perspective to provide
- Example: "Analyze proposals from environmental sustainability perspective, considering long-term ecological impact and resource conservation"

**Optional Advanced Fields:**

*System Prompt:*
- Custom instructions for persona behavior
- Advanced users can fine-tune response style
- Supports markdown formatting
- Example: "You are a senior policy researcher with 15 years of experience in environmental regulation. Always cite specific examples from case studies when possible."

*Parameters:*
- Key-value pairs for specialized configuration
- Can include things like:
  - `expertise_level`: "senior" | "junior" | "expert"
  - `citation_style`: "academic" | "journalistic" | "conversational"
  - `response_length`: "brief" | "moderate" | "detailed"

#### Persona Validation
The system validates:
- **Field Requirements**: All required fields completed
- **Length Constraints**: Character limits enforced
- **Uniqueness**: No duplicate names within the same configuration
- **Content Safety**: Inappropriate content detection

### Flow Editor: Visual Discussion Design

The Flow Editor provides a drag-and-drop interface for designing discussion structures.

#### Visual Flow Designer
**Node Management:**
- **Persona Nodes**: Represent each discussion participant
- **Connection Lines**: Show the sequence of contributions
- **Add/Remove Nodes**: Dynamically modify flow structure
- **Drag and Drop**: Intuitive flow rearrangement

**Flow Validation:**
- Ensures all personas in flow exist
- Validates logical progression
- Checks for circular dependencies
- Confirms minimum flow requirements (at least 2 steps)

#### Flow Configuration Panel
**Basic Settings:**
- **Flow Name**: Descriptive identifier for the flow
- **Description**: Purpose and intended use case
- **Round Count**: How many complete cycles to execute

**Advanced Settings:**
- **Context Passing Mode**: Linear vs. accumulated
- **Error Handling**: How to handle persona failures
- **Timeout Settings**: Maximum time per persona response

#### Pre-built Flow Templates
The application includes several proven templates:

**Academic Analysis:**
```
Research Expert → Critical Reviewer → Methodology Critic → Synthesizer
```
Ideal for: Research proposals, academic topics, scientific discussions

**Policy Discussion:**
```
Stakeholder A → Stakeholder B → Policy Expert → Economic Analyst → Final Recommendation
```
Ideal for: Government policy, business decisions, regulatory topics

**Creative Exploration:**
```
Ideator → Practical Critic → Creative Enhancer → Feasibility Checker → Final Concept
```
Ideal for: Product development, creative projects, innovation challenges

### Import/Export: Configuration Management

The Import/Export system enables sharing and backup of your AI Council configurations.

#### Export Features
**Configuration Export:**
- **Complete Setup**: All personas, flows, and settings
- **Partial Export**: Selected personas or flows only
- **Metadata Inclusion**: Creation dates, descriptions, usage notes

**Export Formats:**
- **JSON Download**: Standard file format for backup
- **Clipboard Copy**: Quick sharing via copy-paste
- **QR Code**: For mobile or cross-device transfer (future feature)

**Export Validation:**
The system ensures:
- Complete data integrity
- Version compatibility information
- Dependency resolution (personas used in flows)

#### Import Features
**Import Sources:**
- **File Upload**: JSON files from previous exports
- **Clipboard Paste**: Direct JSON content import
- **URL Import**: Remote configuration sharing (future feature)

**Import Validation:**
- **Schema Validation**: Ensures data structure correctness
- **Conflict Resolution**: Handles duplicate names intelligently
- **Data Sanitization**: Security checks on imported content

**Import Options:**
- **Merge Mode**: Add to existing configurations
- **Replace Mode**: Override current setup completely  
- **Selective Import**: Choose specific personas or flows

#### Sharing Workflows
**Team Collaboration:**
1. Create and test your configuration
2. Export to JSON file
3. Share file with team members
4. Team imports and customizes as needed

**Template Distribution:**
1. Design effective flows for specific use cases
2. Export with detailed descriptions
3. Share in knowledge base or documentation
4. Others can import and adapt to their needs

### Report Generation: Comprehensive Documentation

The Report Generator creates professional documentation of your AI Council debates.

#### Report Templates

**Comprehensive Report:**
- Full transcript with timestamps
- Executive summary
- Key points extracted by moderator
- Final analysis with recommendations
- Participant information and flow details
- Statistical summary (word counts, round timing)

**Executive Summary:**
- High-level overview only
- Key decisions or conclusions
- Essential bullet points
- Recommendations
- Perfect for stakeholder briefings

**Transcript Only:**
- Complete conversation record
- Minimal formatting
- Timestamp information
- Round and persona attribution
- Ideal for detailed analysis or archival

**Analysis Only:**
- Focused on insights and conclusions
- Consensus points identification
- Outstanding questions highlighted
- Recommendations section
- Strategic implications

#### Export Options
**File Downloads:**
- **Text Format (.txt)**: Universal compatibility
- **Markdown Format (.md)**: Rich formatting support
- **PDF Export**: Professional presentation format (future feature)

**Direct Sharing:**
- **Clipboard Copy**: Immediate use in other applications
- **Email Integration**: Direct sending capabilities (future feature)
- **Cloud Storage**: Integration with Google Drive, Dropbox (future feature)

#### Report Customization
**Branding Options:**
- Custom headers and footers
- Organization logo inclusion (future feature)
- Color scheme customization (future feature)

**Content Control:**
- Include/exclude specific sections
- Anonymize persona names if needed
- Add custom commentary or notes
- Highlight specific insights

---

## Advanced Usage

### Creating Effective Personas

#### Persona Design Principles

**Specificity Over Generality:**
Instead of "Expert", use "Senior Environmental Policy Researcher with expertise in carbon market mechanisms". Specific roles generate more focused, valuable contributions.

**Complementary Perspectives:**
Design personas that naturally build on or challenge each other:
- Pair optimists with realists
- Combine broad strategic thinkers with detail-oriented implementers
- Include both insider and outsider perspectives

**Clear Analytical Frameworks:**
Give each persona a specific analytical lens:
- Economic analysis (cost-benefit, ROI, market dynamics)
- Ethical analysis (stakeholder impact, moral frameworks)
- Technical analysis (feasibility, implementation challenges)
- Political analysis (stakeholder interests, power dynamics)

#### Advanced Persona Techniques

**Parameter Utilization:**
Use parameters to create variations of similar personas:
```json
{
  "expertise_level": "senior",
  "industry_focus": "healthcare",
  "risk_tolerance": "conservative",
  "citation_preference": "peer_reviewed"
}
```

**System Prompt Crafting:**
Effective system prompts include:
- Professional background and experience
- Analytical methodology preferences
- Communication style requirements
- Specific knowledge domains

Example:
```
You are Dr. Sarah Chen, a health policy researcher with 12 years of experience in pharmaceutical regulation. You approach problems through a public health lens, always considering population-level impacts. You prefer to cite specific case studies from your research and tend to ask probing questions about implementation details. Your responses should be thorough but accessible to non-specialists.
```

### Sophisticated Flow Design

#### Multi-Stage Analysis Flows

**Research Validation Flow:**
```
Literature Reviewer → Methodology Critic → Statistical Analyst → 
Peer Reviewer → Implementation Specialist → Final Assessment
```

This flow mimics academic peer review:
1. Literature Reviewer establishes current knowledge
2. Methodology Critic examines research approach
3. Statistical Analyst reviews quantitative aspects  
4. Peer Reviewer provides overall assessment
5. Implementation Specialist considers practical applications
6. Final Assessment synthesizes all perspectives

**Stakeholder Impact Flow:**
```
Primary Stakeholder → Secondary Stakeholder → Affected Community Rep → 
Economic Impact Analyst → Social Impact Analyst → Policy Synthesizer
```

Perfect for policy decisions affecting multiple groups:
1. Primary stakeholders present their interests
2. Secondary stakeholders add their perspectives
3. Community representatives voice constituent concerns
4. Analysts examine economic and social implications
5. Policy synthesizer finds balanced solutions

#### Dynamic Flow Adaptation

**Conditional Branching (Future Feature):**
Flows that adapt based on previous responses:
- If consensus emerges early, move to implementation planning
- If major disagreement occurs, add conflict resolution steps
- If new information emerges, loop back for reevaluation

**Iterative Refinement:**
Design flows that build complexity over multiple rounds:
- Round 1: Initial positions and basic analysis
- Round 2: Deeper examination of key points
- Round 3: Integration and synthesis
- Round 4: Implementation planning

### Performance Optimization

#### Efficient Topic Formulation

**Specific vs. General Topics:**
- ❌ Generic: "What about climate change?"
- ✅ Specific: "Should carbon pricing be implemented through cap-and-trade or carbon tax mechanisms?"

**Question Structure:**
- **Analytical Questions**: "What are the implications of..."
- **Decision Questions**: "Should we choose option A or B?"
- **Evaluation Questions**: "How effective is the current approach to..."
- **Prediction Questions**: "What will happen if we implement..."

#### Managing Discussion Length

**Short Discussions (1-2 rounds):**
- Best for: Quick insights, initial exploration, time-constrained analysis
- Persona count: 3-4
- Flow length: 4-6 steps

**Medium Discussions (3-4 rounds):**
- Best for: Thorough analysis, complex topics, stakeholder review
- Persona count: 4-6  
- Flow length: 8-12 steps

**Long Discussions (5+ rounds):**
- Best for: Comprehensive research, multi-faceted problems, detailed planning
- Persona count: 5-8
- Flow length: 15+ steps

#### Token and Cost Management

**Efficient Prompting:**
- Clear, concise persona tasks reduce unnecessary verbosity
- Specific questions generate focused responses
- Well-designed context passing minimizes repetition

**Response Length Control:**
Use persona parameters to control output length:
- Brief responses (100-200 words) for quick insights
- Moderate responses (300-500 words) for balanced analysis  
- Detailed responses (500+ words) for comprehensive examination

---

## Technical Reference

### API Endpoints

The AI Council application provides RESTful APIs for integration and automation.

#### Persona Management
```
GET    /api/personas           - List all personas
POST   /api/personas           - Create new persona
PUT    /api/personas/{id}      - Update existing persona
DELETE /api/personas/{id}      - Delete persona
```

#### Flow Management
```
GET    /api/flows              - List all flows
POST   /api/flows              - Create new flow
PUT    /api/flows/{id}         - Update existing flow
DELETE /api/flows/{id}         - Delete flow
```

#### Debate Management
```
GET    /api/debates            - List debate sessions
POST   /api/debates            - Create new debate
GET    /api/debates/{id}       - Get specific debate
PATCH  /api/debates/{id}       - Update debate status
```

#### Message Management
```
GET    /api/debates/{id}/messages     - Get debate messages
POST   /api/debates/{id}/messages     - Add message to debate
```

#### Analysis Generation
```
GET    /api/debates/{id}/analysis     - Get existing analysis
POST   /api/debates/{id}/analysis     - Generate final analysis
```

### Database Schema

The application uses PostgreSQL with the following key tables:

#### Personas Table
```sql
CREATE TABLE personas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(200) NOT NULL,
    task VARCHAR(500) NOT NULL,
    system_prompt TEXT,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Flows Table
```sql
CREATE TABLE flows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    state_flow JSONB NOT NULL,
    num_rounds INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Debates Table
```sql
CREATE TABLE debates (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(1000) NOT NULL,
    workflow_id INTEGER REFERENCES workflows(id),
    status VARCHAR(20) DEFAULT 'active',
    current_step INTEGER DEFAULT 0,
    current_round INTEGER DEFAULT 1,
    context TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

#### Messages Table
```sql
CREATE TABLE debate_messages (
    id SERIAL PRIMARY KEY,
    debate_id INTEGER REFERENCES debates(id),
    persona_name VARCHAR(100) NOT NULL,
    persona_id INTEGER,
    round INTEGER NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

#### Analysis Table
```sql
CREATE TABLE debate_summaries (
    id SERIAL PRIMARY KEY,
    debate_id INTEGER REFERENCES debates(id),
    summary TEXT NOT NULL,
    bullet_points TEXT[],
    key_insights TEXT,
    consensus_points TEXT,
    outstanding_questions TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Configuration Options

#### Environment Variables
```bash
# Database Configuration
POSTGRES_URL=postgresql://username:password@host:port/database

# API Keys (Server-side only)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Application Settings
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your_auth_secret
```

#### Rate Limiting Configuration
```javascript
// Default rate limits
const rateLimits = {
  completion: { requests: 100, window: 900 },    // 100 requests per 15 minutes
  workflow: { requests: 50, window: 900 },      // 50 workflow operations per 15 minutes
  analysis: { requests: 10, window: 900 }       // 10 analysis generations per 15 minutes
};
```

#### Validation Rules
```javascript
// Input validation constraints
const validation = {
  topic: { minLength: 1, maxLength: 1000 },
  personaName: { minLength: 1, maxLength: 100 },
  personaRole: { minLength: 1, maxLength: 200 },
  personaTask: { minLength: 1, maxLength: 500 },
  messageContent: { minLength: 1, maxLength: 10000 }
};
```

---

## Troubleshooting

### Common Issues and Solutions

#### Debate Execution Problems

**Issue: Personas not responding or giving generic answers**

*Possible Causes:*
- Vague or unclear persona tasks
- Insufficient context from previous personas
- API rate limiting or connectivity issues

*Solutions:*
1. Review persona task descriptions for specificity
2. Ensure topics are clear and well-defined
3. Check debug log for API errors
4. Verify personas have complementary rather than overlapping roles

**Issue: Debates completing too quickly without sufficient analysis**

*Possible Causes:*
- Too few rounds configured
- Personas giving brief responses
- Flow design doesn't encourage interaction

*Solutions:*
1. Increase round count in flow settings
2. Add parameters to encourage longer responses
3. Include more personas with different perspectives
4. Use flows that create natural dialogue

**Issue: Repetitive or circular discussions**

*Possible Causes:*
- Similar personas with overlapping roles
- Poor flow design that doesn't build momentum
- Lack of context accumulation between rounds

*Solutions:*
1. Ensure personas have distinct analytical frameworks
2. Design flows that progress from broad to specific analysis
3. Include a strong moderator persona to summarize progress
4. Add synthesis personas to consolidate insights

#### Import/Export Issues

**Issue: Configuration import fails with validation errors**

*Solutions:*
1. Verify JSON format is correct and complete
2. Check that all referenced personas exist in the configuration
3. Ensure version compatibility (check export version)
4. Validate that required fields are present

**Issue: Exported reports don't include expected content**

*Solutions:*
1. Verify the debate completed successfully before generating reports
2. Check that moderator personas extracted bullet points during the discussion
3. Ensure final analysis was generated
4. Select appropriate report template for desired content

#### Performance Issues

**Issue: Slow response times or timeouts**

*Solutions:*
1. Check internet connectivity
2. Verify API keys are configured correctly
3. Monitor rate limiting status in debug log
4. Reduce persona task complexity to minimize token usage
5. Check server status if using hosted version

**Issue: High API costs**

*Solutions:*
1. Use more specific, focused persona tasks to reduce response length
2. Optimize flows to avoid unnecessary repetition
3. Monitor token usage in debug logs
4. Consider using shorter discussions for exploratory topics

### Error Messages and Meanings

#### API Errors
- `429: Rate limit exceeded` - Too many requests in time window
- `400: Invalid input` - Request data doesn't meet validation requirements  
- `404: Resource not found` - Persona, flow, or debate doesn't exist
- `500: Internal server error` - Server-side processing error

#### Validation Errors
- `Name is required` - Persona name field is empty
- `Task must be 500 characters or less` - Persona task exceeds limit
- `Invalid flow configuration` - Flow references non-existent personas
- `Topic too long` - Topic exceeds 1000 character limit

#### Debug Log Interpretation
The debug log provides detailed information about system operations:

```
[FLOW_START] Starting debate with topic: "AI Regulation"
[PERSONA_EXECUTE] Executing Empathy Advocate (ID: 1)
[API_CALL] Calling completion API with 245 tokens
[API_RESPONSE] Received response with 312 tokens
[BULLET_EXTRACT] Extracted 4 bullet points from moderator response
[FLOW_ADVANCE] Moving to step 2 of 8 (Round 1)
[ERROR] API timeout after 30 seconds - retrying
[FLOW_COMPLETE] Debate completed successfully with 8 messages
```

---

## Best Practices

### Designing Effective Debates

#### Topic Selection Guidelines

**Characteristics of Good Topics:**
- **Specific enough** to generate focused discussion
- **Complex enough** to benefit from multiple perspectives  
- **Relevant enough** to stakeholders to generate engagement
- **Balanced enough** to allow for legitimate disagreement

**Topic Formulation Techniques:**

*The Dilemma Format:*
"Should [organization] choose [option A] or [option B] for [specific situation]?"

*The Evaluation Format:*
"How effective is [current approach/policy/system] for achieving [specific goal]?"

*The Design Format:*
"What would be the key considerations for designing [system/policy/solution] to address [specific problem]?"

*The Prediction Format:*
"What are the likely consequences of [specific change/trend/decision] over the next [timeframe]?"

#### Flow Design Best Practices

**Progressive Complexity:**
Design flows that build understanding over time:
1. Start with broad context and stakeholder perspectives
2. Move to detailed analysis and evidence examination
3. Progress to synthesis and integration
4. End with recommendations and implementation considerations

**Balanced Representation:**
Include personas that represent:
- Different stakeholder groups affected by the issue
- Various analytical frameworks (economic, ethical, technical, social)
- Different levels of risk tolerance and change orientation
- Both insider knowledge and external perspectives

**Natural Transitions:**
Create flows where each persona naturally builds on the previous:
- Information gatherers → Analysis specialists → Synthesis experts
- Problem definers → Solution generators → Implementation planners
- Current state assessors → Future state designers → Transition strategists

#### Quality Control

**Pre-Debate Checklist:**
- [ ] Topic is specific and actionable
- [ ] Personas have distinct, complementary roles
- [ ] Flow creates logical progression
- [ ] Round count matches topic complexity
- [ ] Expected outcome is clear

**Post-Debate Review:**
- [ ] All personas contributed meaningfully
- [ ] Discussion progressed logically
- [ ] Key insights were extracted
- [ ] Recommendations are actionable
- [ ] Analysis addresses original question

### Organizational Use Cases

#### Educational Applications

**Critical Thinking Development:**
Create debates that expose students to multiple analytical frameworks:
- History: Examining historical events from different cultural perspectives
- Science: Evaluating research proposals through various methodological lenses
- Literature: Analyzing texts through different critical theory approaches
- Ethics: Exploring moral dilemmas through various ethical frameworks

**Curriculum Integration:**
- Use AI Council debates as preparation for class discussions
- Generate reports for students to analyze and critique
- Create template configurations for recurring course topics
- Encourage students to design their own persona/flow combinations

#### Business Applications

**Strategic Decision Making:**
- Market entry decisions with stakeholder analysis
- Product development with user experience, technical, and business perspectives
- Policy development with compliance, operational, and strategic views
- Crisis response planning with internal and external stakeholder consideration

**Training and Development:**
- Leadership scenario analysis with multiple management perspectives
- Customer service situation analysis from customer, employee, and business perspectives
- Change management planning with stakeholder impact assessment
- Risk assessment with various departmental and external expert views

#### Research Applications

**Literature Review Enhancement:**
- Generate multi-perspective analysis of research gaps
- Examine methodology choices through different academic traditions
- Evaluate policy implications from various disciplinary perspectives
- Assess research ethics from multiple stakeholder viewpoints

**Proposal Development:**
- Examine research questions from multiple theoretical frameworks
- Evaluate methodology choices through different disciplinary lenses
- Assess feasibility from technical, resource, and political perspectives
- Generate comprehensive literature contextualization

### Maintenance and Optimization

#### Configuration Management

**Version Control:**
- Export configurations before making major changes
- Maintain libraries of proven persona/flow combinations
- Document the rationale behind specific configuration choices
- Test modifications with sample topics before using in important contexts

**Performance Monitoring:**
- Track response quality over time
- Monitor token usage and costs
- Assess user satisfaction with generated content
- Identify and address recurring issues

**Content Quality:**
- Regularly review and update persona descriptions
- Refine flows based on actual usage patterns
- Collect feedback from users about discussion quality
- Update system prompts to reflect evolving best practices

#### Scaling Considerations

**Team Deployment:**
- Develop standard configurations for common use cases
- Provide training materials for new users
- Establish quality guidelines for persona creation
- Create approval processes for organization-wide configurations

**Integration Planning:**
- Consider API usage for automated integration with other systems
- Plan database capacity for expected usage levels
- Develop backup and recovery procedures for critical configurations
- Establish monitoring for system performance and availability

---

## Appendix

### Keyboard Shortcuts

- `Ctrl/Cmd + Enter` - Start or continue debate
- `Ctrl/Cmd + R` - Reset current debate
- `Ctrl/Cmd + S` - Export current configuration
- `Ctrl/Cmd + E` - Open persona editor
- `Ctrl/Cmd + F` - Open flow editor
- `Ctrl/Cmd + G` - Generate report
- `Ctrl/Cmd + H` - Open help system
- `Esc` - Close current modal or panel

### Sample Configurations

#### Academic Research Configuration
```json
{
  "personas": [
    {
      "name": "Literature Reviewer",
      "role": "Academic researcher specializing in systematic review",
      "task": "Examine existing research on the topic, identify gaps, and assess methodological approaches used in prior studies."
    },
    {
      "name": "Methodology Critic", 
      "role": "Research design specialist",
      "task": "Evaluate proposed or existing research methodologies for rigor, validity, and appropriateness to research questions."
    },
    {
      "name": "Statistical Analyst",
      "role": "Quantitative research expert",
      "task": "Assess statistical approaches, sample sizes, and data analysis methods for accuracy and appropriateness."
    },
    {
      "name": "Implementation Researcher",
      "role": "Practical application specialist", 
      "task": "Consider real-world implementation challenges and practical implications of research findings."
    }
  ],
  "flow": [1, 2, 3, 4, 2, 4],
  "rounds": 2
}
```

#### Business Strategy Configuration
```json
{
  "personas": [
    {
      "name": "Market Analyst",
      "role": "Competitive intelligence specialist",
      "task": "Analyze market conditions, competitive landscape, and customer demand patterns relevant to the strategic decision."
    },
    {
      "name": "Financial Controller",
      "role": "Financial impact assessor",
      "task": "Evaluate financial implications, ROI projections, and resource requirements for proposed strategies."
    },
    {
      "name": "Operations Manager", 
      "role": "Implementation feasibility expert",
      "task": "Assess operational capabilities, resource constraints, and implementation challenges for strategic options."
    },
    {
      "name": "Risk Manager",
      "role": "Risk assessment specialist",
      "task": "Identify potential risks, mitigation strategies, and contingency planning requirements."
    },
    {
      "name": "Strategy Synthesizer",
      "role": "Strategic decision facilitator",
      "task": "Integrate multiple perspectives, identify trade-offs, and recommend balanced strategic approaches."
    }
  ],
  "flow": [1, 2, 3, 4, 5, 1, 2, 3, 5],
  "rounds": 2
}
```

### Glossary

**Analysis**: The final synthesized output that integrates all persona contributions and extracts key insights, consensus points, and recommendations.

**Context Passing**: The mechanism by which information flows between personas in a debate, where each persona receives the previous persona's output as input for their own contribution.

**Flow**: The structured sequence of persona interactions that defines how a debate progresses, including which personas speak when and how many rounds the debate continues.

**Persona**: An AI participant in a debate with a defined role, perspective, and set of instructions that shape their contributions to the discussion.

**Round**: A complete cycle through all personas in the configured flow, allowing for multiple iterations where personas can build upon and respond to each other's previous contributions.

**State Machine**: The underlying system that manages debate progression, ensuring personas execute in the correct sequence and receive appropriate context from previous steps.

**Template**: A pre-configured set of personas and flows designed for specific use cases, allowing users to quickly set up debates for common scenarios.

---

*This manual was generated for AI Council v1.0. For updates and additional resources, visit the application's help system or contact support.*