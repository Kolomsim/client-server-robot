import React from 'react'

interface ProgressBarProps {
	progress: number // от 0 до 1
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
	return (
		<div
			className='progressBar'
			role='progressbar'
			aria-valuenow={progress * 100}
			aria-valuemin={0}
			aria-valuemax={100}
			style={
				{
					'--progress-value': `${progress * 100}%`,
				} as React.CSSProperties
			}
		>
			<span className='progressText'>{Math.round(progress * 100)}%</span>
		</div>
	)
}

export default ProgressBar
