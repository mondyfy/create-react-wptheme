/**
 * Copyright (c) 2019-present, https://github.com/devloco
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//   /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
// create-react-wptheme is installed globally on people's computers. This means
// that it is extremely difficult to have them upgrade the version and
// because there's only one global version installed, it is very prone to
// breaking changes.
//
// The only job of create-react-wptheme is to init the repository and then
// forward all the commands to the local version of create-react-wptheme.
//
// If you need to add a new command, please add it to the scripts/ folder.
//
// The only reason to modify this file is to add more warnings and
// troubleshooting information for the `create-react-wptheme` command.
//
// Do not make breaking changes! We absolutely don't want to have to
// tell people to update their global version of create-react-wptheme.
//
// Also be careful with new language features.
// This file must work on Node 6+.
//
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//   /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

"use strict";

const validateProjectName = require("validate-npm-package-name");
const chalk = require("chalk");
const commander = require("commander");
const fs = require("fs-extra");
const path = require("path");
const execSync = require("child_process").execSync;
const spawn = require("cross-spawn");
const dns = require("dns");
const url = require("url");
const envinfo = require("envinfo");

const packageJson = require("./package.json");
const _wpThemeVersion = packageJson.version;
const _createReactAppVersion = _wpThemeVersion.split("-wp.")[0];

// Check these!!!!
const _reactScriptsWpThemeVersion = "3.2.0-wp.2";
const _getScriptsPath = function() {
    return scriptsFromNpm();
};

const scriptsFromNpm = function() {
    //console.log("SCRIPTS FROM NPM");
    return {
        path: `@devloco/react-scripts-wptheme@^${_reactScriptsWpThemeVersion}`,
        callback: function() {}
    };
};

const scriptsFromGit = function() {
    console.log("SCRIPTS FROM GIT");
    const deleteFolderRecursive = (path) => {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file) {
                let curPath = path + "/" + file;
                if (fs.statSync(curPath).isDirectory()) {
                    // recurse
                    deleteFolderRecursive(curPath);
                } else {
                    // delete file
                    fs.unlinkSync(curPath);
                }
            });

            fs.rmdirSync(path);
        }
    };

    const tempFolderName = "temp";
    fs.ensureDirSync(tempFolderName);
    process.chdir(tempFolderName);
    const tempPath = process.cwd();
    console.log(chalk.magenta("Cloning @devloco/create-react-app/react-scripts from GitHub..."));
    execSync("git clone https://github.com/devloco/create-react-app.git");
    process.chdir("..");
    let scriptsPath = "file:" + path.join(tempPath, "create-react-app", "packages", "react-scripts");
    return {
        path: scriptsPath,
        callback: function() {
            deleteFolderRecursive(tempPath);
        }
    };
};

let projectName;
const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .arguments("<project-directory>")
    .usage(`${chalk.green("<project-directory>")} [options]`)
    .action((name) => {
        projectName = name;
    })
    .option("--verbose", "force create-react-app to print additional logs (NOTE: create-react-wptheme is always verbose)")
    .option("--info", "print environment debug info")
    .option("--use-npm", "force downloading packages using npm instead of yarn (if both are installed)")
    .option("--use-pnp")
    .option("--typescript")
    .allowUnknownOption()
    .on("--help", () => {
        console.log(`    Only ${chalk.green("<project-directory>")} is required.`);
        console.log();
        console.log(`    If you have any problems, do not hesitate to file an issue:`);
        console.log(`      ${chalk.cyan("https://github.com/devloco/create-react-wptheme/issues/new")}`);
        console.log();
    })
    .parse(process.argv);

if (program.info) {
    console.log(chalk.bold("\nEnvironment Info:"));
    return envinfo
        .run(
            {
                System: ["OS", "CPU"],
                Binaries: ["Node", "npm", "Yarn"],
                Browsers: ["Chrome", "Edge", "Internet Explorer", "Firefox", "Safari"],
                npmPackages: ["react", "react-dom", "react-scripts"],
                npmGlobalPackages: ["create-react-app"]
            },
            {
                duplicates: true,
                showNotFound: true
            }
        )
        .then(console.log);
}

if (typeof projectName === "undefined") {
    console.error("Please specify the project directory:");
    console.log(`  ${chalk.cyan(program.name())} ${chalk.green("<project-directory>")}`);
    console.log();
    console.log("For example:");
    console.log(`  ${chalk.cyan(program.name())} ${chalk.green("my-react-app")}`);
    console.log();
    console.log(`Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`);
    process.exit(1);
}

function printValidationResults(results) {
    if (typeof results !== "undefined") {
        results.forEach((error) => {
            console.error(chalk.red(`  *  ${error}`));
        });
    }
}

console.log(program.name() + " version: " + chalk.magenta(_wpThemeVersion));
console.log("@devloco/react-scripts-wptheme version: " + chalk.magenta(_reactScriptsWpThemeVersion));
console.log("create-react-app version: " + chalk.magenta(_createReactAppVersion));
createApp(projectName, program.verbose, program.scriptsVersion, program.useNpm, program.usePnp, program.typescript);

function createApp(name, verbose, version, useNpm, usePnp, useTypescript, template) {
    const root = path.resolve(name);
    const appName = path.basename(root);

    checkAppName(appName);
    fs.ensureDirSync(name);

    console.log(`Creating a new React WP theme in ${chalk.green(root)}.`);
    console.log();

    let useYarn = useNpm ? false : shouldUseYarn();

    const originalDirectory = process.cwd();
    process.chdir(root); // change into the newly created folder, then run create-react-app.

    createWpTheme(root, appName, version, verbose, originalDirectory, template, useYarn, usePnp, useTypescript);
}

function shouldUseYarn() {
    try {
        execSync("yarnpkg --version", { stdio: "ignore" });
        return true;
    } catch (e) {
        return false;
    }
}

function createWpTheme(root, appName, version, verbose, originalDirectory, template, useYarn, usePnp, useTypescript) {
    const packageToInstall = "create-react-app";

    return Promise.resolve(packageToInstall)
        .then((packageName) =>
            checkIfOnline(useYarn).then((isOnline) => ({
                isOnline: isOnline,
                packageName: packageName
            }))
        )
        .then((info) => {
            if (!info.isOnline) {
                abortCommand(chalk.yellow("You appear to be offline."));
            }

            let createWpThemeReactRoot = "react-src";
            createReactApp(createWpThemeReactRoot, appName, version, verbose, originalDirectory, template, useYarn, usePnp, useTypescript);
        })
        .catch((reason) => {
            console.log();
            console.log("Aborting installation.");

            if (reason.command) {
                console.log(`  ${chalk.cyan(reason.command)} has failed.`);
            } else {
                console.log(chalk.red("Unexpected error."), reason);
                console.log("Please report it as a bug here:");
                console.log("https://github.com/devloco/create-react-wptheme/issues");
            }

            console.log();
            console.log("Done.");
            process.exit(1);
        });
}

function createReactApp(createWpThemeReactRoot, appName, version, verbose, originalDirectory, template, useYarn, usePnp, useTypescript) {
    return new Promise((resolve, reject) => {
        let command = "npx";

        let args = [];
        args.push(`create-react-app@${_createReactAppVersion}`);
        args.push(createWpThemeReactRoot);

        if (verbose) {
            args.push("--verbose");
        }

        if (!useYarn) {
            args.push("--use-npm");
        }

        if (usePnp) {
            args.push("--use-pnp");
        }

        if (useTypescript) {
            args.push("--typescript");
        }

        let scriptsPath = _getScriptsPath();
        args.push("--scripts-version");
        args.push(scriptsPath.path);

        const child = spawn(command, args, { stdio: "inherit" })
            .on("error", function(err) {
                console.log(`createReactWpTheme.js ERROR for command: ${command} ${args.join(" ")}`);
                throw err;
            })
            .on("close", (code) => {
                if (code !== 0) {
                    reject({
                        command: `${command} ${args.join(" ")}`
                    });

                    return;
                }

                scriptsPath.callback();
                resolve();
            });
    }).catch((code) => {
        reject(code);
    });
}

function checkAppName(appName) {
    const validationResult = validateProjectName(appName);
    if (!validationResult.validForNewPackages) {
        console.error(`Could not create a project called ${chalk.red(`"${appName}"`)} because of npm naming restrictions:`);

        printValidationResults(validationResult.errors);
        printValidationResults(validationResult.warnings);
        process.exit(1);
    }

    // TODO: there should be a single place that holds the dependencies
    const dependencies = ["react", "react-dom", "react-scripts", "@devloco/react-scripts-wptheme"].sort();
    if (dependencies.indexOf(appName) >= 0) {
        console.error(
            chalk.red(`We cannot create a project called ${chalk.green(appName)} because a dependency with the same name exists.\n` + `Due to the way npm works, the following names are not allowed:\n\n`) +
                chalk.cyan(dependencies.map((depName) => `  ${depName}`).join("\n")) +
                chalk.red("\n\nPlease choose a different project name.")
        );
        process.exit(1);
    }
}

function getProxy() {
    if (process.env.https_proxy) {
        return process.env.https_proxy;
    } else {
        try {
            // Trying to read https-proxy from .npmrc
            let httpsProxy = execSync("npm config get https-proxy")
                .toString()
                .trim();
            return httpsProxy !== "null" ? httpsProxy : undefined;
        } catch (e) {
            return;
        }
    }
}

function checkIfOnline(useYarn) {
    if (!useYarn) {
        // Don't ping the Yarn registry.
        // We'll just assume the best case.
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        dns.lookup("registry.yarnpkg.com", (err) => {
            let proxy;
            if (err != null && (proxy = getProxy())) {
                // If a proxy is defined, we likely can't resolve external hostnames.
                // Try to resolve the proxy name as an indication of a connection.
                dns.lookup(url.parse(proxy).hostname, (proxyErr) => {
                    resolve(proxyErr == null);
                });
            } else {
                resolve(err == null);
            }
        });
    });
}
