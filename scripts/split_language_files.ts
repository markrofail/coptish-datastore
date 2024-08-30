import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import {
    MultiLingualText,
    JointSections,
    Language,
    LANGUAGE_CODE_MAP,
    SplitSection,
    JointInfoSection,
    CompoundPrayerSection,
    ReadingSection,
    JointVersesSection,
    SplitVersesSection,
    SplitInfoSection,
    listAllFiles,
    shortenFilename,
    MultiLingualProcessor,
} from './utils'

type InputFile = {
    title?: MultiLingualText
    sections?: JointSections[]
}

class MultiLingualSplitter extends MultiLingualProcessor {
    transformFile = (inputFile: string) => {
        const parsed = yaml.load(fs.readFileSync(inputFile, 'utf-8')) as InputFile

        const splitTitles = parsed.title && this.splitTitle(parsed.title)
        const splitSections = parsed.sections && this.splitSections(parsed.sections)

        this.languages.forEach((language) => {
            const outputData = {
                ...(splitTitles ? { title: splitTitles[language] } : {}), //
                ...(splitSections ? { sections: splitSections[language] } : {}),
            }

            const outputPath = inputFile.replace('.yml', `.${LANGUAGE_CODE_MAP[language]}.yml`)
            fs.writeFileSync(outputPath, yaml.dump(outputData, { lineWidth: 9999 }), 'utf-8')
        })
    }

    private splitTitle = (title: MultiLingualText): { [K in Language]: string } => {
        return this.forEachLanguage((language) => title[language] || '')
    }

    private splitSections = (sections: JointSections[]): { [K in Language]: SplitSection[] } => {
        const splitSections = sections.map((section) => {
            if (section.type === 'compound-prayer' || section.type === 'reading') return this.copySection(section as ReadingSection | CompoundPrayerSection)
            if (section.type === 'info') return this.splitInfoSection(section as JointInfoSection)
            else return this.splitVersesSection(section as JointVersesSection)
        })

        return this.forEachLanguage((language) => splitSections.map((section) => section[language]))
    }

    private copySection = <T>(section: T): { [K in Language]: T } => {
        return this.forEachLanguage(() => section)
    }

    private splitVersesSection = (versesSection: JointVersesSection): { [K in Language]: SplitVersesSection } => {
        return this.forEachLanguage((language) => ({
            type: 'verses' as const, //
            speaker: versesSection.speaker,
            verses: versesSection.verses.map((verse) => verse[language] || ''),
        }))
    }

    private splitInfoSection = (infoSection: JointInfoSection): { [K in Language]: SplitInfoSection } => {
        return this.forEachLanguage((language) => ({
            type: 'info' as const, //
            text: infoSection.text[language] || '',
        }))
    }
}

const program = new Command()
program
    .version('1.0.0')
    .description('A CLI to split multilingual prayer files by language')
    .argument('<input file or directory>', 'either a file or directory to split')
    .parse(process.argv)

const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

const splitter = new MultiLingualSplitter()
const files = listAllFiles(inputFile, { predicate: (filePath) => filePath.includes('.yml') && !filePath.match(/\..*\.yml/) })
files.forEach((file, i) => {
    console.log(`[splitting ${i + 1}/${files.length}] ${shortenFilename(file)}`)
    splitter.transformFile(file)
})
