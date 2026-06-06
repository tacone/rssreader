import he from 'he';
const { decode } = he;

export function htmlToText(html: string): string {
	return decode(html.replace(/<[^>]*>/g, '')).trim();
}
