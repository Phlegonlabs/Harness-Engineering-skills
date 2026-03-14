const layerOrder = ["types", "config", "lib", "services", "app"];

const forbidden = layerOrder.flatMap((fromLayer, fromIndex) =>
  layerOrder.slice(fromIndex + 1).map(toLayer => ({
    name: `${fromLayer}-cannot-import-${toLayer}`,
    severity: "error",
    comment: `Keep dependency direction ${layerOrder.join(" -> ")}`,
    from: { path: `^src/${fromLayer}` },
    to: { path: `^src/${toLayer}` },
  })),
);

module.exports = {
  forbidden,
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^dist)|(^tests)" },
    tsConfig: {
      fileName: "tsconfig.json",
    },
  },
};
