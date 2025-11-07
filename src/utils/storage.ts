interface Analysis {
  id: string;
  patientName: string;
  patientId?: string;
  doctorId: string;
  timestamp: string;
  originalImage: string;
  pressureImage: string;
  contourImage: string;
  condition: string;
  confidence: number;
  footMetrics: {
    length: number;
    width: number;
    staheli_index: number;
    chippaux_index: number;
    harris_index: number;
  };
}

const STORAGE_KEY = 'medicalFootAnalyses';

export const saveAnalysis = (analysis: Analysis): void => {
  const analyses = getAnalyses();
  analyses.push(analysis);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
};

export const getAnalyses = (): Analysis[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getAnalysesByPatientId = (patientId: string): Analysis[] => {
  const analyses = getAnalyses();
  return analyses.filter((a) => a.patientId === patientId);
};

export const getAnalysesByDoctorId = (doctorId: string): Analysis[] => {
  const analyses = getAnalyses();
  return analyses.filter((a) => a.doctorId === doctorId);
};
