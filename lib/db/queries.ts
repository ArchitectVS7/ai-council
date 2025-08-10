import { getDb } from './connection'
import { agentTemplates, workflowTemplates, debates, debateMessages, workflowExecutions } from './schema'
import { desc, count, sql } from 'drizzle-orm'

export async function getDashboardStats() {
  const db = getDb()
  
  try {
    // Get counts
    const [templatesResult] = await db.select({ count: count() }).from(agentTemplates)
    const [workflowsResult] = await db.select({ count: count() }).from(workflowTemplates)
    const [debatesResult] = await db.select({ count: count() }).from(debates)
    const [executionsResult] = await db.select({ count: count() }).from(workflowExecutions)
    
    // Get recent activity
    const recentDebates = await db
      .select()
      .from(debates)
      .orderBy(desc(debates.createdAt))
      .limit(5)
    
    const recentExecutions = await db
      .select()
      .from(workflowExecutions)
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(5)
    
    return {
      stats: {
        agentTemplates: templatesResult?.count || 0,
        workflowTemplates: workflowsResult?.count || 0,
        totalDebates: debatesResult?.count || 0,
        totalExecutions: executionsResult?.count || 0,
      },
      recentDebates,
      recentExecutions,
    }
  } catch (error) {
    console.error('Database query failed:', error)
    // Return mock data as fallback
    return {
      stats: {
        agentTemplates: 13,
        workflowTemplates: 3,
        totalDebates: 0,
        totalExecutions: 0,
      },
      recentDebates: [],
      recentExecutions: [],
    }
  }
}

export async function getAgentTemplates() {
  const db = getDb()
  
  try {
    return await db
      .select()
      .from(agentTemplates)
      .where(sql`${agentTemplates.isActive} = true`)
      .orderBy(agentTemplates.category, agentTemplates.name)
  } catch (error) {
    console.error('Failed to fetch agent templates:', error)
    return []
  }
}

export async function getWorkflowTemplates() {
  const db = getDb()
  
  try {
    return await db
      .select()
      .from(workflowTemplates)
      .where(sql`${workflowTemplates.isActive} = true`)
      .orderBy(workflowTemplates.category, workflowTemplates.name)
  } catch (error) {
    console.error('Failed to fetch workflow templates:', error)
    return []
  }
}

export async function getDebatesWithMessages() {
  const db = getDb()
  
  try {
    const debates = await db
      .select()
      .from(debates)
      .orderBy(desc(debates.createdAt))
      .limit(20)
    
    // Get messages for each debate
    const debatesWithMessages = await Promise.all(
      debates.map(async (debate) => {
        const messages = await db
          .select()
          .from(debateMessages)
          .where(sql`${debateMessages.debateId} = ${debate.id}`)
          .orderBy(debateMessages.timestamp)
        
        return {
          ...debate,
          messages,
        }
      })
    )
    
    return debatesWithMessages
  } catch (error) {
    console.error('Failed to fetch debates:', error)
    return []
  }
}