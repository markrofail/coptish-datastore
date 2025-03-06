import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

type FileNodeWithContent = { name: string; content?: string }
type FileNode = string

// Define the structure for file system nodes, allowing for files with content.
interface DirectoryNode {
    [key: string]: (FileNode | FileNodeWithContent | DirectoryNode)[]
}

/**
 * Creates a directory structure recursively based on the provided data.
 *
 * @param data The file system structure data.
 * @param basePath The base path for creating the structure.
 */
function createDirectoryStructure(data: DirectoryNode[], basePath: string = '.'): void {
    for (const item of data) {
        for (const key in item) {
            const currentPath = path.join(basePath, key)

            if (Array.isArray(item[key])) {
                createDirectory(currentPath)
                processFileSystemNodes(item[key], currentPath)
            }
        }
    }
}

/**
 * Creates a directory if it doesn't exist.
 *
 * @param dirPath The path of the directory to create.
 */
function createDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

const isFileNode = (node: FileNode | FileNodeWithContent | DirectoryNode): node is FileNode => typeof node === 'string'
const isFileNodeWithContent = (node: FileNode | FileNodeWithContent | DirectoryNode): node is FileNodeWithContent => typeof node === 'object' && 'name' in node

/**
 * Processes an array of file system nodes, creating files and subdirectories.
 *
 * @param nodes The array of file system nodes to process.
 * @param currentPath The current base path.
 */
function processFileSystemNodes(nodes: (FileNode | FileNodeWithContent | DirectoryNode)[], currentPath: string): void {
    for (const node of nodes) {
        if (isFileNode(node)) {
            createEmptyFile(path.join(currentPath, node))
        } else if (isFileNodeWithContent(node)) {
            createFileWithContent(path.join(currentPath, node.name), node.content || '')
        } else {
            createDirectoryStructure([node], currentPath) // Recursive call for subdirectories
        }
    }
}

/**
 * Creates an empty file if it doesn't exist.
 *
 * @param filePath The path of the file to create.
 */
function createEmptyFile(filePath: string): void {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '')
}

/**
 * Creates a file with the specified content if it doesn't exist.
 *
 * @param filePath The path of the file to create.
 * @param content The content to write to the file.
 */
function createFileWithContent(filePath: string, content: string): void {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content)
}

const yamlData = fs.readFileSync(path.join(__dirname, './directory_structure.yml'), 'utf8')
const jsonData = yaml.load(yamlData) as DirectoryNode[]
const basePath = path.join(__dirname, '../data/HC-Katameros-Great-Lent')
createDirectoryStructure(jsonData, basePath)
