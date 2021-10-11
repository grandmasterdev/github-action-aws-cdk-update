import { mocked } from "ts-jest/utils";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { exec } from '@actions/exec';
import {setOutput, getInput } from '@actions/core';
import packageJson from "./__mocks__/package.json";

jest.mock("child_process");
jest.mock("fs");
jest.mock("@actions/exec");
jest.mock("@actions/core");

describe("action test", () => {
  const mockedExecSync = mocked(execSync, true);
  const mockedReadFileSync = mocked(readFileSync, true);
  const mockedWriteFileSync = mocked(writeFileSync, true);
  const mockedExec = mocked(exec, true);
  const mockedGetInput = mocked(getInput, true);
  const mockedSetOutput = mocked(setOutput, true);

  const mockedConsole = mocked(console, true);

  beforeEach(async () => {
    jest.clearAllMocks();

    mockedReadFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockedConsole.info = jest.fn();
    mockedConsole.log = jest.fn();
  });

  it("should update package.json aws-cdk modules to the latest version", async () => {
    mockedExecSync.mockReturnValue("1.127.0");

    await require("./index");

    expect(mockedGetInput).toHaveBeenCalledTimes(5);
  });
});
