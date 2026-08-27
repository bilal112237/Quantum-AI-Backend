
const BASE_URL = process.env.FORMAT_CONVERTER_URL || 'https://formatconvert.quantumlogicslimited.com';
const SDK_URL = `${BASE_URL}/sdk.js`;

export class FormatConverterService {
  async convertText(text: string, to: string) {
    const inputFile = new File([text], 'answer.txt', { type: 'text/plain' });
    const { convert } = await import(SDK_URL);
    return convert(inputFile, to);
  }
}

export const formatConverterService = new FormatConverterService();