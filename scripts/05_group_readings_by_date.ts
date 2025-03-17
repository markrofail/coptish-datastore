import * as path from 'path'
import * as yaml from 'js-yaml'
import { Dirent, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { defaultDict } from './utils'
import { Command } from 'commander'

function processDirectory(directoryPath: string) {
    try {
        const entries = readdirSync(directoryPath, { withFileTypes: true })
        const hasSubDirs = entries.some((entry) => entry.isDirectory())

        // If this is a leaf directory (no subdirectories)
        if (!hasSubDirs) {
            createYmlFile(directoryPath, entries)
            return
        } else {
            // Process subdirectories recursively
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subDirPath = path.join(directoryPath, entry.name)
                    processDirectory(subDirPath)
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${directoryPath}:`, error)
        throw error
    }
}

function createYmlFile(dirPath: string, entries: Dirent[]) {
    const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name))
    let title: unknown

    // Process all .yml files in the leaf directory
    const result = defaultDict(() => [] as unknown[])
    for (const entry of sortedEntries) {
        if (!entry.isFile) continue
        if (entry.name === 'index.yml') {
            const content = readFileSync(path.join(dirPath, entry.name), 'utf8')
            title = (yaml.load(content) as any)?.title
        } else if (entry.name.endsWith('.yml')) {
            let filePath = path.basename(entry.name, path.extname(entry.name))
            if (/^\d/.test(filePath)) filePath = filePath.substring(3, filePath.length)
            if (/\d$/.test(filePath)) filePath = filePath.substring(0, filePath.length - 3)

            try {
                const content = readFileSync(path.join(dirPath, entry.name), 'utf8')
                const parsedContent = yaml.load(content)
                result[filePath].push(parsedContent)
            } catch (error) {
                console.error(`Error processing file ${filePath}:`, error)
            }
        }
    }

    // Write the new YAML file if we have any content
    if (Object.keys(result).length > 0) {
        const dirName = path.basename(dirPath)
        const outputPath = path.join(path.dirname(dirPath), `${dirName}.yml`)
        const yamlContent = yaml.dump({ title, ...result }, { lineWidth: -1 })

        try {
            writeFileSync(outputPath, yamlContent, 'utf8')
            rmSync(dirPath, { recursive: true })
            console.log(`Created ${outputPath}`)
        } catch (error) {
            console.error(`Error writing file ${outputPath}:`, error)
        }
    }
}

const program = new Command()
program //
    .argument('<input file or directory>', 'either a file or directory to process')
    .parse(process.argv)

const [inputFile] = program.args
if (!existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

try {
    processDirectory(inputFile)
    console.log('Directory processing completed')
} catch (error) {
    console.error('Failed to process directory:', error)
}
