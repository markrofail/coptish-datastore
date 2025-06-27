import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { listAllFiles, MultiLingualProcessor } from './utils'
import { Prayer, Reading } from '../schemas/raw_types'
import { ReadingType, Synaxarium } from '../schemas/types'
import cliProgress from 'cli-progress'

class TypeFieldAdder extends MultiLingualProcessor {
    /**
     * Transforms a single YAML file by adding/updating the 'type' field at its root.
     *
     * @param filepath The path to the YAML file.
     */
    transformFile = (filepath: string) => {
        const fileContent = fs.readFileSync(filepath, 'utf-8')
        const inputData: any = yaml.load(fileContent) // Load as any to inspect structure

        // Determine the type based on content structure
        const determinedType = this.determineRootType(inputData)

        // If a type was determined and it's different or missing, update the data
        if (!inputData.type || inputData.type !== determinedType) {
            inputData.type = determinedType
            fs.writeFileSync(filepath, yaml.dump(inputData, { lineWidth: 9999 }), 'utf-8')
            // console.log(`Updated type for: ${filepath} to '${determinedType}'`); // Optional: for detailed logging
        } else {
            // console.log(`Type already correct for: ${filepath} ('${determinedType}')`); // Optional: for detailed logging
        }
    }

    /**
     * Determines the root type of the YAML content based on its structure.
     * @param data The parsed YAML data.
     * @returns The determined type ('prayer', 'reading', or 'synaxarium').
     * @throws Error if the type cannot be determined.
     */
    private determineRootType(data: any): Prayer['type'] | Reading['type'] | Synaxarium['type'] {
        // A Prayer typically has a 'sections' array
        if (data.sections !== undefined && Array.isArray(data.sections)) {
            return 'prayer'
        }

        // A Synaxarium has a 'commemorations' array
        if (data.commemorations !== undefined && Array.isArray(data.commemorations)) {
            return 'synaxarium'
        }

        // A Reading usually contains properties corresponding to ReadingType
        // other than 'title' and 'type' itself
        const readingTypeKeys: ReadingType[] = [
            'vespers-psalm',
            'vespers-gospel',
            'matins-psalm',
            'matins-gospel',
            'matins-prophecies',
            'matins-sermon',
            'pauline-epistle',
            'catholic-epistle',
            'acts-of-the-apostles',
            'synaxarium', // 'synaxarium' can be a reading type within a Reading file
            'liturgy-psalm',
            'liturgy-gospel',
            'evening-prayers-psalm',
            'evening-prayers-gospel',
        ]

        for (const key of readingTypeKeys) {
            if (data[key] !== undefined) {
                return 'reading'
            }
        }

        // If none of the above patterns match, we cannot determine the type.
        throw new Error(`Could not determine a valid root type for file content. Keys found: ${Object.keys(data).join(', ')}`)
    }
}

// --- Main execution block ---
const program = new Command()
program //
    .argument('<input file or directory>', 'Either a file or directory to process.')
    .parse(process.argv)

const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`Input file or directory does not exist: "${inputFile}"`)
}

const typeAdder = new TypeFieldAdder()
// Ensure only .yml files are processed
const files = listAllFiles(inputFile, { predicate: (filePath) => path.extname(filePath) === '.yml' })
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

console.log('Migrating files to add/update "type" field...')
const errors: string[] = []
progressBar.start(files.length, 0)

for (const file of files) {
    progressBar.increment()
    try {
        typeAdder.transformFile(file)
    } catch (e: any) {
        errors.push(`Error processing ${file}: ${e.message}`)
    }
}
progressBar.stop()

if (errors.length > 0) {
    console.error('\nMigration completed with errors:')
    program.error(errors.join('\n'))
} else {
    console.log('\nMigration completed successfully for all files!')
}
