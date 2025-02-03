import { Prayer, VersesSection, MultiLingualText, CompoundPrayerSection, InfoSection, ReadingSection } from './types'

export interface RawPrayer extends Omit<Prayer, 'sections'> {
    sections?: (VersesSection | InfoSection | ReadingSection | CompoundPrayerSection)[]
}

export interface RawVersesSection extends Omit<VersesSection, 'verses'> {
    verses: MultiLingualTextArray
}

export type MultiLingualTextArray = ConvertToArray<MultiLingualText>

type ConvertToArray<T> = {
    [K in keyof T]: T[K] extends string ? string[] : T[K] extends string | undefined ? string[] | undefined : T[K]
}
