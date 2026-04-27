const bmIssueTypes = {
  Breakdown: [
    "Pump Not Working",
    "Valve Leakage (Major)",
    "Motor Trip / Failure",
    "Electrical Panel Failure",
    "Alarm Panel Not Working",
    "Detector Not Working",
    "Pressure Loss / No Pressure",
    "Pipe Leakage / Burst",
    "Control System Failure",
    "Communication Failure (IoT / Network)",
    "Battery Failure (Critical Systems)",
    "Valve Not Operating",
  ],
  Compliance: [
    "Hydrostatic Pressure Testing",
    "Fire Extinguisher Refilling",
    "Fire Alarm Testing",
    "Sprinkler Testing",
    "Battery Load Testing",
    "Earthing Testing",
    "Emergency Lighting Testing",
    "Exit Signage Check",
  ]
};

module.exports = bmIssueTypes;
