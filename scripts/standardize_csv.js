const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CSV_DIR = path.join(__dirname, '../CSV');
const TARGET_HEADER = [
    'Plant', 'Building', 'Floor', 'Wing', 'Location', 'Category', 'Product', 'Type', 'Sub Type',
    'Maintenance Status', 'Tag', 'Lifespan Years', 'Manufacturing Date', 'Installation Date',
    'Warranty End Date', 'Manufacturer', 'Model', 'SL No / Part No'
];

const FILES_TO_PROCESS = [
    { name: 'FE Asset of Plant 1-Table 1.csv', type: 'FE', plantName: 'Orion Manufacturing Unit' },
    { name: 'FE Asset of Plant 2-Table 1.csv', type: 'FE', plantName: 'Nova Pharma Labs' },
    { name: 'FE Asset of Plant 3-Table 1.csv', type: 'FE', plantName: 'Vertex Engineering Works' },
    { name: 'FE Asset of Plant 4-Table 1.csv', type: 'FE', plantName: 'Zenith FMCG Plant' },
    { name: 'FE Assets of Plant 5-Table 1.csv', type: 'FE', plantName: 'Bharath Science Foundation' },
    { name: 'Hydrant Asset Plant 1-Table 1.csv', type: 'Hydrant', plantName: 'Orion Manufacturing Unit' },
    { name: 'Hydrant Asset Plant 3-Table 1.csv', type: 'Hydrant', plantName: 'Vertex Engineering Works' },
    { name: 'Hydrant Assets Plant 4 -Table 1.csv', type: 'Hydrant', plantName: 'Zenith FMCG Plant' },
    { name: 'Hydrant Assets of Plant 5-Table 1.csv', type: 'Hydrant', plantName: 'Bharath Science Foundation' },
];

// Product Mapping Configuration
const ALLOWED_PRODUCTS = {
    'Hydrant': [
        {
            names: ['Air Release Valve', 'Air Release'],
            target: 'Air Release Valve',
            type: 'Single Orifice',
            subType: 'Flanged End'
        },
        {
            names: ['Pressure Reducing Valve', 'Pressure Reducing'],
            target: 'Pressure Reducing Valve',
            type: 'Pilot Operated',
            subType: 'Flanged End'
        },
        {
            names: ['Pressure Relief Valve', 'Pressure Relief'],
            target: 'Pressure Relief Valve',
            type: 'Spring Loaded',
            subType: 'Flanged End'
        },
        {
            names: [], // Catch-all for Hydrants
            target: 'Hydrant Valve', // Generic replacement name
            type: 'Oblique',
            subType: 'Single Outlet'
        }
    ],
    'Fire Extinguisher': [
        {
            names: ['Water'],
            target: 'Water',
            type: 'Water',
            subType: 'Portable'
        },
        {
            names: ['Clean Agent', 'Halon', 'HFC', 'Fe36', 'FE-36', 'FK'],
            target: 'Clean Agent',
            // Preserve existing Type/SubType (handled in logic), or default to null
            type: null,
            subType: null
        },
        {
            names: [], // Empty matches all others (fallback)
            target: 'Fire Ext',
            type: null,
            subType: null
        }
    ]
};

// Plant Structure Configuration (Building -> Floors)
const PLANT_STRUCTURE = {
    'Orion Manufacturing Unit': {
        'Production Block A': ['Ground', 'First', 'Second', 'Third'],
        'Production Block B': ['Ground', 'First', 'Second', 'Third']
    },
    'Nova Pharma Labs': {
        'Production Block A': ['Ground', 'First', 'Second', 'Third'],
        'Production Block B': ['Ground', 'First', 'Second', 'Third']
    },
    'Vertex Engineering Works': {
        'Production Block A': ['Ground', 'First', 'Second', 'Third'],
        'Production Block B': ['Ground', 'First', 'Second', 'Third']
    },
    'Zenith FMCG Plant': {
        'Production Block A': ['Ground', 'First', 'Second', 'Third'],
        'Production Block B': ['Ground', 'First', 'Second', 'Third']
    },
    'Bharath Science Foundation': {
        'Production Block A': ['Ground', 'First', 'Second', 'Third'],
        'Production Block B': ['Ground', 'First', 'Second', 'Third']
    }
};

// Helper to normalize Building names
function normalizeBuilding(raw) {
    if (!raw) return 'Production Block A'; // Default empty to Block A
    const upper = raw.toUpperCase().trim();

    // Direct matches
    if (upper.includes('BLOCK B') || upper.includes('BLK B')) return 'Production Block B';
    if (upper.includes('BLOCK A') || upper.includes('BLK A')) return 'Production Block A';

    // Known definitions
    if (upper.includes('R & D') || upper.includes('R&D')) return 'Production Block B';
    if (upper.includes('FABRICATION')) return 'Production Block B';
    if (upper.includes('COLD STORAGE')) return 'Production Block B';
    if (upper.includes('SCIENCE LAB')) return 'Production Block B';
    if (upper.includes('LIBRARY')) return 'Production Block B';

    // Default Fallback
    return 'Production Block A';
}

// Helper to normalize Floor names
function normalizeFloor(raw) {
    if (!raw) return 'Ground'; // Default empty to Ground
    const upper = String(raw).toUpperCase().trim();

    // Ground variations
    if (['GF', 'G.F', 'G', '0', 'GRND', 'GROUND', 'GROUND FLOOR', 'EXTERNAL', 'BASEMENT', 'TERRACE'].some(x => upper.includes(x))) return 'Ground';

    // First
    if (['1', '1ST', 'FIRST', 'FIRST FLOOR', '1ST FLOOR'].includes(upper)) return 'First';

    // Second
    if (['2', '2ND', 'SECOND', 'SECOND FLOOR', '2ND FLOOR'].includes(upper)) return 'Second';

    // Third
    if (['3', '3RD', 'THIRD', 'THIRD FLOOR', '3RD FLOOR'].includes(upper)) return 'Third';

    // Fourth+ mapping to Third
    if (['4', '4TH', 'FOURTH', '5', '5TH', 'FIFTH', '6', '6TH', 'SIXTH', '7', '7TH'].some(x => upper.includes(x))) return 'Third';

    // Default Fallback
    return 'Ground';
}

// Helper to parse a CSV line handling quoted fields
function parseCSVLine(text) {
    if (!text) return [];
    let result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
}

// Helper to convert CSV array to line
function arrayToCSVLine(arr) {
    return arr.map(val => {
        if (val === undefined || val === null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }).join(',');
}

async function processFile(fileConfig) {
    const inputPath = path.join(CSV_DIR, fileConfig.name);
    const outputPath = path.join(CSV_DIR, fileConfig.name.replace('.csv', '_standardized.csv'));

    if (!fs.existsSync(inputPath)) {
        console.warn(`File not found: ${fileConfig.name}`);
        return;
    }

    const fileStream = fs.createReadStream(inputPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lines = [];
    for await (const line of rl) {
        lines.push(line);
    }

    if (lines.length === 0) return;

    // Detect header line
    let headerIndex = -1;
    let headers = [];
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const row = parseCSVLine(lines[i]);
        // Looking for signatures of headers
        if (row.includes('Product Name') || row.includes('Category') || (row.includes('Building') && row.includes('Location'))) {
            headerIndex = i;
            headers = row;
            break;
        }
    }

    if (headerIndex === -1) {
        console.error(`Could not detect header for ${fileConfig.name}`);
        return;
    }

    console.log(`Processing ${fileConfig.name}. Header found at line ${headerIndex + 1}`);

    // Add columns to map for easier lookup (uppercase for case-insensitive matching)
    const headerMap = {};
    headers.forEach((h, idx) => {
        headerMap[h.trim()] = idx; // Keep original case for lookup
        headerMap[h.trim().toUpperCase()] = idx; // Add upper case
    });

    // Helper to get value securely
    const getValue = (row, colPatterns) => {
        if (!Array.isArray(colPatterns)) colPatterns = [colPatterns];
        for (const pattern of colPatterns) {
            const idx = headerMap[pattern.toUpperCase()];
            if (idx !== undefined && idx < row.length) {
                return row[idx];
            }
        }
        return '';
    };

    const standardizedRows = [];
    let debugCount = 0;

    // Iterate data lines
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        if (line.replace(/,/g, '').trim() === '') continue; // Skip comma-only lines

        const row = parseCSVLine(line);
        if (row.length === 0) continue;

        const rawProduct = getValue(row, ['Product Name', 'Product']);
        const rawBuilding = getValue(row, 'Building');
        const rawFloor = getValue(row, ['Floor', 'Floor Name']);

        // 1. Determine Category
        let category = getValue(row, 'Category');
        if (!category) {
            category = fileConfig.type === 'FE' ? 'Fire Extinguisher' : 'Hydrant'; // Default based on file type
        }
        if (category.toLowerCase().includes('hydrant')) category = 'Hydrant';
        else if (category.toLowerCase().includes('extinguisher')) category = 'Fire Extinguisher';

        // 2. Product Standardization & Filtering
        let validProductConfig = null;
        let productConfigs = ALLOWED_PRODUCTS[category === 'Hydrant' ? 'Hydrant' : 'Fire Extinguisher'];

        if (!productConfigs) {
            if (debugCount < 3) console.log(`SKIP: Unknown category '${category}'`);
            continue;
        }

        for (const config of productConfigs) {
            if (config.names.length === 0) {
                validProductConfig = config;
                break;
            }
            if (config.names.some(n => rawProduct.toUpperCase().includes(n.toUpperCase()))) {
                validProductConfig = config;
                break;
            }
        }

        if (!validProductConfig) {
            if (debugCount < 5) {
                console.log(`SKIP: Product mismatch. Raw: '${rawProduct}', Cat: '${category}'`);
                debugCount++;
            }
            continue;
        }

        const standardProduct = validProductConfig.target;
        let standardType = validProductConfig.type || getValue(row, 'Type');
        let standardSubType = validProductConfig.subType || getValue(row, ['Sub Type', 'Sub-Type']);

        // FE Type Normalization
        if (category === 'Fire Extinguisher' && !validProductConfig.type) {
            const tUpper = (standardType || '').toUpperCase().trim();
            // CO2
            if (tUpper.includes('CO2') || tUpper.includes('CARBON DIOXIDE')) standardType = 'CO2';
            // Powders
            else if (tUpper === 'ABC' || tUpper === 'A.B.C') standardType = 'ABC';
            else if (tUpper === 'BC' || tUpper === 'B.C') standardType = 'BC';
            else if (tUpper === 'D') standardType = 'D';
            // Foam
            else if (tUpper.includes('AFFF') || tUpper.includes('FOAM')) standardType = 'AFFF-AR'; // Standardize on one
            // Clean Agent (Type)
            else if (tUpper.includes('FK') || tUpper.includes('5-1-12')) standardType = 'FK 5-1-12';
            else if (tUpper.includes('HFC') || tUpper.includes('36')) standardType = 'HFC 236 fa';
            // Default normalization (Title Case or Upper)
            else standardType = standardType; // Leave as-is if no rule match
        }

        // FE SubType Normalization
        if (category === 'Fire Extinguisher' && !validProductConfig.subType) {
            const sUpper = (standardSubType || '').toUpperCase().trim();
            if (sUpper.includes('PORTABLE')) standardSubType = 'Portable';
            else if (sUpper.includes('TROLLEY')) standardSubType = 'Trolley Mounted';
            else if (sUpper.includes('CEILING')) standardSubType = 'Ceiling Mounted';
        }

        // 3. Building/Floor Standardization & Filtering
        const standardBuilding = normalizeBuilding(rawBuilding);
        const standardFloor = normalizeFloor(rawFloor);

        const validBuildings = PLANT_STRUCTURE[fileConfig.plantName];
        if (!validBuildings) {
            if (debugCount < 5) console.log(`SKIP: No structure for plant '${fileConfig.plantName}'`);
            continue;
        }

        let isLocationValid = false;
        if (validBuildings[standardBuilding]) {
            if (standardFloor) {
                if (validBuildings[standardBuilding].includes(standardFloor)) {
                    isLocationValid = true;
                } else {
                    if (debugCount < 5) {
                        console.log(`SKIP: Floor invalid. Plant: ${fileConfig.plantName}, Bldg: ${standardBuilding}, Floor: '${standardFloor}' (Raw: ${rawFloor})`);
                        debugCount++;
                    }
                }
            } else {
                // Missing Floor
                if (fileConfig.type === 'FE') {
                    // Relaxed for FE
                    isLocationValid = true;
                } else {
                    if (debugCount < 5) {
                        console.log(`SKIP: Missing Floor. Plant: ${fileConfig.plantName}, Bldg: ${standardBuilding}, RawFloor: '${rawFloor}'`);
                        debugCount++;
                    }
                }
            }
        } else {
            if (debugCount < 5) {
                console.log(`SKIP: Building invalid. Plant: ${fileConfig.plantName}, Bldg: '${standardBuilding}' (Raw: ${rawBuilding})`);
                debugCount++;
            }
        }

        if (!isLocationValid) continue;

        // Construct New Row
        const newRow = {};
        newRow['Plant'] = fileConfig.plantName;
        newRow['Building'] = standardBuilding;
        newRow['Floor'] = standardFloor || 'Unknown'; // Default if passed validation via relaxation
        newRow['Wing'] = getValue(row, 'Wing');
        newRow['Location'] = getValue(row, 'Location');
        newRow['Category'] = category;
        newRow['Product'] = standardProduct;
        newRow['Type'] = standardType;
        newRow['Sub Type'] = standardSubType;

        const condition = getValue(row, ['Condition', 'Asset Status']);
        const status = getValue(row, 'Status');
        newRow['Maintenance Status'] = condition || status;

        newRow['Tag'] = getValue(row, 'Tag');
        newRow['Lifespan Years'] = getValue(row, 'Lifespan Years');
        newRow['Manufacturing Date'] = getValue(row, 'Mfg Date');

        const installDate = getValue(row, ['Installation Date', 'Installation Year']);
        newRow['Installation Date'] = installDate;

        newRow['Warranty End Date'] = getValue(row, 'Warranty End Date');
        newRow['Manufacturer'] = getValue(row, ['Make', 'Manufacturer']);
        newRow['Model'] = getValue(row, 'Model');
        newRow['SL No / Part No'] = getValue(row, ['Serial No', 'SL No / Part No', 'Serial Number']);

        const outputRow = TARGET_HEADER.map(col => newRow[col] || '');
        standardizedRows.push(outputRow);
    }

    const outputContent = [
        arrayToCSVLine(TARGET_HEADER),
        ...standardizedRows.map(r => arrayToCSVLine(r))
    ].join('\n');

    fs.writeFileSync(outputPath, outputContent);
    console.log(`Created ${outputPath} with ${standardizedRows.length} rows.`);
}

async function main() {
    if (!fs.existsSync(CSV_DIR)) {
        console.error(`Directory not found: ${CSV_DIR}`);
        return;
    }

    for (const file of FILES_TO_PROCESS) {
        await processFile(file);
    }
    console.log('All files processed.');
}

main().catch(console.error);
