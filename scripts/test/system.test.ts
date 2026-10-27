import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const childProcess = vi.hoisted(() => ({ spawn: vi.fn() }));
const fs = vi.hoisted(() => ({
  chmodSync: vi.fn(),
  constants: { COPYFILE_EXCL: 1 },
  copyFileSync: vi.fn(),
  lstatSync: vi.fn(),
  readFileSync: vi.fn(),
  readlinkSync: vi.fn(),
  symlinkSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
const pg = vi.hoisted(() => {
  const instance = {
    connect: vi.fn(),
    query: vi.fn(),
    escapeIdentifier: vi.fn((value: string) => `"${value}"`),
    end: vi.fn(),
  };
  return { instance, Client: vi.fn(function Client() { return instance; }) };
});

vi.mock("node:child_process", () => childProcess);
vi.mock("node:fs", () => fs);
vi.mock("pg", () => ({ default: { Client: pg.Client } }));

const { connect, createSystem, pathKind } = await import("../setup/system.ts");

function stats(kind: "symlink" | "file" | "dir") {
  return { isSymbolicLink: () => kind === "symlink", isFile: () => kind === "file" };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSystem", () => {
  const system = createSystem("/repo");

  it("opisuje bieżący proces", () => {
    expect(system).toMatchObject({
      rootDir: "/repo",
      platform: process.platform,
      nodeVersion: process.versions.node,
      env: process.env,
    });
  });

  it("wypisuje linie na stdout", () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    system.write("linia");

    expect(write).toHaveBeenCalledWith("linia\n");
    write.mockRestore();
  });

  it("uruchamia komendę w katalogu repo z przekazanym wyjściem i zwraca kod", async () => {
    const child = new EventEmitter();
    childProcess.spawn.mockReturnValue(child);

    const exit = system.run("npm", ["install"]);
    child.emit("close", 3);

    await expect(exit).resolves.toBe(3);
    expect(childProcess.spawn).toHaveBeenCalledWith("npm", ["install"], { cwd: "/repo", stdio: "inherit" });
  });

  it("traktuje proces zabity sygnałem jako porażkę", async () => {
    const child = new EventEmitter();
    childProcess.spawn.mockReturnValue(child);

    const exit = system.run("npm", ["install"]);
    child.emit("close", null);

    await expect(exit).resolves.toBe(1);
  });

  it("odrzuca, gdy komendy nie da się uruchomić", async () => {
    const child = new EventEmitter();
    childProcess.spawn.mockReturnValue(child);

    const exit = system.run("brak", []);
    child.emit("error", new Error("ENOENT"));

    await expect(exit).rejects.toThrow("ENOENT");
  });

  it("deleguje operacje na plikach do node:fs, bez nadpisywania przy kopiowaniu", () => {
    fs.readlinkSync.mockReturnValue("../../.env");
    fs.readFileSync.mockReturnValue("A=1");

    expect(system.readLink("/l")).toBe("../../.env");
    expect(system.readFile("/f")).toBe("A=1");
    system.copyFile("/a", "/b");
    system.symlink("../../.env", "/l");
    system.writeFile("/w", "B=2");
    system.chmod("/w", 0o600);

    expect(fs.readFileSync).toHaveBeenCalledWith("/f", "utf8");
    expect(fs.copyFileSync).toHaveBeenCalledWith("/a", "/b", fs.constants.COPYFILE_EXCL);
    expect(fs.symlinkSync).toHaveBeenCalledWith("../../.env", "/l");
    expect(fs.writeFileSync).toHaveBeenCalledWith("/w", "B=2");
    expect(fs.chmodSync).toHaveBeenCalledWith("/w", 0o600);
    expect(system.pathKind).toBe(pathKind);
    expect(system.connect).toBe(connect);
  });
});

describe("generateSecret", () => {
  it("zwraca losowy sekret base64url dłuższy niż minimum 32 bajtów", () => {
    const system = createSystem("/repo");

    const first = system.generateSecret();

    expect(first).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(system.generateSecret()).not.toBe(first);
  });
});

describe("pathKind", () => {
  it.each([
    ["symlink", "symlink"],
    ["file", "file"],
    ["dir", "other"],
  ] as const)("rozpoznaje %s przez lstat", (kind, expected) => {
    fs.lstatSync.mockReturnValue(stats(kind));

    expect(pathKind("/p")).toBe(expected);
  });

  it("zwraca missing dla nieistniejącej ścieżki", () => {
    fs.lstatSync.mockImplementation(() => {
      throw Object.assign(new Error("nie ma"), { code: "ENOENT" });
    });

    expect(pathKind("/p")).toBe("missing");
  });

  it("przekazuje dalej inne błędy lstat", () => {
    const denied = Object.assign(new Error("brak dostępu"), { code: "EACCES" });
    fs.lstatSync.mockImplementation(() => {
      throw denied;
    });

    expect(() => pathKind("/p")).toThrow(denied);
  });

  it("przekazuje dalej wyjątek, który nie jest Error", () => {
    fs.lstatSync.mockImplementation(() => {
      throw "napis";
    });

    expect(() => pathKind("/p")).toThrow("napis");
  });
});

describe("connect", () => {
  it("łączy się przez pg z limitem czasu i deleguje zapytania", async () => {
    pg.instance.query.mockResolvedValue({ rowCount: 1 });

    const client = await connect("postgresql://u@h/postgres", 5000);

    expect(pg.Client).toHaveBeenCalledWith({ connectionString: "postgresql://u@h/postgres", connectionTimeoutMillis: 5000 });
    expect(pg.instance.connect).toHaveBeenCalledOnce();
    await expect(client.query("SELECT 1", [1])).resolves.toEqual({ rowCount: 1 });
    expect(pg.instance.query).toHaveBeenCalledWith("SELECT 1", [1]);
    expect(client.escapeIdentifier("x")).toBe('"x"');
    await client.end();
    expect(pg.instance.end).toHaveBeenCalledOnce();
  });
});
