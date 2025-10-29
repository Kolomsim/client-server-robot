export type FilterType = 'text' | 'dateRange' | 'select'

export interface FilterField {
	key: string
	label: string
	type: FilterType
	options?: string[]
}
