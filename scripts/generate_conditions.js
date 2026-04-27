const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const QUESTIONS_FILE = path.join(__dirname, '../CSV/questions_maintenance.csv');
const OUTPUT_FILE = path.join(__dirname, '../CSV/conditions.csv');

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']; // No 'Info'

const PRIORITY_MAP = {
    'CRITICAL': 100,
    'HIGH': 75,
    'MEDIUM': 50,
    'LOW': 35
};

const HEALTH_IMPACTS = [
    'Impact on safety performance',
    'Risk of malfunction during emergency',
    'Potential for operational failure',
    'Degraded asset reliability',
    'Compliance violation risk'
];

const RECOMMENDED_ACTIONS = [
    'Inspect immediately and repair',
    'Replace if damaged or expired',
    'Schedule maintenance check',
    'Verify pressure levels',
    'Clean and re-inspect'
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateConditions() {
    console.log(`Reading from: ${QUESTIONS_FILE}`);

    const inputContent = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    const records = parse(inputContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Extract unique conditions
    const uniqueConditions = new Set();
    records.forEach(row => {
        if (row.conditions && row.conditions.trim()) {
            // "conditions" in question csv might be a single string code like "DISPLACED"
            // The prompt implies deriving from that column.
            uniqueConditions.add(row.conditions.trim());
        }
    });

    const outputRows = [];

    // Header based on request: Condition Name *, Severity*, Priority *, Health Impact *, Recommended Action, Immediate

    uniqueConditions.forEach(conditionName => {
        const severity = getRandomItem(SEVERITIES);
        const priority = PRIORITY_MAP[severity];
        const healthImpact = getRandomItem(HEALTH_IMPACTS);
        const recommendedAction = getRandomItem(RECOMMENDED_ACTIONS);
        const immediate = Math.random() < 0.5 ? 'TRUE' : 'FALSE';

        outputRows.push({
            'Condition Name *': conditionName,
            'Severity *': severity,
            'Priority *': priority,
            'Health Impact *': healthImpact,
            'Recommended Action': recommendedAction,
            'Immediate': immediate
        });
    });

    const csvOutput = stringify(outputRows, {
        header: true,
        columns: ['Condition Name *', 'Severity *', 'Priority *', 'Health Impact *', 'Recommended Action', 'Immediate']
    });

    fs.writeFileSync(OUTPUT_FILE, csvOutput);
    console.log(`Generated ${OUTPUT_FILE} with ${outputRows.length} conditions.`);
}

generateConditions();
