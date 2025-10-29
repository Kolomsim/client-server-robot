import React from 'react'

interface FocusBackgroundProps {
	isActive: boolean
	setIsActive: (isActive: boolean) => void
}

const FocusBackground: React.FC<FocusBackgroundProps> = ({
	isActive,
	setIsActive,
}) => {
	if (!isActive) return null

	return (
		<div className='focusBackground' onClick={() => setIsActive(false)}></div>
	)
}

export default FocusBackground
