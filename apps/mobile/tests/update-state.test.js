import test from "node:test";
import assert from "node:assert/strict";
import { resolveUpdateState, hasRecoverableInstaller } from "../src/update-state.js";

const latest = Object.freeze({ version: "0.4.87" });

test("detecta una versión superior a la instalada", () => {
  assert.deepEqual(resolveUpdateState(latest, "0.4.86", true), {
    status: "available",
    version: "0.4.87",
  });
});

test("no ofrece una actualización cuando las versiones coinciden", () => {
  assert.deepEqual(resolveUpdateState({ version: "0.4.86" }, "0.4.86", true), {
    status: "current",
    version: "0.4.86",
  });
});

test("no ofrece una versión antigua como actualización", () => {
  assert.deepEqual(resolveUpdateState({ version: "0.4.83" }, "0.4.86", true), {
    status: "current",
    version: "0.4.83",
  });
});

test("la vista web informa la versión sin ejecutar el instalador nativo", () => {
  assert.deepEqual(resolveUpdateState(latest, "0.4.86", false), {
    status: "web",
    version: "0.4.87",
  });
});

test("una respuesta sin release válido no genera una actualización", () => {
  assert.deepEqual(resolveUpdateState(null, "0.4.86", true), {
    status: "none",
    version: "",
  });
});

test("reconoce una APK terminada cuyo instalador ya fue abierto", () => {
  assert.equal(hasRecoverableInstaller({
    status: "successful",
    installPrompted: true,
    version: "0.4.87",
  }), true);
});

test("no confunde una descarga incompleta o no confirmada con un instalador recuperable", () => {
  assert.equal(hasRecoverableInstaller({ status: "running", installPrompted: true }), false);
  assert.equal(hasRecoverableInstaller({ status: "successful", installPrompted: false }), false);
  assert.equal(hasRecoverableInstaller({ status: "failed", installPrompted: true }), false);
});
