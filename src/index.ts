import { setOutput, getInput } from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
import { getOctokit, context } from "@actions/github";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const AWS_CDK_PACKAGE: string = "aws-cdk/";

const WORKING_DIR: string = getInput("working-dir") ?? ".";
const GITHUB_USER: string = getInput("github-user") ?? "";
const GITHUB_EMAIL: string = getInput("github-email") ?? "";
const GITHUB_TOKEN: string = getInput("github-token") ?? "";
const GITHUB_REMOTE: string = getInput("github-remote") ?? "origin";

/**
 * Get the latest AWS CDK version from npm
 * @returns awws cdk version
 */
const getLatestAwsCdkVersion = async () => {
  const output = await getExecOutput("npm", ["view", "@aws-cdk/core", "version"], {
    ignoreReturnCode: true
  });

  if (!output) {
    throw new Error(
      `[getLatestAwsCdkVersion] failed to get output from npm for the latest version!`
    );
  }

  return output.stdout.replace("\n", "").replace("\r\n", "");
};

/**
 * Get package json file data
 * @returns package.json object
 */
const getPackageJsonFile = async () => {
  const packageJson = readFileSync(resolve(WORKING_DIR, "package.json"), {
    encoding: "utf-8",
  });

  return packageJson ? JSON.parse(packageJson ?? undefined) : {};
};

/**
 * Check and replace the version if its not updated
 * @param current 
 * @param latest 
 * @param object 
 * @returns updated mutated object
 */
const replaceVersionIfNotTheSame = (
  current: string,
  latest: string,
  object: unknown
) => {
  if (current !== latest) {
    object = latest;
  }

  return object;
};

/**
 * Update the aws cdk module to the latest
 * @param latestVersion 
 */
const updateAllAwsCdkModules = async (latestVersion: string) => {
  try {
    console.info("updating all aws cdk modules...");
    const originalPackageJson = await getPackageJsonFile();

    let packageJson = JSON.parse(JSON.stringify(originalPackageJson));
    let isUpdated: boolean = false;

    if (packageJson) {
      const { dependencies, devDependencies } = packageJson;

      if (dependencies) {
        for (const dependency of Object.keys(dependencies)) {
          if (dependency.indexOf(AWS_CDK_PACKAGE) > -1) {
            console.info("compare the version...");
            const currentVersion: string = dependencies[dependency]
              ?.replace("^", "")
              .replace("~", "");

            dependencies[dependency] = replaceVersionIfNotTheSame(
              currentVersion,
              latestVersion,
              dependencies[dependency]
            );
          }
        }
      }

      if (devDependencies) {
        for (const dependency of Object.keys(devDependencies)) {
          if (dependency.indexOf(AWS_CDK_PACKAGE) > -1) {
            console.info("compare the version...");
            const currentVersion: string = dependencies[dependency]
              ?.replace("^", "")
              .replace("~", "");

            devDependencies[dependency] = replaceVersionIfNotTheSame(
              currentVersion,
              latestVersion,
              devDependencies[dependency]
            );
          }
        }
      }

      if (JSON.stringify(packageJson) !== JSON.stringify(originalPackageJson)) {
        console.info("version changed");
        isUpdated = true;
      }

      if (isUpdated) {
        console.info("final output", packageJson);

        writeFileSync(
          resolve(WORKING_DIR, "package.json"),
          JSON.stringify(packageJson, null, 2),
          {
            encoding: "utf-8",
          }
        );

        await makePullRequest();
      }

      setOutput("is_updated", isUpdated);
    }
  } catch (ex) {
    throw ex;
  }
};

/**
 * Assert the git config
 */
const githubConfig = async () => {
  console.info(`configuring git settings...`);

  await exec(`git config --global user.name ${GITHUB_USER}`);
  await exec(`git config --global user.email ${GITHUB_EMAIL}`);
};

/**
 * Make pull request if there's changes
 */
const makePullRequest = async () => {
  const octokit = getOctokit(GITHUB_TOKEN);
console.log(context);
  const { data } = (await octokit.request("GET /repos/:owner/:repo", { owner: context.repo.owner, repo: context.repo.repo }));

  await githubConfig();

  console.info(`making pull request on changes...`);

  await exec("git checkout -b aws-cdk-version-update", undefined, {
    cwd: WORKING_DIR,
  });
  await exec("git status");
  await exec("git add -A");
  await exec('git commit -m "updated aws-cdk version to the latest"');
  await exec(`git push --force ${GITHUB_REMOTE} aws-cdk-version-update`);

  await octokit.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: "update aws-cdk version",
    body: "updated aws-cdk version to the latest",
    base: data.default_branch,
    head: "aws-cdk-version-update",
  });
};

/**
 * Executor
 */
const run = async () => {
  console.info("current working dir", WORKING_DIR);

  const latestVersion = await getLatestAwsCdkVersion();

  await updateAllAwsCdkModules(latestVersion);

  setOutput('cdk_version', latestVersion);
};

run();
