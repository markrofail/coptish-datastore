import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import cliProgress from 'cli-progress'
import { Command } from 'commander'
import { Language, listAllFiles, MultiLingualProcessor, MultiLingualText, Section } from './utils'
import { Reading, SubReading, VersesSection } from '../schemas/types'
import {
    MultiLingualTextArray,
    SubReading as RawSubReading,
    Prayer as RawPrayer,
    RawRoot,
    VersesSection as RawVersesSection,
    Reading as RawReading,
} from '../schemas/raw_types'
import { range } from 'lodash'

const isPrayerT = (input: RawRoot): input is RawPrayer => input.hasOwnProperty('sections')
const isReadingT = (input: RawRoot): input is RawReading => input.hasOwnProperty('liturgy-gospel')

class MultiLingualVerseMerger extends MultiLingualProcessor {
    transformFile = (filepath: string) => {
        const inputData = yaml.load(fs.readFileSync(filepath, 'utf-8')) as RawRoot
        if (!inputData) {
            // throw new Error(`[ValidationError] File ${filepath} is empty or not a valid yaml file`)
            return
        }

        let outputData
        if (isPrayerT(inputData)) {
            const transformedSections = this.transformSections(inputData.sections)
            outputData = { ...inputData, sections: transformedSections }
        } else if (isReadingT(inputData)) {
            outputData = this.transformReading(inputData)
        }

        if (outputData) {
            const outputPath = filepath.replace('data/', 'output/')
            fs.mkdirSync(path.dirname(outputPath), { recursive: true })
            fs.writeFileSync(outputPath, yaml.dump(outputData, { lineWidth: 9999 }), 'utf-8')
            fs.writeFileSync(outputPath.replace('.yml', '.json'), JSON.stringify(outputData, null, 2), 'utf-8')
        }
    }

    private transformSections = (sections?: RawPrayer['sections']) =>
        sections && sections.map((section) => (section.type === 'verses' ? this.transformVersesSection(section as RawVersesSection) : section))

    private transformVersesSection = ({ verses, ...rest }: RawVersesSection): VersesSection => {
        const languages = Object.keys(verses) as Language[]
        const maxLength = Math.max(...languages.map((language) => verses[language]?.length || 0))

        Object.entries(verses).forEach(([key, value]) => {
            if (value.length != 0 && value.length != maxLength) {
                throw new Error(`[ValidationError] different verses lengths:
                    ${key} verses had a length of ${value.length} while there's ${maxLength} english verses.
                    Verses:
                        ${key}: ${value?.[0]}
                    `)
            }
        })

        const transformedVerses: MultiLingualText[] = range(0, maxLength).map((i) => this.forEachLanguage((language) => verses[language]?.at(i) || ''))

        return { ...rest, verses: transformedVerses }
    }

    private transformReading = ({ title, ...rest }: RawReading): Reading => {
        const transformedText = Object.fromEntries(
            Object.entries(rest).map(([readingType, readings]) => [readingType, readings.map((reading) => this.transformSubReading(reading))])
        )
        return { ...transformedText, title }
    }

    private transformSubReading = ({ text, ...rest }: RawSubReading): SubReading => {
        const transformedText = this.transformText(text)
        return { ...rest, text: transformedText }
    }

    private transformText = (data: MultiLingualTextArray): MultiLingualText[] => {
        const languages = Object.keys(data) as Language[]
        const maxLength = Math.max(...languages.map((language) => data[language]?.length || 0))
        const result: MultiLingualText[] = []

        for (let i = 0; i < maxLength; i++) {
            const item = {} as any
            for (const language of languages) {
                if (data[language] && data[language][i] !== undefined) {
                    item[language] = data[language][i]
                }
            }
            result.push(item)
        }

        return result
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
const errors: { filename: string; message: string }[] = []
progressBar.start(files.length, 0) // start the progress bar with a total value of files.length and start value of 0

for (const file of files) {
    progressBar.increment()
    try {
        merger.transformFile(file)
    } catch (e: any) {
        errors.push({ filename: file, message: e.message })
    }
}
progressBar.stop()

if (errors.length > 0) {
    errors.map((error) => console.error(error))
    process.exit(1)
}
