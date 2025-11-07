import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  LogOut,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { saveAnalysis, getAnalysesByPatientId, getAnalysesByDoctorId } from '../utils/storage';
import axios from 'axios';
import '../styles/analysis.css';

interface FootMetrics {
  length: number;
  width: number;
  staheli_index: number;
  chippaux_index: number;
  harris_index: number;
}

interface AnalysisResult {
  condition: string;
  confidence: number;
}

interface SavedAnalysis {
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
  footMetrics: FootMetrics;
}

function Analysis() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pressureImage, setPressureImage] = useState<string | null>(null);
  const [grayscaleImage, setGrayscaleImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [footMetrics, setFootMetrics] = useState<FootMetrics | null>(null);
  const [patientName, setPatientName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<SavedAnalysis[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userType, userId, userName, logout } = useAuth();
  const navigate = useNavigate();

  // ✅ Modified useEffect — now fetches reports from backend for patients
  useEffect(() => {
    loadHistory();

    const fetchPatientReports = async () => {
      if (userType === 'patient' && userName) {
        try {
          const response = await axios.get(`http://localhost:5000/get_reports/${userName}`);
          const reports = response.data;
          if (Array.isArray(reports) && reports.length > 0) {
            const latestReport = reports[reports.length - 1];

            const formatted: SavedAnalysis = {
              id: `report_${Date.now()}`,
              patientName: latestReport.patient_name,
              doctorId: 'unknown',
              timestamp: latestReport.timestamp,
              originalImage: `http://localhost:5000${latestReport.original_scan}`,
              pressureImage: `http://localhost:5000${latestReport.pressure_heatmap}`,
              contourImage: `http://localhost:5000${latestReport.contour_heatmap}`,
              condition: latestReport.prediction,
              confidence: latestReport.confidence,
              footMetrics: {
                length: latestReport.foot_length_cm,
                width: latestReport.foot_width_cm,
                staheli_index: latestReport.staheli_index,
                chippaux_index: latestReport.chippaux_index,
                harris_index: latestReport.harris_index,
              },
            };
            setAnalysisHistory([ formatted]);
            loadHistoricalAnalysis(formatted);
          }
          console.log(analysisHistory)
        } catch (err) {
          console.error('Error fetching reports:', err);
        }
      }
    };

    fetchPatientReports();
  }, [userId, userType, userName]);

  const loadHistory = () => {
    if (!userId) return;
    const history =
      userType === 'doctor'
        ? getAnalysesByDoctorId(userId)
        : getAnalysesByPatientId(userId);
    setAnalysisHistory(history);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const validateImage = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPEG or PNG image');
      return false;
    }
    if (file.size > maxSize) {
      setError('Image size should be less than 5MB');
      return false;
    }
    return true;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!validateImage(file)) return;

    if (userType === 'doctor' && !patientName.trim()) {
      setError('Please enter patient name before uploading');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setUploadProgress(0);
      setAnalysisResult(null);
      setFootMetrics(null);
      setPressureImage(null);
      setGrayscaleImage(null);

      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('image', file);
      if (userType === 'doctor') {
        formData.append('patient_name', patientName);
      }

      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      const {
        pressure_heatmap,
        contour_heatmap,
        prediction,
        confidence,
        foot_length_cm,
        foot_width_cm,
        staheli_index,
        chippaux_index,
        harris_index,
      } = response.data;

      const formatImage = (imgUrl: string) => {
        if (
          typeof imgUrl === 'string' &&
          (imgUrl.startsWith('/') || imgUrl.startsWith('http'))
        ) {
          return `http://localhost:5000${imgUrl}`;
        }
        return null;
      };

      const pressureImgUrl = formatImage(pressure_heatmap);
      const contourImgUrl = formatImage(contour_heatmap);

      setPressureImage(pressureImgUrl);
      setGrayscaleImage(contourImgUrl);
      setAnalysisResult({ condition: prediction, confidence });

      const metrics: FootMetrics = {
        length: foot_length_cm,
        width: foot_width_cm,
        staheli_index,
        chippaux_index,
        harris_index,
      };
      setFootMetrics(metrics);
      setUploadProgress(100);

      const analysis: SavedAnalysis = {
        id: `analysis_${Date.now()}`,
        patientName: userType === 'doctor' ? patientName : userName || 'Unknown',
        patientId: userType === 'patient' ? userId! : undefined,
        doctorId: userType === 'doctor' ? userId! : 'self',
        timestamp: new Date().toISOString(),
        originalImage: reader.result as string,
        pressureImage: pressureImgUrl || '',
        contourImage: contourImgUrl || '',
        condition: prediction,
        confidence,
        footMetrics: metrics,
      };

      saveAnalysis(analysis);
      loadHistory();
    } catch (err) {
      const errorMessage =
        (err as any).response?.data?.error ||
        (err as Error).message ||
        'Error processing image';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (pressureImage) {
      const link = document.createElement('a');
      link.href = pressureImage;
      link.download = `foot-pressure-analysis-${new Date().toISOString()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getSuggestions = (condition: string): string[] => {
    switch (condition) {
      case 'Pes_Planus':
        return [
          'Use arch supports or custom orthotics.',
          'Strengthen foot and ankle muscles with toe curls and heel raises.',
          'Avoid prolonged standing or walking on hard surfaces.',
          'Consider physical therapy if pain persists.',
        ];
      case 'Pes_Cavus':
        return [
          'Use cushioned insoles or supportive shoes.',
          'Stretch tight calf and foot muscles regularly.',
          'Limit high-impact activities like running if painful.',
          'Consult a specialist if there\'s frequent ankle sprain.',
        ];
      case 'Normal_Arch':
        return [
          'Maintain good posture and foot hygiene.',
          'Wear well-fitted and supportive footwear.',
          'Do occasional arch and ankle strengthening exercises.',
          'No corrective action needed unless discomfort arises.',
        ];
      default:
        return ['No suggestions available.'];
    }
  };

  const loadHistoricalAnalysis = (analysis: SavedAnalysis) => {
    setSelectedImage(analysis.originalImage);
    setPressureImage(analysis.pressureImage);
    setGrayscaleImage(analysis.contourImage);
    setAnalysisResult({
      condition: analysis.condition,
      confidence: analysis.confidence,
    });
    setFootMetrics(analysis.footMetrics);
    setPatientName(analysis.patientName);
    setShowHistory(false);
  };

  return (
    <div className="analysis-container">
      <header className="analysis-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-icon">
              <ImageIcon className="icon" />
            </div>
            <div>
              <h1>Foot Pressure Analysis</h1>
              <p>
                Logged in as {userType === 'doctor' ? 'Doctor' : 'Patient'} -{' '}
                {userName}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="history-button"
            >
              <History className="history-icon" />
              History
            </button>
            <button onClick={handleLogout} className="logout-button">
              <LogOut className="logout-icon" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {showHistory && (
        <div className="history-panel">
          <div className="history-content">
            <h2>Analysis History</h2>
            {analysisHistory.length === 0 ? (
              <p className="empty-history">No analysis history found</p>
            ) : (
              <div className="history-list">
                {analysisHistory.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="history-item"
                    onClick={() => loadHistoricalAnalysis(analysis)}
                  >
                    <img
                      src={analysis.originalImage || analysis.pressureImage}
                      alt="Historical scan"
                      className="history-thumbnail"
                    />
                    <div className="history-details">
                      <h3>{analysis.patientName}</h3>
                      <p>Condition: {analysis.condition}</p>
                      <p className="history-date">
                        {new Date(analysis.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="analysis-main">
        <div className="analysis-card">
          {userType === 'doctor' && (
            <>
              <div className="patient-name-section">
                <label htmlFor="patient-name">Patient Name</label>
                <input
                  id="patient-name"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="patient-name-input"
                  disabled={isProcessing}
                />
              </div>

              <div className="upload-section">
                <div className="upload-container">
                  <label htmlFor="image-upload" className="upload-label">
                    <div className="upload-content">
                      {isProcessing ? (
                        <>
                          <div className="upload-progress">
                            <div
                              className="progress-bar"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="upload-text">
                            Uploading: {uploadProgress}%
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon-container">
                            <Upload className="upload-icon" />
                          </div>
                          <p className="upload-text">
                            <span>Click to upload</span> or drag and drop
                          </p>
                          <p className="upload-subtext">PNG or JPEG (Max 5MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="upload-input"
                      accept="image/jpeg,image/png"
                      onChange={handleImageUpload}
                      ref={fileInputRef}
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle className="error-icon" />
                  <p>{error}</p>
                </div>
              )}
            </>
          )}

          {userType === 'patient' && analysisHistory.length === 0 && (
            <div className="no-reports-message">
              <AlertCircle className="info-icon" />
              <h2>No Reports Available</h2>
              <p>
                You don't have any analysis reports yet. Please visit your
                doctor to get your foot analysis done.
              </p>
            </div>
          )}

          <div className="image-grid">
            <div className="image-preview">
              <h2>Original Scan</h2>
              <div className="image-container">
                {
                selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Original foot scan"
                    className="preview-image"
                  />
                ) : (
                  <div className="empty-state">No image uploaded</div>
                )}
              </div>
            </div>

            <div className="image-preview">
              <h2>Pressure Image</h2>
              <div className="image-container">
                {isProcessing ? (
                  <div className="loading-state">
                    <Loader2 className="loading-icon" />
                    <p>Processing image...</p>
                  </div>
                ) : pressureImage ? (
                  <img
                    src={pressureImage}
                    alt="Pressure image"
                    className="preview-image"
                  />
                ) : (
                  <div className="empty-state">No pressure image available</div>
                )}
              </div>
            </div>

            <div className="image-preview">
              <h2>Contour Image</h2>
              <div className="image-container">
                {isProcessing ? (
                  <div className="loading-state">
                    <Loader2 className="loading-icon" />
                    <p>Processing image...</p>
                  </div>
                ) : grayscaleImage ? (
                  <img
                    src={grayscaleImage}
                    alt="Grayscale image"
                    className="preview-image"
                  />
                ) : (
                  <div className="empty-state">No grayscale image available</div>
                )}
              </div>
            </div>
          </div>

          {analysisResult && (
            <div className="analysis-result">
              <h2>Analysis Result</h2>
              <p>
                <strong>Condition: </strong>
                {analysisResult.condition}
              </p>
              {footMetrics && (
                <div className="foot-metrics">
                  <h3>Foot Metrics</h3>
                  <p>
                    <strong>Length:</strong> {footMetrics.length} cm
                  </p>
                  <p>
                    <strong>Width:</strong> {footMetrics.width} cm
                  </p>
                  <p>
                    <strong>Staheli Index:</strong> {footMetrics.staheli_index}
                  </p>
                  <p>
                    <strong>Chippaux Index:</strong>{' '}
                    {footMetrics.chippaux_index / 100}
                  </p>
                  <p>
                    <strong>Harris Index:</strong> {footMetrics.harris_index}
                  </p>
                </div>
              )}

              <h3>Recommendations</h3>
              <ul className="suggestion-list">
                {getSuggestions(analysisResult.condition).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <button className="download-button" onClick={handleDownload}>
                <Download className="download-icon" /> Download Pressure Image
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Analysis;
