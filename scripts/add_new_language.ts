import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import {
    CompoundPrayerSection,
    listAllFiles,
    MultiLingualProcessor,
    ReadingSection,
    shortenFilename,
    SplitInfoSection,
    SplitSection,
    SplitVersesSection,
} from './utils'

type InputFile = {
    title?: string
    sections?: SplitSection[]
}

class MultiLingualCopier extends MultiLingualProcessor {
    transformFile = (inputFile: string, languageCode: string) => {
        const parsed = yaml.load(fs.readFileSync(inputFile, 'utf-8')) as InputFile

        const outputData = {
            ...(parsed.title ? { title: '' } : {}), //
            ...(parsed.sections ? { sections: this.emptySections(parsed.sections) } : {}),
        }

        const outputPath = inputFile.replace('.en.', `.${languageCode}.`)
        fs.writeFileSync(outputPath, yaml.dump(outputData, { lineWidth: 9999 }), 'utf-8')
    }

    private emptySections = (sections: SplitSection[]): SplitSection[] => {
        return sections.map((section) => {
            if (section.type === 'compound-prayer' || section.type === 'reading') return this.copySection(section as ReadingSection | CompoundPrayerSection)
            if (section.type === 'info') return this.emptyInfoSection(section as SplitInfoSection)
            else return this.emptyVersesSection(section as SplitVersesSection)
        })
    }

    private copySection = <T>(sections: T): T => sections

    private emptyInfoSection = (infoSection: SplitInfoSection): SplitInfoSection => {
        return { ...infoSection, text: '' }
    }

    private emptyVersesSection = ({ verses, ...rest }: SplitVersesSection): SplitVersesSection => {
        return { ...rest, verses: verses.map(() => '') }
    }
}

const program = new Command()
program
    .version('1.0.0')
    .description('A CLI to merge multilingual prayer files')
    .argument('<input file or directory>', 'either a file or directory to merge')
    .requiredOption('--language-code <string>', 'language code file prefix. i.e. our-father.{LANGUAGE_CODE}.yml')
    .parse(process.argv)

const { languageCode } = program.opts()
const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

const copier = new MultiLingualCopier()
const files = listAllFiles(inputFile, { predicate: (filePath) => filePath.includes('.en.yml') })
files.forEach((file, i) => {
    console.log(`[creating ${i + 1}/${files.length}] ${shortenFilename(file.replace('.en.', `.${languageCode}.`))}`)
    copier.transformFile(file, languageCode)
})
