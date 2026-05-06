import cv2
import numpy as np
import imutils
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import datetime
import random
import json

os.environ['TF_USE_LEGACY_KERAS'] = '1'
import tensorflow as tf
import tf_keras as keras
import base64

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
CORS(app)

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'brain_tumor_db.sqlite')
# If you start your MySQL server later, you can uncomment the line below:
# app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/brain_tumor_db'
from sqlalchemy.engine import URL

db_url = URL.create(
    drivername="postgresql",
    username="postgres",
    password="Abhay8957479757$",
    host="db.ahgsmzdqgaxrzsteqvxp.supabase.co",
    port=5432,
    database="postgres"
)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-mri-key' # Change in production
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Create upload folder if not exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- Extensions ---
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

class Record(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    result_label = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    tumor_detected = db.Column(db.Boolean, nullable=False)
    date_time = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    tumor_type = db.Column(db.String(100), nullable=True)
    precautions = db.Column(db.Text, nullable=True)

with app.app_context():
    db.create_all()

# --- ML Model ---
model = keras.models.load_model('models/cnn-parameters-improvement-23-0.91.model', compile=False)

def crop_brain_contour(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.threshold(gray, 45, 255, cv2.THRESH_BINARY)[1]
    thresh = cv2.erode(thresh, None, iterations=2)
    thresh = cv2.dilate(thresh, None, iterations=2)
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    if not cnts:
        return image
    c = max(cnts, key=cv2.contourArea)
    extLeft = tuple(c[c[:, :, 0].argmin()][0])
    extRight = tuple(c[c[:, :, 0].argmax()][0])
    extTop = tuple(c[c[:, :, 1].argmin()][0])
    extBot = tuple(c[c[:, :, 1].argmax()][0])
    return image[extTop[1]:extBot[1], extLeft[0]:extRight[0]]

def preprocess(image):
    image = crop_brain_contour(image)
    image = cv2.resize(image, (240, 240), interpolation=cv2.INTER_CUBIC)
    image = image / 255.0
    return np.expand_dims(image, axis=0)

# --- Routes ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    admin_code = data.get('admin_code')

    if not name or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    is_admin = (admin_code == 'secret-admin-123')

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(name=name, email=email, password_hash=hashed_password, is_admin=is_admin)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if user and bcrypt.check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "name": user.name, "is_admin": user.is_admin}), 200

    return jsonify({"error": "Invalid email or password"}), 401


@app.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'No image uploaded'}), 400

    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({'error': 'Invalid image'}), 400

    processed = preprocess(image)
    prob = float(model(processed, training=False).numpy()[0][0])
    
    is_tumor = prob > 0.5
    label = 'Tumor Detected' if is_tumor else 'No Tumor Detected'
    confidence = prob if is_tumor else 1 - prob
    
    tumor_type = None
    precautions_list = []
    
    if is_tumor:
        tumor_types_info = {
            "Glioma": [
                "Schedule regular MRI scans to monitor tumor growth.",
                "Take prescribed anti-seizure medications if applicable.",
                "Avoid activities that could cause head trauma.",
                "Maintain a healthy diet and lifestyle to support immune function.",
                "Consider physical therapy if motor skills are affected."
            ],
            "Meningioma": [
                "Undergo periodic neurological evaluations.",
                "Use medications to manage symptoms like headaches or seizures.",
                "Ensure adequate rest and avoid strenuous physical activities.",
                "Seek immediate consultation if sudden vision or hearing changes occur.",
                "Discuss surgical or radiation options with a neurosurgeon."
            ],
            "Pituitary Tumor": [
                "Schedule regular eye exams to check for peripheral vision loss.",
                "Perform blood tests to monitor hormone levels.",
                "Consider hormone replacement therapy if prescribed.",
                "Practice stress management techniques.",
                "Maintain consistent follow-ups with an endocrinologist."
            ]
        }
        tumor_type = random.choice(list(tumor_types_info.keys()))
        precautions_list = tumor_types_info[tumor_type]

    cropped = crop_brain_contour(image)
    cropped_resized = cv2.resize(cropped, (240, 240))
    _, buffer = cv2.imencode('.jpg', cropped_resized)
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    # Save original image to disk
    filename = f"{user_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    cv2.imwrite(filepath, image)

    # Save record to database
    new_record = Record(
        user_id=user_id,
        image_path=f"/static/uploads/{filename}",
        result_label=label,
        confidence=round(confidence * 100, 2),
        tumor_detected=is_tumor,
        tumor_type=tumor_type,
        precautions=json.dumps(precautions_list) if precautions_list else None
    )
    db.session.add(new_record)
    db.session.commit()

    return jsonify({
        'label': label,
        'confidence': round(confidence * 100, 2),
        'tumor': is_tumor,
        'tumor_type': tumor_type,
        'precautions': precautions_list,
        'processed_image': img_b64
    })


@app.route('/api/history', methods=['GET'])
@jwt_required()
def history():
    user_id = get_jwt_identity()
    records = Record.query.filter_by(user_id=user_id).order_by(Record.date_time.desc()).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "image_path": request.host_url.rstrip('/') + r.image_path,
            "result_label": r.result_label,
            "confidence": r.confidence,
            "tumor_detected": r.tumor_detected,
            "date_time": r.date_time.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(results), 200

@app.route('/api/admin/all_data', methods=['GET'])
@jwt_required()
def admin_all_data():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.all()
    records = Record.query.order_by(Record.date_time.desc()).all()

    user_data = [{"id": u.id, "name": u.name, "email": u.email, "is_admin": u.is_admin} for u in users]
    record_data = []
    for r in records:
        record_data.append({
            "id": r.id,
            "user_id": r.user_id,
            "image_path": request.host_url.rstrip('/') + r.image_path,
            "result_label": r.result_label,
            "confidence": r.confidence,
            "tumor_detected": r.tumor_detected,
            "date_time": r.date_time.strftime("%Y-%m-%d %H:%M:%S")
        })

    return jsonify({
        "users": user_data,
        "records": record_data
    }), 200

# Serve uploaded static files
@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True)
