module.exports = {
  "env": {
    "jest/globals": true,
    "commonjs": true,
    "es2021": true
  },
  plugins: ["jest"],
  "extends": [
    "eslint:recommended",
    'plugin:prettier/recommended',
  ],
  "parserOptions": {
    "ecmaVersion": "latest"
  },
  ignorePatterns: ['.eslintrc.js'],
  "rules": {
  }
}
