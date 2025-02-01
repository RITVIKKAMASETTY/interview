from flask import Flask, render_template, request, jsonify, Response
import cv2
import speech_recognition as sr
import threading
import time
from gtts import gTTS
import os

app = Flask(__name__)

# Global variables
camera_on = False
malpractice_detected = False

def detect_malpractice():
    global camera_on, malpractice_detected
    cap = cv2.VideoCapture(0)
    while camera_on:
        ret, frame = cap.read()
        if not ret:
            break
        # Simple malpractice detection: Check if a new face appears
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        if len(faces) > 1:
            malpractice_detected = True
            break
    cap.release()

def speak(text):
    tts = gTTS(text=text, lang='en')
    tts.save("output.mp3")
    os.system("afplay output.mp3")  # macOS command to play audio

def listen():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        audio = recognizer.listen(source)
    try:
        text = recognizer.recognize_google(audio)
        return text
    except sr.UnknownValueError:
        return "Could not understand audio"
    except sr.RequestError:
        return "API unavailable"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_interview', methods=['POST'])
def start_interview():
    global camera_on, malpractice_detected
    camera_on = True
    malpractice_detected = False
    threading.Thread(target=detect_malpractice).start()

    questions = [
        "What is the time complexity of a binary search algorithm?",
        "Explain the concept of machine learning.",
        "What is the difference between supervised and unsupervised learning?"
    ]

    return jsonify({"status": "questions_asked", "questions": questions})

@app.route('/speak', methods=['POST'])
def speak_question():
    data = request.json
    text = data.get('text')
    speak(text)
    return jsonify({"status": "spoken"})

@app.route('/listen', methods=['POST'])
def listen_answer():
    answer = listen()
    return jsonify({"text": answer})

@app.route('/submit_answers', methods=['POST'])
def submit_answers():
    global camera_on, malpractice_detected
    answers = request.json.get('answers')
    if malpractice_detected:
        return jsonify({"status": "malpractice_detected", "message": "Malpractice detected. Interview terminated."})

    # Evaluate answers (simple evaluation for demonstration)
    evaluation = []
    for i, answer in enumerate(answers):
        if i == 0:
            if "O(log n)" in answer:
                evaluation.append("Correct")
            else:
                evaluation.append("Incorrect")
        else:
            evaluation.append("Answered")

    return jsonify({"status": "completed", "answers": answers, "evaluation": evaluation})

@app.route('/camera_feed')
def camera_feed():
    global camera_on
    cap = cv2.VideoCapture(0)
    while camera_on:
        ret, frame = cap.read()
        if not ret:
            break
        # Encode frame to JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    cap.release()

if __name__ == '__main__':
    app.run(debug=True)
