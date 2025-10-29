import { useState } from 'react'
import { FilterField } from '../types/Filter'

interface FilterPanelProps {
	fields: FilterField[]
	onFilterChange: (filters: Record<string, any>) => void
}

export default function FilterPanelP({
	fields,
	onFilterChange,
}: FilterPanelProps) {
	const [filters, setFilters] = useState<Record<string, any>>({})

	const handleChange = (key: string, value: any) => {
		const newFilters = { ...filters, [key]: value }
		setFilters(newFilters)
		onFilterChange(newFilters)
	}

	const handleDateRange = (key: string, index: number, value: string) => {
		const currentRange = filters[key] || ['', '']
		currentRange[index] = value
		handleChange(key, [...currentRange])
	}

	return (
		<div className='filter-panel'>
			{fields.map(field => (
				<div key={field.key} className='filter-item'>
					<label>{field.label}</label>

					{field.type === 'text' && (
						<input
							type='text'
							value={filters[field.key] || ''}
							onChange={e => handleChange(field.key, e.target.value)}
						/>
					)}

					{field.type === 'select' && (
						<select
							value={filters[field.key] || ''}
							onChange={e => handleChange(field.key, e.target.value)}
						>
							<option value=''>Все</option>
							{field.options?.map(opt => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					)}

					{field.type === 'dateRange' && (
						<div className='date-range'>
							<input
								type='date'
								value={filters[field.key]?.[0] || ''}
								onChange={e => handleDateRange(field.key, 0, e.target.value)}
							/>
							<span>–</span>
							<input
								type='date'
								value={filters[field.key]?.[1] || ''}
								onChange={e => handleDateRange(field.key, 1, e.target.value)}
							/>
						</div>
					)}
				</div>
			))}
		</div>
	)
}
