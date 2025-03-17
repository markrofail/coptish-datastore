import * as BaseTypes from './types'

export type RawRoot = Prayer | Reading | ReadingV2 | BaseTypes.Synaxarium

export interface Reading extends Omit<BaseTypes.Reading, 'text'> {
    text: MultiLingualTextArray
}

export interface ReadingV2 extends Partial<Record<BaseTypes.ReadingType, Reading[]>>, Pick<BaseTypes.ReadingV2, 'title'> {}

export interface Prayer extends Omit<BaseTypes.Prayer, 'sections'> {
    sections?: (VersesSection | BaseTypes.InfoSection | BaseTypes.ReadingSection | BaseTypes.CompoundPrayerSection)[]
}

export interface VersesSection extends Omit<BaseTypes.VersesSection, 'verses'> {
    verses: MultiLingualTextArray
}

export type MultiLingualTextArray = {
    [K in keyof BaseTypes.MultiLingualText]: BaseTypes.MultiLingualText[K] extends string
        ? string[]
        : BaseTypes.MultiLingualText[K] extends string | undefined
        ? string[] | undefined
        : BaseTypes.MultiLingualText[K]
}
