import * as fs from 'fs'
import * as path from 'path'

export const LANGUAGES = ['english', 'arabic', 'coptic', 'coptic_english'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_CODE_MAP: Record<Language, string> = {
    english: 'en',
    arabic: 'ar',
    coptic: 'co',
    coptic_english: 'co-en',
}

export type MultiLingualText = Record<Language, string>
export type MultiLingualRecord<T> = { [K in Language]: T }

export type InfoSection = { type: 'info'; text: MultiLingualText | string }
export type JointInfoSection = Omit<InfoSection, 'text'> & { text: MultiLingualText }
export type SplitInfoSection = Omit<InfoSection, 'text'> & { text: string }

export type Speaker = 'priest' | 'deacon' | 'people'
export type VersesSection = { type: 'verses'; speaker: Speaker; verses: (MultiLingualText | string)[] }
export type JointVersesSection = Omit<VersesSection, 'verses'> & { verses: MultiLingualText[] }
export type SplitVersesSection = Omit<VersesSection, 'verses'> & { verses: string[] }
export namespace VersesSection {
    export type V1 = { type: 'verses'; speaker: Speaker; verses: MultiLingualText[] }
    export type V2 = { type: 'verses'; speaker: Speaker; verses: Record<Language, string[]> }
}

export type CompoundPrayerSection = { type: 'compound-prayer'; path: string }
export type ReadingSection = { type: 'reading'; readingType: string }

export type JointSections = JointInfoSection | JointVersesSection | CompoundPrayerSection | ReadingSection
export type SplitSection = SplitInfoSection | SplitVersesSection | CompoundPrayerSection | ReadingSection
export type Section = InfoSection | VersesSection | CompoundPrayerSection | ReadingSection

export class MultiLingualProcessor {
    protected languages: Language[]

    constructor(languages: Array<Language> = [...LANGUAGES]) {
        this.languages = languages
    }

    protected forEachLanguage = <T>(callback: (language: Language) => T) => {
        return Object.fromEntries(this.languages.map((language) => [language, callback(language)])) as Record<Language, T>
    }
}

export const shortenFilename = (filename: string) => filename.split('/').splice(-2).join('/')
export const listAllFiles = (filePath: string, opts?: { predicate: (filePath: string) => boolean }): string[] => {
    if (fs.lstatSync(filePath).isDirectory()) {
        return fs.readdirSync(filePath).flatMap((child) => listAllFiles(path.join(filePath, child), opts))
    }

    if (!opts?.predicate || opts.predicate(filePath)) {
        return [filePath]
    }

    return []
}
