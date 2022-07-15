module.exports = {
  "env": {
    "node": true,
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
