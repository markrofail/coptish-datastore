import { Command } from 'commander'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { existsSync } from 'fs'
import { Reading as RawReading, ReadingV2 as RawReadingV2 } from '../schemas/raw_types'

const folders = [
    'acts-of-the-apostles',
    'catholic-epistle',
    'liturgy-gospel',
    'liturgy-psalm',
    'matins-gospel',
    'matins-psalm',
    'pauline-epistle',
    'vespers-gospel',
    'vespers-psalm',
] as const

async function mergeFiles(inputDir: string) {
    try {
        const outputDir = path.join(inputDir, 'annual')
        await fs.mkdir(outputDir, { recursive: true })

        const files = await fs.readdir(path.join(inputDir, folders[0]))
        const dates = files.filter((f) => f.endsWith('.yml')).map((f) => f.replace('.yml', ''))

        for (const date of dates) {
            const output: RawReadingV2 = { title: { english: date } }

            for (const folder of folders) {
                const filePath = path.join(inputDir, folder, `${date}.yml`)
                try {
                    const fileContent = await fs.readFile(filePath, 'utf8')
                    const data = yaml.load(fileContent) as RawReading

                    // Initialize array for this reading type if not exists
                    output[folder] = output[folder] || []

                    // Add the reading to the appropriate array
                    output[folder]!.push(data)
                } catch (error) {
                    console.warn(`Warning: Could not read ${filePath}: ${error}`)
                }
            }

            // Write merged file
            const outputPath = path.join(outputDir, `${date}.yml`)
            await fs.writeFile(outputPath, yaml.dump(output, { lineWidth: -1 }))
            console.log(`Successfully merged files for ${date}`)
        }
    } catch (error) {
        console.error(`Error during merge process: ${error}`)
        process.exit(1)
    }
}

const program = new Command()

program
    .version('1.0.0')
    .description('Merge liturgical reading YAML files by date')
    .argument('<input file or directory>', 'either a file or directory to process')
    .parse(process.argv)

const [inputFile] = program.args
if (!existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

try {
    mergeFiles(inputFile)
    console.log('Directory processing completed')
} catch (error) {
    console.error('Failed to process directory:', error)
}
