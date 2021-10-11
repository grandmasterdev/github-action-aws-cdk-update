import { setOutput } from "@actions/core";
import { exec } from '@actions/exec';
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const AWS_CDK_PACKAGE: string = "@aws-cdk";

const getLatestAwsCdkVersion = () => {
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

const getPackageJsonFile = () => {
  const packageJson = readFileSync(resolve(__dirname, "..", "package.json"), {
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

const updateAllAwsCdkModules = (latestVersion: string) => {
  try {
    console.info("updating all aws cdk modules...");
    const originalPackageJson = getPackageJsonFile();

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

        console.log(dependencies);
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
        console.log("final output", packageJson);

        writeFileSync(
          resolve(__dirname, "..", "package.json"),
          JSON.stringify(packageJson, null, 2),
          {
            encoding: "utf-8",
          }
        );

        makePullRequest();
      }

      setOutput('is_updated', isUpdated);
    }
  } catch (ex) {
    throw ex;
  }
};

const makePullRequest = () => {
    exec('git checkout -b aws-cdk-version-update');
    exec('git add -A');
    exec('git commit -m "updated aws-cdk version to the latest"')
    exec('git push origin aws-cdk-version-update');
}

const run = () => {
  const latestVersion = getLatestAwsCdkVersion();

  updateAllAwsCdkModules(latestVersion);
};

run();
