const {exec} = require('child_process');
const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');
const semverClean = require('semver/functions/clean');
const getMajorVersion = require('semver/functions/major');
const getMinorVersion = require('semver/functions/minor');
const getPatchVersion = require('semver/functions/patch');
const getBuildVersion = require('semver/functions/prerelease');
const {version: reactNativeVersion} = require('react-native-version');

// Use Github Actions' default environment variables to get repo information
// https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables#default-environment-variables
const [repoOwner, repoName] = process.env.GITHUB_REPOSITORY.split('/');

/**
 * Pad a number to be three digits (with leading zeros if necessary).
 *
 * @param {Number} number - Must be an integer.
 * @returns {String} - A string representation of the number w/ length 3.
 */
function padToThreeDigits(number) {
    if (number >= 100) {
        return number.toString();
    } else if (number >= 10) {
        return `0${number.toString()}`;
    } else {
        return `00${number.toString()}`;
    }
}

/**
 * Generate the 12-digit versionCode for android.
 * This version code allocates three digits each for MAJOR, MINOR, PATCH, and BUILD versions.
 * As a result, our max version is 999.999.999-999.
 *
 * @param {String} npmVersion
 * @returns {String}
 */
function generateAndroidVersionCode(npmVersion) {
    return ''.concat(
        padToThreeDigits(getMajorVersion(npmVersion)),
        padToThreeDigits(getMinorVersion(npmVersion)),
        padToThreeDigits(getPatchVersion(npmVersion)),
        padToThreeDigits(getBuildVersion(npmVersion)),
    );
}

/**
 * Use the react-native-version package to update the version of a native platform.
 *
 * @param {String} platform – "ios" or "android"
 * @param {String} versionCode – The version code to update the native platform.
 */
function updateNativeVersion(platform, versionCode) {
    if (platform !== 'android' || platform !== 'ios') {
        console.error('Invalid native platform specified!');
        core.setFailed();
    }

    reactNativeVersion({
        target: platform,
        setBuild: versionCode,
        amend: true,
    })
        .then(() => {
            console.log(`Successfully updated ${platform} version to ${versionCode}`);
        })
        .catch((err) => {
            console.log('Error updating native version:', `platform: ${platform}`, `versionCode: ${versionCode}`, err);
            core.setFailed(err);
        })
}

/**
 * A callback function for a successful `npm version` command.
 *
 * @param {String} newVersion
 */
function postVersionUpdateNative(newVersion) {
    const cleanNewVersion = semverClean(newVersion);
    console.log(`Updated npm version to ${cleanNewVersion}! Updating native versions...`);

    // The native version needs to be different on Android v.s. iOS
    const androidVersionCode = generateAndroidVersionCode(cleanNewVersion);
    console.log('Updating android:', `buildCode: ${androidVersionCode}`, `buildName: ${cleanNewVersion}`);
    updateNativeVersion('android', generateAndroidVersionCode(cleanNewVersion));
    console.log(`Updating ios to ${cleanNewVersion}`);
    updateNativeVersion('ios', cleanNewVersion);
}

const MAX_RETRIES = 10;
let errCount = 0;
let shouldRetry;

do {
    shouldRetry = false;
    exec('npm version prerelease -m "Update version to %s"', (err, stdout, stderr) => {
        if (!err) {
            // npm version updated, now update native version to keep in sync and prepare to deploy.
            postVersionUpdateNative(stdout);
        } else {
            console.log(stdout);
            console.error(stderr);

            // It's possible that two PRs were merged in rapid succession.
            // In this case, both PRs will attempt to update to the same npm version.
            // This will cause the deploy to fail with an exit code 128, saying the git tag for that version already exists.
            if (errCount < MAX_RETRIES) {
                console.log(
                    'Err: npm version conflict, attempting to automatically resolve',
                    `retryCount: ${++errCount}`,
                );
                shouldRetry = true;
                const {version} = JSON.parse(fs.readFileSync('./package.json'));
                const currentPatchVersion = `v${version.slice(0, -4)}`
                console.log('Current patch version:', currentPatchVersion);

                // Get the highest build version git tag from the repo
                console.log('Fetching tags from github...');
                const octokit = github.getOctokit(core.getInput('GITHUB_TOKEN', {required: true}));
                octokit.repos.listTags({
                    owner: repoOwner,
                    repo: repoName,
                })
                    .then(response => {
                        const tags = response.data.map(tag => tag.name);
                        console.log('Tags: ', tags);
                        const highestBuildNumber = Math.max(
                            ...(tags
                                .filter(tag => tag.startsWith(currentPatchVersion))
                                .map(tag => tag.split('-')[1])
                            )
                        );
                        console.log('Highest build number from current patch version:', highestBuildNumber);

                        const newBuildNumber = `${currentPatchVersion}-${highestBuildNumber + 1}`;
                        console.log(`Setting npm version for this PR to ${newBuildNumber}`);
                        exec(`npm version ${newBuildNumber} -m "Update version to ${newBuildNumber}"`, (err, stdout, stderr) => {
                            if (!err) {
                                // NPM version successfully updated, update native versions - don't retry.
                                postVersionUpdateNative(stdout);
                                shouldRetry = false;
                            } else {
                                // Log errors and retry
                                console.log(stdout);
                                console.error(stderr);
                            }
                        });
                    })
                    .catch(exception => core.setFailed(exception))
            } else {
                core.setFailed(err);
            }
        }
    });
} while (shouldRetry);
