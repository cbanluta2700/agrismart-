#!/usr/bin/env bun
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface MemoryUpdate {
  taskName: string
  taskType: string
  status: 'started' | 'completed'
  timestamp: string
  components: string[]
}

class TaskInitializer {
  private memoryBankPath: string
  private currentTask: any

  constructor() {
    this.memoryBankPath = join(process.cwd(), 'docs', 'memory-bank', 'tasks.json')
    this.initializeMemoryBank()
  }

  private initializeMemoryBank() {
    try {
      readFileSync(this.memoryBankPath)
    } catch {
      writeFileSync(this.memoryBankPath, JSON.stringify({ tasks: [] }, null, 2))
    }
  }

  private updateMemoryBank(update: MemoryUpdate) {
    const memoryBank = JSON.parse(readFileSync(this.memoryBankPath, 'utf-8'))
    memoryBank.tasks.push(update)
    writeFileSync(this.memoryBankPath, JSON.stringify(memoryBank, null, 2))
  }

  private async checkArchitecture() {
    console.log('🔍 Checking current architecture...')
    
    // Generate fresh architecture diagram
    execSync('./scripts/update-architecture.sh')
    
    // Read current architecture
    const diagram = readFileSync(
      join(process.cwd(), 'docs', 'architecture.mmd'),
      'utf-8'
    )
    
    console.log('✅ Architecture check complete')
    return diagram
  }

  private async initializeTask() {
    // Start task flow
    this.currentTask = await import('./task-flow').then(m => m.createTaskFlow())
    
    // Update memory bank with task start
    this.updateMemoryBank({
      taskName: this.currentTask.taskName,
      taskType: this.currentTask.taskType,
      status: 'started',
      timestamp: new Date().toISOString(),
      components: this.currentTask.affectedComponents
    })

    console.log(`🚀 Task "${this.currentTask.taskName}" initialized`)
  }

  public async registerTaskCompletion() {
    if (!this.currentTask) {
      console.error('No active task found')
      return
    }

    // Update architecture
    await this.checkArchitecture()

    // Update memory bank with task completion
    this.updateMemoryBank({
      ...this.currentTask,
      status: 'completed',
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Task "${this.currentTask.taskName}" completed`)
  }

  public async start() {
    console.log('🔄 Initializing task...')
    
    // Check architecture first
    await this.checkArchitecture()
    
    // Initialize task
    await this.initializeTask()
    
    // Set up completion hook
    process.on('SIGINT', async () => {
      console.log('\n⚠️ Task interrupted. Updating status...')
      await this.registerTaskCompletion()
      process.exit()
    })

    return this.currentTask
  }
}

// Auto-start when script is run directly
if (require.main === module) {
  const initializer = new TaskInitializer()
  initializer.start().catch(console.error)
}

export const taskInitializer = new TaskInitializer()