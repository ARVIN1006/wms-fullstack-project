/**
 * Format a number as IDR currency string
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string (e.g. "Rp 1.500.000")
 */
export const formatCurrency = (amount) => {
  return `Rp ${parseFloat(amount || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

/**
 * Format a number with ID locale
 * @param {number|string} number - The number to format
 * @returns {string} Formatted number string (e.g. "1.500")
 */
export const formatNumber = (number) => {
  return parseFloat(number || 0).toLocaleString("id-ID");
};
