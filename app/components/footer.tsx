import {
	EARLY_BUDDHISM_X_URL,
	FEEDBACK_FORM_URL,
	THERAVADA_ASSOCIATION_URL,
} from "../utils/site-links";

type Props = {
	maxWidth?: "4xl" | "7xl";
};

export default function Footer({ maxWidth = "7xl" }: Props) {
	const maxWidthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-7xl";

	return (
		<footer className="border-t border-[#d6c6ad] bg-white">
			<div
				className={`mx-auto ${maxWidthClass} px-6 py-8 text-center text-xs text-[#888] sm:px-8`}
			>
				<div className="space-y-2">
					<div>© {new Date().getFullYear()} 初期仏教塾</div>
					<div>
						<a
							aria-label="Xで初期仏教塾を見る"
							className="text-[#dc6209] underline transition hover:text-[#9d7e4c]"
							href={EARLY_BUDDHISM_X_URL}
							rel="noopener noreferrer"
							target="_blank"
						>
							X
						</a>
					</div>
					<div>
						<a
							className="text-[#dc6209] underline transition hover:text-[#9d7e4c]"
							href={THERAVADA_ASSOCIATION_URL}
							rel="noopener noreferrer"
							target="_blank"
						>
							運営：日本テーラワーダ仏教協会
						</a>
					</div>
					<div>
						<a
							className="text-[#dc6209] underline transition hover:text-[#9d7e4c]"
							href={FEEDBACK_FORM_URL}
							rel="noopener noreferrer"
							target="_blank"
						>
							ご意見・不具合はこちら
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
