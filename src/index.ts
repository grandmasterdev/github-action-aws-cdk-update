import { setOutput, getInput } from "@actions/core";
import { exec } from "@actions/exec";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const AWS_CDK_PACKAGE: string = "@aws-cdk";

const WORKING_DIR: string = getInput("working-dir") ?? ".";
const GITHUB_USER: string = getInput("github-user") ?? "";
const GITHUB_EMAIL: string = getInput("github-email") ?? "";
const GITHUB_TOKEN: string = getInput("github-token") ?? "";
const GITHUB_REMOTE: string = getInput("github-remote") ?? "origin";

const getLatestAwsCdkVersion = async () => {
  const output = execSync("npm view @aws-cdk/core version", {
    encoding: "utf-8",
  });

  if (!output) {
    throw new Error(
      `[getLatestAwsCdkVersion] failed to get output from npm for the latest version!`
    );
  }

  return output.replace("\n", "").replace("\r\n", "");
};

const getPackageJsonFile = async () => {
  const packageJson = readFileSync(resolve(WORKING_DIR, "package.json"), {
    encoding: "utf-8",
  });

  return packageJson ? JSON.parse(packageJson ?? undefined) : {};
};

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

const githubConfig = async () => {
  console.info(`configuring git settings...`);

  await exec(`git config --global user.name ${GITHUB_USER}`);
  await exec(`git config --global user.email ${GITHUB_EMAIL}`);
};

const makePullRequest = async () => {
  await githubConfig();

  console.info(`making pull request on changes...`);

  await exec("git checkout -b aws-cdk-version-update");
  await exec("git add -A");
  await exec('git commit -m "updated aws-cdk version to the latest"');
  await exec(`git push ${GITHUB_REMOTE} aws-cdk-version-update`);
};

const run = async () => {
  console.info("current working dir", WORKING_DIR);

  const latestVersion = await getLatestAwsCdkVersion();

  await updateAllAwsCdkModules(latestVersion);
};

run();
