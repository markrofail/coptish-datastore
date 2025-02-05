import * as BaseTypes from './types'

export type RawRoot = Prayer | BaseTypes.Reading | BaseTypes.Synaxarium

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
