import { mocked } from "ts-jest/utils";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { exec, getExecOutput } from "@actions/exec";
import { setOutput, getInput } from "@actions/core";
import { getOctokit, context as ctx} from "@actions/github";
import packageJson from "./__mocks__/package.json";

jest.mock("child_process");
jest.mock("fs");
jest.mock("@actions/exec");
jest.mock("@actions/core");
jest.mock("@actions/github");

describe("action test", () => {
  const mockedExecSync = mocked(execSync, true);
  const mockedReadFileSync = mocked(readFileSync, true);
  const mockedWriteFileSync = mocked(writeFileSync, true);
  const mockedExec = mocked(exec, true);
  const mockedGetExecOuput = mocked(getExecOutput, true);
  const mockedGetInput = mocked(getInput, true);
  const mockedSetOutput = mocked(setOutput, true);
  const mockedGetOctokit = mocked(getOctokit, true);
  const mockedCtx = mocked(ctx);

  const mockedConsole = mocked(console, true);

  beforeEach(async () => {
    jest.clearAllMocks();

    mockedReadFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockedConsole.info = jest.fn();
    mockedConsole.log = jest.fn();
  });

  it("should update package.json aws-cdk modules to the latest version", async () => {
    mockedGetExecOuput.mockResolvedValueOnce({
      stdout: "1.129.0",
      stderr: "",
      exitCode: 0,
    });
    mockedExec.mockResolvedValue(0);
    (mockedGetOctokit as any).mockReturnValue({
      rest: {
        pulls: {
          create: jest.fn(),
        },
      },
      request: jest.fn().mockReturnValue({
        default_branch: "default",
      }),
    });
    (mockedCtx as any).mockReturnValue({
      repo: {
        owner: "mocked-owner",
        repo: "mocked-repo",
      },
    });

    await import("./index");

    expect(mockedGetInput).toHaveBeenCalledTimes(5);
  });
});
