import { useEffect, useRef } from 'react'
import TaskTracker from '@/lib/utils/task-tracker'
import { useRouter } from 'next/navigation'

interface UseTaskTrackingOptions {
  componentName: string
  type?: 'component' | 'hook' | 'page' | 'layout'
  dependencies?: string[]
}

export function useTaskTracking({
  componentName,
  type = 'component',
  dependencies = []
}: UseTaskTrackingOptions) {
  const router = useRouter()
  const registered = useRef(false)

  useEffect(() => {
    if (!registered.current) {
      // Register component with task tracker
      TaskTracker.addCodeReference(`${type}:${componentName}`)
      
      // Track dependencies
      dependencies.forEach(dep => {
        TaskTracker.addCodeReference(`dependency:${dep}`)
      })

      registered.current = true
    }
  }, [componentName, type, dependencies])

  // Track route changes for pages
  useEffect(() => {
    if (type === 'page') {
      const handleRouteChange = (url: string) => {
        TaskTracker.addCodeReference(`route:${url}`)
      }

      // Add listener for route changes
      window.addEventListener('popstate', () => handleRouteChange(window.location.pathname))

      return () => {
        window.removeEventListener('popstate', () => handleRouteChange(window.location.pathname))
      }
    }
  }, [type])

  return {
    /**
     * Log a specific action or event in the component
     */
    trackAction: (action: string) => {
      const currentTask = TaskTracker.getInstance().getCurrentTask()
      if (currentTask) {
        const actionLog = `${componentName}:${action}`
        TaskTracker.getInstance().updateTaskProgress({
          codeReferences: [
            ...(currentTask.codeReferences || []),
            actionLog
          ]
        })
      }
    },

    /**
     * Update component dependencies
     */
    updateDependencies: (newDependencies: string[]) => {
      newDependencies.forEach(dep => {
        TaskTracker.addCodeReference(`dependency:${dep}`)
      })
    },

    /**
     * Log component updates or rerenders
     */
    trackUpdate: (reason: string) => {
      TaskTracker.addCodeReference(`update:${componentName}:${reason}`)
    },

    /**
     * Track component unmount
     */
    trackUnmount: () => {
      TaskTracker.addCodeReference(`unmount:${componentName}`)
    },

    /**
     * Get current component status in task
     */
    getComponentStatus: () => {
      const currentTask = TaskTracker.getInstance().getCurrentTask()
      if (!currentTask) return null

      const references = currentTask.codeReferences || []
      return {
        isRegistered: references.includes(`${type}:${componentName}`),
        actions: references.filter(ref => ref.startsWith(`${componentName}:`)),
        dependencies: references.filter(ref => ref.startsWith('dependency:'))
      }
    }
  }
}