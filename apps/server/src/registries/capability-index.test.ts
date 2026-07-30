import { describe, expect, it } from "vitest";
import { CapabilityIndex } from "./capability-index.js";
import { makeCapability } from "@streamdesk/test-utils";

describe("CapabilityIndex", () => {
  it("finds connects offering a given action", () => {
    const index = new CapabilityIndex();
    index.setCapabilities("connect-a", [makeCapability({ actions: ["system.url.open"] })]);
    index.setCapabilities("connect-b", [makeCapability({ actions: ["example.counter.ping"] })]);

    expect(index.connectsForAction("system.url.open")).toEqual(["connect-a"]);
    expect(index.connectsForAction("example.counter.ping")).toEqual(["connect-b"]);
    expect(index.connectsForAction("unknown.action")).toEqual([]);
  });

  it("stops offering actions once a connect is removed", () => {
    const index = new CapabilityIndex();
    index.setCapabilities("connect-a", [makeCapability({ actions: ["system.url.open"] })]);
    index.remove("connect-a");
    expect(index.connectsForAction("system.url.open")).toEqual([]);
  });
});
