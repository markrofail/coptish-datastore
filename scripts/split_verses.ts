import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import { MultiLingualText, listAllFiles, shortenFilename, MultiLingualProcessor, VersesSection, Section } from './utils'

type InputFile = {
    title?: MultiLingualText
    sections?: Section[]
}

class MultiLingualVerseSplitter extends MultiLingualProcessor {
    transformFile = (filepath: string) => {
        const inputData = yaml.load(fs.readFileSync(filepath, 'utf-8')) as InputFile

        const transformedSections = this.transformSections(inputData.sections)

        const outputData = { ...inputData, sections: transformedSections }
        fs.writeFileSync(filepath, yaml.dump(outputData, { lineWidth: 9999 }), 'utf-8')
    }

    private transformSections = (sections?: Section[]) =>
        sections && sections.map((section) => (!section.type || section.type === 'verses' ? this.transformVersesSection(section as VersesSection.V1) : section))

    private transformVersesSection = ({ verses, type, ...rest }: VersesSection.V1): VersesSection.V2 => ({
        ...rest,
        type: 'verses' as const,
        verses: this.forEachLanguage((language) => verses.map((verse) => verse[language] || '')),
    })
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
files.forEach((file, i) => {
    console.log(`[splitting ${i + 1}/${files.length}] ${shortenFilename(file)}`)
    splitter.transformFile(file)
})
