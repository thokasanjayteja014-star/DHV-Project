import { DatasetConfig, MedicalPatient, CrimeSite, Customer, DataPoint } from "@shared/schema";

// Medical Dataset Configuration
export const medicalConfig: DatasetConfig = {
  id: 'medical',
  name: 'Medical Patients',
  icon: 'user',
  xAxis: { label: 'Blood Pressure (Systolic)', key: 'Blood_Pressure_Sys' },
  yAxis: { label: 'Temperature (°F)', key: 'Temperature_F' },
  availableAxes: [
    { label: 'Blood Pressure (Systolic)', key: 'Blood_Pressure_Sys', range: [115, 160] },
    { label: 'Blood Pressure (Diastolic)', key: 'Blood_Pressure_Dia', range: [75, 100] },
    { label: 'Temperature (°F)', key: 'Temperature_F', range: [97, 102.5] },
    { label: 'Sugar Level (mg/dL)', key: 'Sugar_Level_mg_dL', range: [85, 190] },
    { label: 'Age', key: 'Age', range: [20, 65] },
  ],
  tooltipFields: [
    { label: 'Age', key: 'Age', format: (v) => `${v} years` },
    { label: 'Temperature', key: 'Temperature_F', format: (v) => `${v}°F` },
    { label: 'BP (Sys/Dia)', key: 'Blood_Pressure_Sys', format: (v, data: any) => `${v}/${data.Blood_Pressure_Dia}` },
    { label: 'Sugar Level', key: 'Sugar_Level_mg_dL', format: (v) => `${v} mg/dL` },
  ],
  clusterColors: ['hsl(140, 65%, 50%)', 'hsl(48, 90%, 55%)', 'hsl(0, 75%, 55%)', 'hsl(220, 75%, 60%)'],
  getDiagnosis: (stats) => {
    const avgTemp = stats.Temperature_F || 0;
    const avgBP = stats.Blood_Pressure_Sys || 0;
    const avgSugar = stats.Sugar_Level_mg_dL || 0;
    const avgAge = stats.Age || 0;

    if (avgTemp > 100.5 && avgBP < 135) return 'Viral Infection Group';
    if (avgBP > 145 && avgSugar > 165) return 'Cardiac & Metabolic Risk';
    if (avgSugar > 150 && avgTemp < 99) return 'Metabolic Risk Group';
    if (avgAge > 55 && avgBP > 140) return 'Elderly Hypertension';
    if (avgTemp < 98.5 && avgSugar < 100) return 'Healthy Baseline';
    return 'Normal/Stable Group';
  },
  getStoryStep: (step: number, algorithm: 'agglomerative' | 'divisive') => {
    const agglomerativeStories = [
      "All patients arrive with unique symptoms and medical readings.",
      "Each patient is examined separately — every patient stands alone.",
      "Doctor compares profiles to find two patients with most similar conditions.",
      "Two similar patients are grouped together for similar treatment.",
      "Next closest pair of patients are grouped based on vital similarity.",
      "Small patient groups start merging into larger health clusters.",
      "Clusters represent different condition types — viral, normal, and metabolic risk.",
      "Merging continues until all patients connect into one medical network.",
      "Dendrogram shows how similar patients join together step by step.",
      "Doctor cuts the tree to focus on meaningful clusters requiring similar care."
    ];
    
    const divisiveStories = [
      "Hospital starts with all patients in one large group under observation.",
      "Doctors split the group into two — healthy and concerning patients.",
      "Focus on 'concerning' group to find differences in blood pressure and sugar.",
      "Group divided into subgroups — high-sugar vs high-fever patients.",
      "Each split reveals clearer distinctions among patient conditions.",
      "Doctors keep dividing until every patient has distinct health profile.",
      "Dendrogram represents this top-down diagnosis process.",
      "Doctor draws a line to identify critical clusters needing special care."
    ];
    
    return algorithm === 'agglomerative' 
      ? agglomerativeStories[Math.min(step, agglomerativeStories.length - 1)]
      : divisiveStories[Math.min(step, divisiveStories.length - 1)];
  },
};

// Crime Dataset Configuration
export const crimeConfig: DatasetConfig = {
  id: 'crime',
  name: 'Crime Sites',
  icon: 'map-pin',
  xAxis: { label: 'Longitude', key: 'Longitude' },
  yAxis: { label: 'Latitude', key: 'Latitude' },
  availableAxes: [
    { label: 'Longitude', key: 'Longitude', range: [75.0, 80.0] },
    { label: 'Latitude', key: 'Latitude', range: [10.0, 13.5] },
    { label: 'Severity Level', key: 'Severity_Level', range: [1, 8] },
  ],
  tooltipFields: [
    { label: 'Crime Type', key: 'Crime_Type' },
    { label: 'Time', key: 'Time_of_Day' },
    { label: 'Severity', key: 'Severity_Level', format: (v) => `Level ${v}` },
    { label: 'Reported By', key: 'Reported_By' },
  ],
  clusterColors: ['hsl(355, 85%, 50%)', 'hsl(30, 85%, 55%)', 'hsl(55, 75%, 60%)', 'hsl(210, 85%, 55%)'],
  getDiagnosis: (stats) => {
    const avgSeverity = stats.Severity_Level || 0;
    const avgLat = stats.Latitude || 0;
    const avgLon = stats.Longitude || 0;
    
    if (avgSeverity >= 6) return 'High-Risk Crime Hotspot';
    if (avgSeverity >= 4 && avgSeverity < 6) return 'Medium-Risk Area';
    if (avgLat > 12 && avgLon > 78) return 'Northern Crime Zone';
    if (avgLat < 11 && avgLon < 76) return 'Southern Crime Zone';
    return 'Low-Risk Zone';
  },
  getStoryStep: (step: number, algorithm: 'agglomerative' | 'divisive') => {
    const agglomerativeStories = [
      "Every crime incident occurs independently across the city.",
      "Investigators treat each crime as a separate case initially.",
      "Analyze cases to find two incidents that are geographically and behaviorally similar.",
      "Two crime scenes are linked as potentially related cases.",
      "Investigation finds the next closest pair of similar crimes.",
      "Clusters of related crimes form — theft rings, assault zones, or fraud networks.",
      "City map begins to reveal crime hotspots.",
      "All incidents connect into one large citywide crime map.",
      "Dendrogram displays how small cases grew into major crime clusters.",
      "Police cut the dendrogram to isolate specific regional crime patterns."
    ];
    
    const divisiveStories = [
      "Police view all city crimes as one big dataset initially.",
      "Spot major differences — violent vs non-violent crimes — and split them apart.",
      "Within violent crimes, separate robbery, assault, and murder cases.",
      "Within non-violent crimes, split fraud and theft groups.",
      "Each split brings more clarity to the crime network.",
      "Every incident is isolated with its own crime type and location.",
      "Dendrogram tells a story from citywide crimes to specific cases.",
      "By cutting it, investigators focus on actionable clusters like theft hotspots."
    ];
    
    return algorithm === 'agglomerative' 
      ? agglomerativeStories[Math.min(step, agglomerativeStories.length - 1)]
      : divisiveStories[Math.min(step, divisiveStories.length - 1)];
  },
};

// Customer Dataset Configuration
export const customerConfig: DatasetConfig = {
  id: 'customer',
  name: 'Customer Segmentation',
  icon: 'shopping-bag',
  xAxis: { label: 'Annual Income ($k)', key: 'Annual_Income_kUSD' },
  yAxis: { label: 'Spending Score', key: 'Spending_Score' },
  availableAxes: [
    { label: 'Annual Income ($k)', key: 'Annual_Income_kUSD', range: [15, 70] },
    { label: 'Spending Score', key: 'Spending_Score', range: [20, 80] },
    { label: 'Age', key: 'Age', range: [22, 50] },
    { label: 'Loyalty Years', key: 'Loyalty_Years', range: [2, 10] },
  ],
  tooltipFields: [
    { label: 'Age', key: 'Age', format: (v) => `${v} years` },
    { label: 'Income', key: 'Annual_Income_kUSD', format: (v) => `$${v}k` },
    { label: 'Spending Score', key: 'Spending_Score', format: (v) => `${v}/100` },
    { label: 'Loyalty', key: 'Loyalty_Years', format: (v) => `${v} years` },
  ],
  clusterColors: ['hsl(280, 80%, 65%)', 'hsl(200, 75%, 60%)', 'hsl(330, 75%, 65%)', 'hsl(160, 70%, 55%)'],
  getDiagnosis: (stats) => {
    const avgIncome = stats.Annual_Income_kUSD || 0;
    const avgSpending = stats.Spending_Score || 0;
    const avgAge = stats.Age || 0;
    const avgLoyalty = stats.Loyalty_Years || 0;

    if (avgIncome > 60 && avgSpending < 40) return 'High-Income Conservative Shoppers';
    if (avgSpending > 70 && avgIncome < 40) return 'Fashion Forward Enthusiasts';
    if (avgIncome > 50 && avgSpending > 60) return 'High-Value Customers';
    if (avgAge > 45 && avgLoyalty > 5) return 'Loyal Mature Customers';
    if (avgAge < 30 && avgSpending > 60) return 'Young High Spenders';
    return 'Value-Conscious Shoppers';
  },
  getStoryStep: (step: number, algorithm: 'agglomerative' | 'divisive') => {
    const agglomerativeStories = [
      "Each customer has unique preferences and spending habits.",
      "Marketing team views every customer as a separate profile initially.",
      "Compare customers to find two with most similar income and spending behavior.",
      "Two customers grouped into a small segment for targeted offers.",
      "Similar pairs of customers start merging into larger segments.",
      "Clear patterns emerge — budget buyers, luxury shoppers, and loyal customers.",
      "Clusters represent well-defined customer groups.",
      "All profiles combine into a complete customer network.",
      "Dendrogram shows how unique buyers merge into audience segments.",
      "Marketers cut the tree to focus on most valuable customer groups."
    ];
    
    const divisiveStories = [
      "Company begins with all customers in one large group.",
      "First split into two — low-spending vs high-spending customers.",
      "Further divide each group based on loyalty and income.",
      "Segmentation continues until each buyer profile is unique.",
      "Each new split uncovers deeper behavioral differences.",
      "Patterns like 'occasional buyers' or 'premium shoppers' emerge.",
      "Dendrogram visually narrates this top-down segmentation journey.",
      "Marketing team cuts it at optimal depth to target profitable segments."
    ];
    
    return algorithm === 'agglomerative' 
      ? agglomerativeStories[Math.min(step, agglomerativeStories.length - 1)]
      : divisiveStories[Math.min(step, divisiveStories.length - 1)];
  },
};

export const DATASET_CONFIGS: Record<string, DatasetConfig> = {
  medical: medicalConfig,
  crime: crimeConfig,
  customer: customerConfig,
};

// Load CSV data - Medical Patients Dataset
export const medicalData: MedicalPatient[] = [
  { Patient_ID: 'P1', Age: 25, Temperature_F: 98.6, Blood_Pressure_Sys: 120, Blood_Pressure_Dia: 80, Sugar_Level_mg_dL: 90, Symptoms: 'Mild fever, fatigue' },
  { Patient_ID: 'P2', Age: 27, Temperature_F: 99.1, Blood_Pressure_Sys: 118, Blood_Pressure_Dia: 78, Sugar_Level_mg_dL: 95, Symptoms: 'Mild fever, cough' },
  { Patient_ID: 'P3', Age: 35, Temperature_F: 101.5, Blood_Pressure_Sys: 130, Blood_Pressure_Dia: 85, Sugar_Level_mg_dL: 100, Symptoms: 'High fever, body pain' },
  { Patient_ID: 'P4', Age: 50, Temperature_F: 97.8, Blood_Pressure_Sys: 140, Blood_Pressure_Dia: 90, Sugar_Level_mg_dL: 160, Symptoms: 'Normal, slight fatigue' },
  { Patient_ID: 'P5', Age: 52, Temperature_F: 98.2, Blood_Pressure_Sys: 135, Blood_Pressure_Dia: 88, Sugar_Level_mg_dL: 155, Symptoms: 'Normal, mild headache' },
  { Patient_ID: 'P6', Age: 48, Temperature_F: 102.0, Blood_Pressure_Sys: 145, Blood_Pressure_Dia: 92, Sugar_Level_mg_dL: 170, Symptoms: 'High fever, cough, fatigue' },
  { Patient_ID: 'P7', Age: 60, Temperature_F: 100.8, Blood_Pressure_Sys: 150, Blood_Pressure_Dia: 95, Sugar_Level_mg_dL: 180, Symptoms: 'High BP, high sugar' },
  { Patient_ID: 'P8', Age: 62, Temperature_F: 101.2, Blood_Pressure_Sys: 155, Blood_Pressure_Dia: 98, Sugar_Level_mg_dL: 185, Symptoms: 'High BP, high sugar, dizziness' },
];

export const crimeData: CrimeSite[] = [
  // Updated crime dataset with new coordinates
  { Crime_ID: 'C1', Latitude: 10.1, Longitude: 75.2, Crime_Type: 'Theft', Time_of_Day: 'Unknown', Severity_Level: 3, Reported_By: 'Unknown' },
  { Crime_ID: 'C2', Latitude: 10.5, Longitude: 76.1, Crime_Type: 'Assault', Time_of_Day: 'Unknown', Severity_Level: 6, Reported_By: 'Unknown' },
  { Crime_ID: 'C3', Latitude: 11.2, Longitude: 77.3, Crime_Type: 'Burglary', Time_of_Day: 'Unknown', Severity_Level: 4, Reported_By: 'Unknown' },
  { Crime_ID: 'C4', Latitude: 10.8, Longitude: 75.8, Crime_Type: 'Theft', Time_of_Day: 'Unknown', Severity_Level: 2, Reported_By: 'Unknown' },
  { Crime_ID: 'C5', Latitude: 12.1, Longitude: 78.2, Crime_Type: 'Fraud', Time_of_Day: 'Unknown', Severity_Level: 5, Reported_By: 'Unknown' },
  { Crime_ID: 'C6', Latitude: 11.5, Longitude: 76.9, Crime_Type: 'Assault', Time_of_Day: 'Unknown', Severity_Level: 7, Reported_By: 'Unknown' },
  { Crime_ID: 'C7', Latitude: 13.0, Longitude: 79.5, Crime_Type: 'Robbery', Time_of_Day: 'Unknown', Severity_Level: 8, Reported_By: 'Unknown' },
  { Crime_ID: 'C8', Latitude: 12.4, Longitude: 78.8, Crime_Type: 'Theft', Time_of_Day: 'Unknown', Severity_Level: 3, Reported_By: 'Unknown' },
  { Crime_ID: 'C9', Latitude: 11.0, Longitude: 77.0, Crime_Type: 'Fraud', Time_of_Day: 'Unknown', Severity_Level: 4, Reported_By: 'Unknown' },
];

export const customerData: Customer[] = [
  // Updated from customer_segmentation_small.csv (Annual_Income_k$→Annual_Income_kUSD, Purchase_Frequency→Loyalty_Years)
  { Customer_ID: 'CU1', Age: 22, Annual_Income_kUSD: 15, Spending_Score: 80, Loyalty_Years: 10, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU2', Age: 25, Annual_Income_kUSD: 20, Spending_Score: 75, Loyalty_Years: 9, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU3', Age: 28, Annual_Income_kUSD: 35, Spending_Score: 60, Loyalty_Years: 8, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU4', Age: 35, Annual_Income_kUSD: 40, Spending_Score: 50, Loyalty_Years: 6, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU5', Age: 40, Annual_Income_kUSD: 55, Spending_Score: 40, Loyalty_Years: 4, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU6', Age: 45, Annual_Income_kUSD: 60, Spending_Score: 30, Loyalty_Years: 3, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU7', Age: 50, Annual_Income_kUSD: 65, Spending_Score: 20, Loyalty_Years: 2, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU8', Age: 30, Annual_Income_kUSD: 25, Spending_Score: 70, Loyalty_Years: 8, Preferred_Category: 'Unknown' },
  { Customer_ID: 'CU9', Age: 38, Annual_Income_kUSD: 50, Spending_Score: 45, Loyalty_Years: 5, Preferred_Category: 'Unknown' },
];

export function convertToDataPoints(dataset: 'medical' | 'crime' | 'customer'): DataPoint[] {
  const config = DATASET_CONFIGS[dataset];
  
  switch (dataset) {
    case 'medical':
      return medicalData.map((patient) => ({
        id: patient.Patient_ID,
        x: (patient as any)[config.xAxis.key],
        y: (patient as any)[config.yAxis.key],
        data: patient,
      }));
    case 'crime':
      return crimeData.map((crime) => ({
        id: crime.Crime_ID,
        x: (crime as any)[config.xAxis.key],
        y: (crime as any)[config.yAxis.key],
        data: crime,
      }));
    case 'customer':
      return customerData.map((customer) => ({
        id: customer.Customer_ID,
        x: (customer as any)[config.xAxis.key],
        y: (customer as any)[config.yAxis.key],
        data: customer,
      }));
  }
}

export function convertToDataPointsWithAxes(dataset: 'medical' | 'crime' | 'customer', xAxisKey: string, yAxisKey: string): DataPoint[] {
  switch (dataset) {
    case 'medical':
      return medicalData.map((patient) => {
        const x = (patient as any)[xAxisKey];
        const y = (patient as any)[yAxisKey];
        if (typeof x !== 'number' || typeof y !== 'number') {
          console.warn(`Invalid coordinates for ${patient.Patient_ID}: x=${x}, y=${y}`);
          return null;
        }
        return {
          id: patient.Patient_ID,
          x: x,
          y: y,
          data: patient,
        };
      }).filter(Boolean) as DataPoint[];
    case 'crime':
      return crimeData.map((crime) => {
        const x = (crime as any)[xAxisKey];
        const y = (crime as any)[yAxisKey];
        if (typeof x !== 'number' || typeof y !== 'number') {
          console.warn(`Invalid coordinates for ${crime.Crime_ID}: x=${x}, y=${y}`);
          return null;
        }
        return {
          id: crime.Crime_ID,
          x: x,
          y: y,
          data: crime,
        };
      }).filter(Boolean) as DataPoint[];
    case 'customer':
      return customerData.map((customer) => {
        const x = (customer as any)[xAxisKey];
        const y = (customer as any)[yAxisKey];
        if (typeof x !== 'number' || typeof y !== 'number') {
          console.warn(`Invalid coordinates for ${customer.Customer_ID}: x=${x}, y=${y}`);
          return null;
        }
        return {
          id: customer.Customer_ID,
          x: x,
          y: y,
          data: customer,
        };
      }).filter(Boolean) as DataPoint[];
  }
}

// Dynamic cluster naming based on data analysis
export function getClusterName(
  dataset: 'medical' | 'crime' | 'customer',
  clusterIndex: number,
  totalClusters: number,
  stats: Record<string, number>,
  dataPoints: DataPoint[],
  clusterIndices: number[]
): string {
  if (dataset === 'medical') {
    return getMedicalClusterName(clusterIndex, totalClusters, stats, dataPoints, clusterIndices);
  } else if (dataset === 'crime') {
    return getCrimeClusterName(clusterIndex, totalClusters, stats, dataPoints, clusterIndices);
  } else if (dataset === 'customer') {
    return getCustomerClusterName(clusterIndex, totalClusters, stats, dataPoints, clusterIndices);
  }
  return `Cluster ${clusterIndex + 1}`;
}

// Medical cluster naming based on health patterns
function getMedicalClusterName(
  clusterIndex: number,
  totalClusters: number,
  stats: Record<string, number>,
  dataPoints: DataPoint[],
  clusterIndices: number[]
): string {
  const avgTemp = stats.Temperature_F || 0;
  const avgBPSys = stats.Blood_Pressure_Sys || 0;
  const avgSugar = stats.Sugar_Level_mg_dL || 0;
  const avgAge = stats.Age || 0;
  
  // Analyze cluster characteristics
  const highTemp = avgTemp > 100.5;
  const mildFever = avgTemp >= 99 && avgTemp <= 100.5;
  const normalTemp = avgTemp < 99;
  const highBP = avgBPSys > 145;
  const moderateBP = avgBPSys >= 135 && avgBPSys <= 145;
  const normalBP = avgBPSys < 135;
  const highSugar = avgSugar > 160;
  const moderateSugar = avgSugar >= 130 && avgSugar <= 160;
  const normalSugar = avgSugar < 130;
  const elderly = avgAge > 55;
  
  // Different names based on number of clusters (cut length)
  if (totalClusters === 1) {
    // Final merged cluster - all patients in one group
    return 'Mixed Symptoms Group';
  } else if (totalClusters === 2) {
    // Two broad groups: Metabolic/Diabetic Risk vs Normal/Stable Group
    if ((highBP && highSugar) || (moderateBP && moderateSugar) || highSugar) {
      return 'Metabolic/Diabetic Risk';
    }
    return 'Normal/Stable Group';
  } else if (totalClusters === 3) {
    // Three main health categories
    // Green cluster (index 0): P1, P2 - young with mild fever
    // Yellow cluster (index 1): P3, P4, P5 - mixed mild viral and metabolic
    // Red cluster (index 2): P6, P7, P8 - high fever or high BP+sugar
    
    if (highTemp && highBP && highSugar) {
      return 'Severe Condition';
    }
    if (highTemp && avgTemp >= 101 && !highBP && !highSugar) {
      return 'Mild Viral Infection';
    }
    if (mildFever && (moderateBP || moderateSugar)) {
      return 'Mild Viral and Metabolic Risk';
    }
    if (normalTemp && normalBP && normalSugar && avgAge < 35) {
      return 'Normal/Stable Group';
    }
    if ((moderateBP || highBP) && (moderateSugar || highSugar)) {
      return 'Mild Viral and Metabolic Risk';
    }
    return 'Moderate Condition';
  } else if (totalClusters === 4) {
    // Four detailed categories
    // Red cluster: Mild Viral Infection (high temp, low BP/sugar)
    // Green cluster: Metabolic Risk (high BP and/or high sugar, normal temp)
    
    if (highTemp && avgTemp >= 101 && normalBP && normalSugar) {
      return 'Mild Viral Infection';
    }
    if ((highBP || moderateBP) && (highSugar || moderateSugar) && normalTemp) {
      return 'Metabolic Risk';
    }
    if (normalTemp && normalBP && normalSugar && avgAge < 35) {
      return 'Normal/Stable Group';
    }
    if (mildFever && normalBP) {
      return 'Mild Fever Group';
    }
    return `Patient Group ${clusterIndex + 1}`;
  } else if (totalClusters >= 5) {
    // More granular classification
    if (highTemp && avgTemp > 101.5) {
      return 'Acute Fever Cases';
    }
    if (mildFever && normalBP) {
      return 'Mild Fever Group';
    }
    if (highBP && highSugar && elderly) {
      return 'Cardiac & Metabolic Risk';
    }
    if (highBP && !highSugar) {
      return 'Hypertension Only';
    }
    if (highSugar && !highBP && normalTemp) {
      return 'Diabetes Management';
    }
    if (normalTemp && normalBP && normalSugar) {
      return 'Baseline Healthy';
    }
    return `Clinical Group ${clusterIndex + 1}`;
  }
  
  return `Cluster ${clusterIndex + 1}`;
}

// Crime cluster naming based on location and severity
function getCrimeClusterName(
  clusterIndex: number,
  totalClusters: number,
  stats: Record<string, number>,
  dataPoints: DataPoint[],
  clusterIndices: number[]
): string {
  const avgSeverity = stats.Severity_Level || 0;
  const avgLat = stats.Latitude || 0;
  const avgLon = stats.Longitude || 0;
  
  // Get crime types in this cluster
  const crimeTypes = clusterIndices.map(i => {
    const point = dataPoints[i];
    return (point.data as CrimeSite).Crime_Type;
  });
  const dominantCrimeType = crimeTypes.length > 0 ? crimeTypes.reduce((a, b) => 
    crimeTypes.filter(v => v === a).length >= crimeTypes.filter(v => v === b).length ? a : b
  ) : '';
  
  const highSeverity = avgSeverity >= 6;
  const moderateSeverity = avgSeverity >= 4 && avgSeverity < 6;
  const lowSeverity = avgSeverity < 4;
  
  // Geographic classification
  const northern = avgLat > 11.5;
  const central = avgLat >= 10.5 && avgLat <= 11.5;
  const southern = avgLat < 10.5;
  const eastern = avgLon > 77.5;
  const western = avgLon < 76.5;
  
  if (totalClusters === 2) {
    if (highSeverity) {
      return 'High-Risk Crime Zone';
    }
    return 'Low-Risk Crime Zone';
  } else if (totalClusters === 3) {
    if (highSeverity) {
      return 'High-Risk Crime Hotspot';
    }
    if (moderateSeverity) {
      return 'Moderate-Risk Area';
    }
    if (lowSeverity) {
      return 'Low-Activity Zone';
    }
    return `Crime Zone ${clusterIndex + 1}`;
  } else if (totalClusters === 4) {
    // Geographic + severity
    if (northern && highSeverity) {
      return 'Northern Hotspot';
    }
    if (central && moderateSeverity) {
      return 'Downtown Crime Belt';
    }
    if (southern && lowSeverity) {
      return 'Peripheral Low Activity';
    }
    if (eastern) {
      return 'Eastern Suburban Zone';
    }
    return `Crime Area ${clusterIndex + 1}`;
  } else if (totalClusters >= 5) {
    // More specific classification
    if (highSeverity && dominantCrimeType === 'Robbery') {
      return 'Armed Robbery Hotspot';
    }
    if (highSeverity && (dominantCrimeType === 'Assault' || dominantCrimeType === 'Murder')) {
      return 'Violent Crime Zone';
    }
    if (moderateSeverity && dominantCrimeType === 'Burglary') {
      return 'Property Crime Area';
    }
    if (moderateSeverity && dominantCrimeType === 'Theft') {
      return 'Theft Cluster';
    }
    if (lowSeverity) {
      return 'Minor Incidents Area';
    }
    
    // Geographic specificity
    if (northern && eastern) {
      return 'Northeast Sector';
    }
    if (northern && western) {
      return 'Northwest Sector';
    }
    if (southern && eastern) {
      return 'Southeast Sector';
    }
    if (southern && western) {
      return 'Southwest Sector';
    }
    
    return `Crime Sector ${clusterIndex + 1}`;
  }
  
  return `Cluster ${clusterIndex + 1}`;
}

// Customer cluster naming based on spending behavior
function getCustomerClusterName(
  clusterIndex: number,
  totalClusters: number,
  stats: Record<string, number>,
  dataPoints: DataPoint[],
  clusterIndices: number[]
): string {
  const avgIncome = stats.Annual_Income_kUSD || 0;
  const avgSpending = stats.Spending_Score || 0;
  const avgAge = stats.Age || 0;
  const avgLoyalty = stats.Loyalty_Years || 0;
  
  const highIncome = avgIncome > 55;
  const moderateIncome = avgIncome >= 35 && avgIncome <= 55;
  const lowIncome = avgIncome < 35;
  
  const highSpending = avgSpending > 65;
  const moderateSpending = avgSpending >= 45 && avgSpending <= 65;
  const lowSpending = avgSpending < 45;
  
  const young = avgAge < 30;
  const middleAged = avgAge >= 30 && avgAge < 45;
  const mature = avgAge >= 45;
  
  const highLoyalty = avgLoyalty > 7;
  const moderateLoyalty = avgLoyalty >= 5 && avgLoyalty <= 7;
  
  if (totalClusters === 2) {
    if (highSpending) {
      return 'High-Value Customers';
    }
    return 'Budget Customers';
  } else if (totalClusters === 3) {
    if (highIncome && highSpending) {
      return 'Premium Loyal Customers';
    }
    if (moderateIncome && moderateSpending) {
      return 'Mid-Spending Regulars';
    }
    if (lowIncome || lowSpending) {
      return 'Budget Shoppers';
    }
    return `Customer Segment ${clusterIndex + 1}`;
  } else if (totalClusters === 4) {
    if (young && highSpending) {
      return 'Young Spenders';
    }
    if (middleAged && moderateSpending) {
      return 'Family-Oriented Buyers';
    }
    if (highIncome && lowSpending) {
      return 'High-Income Occasional';
    }
    if (lowIncome && lowSpending) {
      return 'Low-Income Rare Buyers';
    }
    return `Buyer Group ${clusterIndex + 1}`;
  } else if (totalClusters >= 5) {
    // Very specific segments
    if (young && highSpending && lowIncome) {
      return 'Fashion Forward Youth';
    }
    if (highIncome && highSpending && highLoyalty) {
      return 'VIP Luxury Buyers';
    }
    if (highIncome && lowSpending) {
      return 'Conservative Savers';
    }
    if (mature && highLoyalty) {
      return 'Loyal Mature Customers';
    }
    if (middleAged && moderateIncome && moderateSpending) {
      return 'Mainstream Shoppers';
    }
    if (lowIncome && highSpending) {
      return 'Aspirational Spenders';
    }
    if (lowIncome && lowSpending) {
      return 'Bargain Hunters';
    }
    return `Market Segment ${clusterIndex + 1}`;
  }
  
  return `Cluster ${clusterIndex + 1}`;
}
