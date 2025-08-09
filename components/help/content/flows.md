# Flow Design and Management

## What are Flows?

Flows define the sequence and structure of persona interactions in your debates. They're like choreographing a structured discussion, determining who speaks when, how many rounds occur, and how information passes between participants.

## Flow Components

### Basic Structure

**State Array**
- Ordered list of persona IDs that defines speaking sequence
- Example: [1, 2, 3, 2] means Persona 1 → Persona 2 → Persona 3 → Persona 2
- Can repeat personas for multiple contributions
- Minimum 2 steps required for a valid flow

**Round Configuration**
- Number of complete cycles through the flow
- Each round allows personas to build on previous contributions
- Default: 2 rounds for balanced discussion
- More rounds = deeper analysis but longer execution time

**Context Passing**
- How information flows between personas
- Each persona receives the previous persona's output as input
- Creates building conversations where ideas develop progressively
- Maintains accumulated knowledge throughout the discussion

## Flow Patterns

### Linear Analysis Flow
```
[Expert] → [Critic] → [Synthesizer] → [Final Analysis]
```
**Best for:** Technical topics requiring expert input followed by critical review
- Expert provides domain knowledge
- Critic challenges and validates
- Synthesizer integrates perspectives
- Final analysis draws conclusions

### Dialectical Discussion Flow
```  
[Position A] → [Position B] → [Moderator] → [Position A] → [Position B] → [Final Analysis]
```
**Best for:** Controversial topics with clear opposing viewpoints
- Alternating perspectives build tension
- Moderator summarizes and clarifies
- Multiple rounds allow response and counter-response
- Natural debate progression

### Multi-stakeholder Review Flow
```
[Technical] → [Ethical] → [Economic] → [Moderator] → [Synthesis]
```
**Best for:** Policy decisions affecting multiple stakeholder groups
- Each stakeholder presents their concerns
- Moderator organizes perspectives
- Synthesizer finds balanced solutions
- Comprehensive impact consideration

### Research Validation Flow
```
[Literature Reviewer] → [Methodology Critic] → [Statistical Analyst] → 
[Peer Reviewer] → [Implementation Specialist] → [Final Assessment]
```
**Best for:** Academic research and methodology review
- Systematic evaluation process
- Each step builds on previous analysis
- Mirrors academic peer review
- Thorough quality assessment

## Using the Flow Editor

### Visual Flow Designer

**Node Management**
- Drag personas from the palette to the flow canvas
- Connect nodes to define sequence
- Rearrange by dragging connections
- Remove nodes by clicking the delete button

**Flow Validation**
- Real-time validation ensures flow integrity
- Warns about missing personas or circular dependencies
- Confirms minimum requirements (2+ steps)
- Validates logical progression

**Flow Preview**
- Shows expected execution sequence
- Displays round calculations
- Estimates execution time
- Previews context passing

### Flow Configuration Panel

**Basic Settings**
- **Flow Name**: Descriptive identifier for organization
- **Description**: Purpose and intended use case documentation
- **Round Count**: Number of complete flow cycles

**Advanced Settings**
- **Context Passing Mode**: Linear vs. accumulated context
- **Error Handling**: Behavior when persona fails
- **Timeout Settings**: Maximum time per persona response

## Pre-built Flow Templates

### Academic Analysis Template
```
Research Expert → Critical Reviewer → Methodology Critic → Synthesizer
```
- Research Expert establishes knowledge base
- Critical Reviewer challenges assumptions
- Methodology Critic examines approach
- Synthesizer integrates findings
- **Ideal for:** Research proposals, academic topics, scientific discussions

### Policy Discussion Template  
```
Stakeholder A → Stakeholder B → Policy Expert → Economic Analyst → Final Recommendation
```
- Stakeholders present interests and concerns
- Policy Expert examines regulatory implications
- Economic Analyst assesses financial impact
- Final Recommendation balances perspectives
- **Ideal for:** Government policy, business decisions, regulatory topics

### Creative Exploration Template
```
Ideator → Practical Critic → Creative Enhancer → Feasibility Checker → Final Concept
```
- Ideator generates initial concepts
- Practical Critic identifies constraints
- Creative Enhancer expands possibilities
- Feasibility Checker validates practicality
- **Ideal for:** Product development, creative projects, innovation challenges

## Advanced Flow Design

### Multi-Stage Analysis

**Stage 1: Problem Definition**
- Problem identifier establishes scope
- Stakeholder representative voices concerns
- Context expert provides background

**Stage 2: Solution Generation**
- Solution generator proposes options
- Creative enhancer expands possibilities
- Feasibility analyst validates options

**Stage 3: Evaluation and Selection**
- Evaluator compares alternatives
- Risk assessor identifies concerns
- Decision synthesizer recommends approach

### Conditional Logic (Future Feature)

**Dynamic Branching**
- If consensus emerges early → Move to implementation
- If major disagreement → Add conflict resolution
- If new information → Loop back for reevaluation

**Adaptive Flows**
- Automatically adjust based on progress
- Add steps when needed
- Skip redundant analysis
- Optimize for efficiency

## Flow Optimization

### Efficiency Considerations

**Optimal Flow Length**
- **Short (4-6 steps)**: Quick insights, initial exploration
- **Medium (8-12 steps)**: Thorough analysis, balanced discussion  
- **Long (15+ steps)**: Comprehensive research, detailed planning

**Round Planning**
- **1-2 rounds**: Basic analysis and response
- **3-4 rounds**: Deep exploration and refinement
- **5+ rounds**: Comprehensive investigation (use sparingly)

**Context Management**
- Ensure each persona adds unique value
- Avoid redundant perspectives
- Plan natural progression of ideas
- Include synthesis at appropriate points

### Quality Assurance

**Flow Validation Checklist**
- [ ] All referenced personas exist
- [ ] Logical progression from broad to specific
- [ ] Natural conversation flow
- [ ] Appropriate round count for topic complexity
- [ ] Clear synthesis or conclusion step

**Testing New Flows**
- Test with sample topics before important use
- Monitor for repetition or circular discussions
- Adjust based on output quality
- Document successful patterns for reuse

## Best Practices

### Design Principles

**Progressive Complexity**
- Start with broad context and perspectives  
- Move to detailed analysis and evidence
- Progress to synthesis and integration
- End with recommendations and next steps

**Balanced Representation**
- Include different stakeholder perspectives
- Mix analytical frameworks (economic, ethical, technical)
- Balance optimistic and realistic viewpoints
- Ensure insider and outsider perspectives

**Natural Transitions**
- Design flows where each persona builds naturally on previous contributions
- Information gatherers → Analysis specialists → Synthesis experts
- Problem definers → Solution generators → Implementation planners
- Current state → Future state → Transition strategy

### Common Mistakes to Avoid

**Redundant Personas**
- Don't repeat similar analytical approaches
- Ensure each persona adds unique value
- Avoid overlapping expertise areas

**Poor Sequencing**
- Don't jump between analysis levels randomly
- Maintain logical progression
- Build complexity appropriately

**Insufficient Synthesis**
- Include moderator or synthesizer personas
- Plan for integration of perspectives
- Don't end without conclusion or recommendations

### Flow Maintenance

**Regular Review**
- Assess flow effectiveness periodically
- Update based on usage patterns
- Refine based on user feedback
- Archive unused or ineffective flows

**Version Control**
- Export successful flows for backup
- Document changes and reasons
- Maintain library of proven patterns
- Share effective configurations with team