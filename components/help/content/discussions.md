# Running and Managing Discussions

## Discussion Execution Overview

A discussion in AI Council is a structured collaboration where your configured personas explore a topic according to your defined flow. Each persona contributes their unique perspective in sequence, building comprehensive insights through multiple rounds.

## Starting a Discussion

### Topic Preparation

**Effective Topic Formulation**
- Be specific rather than general
- Frame as clear questions or decision points
- Provide sufficient context for meaningful analysis

**Topic Examples:**
- ❌ Generic: "What about climate change?"
- ✅ Specific: "Should carbon pricing be implemented through cap-and-trade or carbon tax mechanisms?"
- ✅ Decision-focused: "Should our company adopt a 4-day work week policy?"
- ✅ Analytical: "What are the key factors to consider when evaluating remote work policies?"

**Topic Structure Types:**
- **Analytical Questions**: "What are the implications of..."
- **Decision Questions**: "Should we choose option A or B?"
- **Evaluation Questions**: "How effective is the current approach to..."
- **Prediction Questions**: "What will happen if we implement..."

### Configuration Review

**Pre-Discussion Checklist:**
- [ ] Topic is clear and specific
- [ ] Personas have distinct, complementary roles
- [ ] Flow creates logical progression
- [ ] Round count matches topic complexity
- [ ] Expected outcome is defined

**Quick Setup Review:**
1. **Topic Input**: Verify topic clarity and specificity
2. **Persona Panel**: Confirm appropriate personas are selected
3. **Flow Preview**: Review execution sequence
4. **Settings**: Check round count and other parameters

## Discussion Controls and Navigation

### Primary Controls

**Start Discussion Button**
- Initializes new discussion session
- Creates first message with the topic
- Begins executing configured flow
- Locks configuration during execution

**Continue Button**  
- Advances to next step in flow
- Appears after each persona completes contribution
- Shows preview of next persona
- Maintains state between steps

**Reset Button**
- Clears current discussion data
- Returns to initial state
- Preserves persona and flow settings
- Requires confirmation to prevent accidental loss

### Status Monitoring

**Progress Indicators**
- **Current Step**: Shows active persona and position
- **Progress Bar**: Visual completion percentage
- **Round Counter**: Current round and total planned
- **Time Elapsed**: Duration since discussion start

**Flow Status**
- **Next Persona**: Preview of upcoming contribution
- **Remaining Steps**: Steps left in current round
- **Estimated Time**: Approximate completion time

## Understanding Debate Flow

### Context Passing

**Linear Context Flow**
- Each persona receives previous persona's output as input
- Creates natural conversation progression  
- Information builds cumulatively
- Context becomes richer over multiple rounds

**Example Context Flow:**
1. **Empathy Advocate** receives: "Topic: Should we implement remote work?"
2. **Moderator** receives: "Topic + Empathy Advocate's response"
3. **Skeptical Academic** receives: "Topic + All previous responses"

### Round Progression

**Round Structure**
- Each round = complete cycle through the flow
- Round 1: Initial perspectives and positions
- Round 2+: Responses to others, refinement, synthesis
- Multiple rounds allow deeper exploration

**Round Calculation**
- Automatically calculated based on current step and flow length
- Progress indicator shows current position
- Round boundaries clearly marked in transcript

## Message Display and Transcript

### Message Components

**Persona Attribution**
- Clear identification of each contributor
- Persona name and role displayed
- Visual distinction between different personas

**Content Formatting**
- Proper rendering of markdown and structure  
- Bullet points automatically formatted
- Long responses with readable line breaks
- Code blocks and quotes preserved

**Metadata Display**
- Timestamp for each contribution
- Round and step information
- Word count and reading time estimates
- Response generation time

### Transcript Features

**Real-time Updates**
- Messages appear as they're generated
- Progress indicators during generation
- Auto-scroll to latest message
- Smooth animations for new content

**Export Options**
- Copy individual messages
- Copy entire transcript
- Export formatted transcript
- Generate comprehensive reports

## Error Handling and Recovery

### Common Issues

**Persona Non-Response**
- Timeout handling with automatic retry
- Error logging in debug panel
- Option to skip step or restart
- Manual intervention capabilities

**API Errors**
- Rate limiting notifications
- Connectivity issue alerts
- Automatic retry mechanisms
- Graceful degradation options

**Flow Interruption**
- Save current state for resumption
- Manual step control options
- Debug information for troubleshooting
- Support for partial completion

### Recovery Options

**Resume Capability**
- Debates can be paused and resumed
- State preservation across sessions
- Checkpoint system for long discussions
- Recovery from unexpected interruptions

**Manual Intervention**
- Edit persona responses if needed
- Skip problematic steps
- Restart from specific points
- Override automatic flow progression

## Debug Features

### Debug Log

**Information Tracked:**
- API calls and responses
- Token usage and costs
- Persona execution timing
- Error messages and warnings
- State transitions and flow progress

**Using Debug Information:**
- Troubleshoot performance issues
- Monitor API usage and costs
- Understand execution flow
- Identify optimization opportunities

**Debug Log Actions:**
- Copy log to clipboard
- Clear log history
- Filter by message type
- Export for technical support

### Performance Monitoring

**Metrics Displayed:**
- Response generation time per persona
- Total discussion duration
- Token consumption tracking
- API call success/failure rates
- Memory and resource usage

## Debate Management

### Session Control

**Pause and Resume**
- Save current discussion state
- Resume from last step
- Preserve all messages and context
- Handle long-running discussions

**Session History**
- View previous discussion sessions
- Access saved configurations
- Review completed discussions
- Compare different approaches

### Quality Control

**Response Review**
- Preview persona responses before accepting
- Edit responses if needed (manual mode)
- Regenerate unsatisfactory responses
- Maintain discussion quality

**Flow Monitoring**
- Track discussion progression
- Identify off-topic responses  
- Monitor persona performance
- Adjust flow in real-time

## Best Practices

### Topic Management

**Preparation Strategies:**
- Research topic beforehand for context
- Define specific questions or decisions needed
- Consider multiple perspectives before starting
- Prepare follow-up questions for deeper analysis

**Topic Refinement:**
- Start with broad topic, then narrow focus
- Use initial discussions to identify key questions
- Refine topic based on persona responses
- Iterate for better results

### Flow Optimization

**Execution Monitoring:**
- Watch for repetitive responses
- Notice when personas aren't contributing uniquely
- Identify optimal stopping points
- Monitor discussion depth and quality

**Real-time Adjustments:**
- Skip redundant steps if needed
- Add extra rounds for complex topics
- Modify persona parameters between rounds
- Adapt based on emerging insights

### Session Management

**Efficient Execution:**
- Plan discussion timing for optimal attention
- Take breaks during long sessions
- Review progress regularly
- Save important insights immediately

**Quality Assurance:**
- Review each persona's contribution
- Ensure discussion stays on topic
- Monitor for bias or repetition
- Validate key insights and conclusions