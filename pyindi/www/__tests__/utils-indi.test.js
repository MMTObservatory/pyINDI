
const { generateId, utilities, converter } = require("../static/js/utils-indi");
const { fakeIndi } = require("../static/js/fake-data")
describe("generateId", () => {
  test("device", () => {
    expect(generateId.device(fakeIndi.switch) === "Dome_Simulator").toBe(true);
  });
  test("group", () => {
    expect(generateId.group(fakeIndi.switch) === "Dome_Simulator-Options").toBe(true);
  });
  test("vector", () => {
    expect(generateId.vector(fakeIndi.switch) === "Dome_Simulator__SIMULATION").toBe(true);
  });
  test("property", () => {
    expect(generateId.property(fakeIndi.switch, fakeIndi.switch.values[0]) === "Dome_Simulator__SIMULATION__ENABLE").toBe(true);
  });
  test("indiXml", () => {
    expect(generateId.indiXml(fakeIndi.switch) === "Dome Simulator.SIMULATION").toBe(true);
  });
});


// expect(/[&\/\\#,+()$~%.'":*?<>{}]/.test(generateId.device(fakeIndi.switch))).toBe(false);
