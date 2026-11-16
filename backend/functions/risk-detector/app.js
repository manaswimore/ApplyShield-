const { analyze } = require("./scoring");
exports.handler = async event => {
  const result = analyze(event.normalizedText || event.content || "");
  return {...event,detection:result};
};
