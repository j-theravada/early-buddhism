type Props = { paragraphs: string[] };

export default function TranscriptReadable({ paragraphs }: Props) {
	return (
		<div className="mt-4 space-y-3" data-transcript-readable>
			{paragraphs.map((paragraph, index) => (
				<p
					className="text-sm leading-7 text-gray-700"
					key={`${index}-${paragraph.slice(0, 12)}`}
				>
					{paragraph}
				</p>
			))}
		</div>
	);
}
