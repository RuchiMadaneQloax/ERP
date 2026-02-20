export default function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '₹0';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  // Use Indian locale with INR currency formatting
  try {
    return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  } catch (err) {
    // Fallback: prefix with rupee symbol
    return `₹${num.toFixed(2)}`;
  }
}
