module.exports = {
  '*.rs': ['rustfmt --edition 2021', () => 'cargo clippy --all-targets -- -D warnings'],
  'frontend/**/*.{ts,tsx,css,json}': ['prettier --write'],
  'frontend/**/*.{ts,tsx}': () => ['npm --prefix frontend run build'],
};
