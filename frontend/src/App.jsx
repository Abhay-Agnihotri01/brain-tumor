import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import Auth from './Auth'
import './index.css'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('mri_token') || null)
  const [userName, setUserName] = useState(localStorage.getItem('mri_user_name') || '')
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('mri_is_admin') === 'true')
  const [isAuthenticated, setIsAuthenticated] = useState(!!token)
  
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode')
    } else {
      document.body.classList.add('light-mode')
    }
  }, [isDarkMode])
  
  const [activeTab, setActiveTab] = useState('upload') // 'upload' or 'history'
  const [history, setHistory] = useState([])

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [barWidth, setBarWidth] = useState(0)
  const inputRef = useRef()

  function handleLogin(jwt, name, adminStatus) {
    setToken(jwt)
    setUserName(name)
    setIsAdmin(adminStatus)
    setIsAuthenticated(true)
  }

  function handleLogout() {
    localStorage.removeItem('mri_token')
    localStorage.removeItem('mri_user_name')
    localStorage.removeItem('mri_is_admin')
    setToken(null)
    setUserName('')
    setIsAdmin(false)
    setIsAuthenticated(false)
  }

  const [adminData, setAdminData] = useState({ users: [], records: [] })

  async function fetchHistory() {
    try {
      const res = await axios.get('http://localhost:5000/api/history', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHistory(res.data)
    } catch (err) {
      console.error('Failed to fetch history', err)
      if (err.response && err.response.status === 401) {
        handleLogout()
      }
    }
  }

  async function fetchAdminData() {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/all_data', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAdminData(res.data)
    } catch (err) {
      console.error('Failed to fetch admin data', err)
      if (err.response && err.response.status === 401) {
        handleLogout()
      }
    }
  }

  useEffect(() => {
    if (activeTab === 'history' && token) {
      fetchHistory()
    } else if (activeTab === 'admin' && token && isAdmin) {
      fetchAdminData()
    }
  }, [activeTab, token, isAdmin])

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setResult(null)
    setBarWidth(0)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function analyze() {
    if (!file || loading) return
    setLoading(true)
    setResult(null)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await axios.post('http://localhost:5000/predict', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(res.data)
      setTimeout(() => setBarWidth(res.data.confidence), 100)
    } catch (err) {
      console.error(err)
      if (err.response && err.response.status === 401) {
        handleLogout()
      } else {
        alert('Something went wrong. Make sure the Flask server is running.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />
  }

  return (
    <div className="app">

      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-logo">🧠</div>
        <div>
          <div className="header-title">Brain Tumor Detector</div>
          <div className="header-sub">AI-powered MRI Analysis · Convolutional Neural Network</div>
        </div>

        <div className="header-nav">
          <button className={`nav-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>Upload Scan</button>
          <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>My Dashboard</button>
          {isAdmin && (
            <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin Panel</button>
          )}
        </div>

        <div className="header-actions">
          <button className="theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <span className="user-greeting">Hi, {userName.split(' ')[0]}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="main">

        {activeTab === 'upload' && (
          <>
            {/* Hero */}
            <div className="hero">
              <h1>Detect Brain Tumors<br />with AI Precision</h1>
              <p>Upload a Brain MRI scan and our CNN model will analyze it instantly to detect the presence of a tumor.</p>
            </div>

            {/* Features */}
            <div className="features-section">
              <div className="features-header">
                <h2>Why Choose Brain Tumor Detector?</h2>
                <p>Our platform uses state-of-the-art deep learning to provide fast and reliable insights.</p>
              </div>
              <div className="features-grid">
                {[
                  { icon: '⚡', title: 'Lightning Fast', desc: 'Get your MRI scan analyzed in seconds, giving you immediate preliminary results.' },
                  { icon: '🎯', title: 'High Accuracy', desc: 'Powered by a custom Convolutional Neural Network trained on thousands of scans.' },
                  { icon: '🔒', title: 'Secure & Private', desc: 'Your scans and data are securely stored and only accessible to you in your dashboard.' },
                ].map(f => (
                  <div className="feature-card" key={f.title}>
                    <div className="feature-icon">{f.icon}</div>
                    <div className="feature-title">{f.title}</div>
                    <div className="feature-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              {[
                { icon: '🎯', value: '89%',  label: 'Test Accuracy' },
                { icon: '📊', value: '0.88', label: 'F1 Score' },
                { icon: '✅', value: '91%',  label: 'Val Accuracy' },
                { icon: '🖼️', value: '2065', label: 'Training Images' },
              ].map(s => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Upload Section */}
            <div className="upload-section">

              {/* Drop Zone */}
              <div
                className={`drop-zone ${dragging ? 'dragging' : ''}`}
                onClick={() => inputRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input ref={inputRef} type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />

                {preview ? (
                  <div className="preview-box">
                    <img src={preview} alt="preview" />
                    <div className="preview-name">✅ {file.name}</div>
                    <div className="preview-change">Click to change image</div>
                  </div>
                ) : (
                  <>
                    <div className="drop-zone-icon">📂</div>
                    <h3>Drop your MRI image here</h3>
                    <p>or click to browse from your computer</p>
                    <div className="format-tags">
                      {['JPG', 'JPEG', 'PNG', 'BMP'].map(f => (
                        <span className="format-tag" key={f}>{f}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Info + Button Panel */}
              <div className="upload-info">
                <h3>How it works</h3>
                <div className="info-steps">
                  {[
                    ['01', 'Upload', 'Select or drag & drop a Brain MRI image in JPG, PNG or JPEG format.'],
                    ['02', 'Preprocess', 'The image is cropped to the brain region and resized to 240×240px.'],
                    ['03', 'Analyze', 'Our CNN model runs inference and returns a prediction with confidence score.'],
                    ['04', 'Result', 'View the processed scan alongside the tumor detection result.'],
                  ].map(([num, title, desc]) => (
                    <div className="info-step" key={num}>
                      <div className="step-num">{num}</div>
                      <div className="step-text"><strong>{title} — </strong>{desc}</div>
                    </div>
                  ))}
                </div>

                {file && !loading && (
                  <button className="analyze-btn" onClick={analyze}>
                    🔍 &nbsp; Analyze MRI Scan
                  </button>
                )}

                {loading && (
                  <div className="spinner-wrap">
                    <div className="spinner" />
                    <div className="spinner-text">Analyzing MRI scan...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="results-section">

                {/* Processed Image */}
                <div className="result-image-panel">
                  <div className="panel-label">📷 Processed MRI Scan</div>
                  <img src={`data:image/jpeg;base64,${result.processed_image}`} alt="processed MRI" />
                  <div className="image-tags">
                    <span className="image-tag">240 × 240 px</span>
                    <span className="image-tag">Brain Cropped</span>
                    <span className="image-tag">Normalized</span>
                  </div>
                </div>

                {/* Result Panel */}
                <div className="result-panel">
                  <div className="panel-label">🔬 Analysis Result</div>

                  {/* Verdict */}
                  <div className={`result-verdict ${result.tumor ? 'tumor' : 'no-tumor'}`}>
                    <div className="verdict-icon">
                      {result.tumor ? '⚠️' : '✅'}
                    </div>
                    <div className="verdict-text">
                      <h2>{result.label}</h2>
                      <p>{result.tumor
                        ? 'Tumor indicators detected in the MRI scan.'
                        : 'No tumor indicators found in the MRI scan.'
                      }</p>
                    </div>
                  </div>

                  {/* Tumor Type and Precautions */}
                  {result.tumor && result.tumor_type && (
                    <div className="tumor-details">
                      <div className="tumor-type-box">
                        <span className="type-label">Detected Type:</span>
                        <span className="type-value">{result.tumor_type}</span>
                      </div>
                      <div className="precautions-box">
                        <div className="precautions-header">
                          <span className="precautions-icon">📋</span>
                          <span className="precautions-title">Recommended Precautions</span>
                        </div>
                        <ul className="precautions-list">
                          {result.precautions && result.precautions.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Confidence Bar */}
                  <div className="confidence-section">
                    <div className="confidence-header">
                      <span>Confidence Score</span>
                      <span className="confidence-pct">{result.confidence}%</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${result.tumor ? 'tumor' : 'no-tumor'}`}
                        style={{ width: barWidth + '%' }}
                      />
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="info-grid">
                    {[
                      ['Model', 'CNN (Custom)'],
                      ['Input Size', '240 × 240 px'],
                      ['Preprocessing', 'Crop + Normalize'],
                      ['Architecture', 'Conv → BN → ReLU → Pool'],
                    ].map(([label, value]) => (
                      <div className="info-card" key={label}>
                        <div className="info-card-label">{label}</div>
                        <div className="info-card-value">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Disclaimer */}
                  <div className="disclaimer">
                    ⚠️&nbsp; <span>For educational purposes only. Always consult a qualified medical professional for diagnosis.</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dashboard History */}
        {activeTab === 'history' && (
          <div className="dashboard-section slide-in">
            <div className="dashboard-header">
              <h2>My MRI Scans Dashboard</h2>
              <p>View your previous uploads and detection results.</p>
            </div>
            
            <div className="history-grid">
              {history.length === 0 ? (
                <div className="no-history">
                  <div className="no-history-icon">📂</div>
                  <h3>No Scans Yet</h3>
                  <p>Upload your first MRI scan to see the history here.</p>
                  <button className="analyze-btn" style={{marginTop: '20px', width: 'auto', padding: '12px 24px'}} onClick={() => setActiveTab('upload')}>Go to Upload</button>
                </div>
              ) : (
                history.map(item => (
                  <div className="history-card" key={item.id}>
                    <div className="history-img-wrap">
                      <img src={item.image_path} alt="MRI Scan" />
                      <div className={`history-badge ${item.tumor_detected ? 'tumor' : 'no-tumor'}`}>
                        {item.tumor_detected ? '⚠️ Tumor Detected' : '✅ No Tumor'}
                      </div>
                    </div>
                    <div className="history-details">
                      <div className="history-date">📅 {item.date_time}</div>
                      <div className="history-confidence">
                        <span>Confidence:</span> <strong>{item.confidence}%</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {activeTab === 'admin' && isAdmin && (
          <div className="admin-section slide-in">
            <div className="dashboard-header admin-header">
              <h2>Platform Administration</h2>
              <p>View all registered users and MRI scan records across the platform.</p>
            </div>

            <div className="admin-stats">
              <div className="admin-stat-card">
                <div className="stat-num">{adminData.users.length}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-num">{adminData.records.length}</div>
                <div className="stat-label">Total Scans</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-num">{adminData.records.filter(r => r.tumor_detected).length}</div>
                <div className="stat-label">Tumors Detected</div>
              </div>
            </div>

            <div className="admin-tables-container">
              <div className="admin-table-wrapper">
                <h3>Users Directory</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.users.map(u => (
                      <tr key={u.id}>
                        <td>#{u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.is_admin ? 'admin' : 'user'}`}>
                            {u.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-table-wrapper">
                <h3>Recent MRI Scans</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Date</th>
                      <th>Result</th>
                      <th>Confidence</th>
                      <th>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.records.map(r => (
                      <tr key={r.id}>
                        <td>User #{r.user_id}</td>
                        <td>{r.date_time}</td>
                        <td>
                          <span className={`result-badge ${r.tumor_detected ? 'tumor' : 'no-tumor'}`}>
                            {r.tumor_detected ? 'Tumor' : 'Normal'}
                          </span>
                        </td>
                        <td>{r.confidence}%</td>
                        <td>
                          <a href={r.image_path} target="_blank" rel="noreferrer" className="preview-link">
                            View Scan
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-info">
            <h4>Brain Tumor Detector</h4>
            <p>An AI-powered application designed to assist in the rapid detection of brain tumors from MRI scans using advanced Convolutional Neural Networks.</p>
          </div>
          
          <div className="footer-contact">
            <h4>Contact Info</h4>
            <ul>
              <li>📧 support@braintumordetector.ai</li>
              <li>📞 9336150015</li>
              <li>📍NH-24, Sitapur Road, Bakshi ka Talab, Lucknow-226201</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2025 Brain Tumor Detector · Built with TensorFlow/Keras + React + Flask</span>
          <div className="footer-links">
            <span>CNN Model</span>
            <span>Kaggle Dataset</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
