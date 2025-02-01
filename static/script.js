document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startBtn');
    const submitBtn = document.getElementById('submitBtn');
    const questionsList = document.getElementById('questions-list');
    const currentAnswer = document.getElementById('current-answer');
    const startVoice = document.getElementById('startVoice');
    const stopVoice = document.getElementById('stopVoice');
    const results = document.getElementById('results');
    const evaluationResults = document.getElementById('evaluation-results');
    const violationAlerts = document.getElementById('violation-alerts');

    let currentQuestionIndex = 0;
    let answers = [];
    let questions = [];

    // Start interview
    startBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/start_interview', {
                method: 'POST'
            });
            const data = await response.json();

            if (data.status === 'questions_asked') {
                questions = data.questions;
                startInterview();
            }
        } catch (error) {
            showAlert('Failed to start interview');
        }
    });

    function startInterview() {
        startBtn.disabled = true;
        submitBtn.disabled = false;
        startVoice.disabled = false;
        currentAnswer.disabled = false;

        displayQuestions();
        updateStatusDot('active');
    }

    function displayQuestions() {
        questionsList.innerHTML = '';
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.textContent = `Q${index + 1}: ${question}`;
            questionsList.appendChild(questionDiv);
        });
    }

    // Voice controls
    startVoice.addEventListener('click', () => {
        startVoice.disabled = true;
        stopVoice.disabled = false;
        // Start voice recognition
        startSpeechRecognition();
    });

    stopVoice.addEventListener('click', () => {
        startVoice.disabled = false;
        stopVoice.disabled = true;
        // Stop voice recognition
        stopSpeechRecognition();
    });

    // Submit answers
    submitBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/submit_answers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answers: answers })
            });
            const data = await response.json();

            if (data.status === 'malpractice_detected') {
                showAlert(data.message);
                endInterview();
            } else {
                displayResults(data);
            }
        } catch (error) {
            showAlert('Failed to submit answers');
        }
    });

    function displayResults(data) {
        results.classList.remove('hidden');
        evaluationResults.innerHTML = '';

        data.evaluation.forEach((result, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'evaluation-item';
            resultDiv.innerHTML = `
                <div>Question ${index + 1}</div>
                <div class="${result.toLowerCase()}">${result}</div>
            `;
            evaluationResults.appendChild(resultDiv);
        });

        if (data.violations && data.violations.length > 0) {
            const violationsDiv = document.createElement('div');
            violationsDiv.className = 'violations-summary';
            violationsDiv.innerHTML = '<h4>Violations Detected:</h4>';
            data.violations.forEach(violation => {
                violationsDiv.innerHTML += `<p class="violation">${violation}</p>`;
            });
            evaluationResults.appendChild(violationsDiv);
        }

        endInterview();
    }

    function endInterview() {
        startBtn.disabled = true;
        submitBtn.disabled = true;
        startVoice.disabled = true;
        stopVoice.disabled = true;
        currentAnswer.disabled = true;
        updateStatusDot('completed');
    }

    function updateStatusDot(status) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');

        switch(status) {
            case 'active':
                statusDot.style.backgroundColor = '#27ae60';
                statusText.textContent = 'Interview in progress';
                break;
            case 'completed':
                statusDot.style.backgroundColor = '#3498db';
                statusText.textContent = 'Interview completed';
                break;
            default:
                statusDot.style.backgroundColor = '#95a5a6';
                statusText.textContent = 'Ready to start';
        }
    }

    function showAlert(message) {
        const alert = document.createElement('div');
        alert.className = 'violation-alert';
        alert.textContent = message;
        violationAlerts.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    // Speech recognition functions
    let recognition = null;

    function startSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    currentAnswer.value = finalTranscript;
                }
            };

            recognition.start();
        } else {
            showAlert('Speech recognition not supported in this browser');
        }
    }

    function stopSpeechRecognition() {
        if (recognition) {
            recognition.stop();
            answers[currentQuestionIndex] = currentAnswer.value;
        }
    }
});