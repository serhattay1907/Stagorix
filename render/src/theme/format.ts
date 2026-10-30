/** Numbers in the brand's language: separators and decimals follow the locale. */
export const formatNumber = (value: number, locale: string, decimals = 0) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
