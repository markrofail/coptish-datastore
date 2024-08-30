import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import {
    CompoundPrayerSection,
    JointInfoSection,
    JointSections,
    JointVersesSection,
    Language,
    LANGUAGE_CODE_MAP,
    listAllFiles,
    MultiLingualProcessor,
    MultiLingualRecord,
    MultiLingualText,
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

class MultiLingualMerger extends MultiLingualProcessor {
    transformFile = (inputFile: string) => {
        const files: Record<Language, InputFile> = this.forEachLanguage(
            (language) => yaml.load(fs.readFileSync(inputFile.replace('.en.', `.${LANGUAGE_CODE_MAP[language]}.`), 'utf-8')) as InputFile
        )

        const mergedTitles = this.mergeTitles(files)
        const mergeSections = this.mergeSections(files)

        const outputData = {
            ...(mergedTitles ? { title: mergedTitles } : {}), //
            ...(mergeSections ? { sections: mergeSections } : {}),
        }

        const outputPath = inputFile.replace('.en.yml', `.json`)
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    }

    private mergeTitles = (multiLingualRecord: MultiLingualRecord<InputFile>): MultiLingualText | undefined => {
        const englishTitle = multiLingualRecord.english.sections // ground truth
        if (!englishTitle) return

        return this.forEachLanguage((language) => multiLingualRecord[language].title || '')
    }

    private mergeSections = (multiLingualRecord: MultiLingualRecord<InputFile>): JointSections[] | undefined => {
        const englishSections = multiLingualRecord.english.sections // ground truth
        if (!englishSections) return

        const sections = this.forEachLanguage((language) => multiLingualRecord[language].sections)
        return englishSections.map(({ type }, i) => {
            const multiLingualSections = this.forEachLanguage((language) => sections?.[language]?.[i])

            if (type === 'compound-prayer' || type === 'reading') return this.copySection(multiLingualSections) as CompoundPrayerSection | ReadingSection
            else if (type === 'info') return this.mergeInfoSection(multiLingualSections as MultiLingualRecord<SplitInfoSection>)
            else if (!type || type === 'verses') return this.mergeVersesSection(multiLingualSections as MultiLingualRecord<SplitVersesSection>)
            else throw new Error(`unsupported type ${type}`)
        })
    }

    private copySection = <T>(multiLingualRecord: MultiLingualRecord<T>): T => multiLingualRecord.english // ground truth

    private mergeInfoSection = (multiLingualRecord: MultiLingualRecord<SplitInfoSection>): JointInfoSection => {
        const englishInfoSection = multiLingualRecord.english // ground truth

        const combinedText = this.forEachLanguage((language) => multiLingualRecord[language].text || '')
        return { ...englishInfoSection, text: combinedText }
    }

    private mergeVersesSection = (multiLingualRecord: MultiLingualRecord<SplitVersesSection>): JointVersesSection => {
        const englishVersesSection = multiLingualRecord.english // ground truth

        const combinedVerses = englishVersesSection.verses.map((_, i) => this.forEachLanguage((language) => multiLingualRecord?.[language].verses?.[i]))

        return { ...englishVersesSection, verses: combinedVerses }
    }
}

const program = new Command()
program
    .version('1.0.0')
    .description('A CLI to merge multilingual prayer files')
    .argument('<input file or directory>', 'either a file or directory to merge')
    .parse(process.argv)

const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

const merger = new MultiLingualMerger()
const files = listAllFiles(inputFile, { predicate: (filePath) => filePath.includes('.en.yml') })
files.forEach((file, i) => {
    console.log(`[merging ${i + 1}/${files.length}] ${shortenFilename(file)}`)
    merger.transformFile(file)
})
