// Annotate responsive tables with data-label attributes based on headers.
(function () {
  function annotate(table) {
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.children).forEach((cell, idx) => {
        if (!cell.hasAttribute('data-label')) {
          cell.setAttribute('data-label', headers[idx] || '');
        }
      });
    });
  }
  function processAll() { document.querySelectorAll('table.table.responsive').forEach(annotate); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processAll);
  } else {
    processAll();
  }
  const observer = new MutationObserver(() => processAll());
  observer.observe(document.body, { childList: true, subtree: true });
})();