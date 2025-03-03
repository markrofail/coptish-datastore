import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import { listAllFiles, MultiLingualProcessor } from './utils'
import { Root, Reading, MultiLingualText } from '../schemas/types'
import { MultiLingualTextArray } from '../schemas/raw_types'
import cliProgress from 'cli-progress'

const isReadingT = (input: Root): input is Reading => input.hasOwnProperty('text')

class MultiLingualVerseSplitter extends MultiLingualProcessor {
    transformFile = (filepath: string) => {
        const inputData = yaml.load(fs.readFileSync(filepath, 'utf-8')) as Root
        if (!isReadingT(inputData)) return

        const transformedText = this.transformText(inputData.text)

        const outputData = { ...inputData, text: transformedText }
        fs.writeFileSync(filepath, yaml.dump(outputData, { lineWidth: 9999 }), 'utf-8')
    }

    private transformText = (data: MultiLingualText[]): MultiLingualTextArray => {
        return this.forEachLanguage((language) => data.filter((item) => !!item[language]).map((item) => item[language]!))
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

const splitter = new MultiLingualVerseSplitter()
const files = listAllFiles(inputFile, { predicate: (filePath) => filePath.includes('.yml') })
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

console.log('Migrating...')
const errors: string[] = []
progressBar.start(files.length, 0) // start the progress bar with a total value of files.length and start value of 0

for (const file of files) {
    progressBar.increment()
    try {
        splitter.transformFile(file)
    } catch (e: any) {
        errors.push(e.message)
    }
}
progressBar.stop()

if (errors.length > 0) {
    program.error(errors.join('/n'))
}
