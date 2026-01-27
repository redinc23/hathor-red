module.exports = {
  extends: [
    'airbnb',
    'plugin:@typescript-eslint/recommended',
    'plugin:testing-library/react',
    'plugin:jest-dom/recommended'
  ],
  rules: {
    'max-lines-per-function': ['error', { max: 50 }],
    complexity: ['error', 10],
    'max-params': ['error', 3]
  }
};
