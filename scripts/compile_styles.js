const sass = require('sass');
const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(__dirname, '../styles/styles.scss');
const outputFile = path.resolve(__dirname, '../styles.css');

try {
    const result = sass.compile(inputFile, {
        style: 'expanded'
    });
    const cleanedCss = result.css.replace(/^@charset\s+"utf-8";\s*/i, '');
    fs.writeFileSync(outputFile, cleanedCss);
    console.log(`Successfully compiled ${inputFile} to ${outputFile}`);
} catch (error) {
    console.error('Error compiling SCSS:', error);
    process.exit(1);
}
