import { readdir, readFile, writeFile } from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  imports: string[]
  exports: string[]
  children?: FileNode[]
}

interface ComponentRelation {
  from: string
  to: string
  type: 'imports' | 'uses' | 'implements'
}

async function analyzeFile(filePath: string): Promise<{ imports: string[], exports: string[] }> {
  const content = await readFile(filePath, 'utf-8')
  const imports: string[] = []
  const exports: string[] = []

  // Extract imports
  const importRegex = /import\s+{?\s*[\w\s,]+}?\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  // Extract exports
  const exportRegex = /export\s+(const|class|interface|type|function)\s+(\w+)/g
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[2])
  }

  return { imports, exports }
}

async function buildFileTree(dir: string, baseDir: string): Promise<FileNode[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, baseDir)
      nodes.push({
        name: entry.name,
        type: 'directory',
        path: relativePath,
        imports: [],
        exports: [],
        children
      })
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const analysis = await analyzeFile(fullPath)
      nodes.push({
        name: entry.name,
        type: 'file',
        path: relativePath,
        ...analysis
      })
    }
  }

  return nodes
}

function generateMermaidDiagram(nodes: FileNode[]): string {
  let diagram = 'graph TD\n'
  const relations: ComponentRelation[] = []

  function processNode(node: FileNode, parentId?: string) {
    const nodeId = node.path.replace(/[^\w]/g, '_')
    
    if (node.type === 'directory') {
      diagram += `  ${nodeId}[${node.name}]\n`
      node.children?.forEach(child => processNode(child, nodeId))
    } else {
      diagram += `  ${nodeId}((${node.name}))\n`
      
      // Add relations based on imports
      node.imports.forEach(imp => {
        const importId = imp.replace(/[^\w]/g, '_')
        relations.push({
          from: nodeId,
          to: importId,
          type: 'imports'
        })
      })
    }

    if (parentId) {
      diagram += `  ${parentId} --> ${nodeId}\n`
    }
  }

  nodes.forEach(node => processNode(node))

  // Add unique relations to diagram
  const uniqueRelations = new Set(relations.map(r => `${r.from} --> ${r.to}`))
  uniqueRelations.forEach(relation => {
    diagram += `  ${relation}\n`
  })

  return diagram
}

async function generateArchitectureDiagram() {
  try {
    console.log('Analyzing project structure...')
    const projectRoot = path.resolve(__dirname, '..')
    const nodes = await buildFileTree(projectRoot, projectRoot)

    console.log('Generating diagram...')
    const diagram = generateMermaidDiagram(nodes)

    // Save as Mermaid diagram
    const mermaidPath = path.join(projectRoot, 'docs', 'architecture.mmd')
    await writeFile(mermaidPath, diagram)

    // Generate SVG using Mermaid CLI if available
    try {
      await execAsync(`mmdc -i ${mermaidPath} -o ${path.join(projectRoot, 'docs', 'architecture.svg')}`)
      console.log('Architecture diagram generated successfully!')
    } catch (error) {
      console.log('Note: Install Mermaid CLI to generate SVG diagram')
      console.log('npm install -g @mermaid-js/mermaid-cli')
    }

    // Generate component relationships documentation
    const relationships = analyzeComponentRelationships(nodes)
    await writeFile(
      path.join(projectRoot, 'docs', 'component-relationships.md'),
      generateRelationshipsDocs(relationships)
    )

    console.log('Architecture documentation generated successfully!')
  } catch (error) {
    console.error('Error generating architecture diagram:', error)
  }
}

function analyzeComponentRelationships(nodes: FileNode[]): ComponentRelation[] {
  const relations: ComponentRelation[] = []

  function processNode(node: FileNode) {
    if (node.type === 'file') {
      node.imports.forEach(imp => {
        relations.push({
          from: node.path,
          to: imp,
          type: 'imports'
        })
      })
    }
    node.children?.forEach(processNode)
  }

  nodes.forEach(processNode)
  return relations
}

function generateRelationshipsDocs(relations: ComponentRelation[]): string {
  let doc = '# Component Relationships\n\n'
  
  // Group by source component
  const grouped = relations.reduce((acc, rel) => {
    if (!acc[rel.from]) {
      acc[rel.from] = []
    }
    acc[rel.from].push(rel)
    return acc
  }, {} as Record<string, ComponentRelation[]>)

  // Generate documentation
  Object.entries(grouped).forEach(([from, rels]) => {
    doc += `## ${from}\n\n`
    doc += 'Dependencies:\n'
    rels.forEach(rel => {
      doc += `- ${rel.type} ${rel.to}\n`
    })
    doc += '\n'
  })

  return doc
}

// Run the generator
generateArchitectureDiagram()

export { generateArchitectureDiagram }