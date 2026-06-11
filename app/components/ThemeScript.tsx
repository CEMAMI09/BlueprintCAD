/**
 * Runs before paint to prevent theme flash on load.
 */
export default function ThemeScript() {
  const script = `
(function () {
  try {
    var pref = localStorage.getItem('blueprintcad-theme') || 'dark';
    var resolved = pref === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : pref;
    if (resolved !== 'dark' && resolved !== 'light') resolved = 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
