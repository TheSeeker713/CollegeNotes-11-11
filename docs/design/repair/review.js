/* global document */
for (const key of ['theme', 'mode']) {
  document.getElementById(key).addEventListener('change', (event) => {
    document.documentElement.dataset[key] = event.target.value;
  });
}
