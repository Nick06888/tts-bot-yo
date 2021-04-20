const fs = require('fs');
let settings;

/**
 * 
 * @param {String}
 */
function loadSettings(settingsPath) {
    const fileContent = fs.readFileSync(settingsPath);
    settings = JSON.parse(fileContent);
}

/**
 * 
 * @param {String}
 */
function saveSettings(settingsPath) {
    const fileContent = JSON.stringify(settings);
    fs.writeFileSync(settingsPath, fileContent);
}

/**
 * 
 * @param {String}
 */
function getValue(name) {
    return settings[name]
}

/**
 * 
 * @param {String}
 * @param {String}
 */
function setValue(name, val) {
    settings[name] = val;
}

module.exports = {
    loadSettings,
    saveSettings,
    getValue,
    setValue,
}