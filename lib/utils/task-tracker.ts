import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface TaskMetadata {
  id: string
  name: string
  type: string
  status: 'pending' | 'in_progress' | 'completed'
  startTime: string
  endTime?: string
  affectedComponents: string[]
  architectureSnapshot: string
  codeReferences: string[]
}

interface MemoryBankData {
  tasks: TaskMetadata[]
  currentTask?: TaskMetadata
}

class TaskTracker {
  private static instance: TaskTracker
  private memoryBankPath: string
  private data: MemoryBankData

  private constructor() {
    this.memoryBankPath = join(process.cwd(), 'docs', 'memory-bank', 'tasks.json')
    this.data = this.loadMemoryBank()
  }

  public static getInstance(): TaskTracker {
    if (!TaskTracker.instance) {
      TaskTracker.instance = new TaskTracker()
    }
    return TaskTracker.instance
  }

  private loadMemoryBank(): MemoryBankData {
    try {
      const data = readFileSync(this.memoryBankPath, 'utf-8')
      return JSON.parse(data)
    } catch {
      const initialData = { tasks: [] }
      writeFileSync(this.memoryBankPath, JSON.stringify(initialData, null, 2))
      return initialData
    }
  }

  private saveMemoryBank() {
    writeFileSync(this.memoryBankPath, JSON.stringify(this.data, null, 2))
  }

  public startTask(metadata: Omit<TaskMetadata, 'id' | 'status' | 'startTime'>) {
    // Complete any existing task
    if (this.data.currentTask) {
      this.completeTask()
    }

    const newTask: TaskMetadata = {
      ...metadata,
      id: `task_${Date.now()}`,
      status: 'in_progress',
      startTime: new Date().toISOString()
    }

    this.data.currentTask = newTask
    this.data.tasks.push(newTask)
    this.saveMemoryBank()

    return newTask
  }

  public completeTask() {
    if (!this.data.currentTask) {
      throw new Error('No active task to complete')
    }

    this.data.currentTask.status = 'completed'
    this.data.currentTask.endTime = new Date().toISOString()

    // Update in tasks array
    const taskIndex = this.data.tasks.findIndex(t => t.id === this.data.currentTask?.id)
    if (taskIndex !== -1) {
      this.data.tasks[taskIndex] = this.data.currentTask
    }

    // Clear current task
    this.data.currentTask = undefined
    this.saveMemoryBank()
  }

  public updateTaskProgress(update: Partial<TaskMetadata>) {
    if (!this.data.currentTask) {
      throw new Error('No active task to update')
    }

    this.data.currentTask = {
      ...this.data.currentTask,
      ...update
    }

    // Update in tasks array
    const taskIndex = this.data.tasks.findIndex(t => t.id === this.data.currentTask?.id)
    if (taskIndex !== -1) {
      this.data.tasks[taskIndex] = this.data.currentTask
    }

    this.saveMemoryBank()
  }

  public getCurrentTask(): TaskMetadata | undefined {
    return this.data.currentTask
  }

  public getTaskHistory(): TaskMetadata[] {
    return this.data.tasks
  }

  public getTaskById(id: string): TaskMetadata | undefined {
    return this.data.tasks.find(t => t.id === id)
  }

  public static addCodeReference(filePath: string) {
    const tracker = TaskTracker.getInstance()
    const currentTask = tracker.getCurrentTask()
    
    if (currentTask) {
      const references = currentTask.codeReferences || []
      if (!references.includes(filePath)) {
        tracker.updateTaskProgress({
          codeReferences: [...references, filePath]
        })
      }
    }
  }

  public static updateArchitectureSnapshot(snapshot: string) {
    const tracker = TaskTracker.getInstance()
    const currentTask = tracker.getCurrentTask()
    
    if (currentTask) {
      tracker.updateTaskProgress({
        architectureSnapshot: snapshot
      })
    }
  }
}

export const taskTracker = TaskTracker.getInstance()
export default TaskTracker