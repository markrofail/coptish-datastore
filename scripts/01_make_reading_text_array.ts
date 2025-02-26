import * as fs from 'fs'
import * as yaml from 'js-yaml'
import cliProgress from 'cli-progress'
import { Command } from 'commander'
import { MultiLingualText, listAllFiles, MultiLingualProcessor } from './utils'
import { Reading } from '../schemas/types'
import { flattenDeep } from 'lodash'

class MultiLingualVerseMerger extends MultiLingualProcessor {
    transformFile = (filepath: string) => {
        const inputData = yaml.load(fs.readFileSync(filepath, 'utf-8')) as Reading

        if (!inputData.text) return

        inputData.text = flattenDeep(inputData.text) as unknown as MultiLingualText[]
        fs.writeFileSync(filepath, yaml.dump(inputData, { lineWidth: 999999999999 }), 'utf-8')
    }
}

const program = new Command()
program //
    .argument('<input file or directory>', 'either a file or directory to process')
    .parse(process.argv)

const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

const merger = new MultiLingualVerseMerger()
const files = listAllFiles(inputFile, { predicate: (filePath) => filePath.includes('.yml') })
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

console.log('Migrating...')
const errors: string[] = []
progressBar.start(files.length, 0) // start the progress bar with a total value of files.length and start value of 0

for (const file of files) {
    progressBar.increment()
    try {
        merger.transformFile(file)
    } catch (e: any) {
        errors.push(e.message)
    }
}
progressBar.stop()

if (errors.length > 0) {
    program.error(errors.join('/n'))
}
