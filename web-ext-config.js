/* eslint-env node */

module.exports = {
    verbose: false,
    sourceDir: './webextension',
    artifactsDir: './build',
    build: {
        overwriteDest: true
    },
    lint: {
        output: 'text'
    },
    run: {
        firefox: 'nightly'
    }
}
