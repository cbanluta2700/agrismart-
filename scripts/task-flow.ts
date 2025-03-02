#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import prompts from 'prompts'

interface TaskContext {
  taskName: string
  taskType: 'feature' | 'component' | 'hook' | 'utility'
  affectedComponents: string[]
  description: string
}

async function createTaskFlow() {
  // Get task information
  const taskContext = await promptTaskInfo()
  
  // Create task documentation
  createTaskDocument(taskContext)
  
  // Generate implementation checklist
  generateChecklist(taskContext)
  
  // Update architecture diagram
  updateArchitecture()
}

async function promptTaskInfo(): Promise<TaskContext> {
  const response = await prompts([
    {
      type: 'text',
      name: 'taskName',
      message: 'Enter task name:'
    },
    {
      type: 'select',
      name: 'taskType',
      message: 'Select task type:',
      choices: [
        { title: 'Feature', value: 'feature' },
        { title: 'Component', value: 'component' },
        { title: 'Hook', value: 'hook' },
        { title: 'Utility', value: 'utility' }
      ]
    },
    {
      type: 'text',
      name: 'description',
      message: 'Enter task description:'
    },
    {
      type: 'list',
      name: 'affectedComponents',
      message: 'Enter affected components (comma separated):'
    }
  ])

  return {
    taskName: response.taskName,
    taskType: response.taskType,
    description: response.description,
    affectedComponents: response.affectedComponents
  }
}

function createTaskDocument(context: TaskContext) {
  const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
  const docPath = path.join(
    process.cwd(),
    'docs',
    'tasks',
    `${timestamp}_${context.taskName}.md`
  )

  const content = `# Task: ${context.taskName}
Created: ${new Date().toISOString()}

## Overview
${context.description}

## Type
${context.taskType}

## Affected Components
${context.affectedComponents.join('\n')}

## Architecture Check
- [ ] Review current architecture diagram
- [ ] Identify affected component relationships
- [ ] Validate proposed changes
- [ ] Update component documentation

## Implementation Steps
1. [ ] Check similar patterns in codebase
2. [ ] Create/modify components
3. [ ] Update tests
4. [ ] Run architecture update
5. [ ] Verify relationships

## Code References
\`\`\`
# Similar implementations in codebase:
${findSimilarImplementations(context)}
\`\`\`

## Notes
- Remember to run architecture update after implementation
- Update component documentation
- Add tests for new functionality
`

  writeFileSync(docPath, content)
  console.log(`Task document created: ${docPath}`)
}

function generateChecklist(context: TaskContext) {
  const checklistPath = path.join(
    process.cwd(),
    'docs',
    'tasks',
    `${context.taskName}_checklist.md`
  )

  const content = `# Implementation Checklist: ${context.taskName}

## Pre-Implementation
- [ ] Architecture review completed
- [ ] Similar patterns identified
- [ ] Component relationships documented
- [ ] Test requirements defined

## Implementation
- [ ] Create/modify files
- [ ] Add tests
- [ ] Update documentation
- [ ] Run linting/formatting

## Post-Implementation
- [ ] Run architecture update
- [ ] Verify component relationships
- [ ] Update task document
- [ ] Run test suite

## Quality Checks
- [ ] Code follows project patterns
- [ ] Documentation is complete
- [ ] Tests are comprehensive
- [ ] Architecture is updated
`

  writeFileSync(checklistPath, content)
  console.log(`Checklist created: ${checklistPath}`)
}

function findSimilarImplementations(context: TaskContext): string {
  // Search codebase for similar patterns based on task type
  const searchPath = getSearchPath(context.taskType)
  try {
    const result = execSync(
      `find ${searchPath} -type f -name "*.ts*" | xargs grep -l "${context.taskName}"`,
      { encoding: 'utf-8' }
    )
    return result || 'No similar implementations found'
  } catch (error) {
    return 'No similar implementations found'
  }
}

function getSearchPath(taskType: string): string {
  switch (taskType) {
    case 'component':
      return './components'
    case 'hook':
      return './hooks'
    case 'utility':
      return './lib'
    default:
      return '.'
  }
}

function updateArchitecture() {
  try {
    execSync('./scripts/update-architecture.sh')
    console.log('Architecture documentation updated')
  } catch (error) {
    console.error('Failed to update architecture:', error)
  }
}

// Run the task flow
createTaskFlow().catch(console.error)