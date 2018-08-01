#!/usr/bin/env node
'use strict'


/**
 * @file Wrapper for 'npm version' which propagates version in package.json to ./webextension/manifest.json
 * @example
 *    node version-all.js patch
 *    node version-all.js minor
 */

/* eslint-env node */


/**
 * Modules
 * Node
 * @constant
 */
const childProcess = require('child_process')
const path = require('path')

/**
 * Modules
 * External
 * @constant
 */
const appRootPath = require('app-root-path')
appRootPath.setPath(path.join(__dirname, '..'))
const jsonfile = require('jsonfile')


/**
 * Filesystem
 */
const packageFilepath = path.join(appRootPath.path, 'package.json')
const manifestFilepath = path.join(appRootPath.path, 'webextension', 'manifest.json')


/**
 * Main
 */
if (require.main === module) {
    const argv = process.argv.slice(2)

    // Run npm version
    childProcess.execFile('npm', ['version', ...argv], { cwd: appRootPath.path },
        (error, stdout, stderr) => {
            if (error) {
                console.error(error)
                process.exit(1)
            }

            jsonfile.readFile(packageFilepath, (error, packageObject) => {
                if (error) {
                    console.error(error)
                    process.exit(1)
                }

                jsonfile.readFile(manifestFilepath, (error, manifestObject) => {
                    if (error) {
                        console.error(error)
                        process.exit(1)
                    }

                    manifestObject.version = packageObject.version

                    jsonfile.writeFile(manifestFilepath, manifestObject, { spaces: 2 }, (error, result) => {
                        if (error) {
                            console.error(error)
                            process.exit(1)
                        }

                        process.exit(0)
                    })
                })
            })
        })
}
