# Understanding Personas

## What are Personas?

Personas are AI participants in your debates, each with distinct roles, perspectives, and analytical approaches. They're the "panelists" in your AI Council discussions, bringing unique expertise and viewpoints to every topic.

## Persona Components

### Basic Properties

**Name (Required)**
- A descriptive identifier for the persona
- Should be clear and unique within your configuration
- Examples: "Technical Expert", "Ethics Advocate", "Market Analyst"
- Best practice: Use role-based names rather than generic ones

**Role (Required)**  
- A brief description of their perspective or expertise
- Defines their analytical approach and focus area
- Examples: "Sustainability advocate", "Cost-benefit analyst", "User experience specialist"
- Keep it concise but specific

**Task (Required)**
- Detailed instructions for their contributions
- The most important field - tells the AI how to approach topics
- Should specify what type of analysis or perspective to provide
- Example: "Analyze proposals from environmental sustainability perspective, considering long-term ecological impact and resource conservation"

### Advanced Properties

**System Prompt (Optional)**
- Custom instructions for advanced persona behavior
- Fine-tune response style and approach
- Include professional background, experience level, and methodology preferences
- Example: "You are a senior policy researcher with 15 years of experience in environmental regulation. Always cite specific examples when possible and ask probing questions about implementation details."

**Parameters (Optional)**  
- Key-value pairs for specialized configuration
- Examples:
  - `expertise_level`: "senior" | "junior" | "expert"  
  - `citation_style`: "academic" | "journalistic" | "conversational"
  - `response_length`: "brief" | "moderate" | "detailed"
  - `risk_tolerance`: "conservative" | "moderate" | "aggressive"

## Persona Types and Examples

### Analytical Personas

**Technical Expert**
- Role: "Domain-specific technical specialist"
- Task: "Evaluate technical feasibility, identify implementation challenges, and assess resource requirements"
- Best for: Technology decisions, engineering projects, system design

**Data Analyst**
- Role: "Statistical and quantitative analysis specialist" 
- Task: "Examine quantitative evidence, identify data patterns, and assess statistical validity of claims"
- Best for: Research evaluation, performance analysis, evidence-based decisions

**Research Scientist**
- Role: "Peer-review and methodology expert"
- Task: "Evaluate research methodology, assess evidence quality, and identify gaps in current knowledge"
- Best for: Academic discussions, research proposals, scientific topics

### Perspective Personas

**Empathy Advocate**
- Role: "Human impact and ethics consideration specialist"
- Task: "Consider effects on different stakeholder groups, evaluate ethical implications, and ensure inclusive perspectives"
- Best for: Policy decisions, organizational changes, social issues

**Skeptical Academic**  
- Role: "Critical analysis and evidence challenger"
- Task: "Challenge assumptions, demand evidence for claims, and identify potential flaws in reasoning"
- Best for: Research review, strategic planning, quality assurance

**Practical Implementer**
- Role: "Real-world feasibility and implementation expert"
- Task: "Assess practical constraints, implementation challenges, and operational requirements"
- Best for: Strategy execution, project planning, operational decisions

### Facilitation Personas

**Moderator**
- Role: "Discussion facilitator and synthesizer"
- Task: "Summarize key points, extract bullet points, and ensure clarity in the discussion"
- Best for: Required in most flows for organization and synthesis

**Devil's Advocate**
- Role: "Intentional counterargument provider"  
- Task: "Present opposing viewpoints, challenge popular opinions, and ensure comprehensive consideration"
- Best for: Decision validation, bias checking, thorough analysis

**Synthesizer**
- Role: "Integration and common ground finder"
- Task: "Find connections between different perspectives, identify consensus points, and propose balanced solutions"
- Best for: Conflict resolution, strategy development, collaborative decisions

## Creating Effective Personas

### Design Principles

**Specificity Over Generality**
- ❌ Generic: "Expert" 
- ✅ Specific: "Senior Environmental Policy Researcher with expertise in carbon market mechanisms"

**Complementary Perspectives**
- Design personas that naturally build on or challenge each other
- Include both insider and outsider perspectives
- Balance optimistic and realistic viewpoints

**Clear Analytical Frameworks**
Give each persona a specific lens:
- Economic analysis (cost-benefit, ROI, market dynamics)
- Ethical analysis (stakeholder impact, moral frameworks)  
- Technical analysis (feasibility, implementation challenges)
- Political analysis (stakeholder interests, power dynamics)

### Advanced Techniques

**Parameter Utilization**
Use parameters to create variations:
```json
{
  "expertise_level": "senior",
  "industry_focus": "healthcare", 
  "risk_tolerance": "conservative",
  "citation_preference": "peer_reviewed"
}
```

**System Prompt Crafting**  
Effective system prompts include:
- Professional background and experience
- Analytical methodology preferences
- Communication style requirements
- Specific knowledge domains

## Persona Management

### Creating New Personas
1. Click "Create New" in the Persona Editor
2. Fill required fields (Name, Role, Task)
3. Add optional advanced configuration
4. Test with a sample topic
5. Refine based on results

### Editing Existing Personas
1. Select persona from the list
2. Modify any field as needed
3. Save changes
4. Test in a debate to verify improvements

### Quality Validation
The system automatically validates:
- Required field completion
- Character length limits
- Name uniqueness
- Content appropriateness

## Best Practices

**Naming Convention**
- Use descriptive, role-based names
- Avoid generic terms like "Agent 1" or "Expert"
- Consider including expertise area: "Healthcare Policy Analyst"

**Task Definition**
- Be specific about desired analysis type
- Include methodology preferences
- Specify output format expectations
- Consider perspective and bias instructions

**Testing and Refinement**
- Test new personas with varied topics
- Refine tasks based on output quality
- Adjust parameters for optimal performance
- Document successful configurations for reuse