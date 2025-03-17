import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { defaultDict } from './utils'
import { Command } from 'commander'
import { Reading } from '../schemas/raw_types'
import { ReadingType } from '../schemas/types'
import path from 'path'

const normalizeArabicText = (text: string) => text.replace(/[\u064B-\u065F\u0670]/g, '')
const cleanLine = (line: string) => normalizeArabicText(line.replaceAll('ـ', '').replaceAll('{', '').replaceAll('(', '').trim())

const TITLE_KEYWORDS = ['عِظَةٌ', 'من إشعياء', 'من أيوب', 'من يشوع', 'من مزامير', 'من أمثال', 'من إنجيل', 'من سفر', 'البولس', 'الكاثوليكون', 'الإبركسيس'].map(
    normalizeArabicText
)
const isTitleLine = (line: string) => {
    const cleanedLine = cleanLine(line)
    return TITLE_KEYWORDS.some((keyword) => cleanedLine.startsWith(keyword))
}

const cleanStartWith = (line: string, prefix: string) => cleanLine(line).startsWith(cleanLine(prefix))
const getReadingType = (sectionType: SectionType | null, line: string): ReadingType | null => {
    if (!isTitleLine(line)) return null

    if (sectionType === 'Matins' && cleanStartWith(line, 'من مزامير')) return 'matins-psalm'
    if (sectionType === 'Matins' && cleanStartWith(line, 'من إنجيل')) return 'matins-gospel'
    if (sectionType === 'Matins' && cleanStartWith(line, 'عِظَةٌ')) return 'matins-sermon'
    if (sectionType === 'Matins') return 'matins-prophecies'
    if (sectionType === 'Vespers' && cleanStartWith(line, 'من مزامير')) return 'vespers-psalm'
    if (sectionType === 'Vespers' && cleanStartWith(line, 'من إنجيل')) return 'vespers-gospel'
    if (sectionType === 'Liturgy' && cleanStartWith(line, 'البولس')) return 'pauline-epistle'
    if (sectionType === 'Liturgy' && cleanStartWith(line, 'الكاثوليكون')) return 'catholic-epistle'
    if (sectionType === 'Liturgy' && cleanStartWith(line, 'الإبركسيس')) return 'acts-of-the-apostles'
    if (sectionType === 'Liturgy' && cleanStartWith(line, 'من مزامير')) return 'liturgy-psalm'
    if (sectionType === 'Liturgy' && cleanStartWith(line, 'من إنجيل')) return 'liturgy-gospel'
    if (sectionType === 'EveningPrayers' && cleanStartWith(line, 'من مزامير')) return 'evening-prayers-psalm'
    if (sectionType === 'EveningPrayers' && cleanStartWith(line, 'من إنجيل')) return 'evening-prayers-gospel'
    console.error('Unhandled Case', { sectionType, line })
    return null
}

const SECTION_KEYWORDS = ['عشية', 'باكر', 'صلاة المساء'].map(normalizeArabicText)
const LITURGY_TITLE_KEYWORDS = ['البولس', 'الكاثوليكون', 'الإبركسيس'].map(normalizeArabicText)

type SectionType = 'Vespers' | 'Matins' | 'EveningPrayers' | 'Liturgy'
const getSectionType = (line: string): SectionType | null => {
    const cleanedLine = cleanLine(line)
    if (SECTION_KEYWORDS.some((keyword) => cleanedLine.startsWith(keyword))) {
        if (cleanedLine === 'عشية') return 'Vespers'
        if (cleanedLine === 'باكر') return 'Matins'
        if (cleanedLine === 'صلاة المساء') return 'EveningPrayers'
    }

    if (LITURGY_TITLE_KEYWORDS.some((keyword) => cleanedLine.startsWith(keyword))) {
        return 'Liturgy'
    }

    return null
}

// Function to split text into sections based on titles
function splitIntoSections(text: string) {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const readings = defaultDict(() => [] as Reading[])

    let currentTitle: string | null = null
    let currentText: string[] = []

    let sectionType: SectionType | null = null
    let readingType: ReadingType | null = null

    for (const line of lines) {
        const newSectionType = getSectionType(line)
        if (newSectionType !== null) {
            sectionType = newSectionType
            if (sectionType !== 'Liturgy') continue
        }

        if (isTitleLine(line)) {
            // If we have a previous section, save it
            if (currentTitle !== null) {
                readingType &&
                    readings[readingType].push({
                        title: { arabic: currentTitle },
                        text: { arabic: [currentTitle, ...currentText] },
                    })
            }
            // Start a new section
            readingType = getReadingType(sectionType, line)
            currentTitle = line.trim()
            currentText = []
        } else if (currentTitle !== null) {
            // Add line to the current section's text
            currentText.push(line.trim())
        }
    }

    // Add the last section if it exists
    if (currentTitle !== null) {
        readingType &&
            readings[readingType].push({
                title: { arabic: currentTitle },
                text: { arabic: [currentTitle, ...currentText] },
            })
    }

    return readings
}

async function convertRtfToYaml(filepath: string) {
    try {
        const text = fs.readFileSync(filepath, 'utf8')
        const sections = splitIntoSections(text)
        const yamlContent = yaml.dump(sections, { lineWidth: -1 })
        fs.writeFileSync(filepath.replace('.txt', '.yml'), yamlContent, 'utf8')
    } catch (error) {
        console.error('Error during conversion:', error)
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
if (path.extname(inputFile) !== '.txt') {
    program.error(`input file is not a text file "${inputFile}"`)
}

convertRtfToYaml(inputFile)
