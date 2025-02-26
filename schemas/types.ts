export type Root = Prayer | Reading | Synaxarium

export interface Prayer {
    title?: MultiLingualText
    occasion?: Occasion
    sections?: (VersesSection | InfoSection | ReadingSection | CompoundPrayerSection)[]
}

export type Occasion = 'annual' | 'great-lent'
interface AbstractPrayerSection {
    occasion?: Occasion
}

export interface InfoSection extends AbstractPrayerSection {
    type: 'info'
    text: MultiLingualText
}

export type Speaker = 'people' | 'priest' | 'deacon' | 'reader'

export type Saint =
    | 'st-mark'
    | 'archangel-gabriel'
    | 'archangel-michael'
    | 'archangel-raphael'
    | 'archangel-suriel'
    | 'st-john-the-baptist'
    | 'st-mary'
    | 'any-martyr-all'
    | 'st-abanoub'
    | 'st-demiana'
    | 'st-george'
    | 'st-marina-the-martyr'
    | 'st-mina'
    | 'st-philopater-mercurius'
    | 'st-stephen'
    | 'sts-sergios-and-bachus'
    | 'pope-kyrillos-vi'
    | 'st-abraam'
    | 'st-antony-the-great'
    | 'st-athanasius-the-apostolic'
    | 'st-bishoy'
    | 'st-karas-the-anchorite'
    | 'st-moses-the-black'
    | 'st-paul-the-1st-hermit'
    | 'st-reweis-teji'
    | 'st-shenouda-the-archimandrite'
    | 'st-thomas-the-hermit'
    | 'sts-maximos-and-dometius'

export interface VersesSection extends AbstractPrayerSection {
    type: 'verses'
    speaker?: Speaker
    saint?: Saint
    inaudible?: boolean
    verses: MultiLingualText[]
}

export type ReadingType =
    | 'matins-psalm'
    | 'matins-gospel'
    | 'vespers-psalm'
    | 'vespers-gospel'
    | 'pauline-epistle'
    | 'catholic-epistle'
    | 'acts-of-the-apostles'
    | 'synaxarium'
    | 'liturgy-psalm'
    | 'liturgy-gospel'

export interface ReadingSection extends AbstractPrayerSection {
    type: 'reading'
    readingType: ReadingType
}

export interface CompoundPrayerSection extends AbstractPrayerSection {
    type: 'compound-prayer'
    path: string
}

export interface Reading {
    title: MultiLingualText
    text: MultiLingualText[]
}

export interface Synaxarium {
    title: MultiLingualText
    commemorations: {
        title: MultiLingualText
        text: MultiLingualText
    }[]
}

export interface MultiLingualText {
    english?: string
    arabic?: string
    coptic?: string
    coptic_english?: string
    coptic_arabic?: string
}
