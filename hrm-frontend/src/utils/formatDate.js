export default function formatDate(input) {
  if (!input) return '';
  const d = (input instanceof Date) ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const dd = parts.find((p) => p.type === 'day')?.value;
  const mm = parts.find((p) => p.type === 'month')?.value;
  const yyyy = parts.find((p) => p.type === 'year')?.value;
  if (!dd || !mm || !yyyy) return '';
  return `${dd}/${mm}/${yyyy}`;
}
