const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../CSV/questions_maintenance.csv');

const PLANTS = [
    'Orion Manufacturing Unit',
    'Nova Pharma Labs',
    'Vertex Engineering Works',
    'Zenith FMCG Plant',
    'Bharath Science Foundation'
];

// Product Mapping: Water, Clean Agent, Fire Ext
const PRODUCT_MAP = {
    'ALL': 'Fire Ext',
    'Carbon Dioxide (CO2)': 'Fire Ext', // Mapping to Fire Ext as requested strict list
    'Clean Agent': 'Clean Agent',
    'Wet Chemical': 'Water'
};

const QUESTIONS_DATA = [
    {
        orig_product: 'ALL',
        service_type: 'Inspection',
        text: 'Is the fire extinguisher in its dedicated place and accessible?',
        condition: 'DISPLACED',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Inspection',
        text: 'Is the extinguisher free from physical damage or corrosion?',
        condition: 'CYLINDER_DAMAGED',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Inspection',
        text: 'Is the pressure gauge needle in the green zone?',
        condition: 'LOW_PRESSURE',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Inspection',
        text: 'Is the safety pin present and seal intact?',
        condition: 'SEAL_BROKEN',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Inspection',
        text: 'Is the hose and nozzle in good condition?',
        condition: 'HOSE_DAMAGED',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Testing',
        text: 'Is the extinguisher weight within permissible tolerance?',
        condition: 'UNDERWEIGHT',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Maintenance',
        text: 'Is the powder free from caking or compaction?',
        condition: 'POWDER_CAKED',
        std: 'NFPA'
    },
    {
        orig_product: 'ALL',
        service_type: 'Maintenance',
        text: 'Is the service tag updated and within due date?',
        condition: 'SERVICE_OVERDUE',
        std: 'NFPA'
    },
    // CO2
    {
        orig_product: 'Carbon Dioxide (CO2)',
        service_type: 'Inspection',
        text: 'Is the discharge horn free from cracks or damage?',
        condition: 'HORN_DAMAGED',
        std: 'NFPA'
    },
    {
        orig_product: 'Carbon Dioxide (CO2)',
        service_type: 'Testing',
        text: 'Is there any sign of leakage at the valve or horn?',
        condition: 'LEAK_SUSPECTED',
        std: 'NFPA'
    },
    {
        orig_product: 'Carbon Dioxide (CO2)',
        service_type: 'Maintenance',
        text: 'Is the horn cleaned and properly refitted?',
        condition: 'CLEANING_PENDING',
        std: 'NFPA'
    },
    // Clean Agent
    {
        orig_product: 'Clean Agent',
        service_type: 'Maintenance',
        text: 'Is the seal replaced and extinguisher re-tampered?',
        condition: 'SEAL_NOT_REPLACED',
        std: 'NFPA'
    },
    // Wet Chemical
    {
        orig_product: 'Wet Chemical',
        service_type: 'Inspection',
        text: 'Is the extinguisher located near kitchen hazard and accessible?',
        condition: 'DISPLACED',
        std: 'NFPA'
    },
    {
        orig_product: 'Wet Chemical',
        service_type: 'Inspection',
        text: 'Is the hose/wand free from grease or blockage?',
        condition: 'NOZZLE_BLOCKED',
        std: 'NFPA'
    },
    {
        orig_product: 'Wet Chemical',
        service_type: 'Inspection',
        text: 'Is the pressure gauge in normal range?',
        condition: 'LOW_PRESSURE',
        std: 'NFPA'
    },
    {
        orig_product: 'Wet Chemical',
        service_type: 'Maintenance',
        text: 'Is the extinguisher cleaned of grease and oil residue?',
        condition: 'CLEANING_PENDING',
        std: 'NFPA'
    },
    {
        orig_product: 'Wet Chemical',
        service_type: 'Maintenance',
        text: 'Is the service tag updated and valid?',
        condition: 'SERVICE_OVERDUE',
        std: 'NFPA'
    }
];

const HEADERS = [
    'question_code', 'question_text', 'answer_type', 'service_type', 'plant_name',
    'categories', 'products', 'frequencies', 'is_mandatory', 'requires_photo',
    'requires_notes', 'help_text', 'standards', 'conditions'
];

const FREQUENCY_LIST = [
    'Daily', 'Weekly', 'Monthly', 'Quarterly',
    'Half Yearly', 'Yearly', '2 Years', '5 Years'
];

function getFrequency(serviceType) {
    // Select a random number of frequencies (1 to 4)
    const count = Math.floor(Math.random() * 4) + 1;

    // Pick unique indices
    const indices = new Set();
    while (indices.size < count) {
        indices.add(Math.floor(Math.random() * FREQUENCY_LIST.length));
    }

    // Sort indices to maintain logical order
    const sortedIndices = Array.from(indices).sort((a, b) => a - b);

    return sortedIndices.map(i => FREQUENCY_LIST[i]).join(', '); // Return as comma-separated string
}

function escapeCSV(field) {
    if (field === undefined || field === null) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function main() {
    const rows = [];
    rows.push(HEADERS.map(escapeCSV).join(','));

    for (const plant of PLANTS) {
        for (const item of QUESTIONS_DATA) {
            const product = PRODUCT_MAP[item.orig_product];
            const frequency = getFrequency(item.service_type);

            const row = [
                '', // question_code
                item.text, // question_text
                'condition', // answer_type
                item.service_type, // service_type
                plant, // plant_name
                'Fire Extinguisher', // categories
                product, // products
                frequency, // frequencies
                'true', // is_mandatory
                'false', // requires_photo
                'true', // requires_notes
                '', // help_text
                item.std, // standards
                item.condition // conditions
            ];
            rows.push(row.map(escapeCSV).join(','));
        }
    }

    fs.writeFileSync(OUTPUT_FILE, rows.join('\n'));
    console.log(`Generated ${OUTPUT_FILE} with ${rows.length - 1} data rows.`);
}

main();
