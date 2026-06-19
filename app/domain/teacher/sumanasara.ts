export const SUMANASARA_JA_NAME = "アルボムッレ・スマナサーラ長老";
export const SUMANASARA_ROMAN_NAME = "Ven. Alubomulle Sumanasara Nayaka Thero";

const SUMANASARA_JA_NAME_ALIASES = new Set([
	"スマナサーラ",
	"スマナサーラ長老",
	"アルボムッレ・スマナサーラ",
	SUMANASARA_JA_NAME,
]);

export function normalizeSumanasaraJapaneseName(name: string): string {
	const normalizedName = name.trim();
	return SUMANASARA_JA_NAME_ALIASES.has(normalizedName)
		? SUMANASARA_JA_NAME
		: name;
}
