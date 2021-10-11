import { mocked } from "ts-jest/utils";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { exec } from '@actions/exec';
import packageJson from "./__mocks__/package.json";

jest.mock("child_process");
jest.mock("fs");
jest.mock("@actions/exec");

describe("action test", () => {
  const mockedExecSync = mocked(execSync, true);
  const mockedReadFileSync = mocked(readFileSync, true);
  const mockedWriteFileSync = mocked(writeFileSync, true);
  const mockedExec = mocked(exec, true);

  const mockedConsole = mocked(console, true);

  beforeEach(() => {
    jest.clearAllMocks();

    mockedReadFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockedConsole.info = jest.fn();
    mockedConsole.log = jest.fn();
  });

  it("should update package.json aws-cdk modules to the latest version", () => {
    mockedExecSync.mockReturnValue("1.127.0");

    const cut = require("./index");

    expect(mockedExecSync).toHaveBeenCalledTimes(1);
    expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(
        {
          name: "mock-package",
          version: "0.0.1",
          description: "Mock package for jest test",
          main: "dist/index.js",
          scripts: { test: "jest", build: "webpack", prepare: "husky install" },
          keywords: ["github", "action"],
          author: "mocker",
          license: "ISC",
          devDependencies: {
            "@types/jest": "^27.0.2",
            husky: "^7.0.2",
            jest: "^27.2.5",
            "ts-jest": "^27.0.5",
            "ts-loader": "^9.2.6",
            "ts-node": "^10.2.1",
            typescript: "^4.4.3",
            webpack: "^5.58.1",
            "webpack-cli": "^4.9.0",
          },
          dependencies: {
            "@aws-cdk/core": "1.127.0",
            "@aws-cdk/aws-lambda": "1.127.0",
          },
        },
        null,
        2
      ),
      { encoding: "utf-8" }
    );
    expect(mockedExec).toHaveBeenCalledTimes(4);
  });
});
