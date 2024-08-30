import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import cliProgress from 'cli-progress'
import { Command } from 'commander'
import { MultiLingualText, listAllFiles, shortenFilename, MultiLingualProcessor, VersesSection, Section } from './utils'

type InputFile = {
    title?: MultiLingualText
    sections?: Section[]
}

class MultiLingualVerseMerger extends MultiLingualProcessor {
    transformFile = (filepath: string) => {
        const inputData = yaml.load(fs.readFileSync(filepath, 'utf-8')) as InputFile

        const transformedSections = this.transformSections(inputData.sections)

        const outputData = { ...inputData, sections: transformedSections }

        const outputPath = filepath.replace('data/', 'output/').replace('.yml', '.json')
        fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    }

    private transformSections = (sections?: Section[]) =>
        sections && sections.map((section) => (section.type === 'verses' ? this.transformVersesSection(section as VersesSection.V2) : section))

    private transformVersesSection = ({ verses, ...rest }: VersesSection.V2): VersesSection.PreProcessed => {
        const englishVerses = verses.english

        Object.entries(verses).map(([language, verses]) => {
            if (verses.length != englishVerses.length) {
                throw new Error(
                    `[ValidationError] different verses lengths:\n\t${language} verses had a length of ${verses.length} while there's ${englishVerses} english verses.\n\tVerses starting with ${verses[0]}`
                )
            }
        })

        const transformedVerses: MultiLingualText[] = verses.english.map((_, i) => this.forEachLanguage((language) => verses[language][i]))

        return { ...rest, verses: transformedVerses }
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

console.log('Preprocessing...')
progressBar.start(files.length, 0) // start the progress bar with a total value of files.length and start value of 0
files.forEach((file) => {
    progressBar.increment()
    merger.transformFile(file)
})

progressBar.stop()
