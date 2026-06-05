const fs = require('fs');
const path = require('path');

// File paths
const colorTokensFile = path.join(__dirname, 'color-tokens.json');
const designTokensFile = path.join(__dirname, 'design-tokens.tokens.json');
const outputCssFile = path.join(__dirname, 'theme-tokens.css');
const appOutputCssFile = path.join(__dirname, '..', 'sellsnap', 'app', 'theme-tokens.css');

// Load JSON data
const colorData = JSON.parse(fs.readFileSync(colorTokensFile, 'utf8'));
const designData = JSON.parse(fs.readFileSync(designTokensFile, 'utf8'));

// Helper utility to convert strings to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase
    .replace(/\s+/g, '-')                // Convert spaces
    .toLowerCase();
}

// Helper utility to resolve value references like "{color.palette.primary.100}"
function resolveReference(refString, rootDict) {
  if (typeof refString === 'string' && refString.startsWith('{') && refString.endsWith('}')) {
    const pathParts = refString.slice(1, -1).split('.');
    
    let current = rootDict;
    for (const part of pathParts) {
      if (current[part] !== undefined) {
        current = current[part];
      } else {
        return refString; // Return original if path is not found
      }
    }
    return current;
  }
  return refString;
}

// Generate CSS Content
let cssVarOutput = ':root {\n';

// 1. Process Color Roles - LIGHT
cssVarOutput += '  /* === COLOR ROLES (LIGHT) === */\n';
const lightRoles = colorData.color.role.light;

for (const [key, value] of Object.entries(lightRoles)) {
  const resolvedValue = resolveReference(value, colorData);
  cssVarOutput += `  --color-${toKebabCase(key)}: ${resolvedValue};\n`;
}

cssVarOutput += '\n  /* === TYPOGRAPHY TOKENS === */\n';
// 2. Process Typography
// Utilizing the typography node within design-tokens.tokens.json
const typography = designData.typography;

for (const [fontStyleKey, properties] of Object.entries(typography)) {
  for (const [propName, propData] of Object.entries(properties)) {
    const varName = `--typography-${toKebabCase(fontStyleKey)}-${toKebabCase(propName)}`;
    let varValue = propData.value;
    
    // Add "px" suffix if it's a dimension, skipping 0 dimension values
    if (propData.type === 'dimension' && varValue !== 0) {
        varValue = `${varValue}px`;
    }
    
    // Add quotes if it's font-family
    if (propName === 'fontFamily' || propData.type === 'fontFamilies') {
       if(!varValue.includes("'") && !varValue.includes('"')) {
           varValue = `"${varValue}"`;
       }
    }

    cssVarOutput += `  ${varName}: ${varValue};\n`;
  }
}

cssVarOutput += '}\n\n';

// 3. Process Color Roles - DARK
cssVarOutput += '[data-theme="dark"] {\n';
cssVarOutput += '  /* === COLOR ROLES (DARK) === */\n';

const darkRoles = colorData.color.role.dark;
for (const [key, value] of Object.entries(darkRoles)) {
  const resolvedValue = resolveReference(value, colorData);
  cssVarOutput += `  --color-${toKebabCase(key)}: ${resolvedValue};\n`;
}

cssVarOutput += '}\n';

// Write resulting CSS to files
fs.writeFileSync(outputCssFile, cssVarOutput);
fs.writeFileSync(appOutputCssFile, cssVarOutput);

console.log(`Successfully generated CSS variables in:
  - ${outputCssFile}
  - ${appOutputCssFile}`);
