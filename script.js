// Utility to generate a random threshold and points
function generateGraphQuestion() {
    const numPoints = Math.floor(Math.random() * 6) + 10; // 10-15
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const x = Math.random() * 8 - 4;
        points.push({
            x,
            y: Math.random() > 0.5 ? 1 : 0
        });
    }
    const threshold = Math.round((Math.random() * 6 - 3) * 10) / 10;
    return { type: 'graph', points, threshold };
}

function generateTableQuestion() {
    const numDataPoints = 6;
    const threshold = 0.5;
    const data = [];
    
    for (let i = 0; i < numDataPoints; i++) {
        const p = Math.random();
        const y = Math.random() > 0.5 ? 1 : 0;
        data.push({ p: Math.round(p * 100) / 100, y });
    }
    
    // Determine question type (TP, FP, FN, or TN)
    const questionTypes = ['TP', 'FP', 'FN', 'TN'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    return { type: 'table', data, threshold, questionType };
}

function generateQuestion() {
    return Math.random() > 0.5 ? generateGraphQuestion() : generateTableQuestion();
}

function drawGraph(points, threshold) {
    const canvas = document.getElementById('sigmoidGraph');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(40, 360); ctx.lineTo(760, 360); // x axis
    ctx.moveTo(40, 360); ctx.lineTo(40, 40); // y axis
    ctx.stroke();
    // Draw sigmoid curve
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= 720; px++) {
        const x = (px / 720) * 8 - 4;
        const p = 1 / (1 + Math.exp(-(x)));
        const py = 360 - p * 320;
        if (px === 0) ctx.moveTo(40 + px, py);
        else ctx.lineTo(40 + px, py);
    }
    ctx.stroke();
    // Draw threshold line
    const tx = 40 + ((threshold + 4) / 8) * 720;
    ctx.strokeStyle = '#888';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(tx, 40); ctx.lineTo(tx, 360);
    ctx.stroke();
    ctx.setLineDash([]);
    // Jitter points to avoid overlap
    const usedPositions = [];
    points.forEach((pt, i) => {
        let px, py, tries = 0;
        do {
            const jitterX = pt.x + (Math.random() - 0.5) * 0.25;
            px = 40 + ((jitterX + 4) / 8) * 720;
            py = pt.y === 1 ? 60 : 340;
            tries++;
        } while (usedPositions.some(pos => Math.abs(pos.px - px) < 22 && Math.abs(pos.py - py) < 22) && tries < 20);
        usedPositions.push({ px, py });
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.fillStyle = pt.y === 1 ? '#ff7ca8' : '#3b82f6';
        ctx.shadowColor = '#222';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function calculateConfusionMatrix(points, threshold) {
    let TN = 0, FP = 0, FN = 0, TP = 0;
    points.forEach(pt => {
        const pred = pt.x > threshold ? 1 : 0;
        if (pt.y === 1 && pred === 1) TP++;
        else if (pt.y === 1 && pred === 0) FN++;
        else if (pt.y === 0 && pred === 0) TN++;
        else if (pt.y === 0 && pred === 1) FP++;
    });
    return { TN, FP, FN, TP };
}

function calculateTableMetric(data, threshold, metric) {
    let count = 0;
    data.forEach(d => {
        const pred = d.p >= threshold ? 1 : 0;
        if (metric === 'TP' && d.y === 1 && pred === 1) count++;
        else if (metric === 'FP' && d.y === 0 && pred === 1) count++;
        else if (metric === 'FN' && d.y === 1 && pred === 0) count++;
        else if (metric === 'TN' && d.y === 0 && pred === 0) count++;
    });
    return count;
}

let currentQuestion = null;

function loadNewQuestion() {
    currentQuestion = generateQuestion();
    document.getElementById('feedback').textContent = '';
    
    if (currentQuestion.type === 'graph') {
        // Show graph question
        document.getElementById('graph-type').style.display = 'block';
        document.getElementById('table-type').style.display = 'none';
        document.getElementById('confusion-input').style.display = 'block';
        document.getElementById('metric-input').style.display = 'none';
        
        document.getElementById('threshold-value').textContent = currentQuestion.threshold;
        drawGraph(currentQuestion.points, currentQuestion.threshold);
        document.getElementById('input-tn').value = '';
        document.getElementById('input-fp').value = '';
        document.getElementById('input-fn').value = '';
        document.getElementById('input-tp').value = '';
    } else {
        // Show table question
        document.getElementById('graph-type').style.display = 'none';
        document.getElementById('table-type').style.display = 'block';
        document.getElementById('confusion-input').style.display = 'none';
        document.getElementById('metric-input').style.display = 'block';
        
        document.getElementById('table-threshold-value').textContent = currentQuestion.threshold;
        document.getElementById('metric-question').textContent = `How many ${currentQuestion.questionType} are there with threshold t = ${currentQuestion.threshold}?`;
        document.getElementById('metric-answer').value = '';
        
        // Populate table
        const tbody = document.getElementById('data-tbody');
        tbody.innerHTML = '';
        currentQuestion.data.forEach((d, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="border:1px solid #ccc;padding:0.5rem;text-align:center;">${i + 1}</td>
                <td style="border:1px solid #ccc;padding:0.5rem;text-align:center;">${d.p}</td>
                <td style="border:1px solid #ccc;padding:0.5rem;text-align:center;">${d.y}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

document.getElementById('submit-matrix').addEventListener('click', function() {
    if (!currentQuestion || currentQuestion.type !== 'graph') return;
    const userTN = Number(document.getElementById('input-tn').value);
    const userFP = Number(document.getElementById('input-fp').value);
    const userFN = Number(document.getElementById('input-fn').value);
    const userTP = Number(document.getElementById('input-tp').value);
    const correct = calculateConfusionMatrix(currentQuestion.points, currentQuestion.threshold);
    if (userTN === correct.TN && userFP === correct.FP && userFN === correct.FN && userTP === correct.TP) {
        document.getElementById('feedback').textContent = 'Correct!';
        document.getElementById('feedback').style.color = 'green';
    } else {
        document.getElementById('feedback').textContent = `Incorrect. Correct values: TN=${correct.TN}, FP=${correct.FP}, FN=${correct.FN}, TP=${correct.TP}`;
        document.getElementById('feedback').style.color = 'red';
    }
});

// Add submit button for table questions
const metricAnswerInput = document.getElementById('metric-answer');
if (metricAnswerInput) {
    metricAnswerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitMetricAnswer();
    });
}

function submitMetricAnswer() {
    if (!currentQuestion || currentQuestion.type !== 'table') return;
    const userAnswer = Number(document.getElementById('metric-answer').value);
    const correct = calculateTableMetric(currentQuestion.data, currentQuestion.threshold, currentQuestion.questionType);
    if (userAnswer === correct) {
        document.getElementById('feedback').textContent = 'Correct!';
        document.getElementById('feedback').style.color = 'green';
    } else {
        // Build explanation
        const metricType = currentQuestion.questionType;
        let explanation = `Incorrect. Correct answer: ${correct}\n\nExplanation:\n`;
        explanation += `Threshold t = ${currentQuestion.threshold}\n`;
        explanation += `Rule: Predict positive if p ≥ t, negative if p < t\n\n`;
        explanation += `${metricType} cases:\n`;
        
        const matches = [];
        currentQuestion.data.forEach((d, i) => {
            const pred = d.p >= currentQuestion.threshold ? 1 : 0;
            const actual = d.y;
            let isMatcher = false;
            
            if (metricType === 'TP' && actual === 1 && pred === 1) isMatcher = true;
            else if (metricType === 'FP' && actual === 0 && pred === 1) isMatcher = true;
            else if (metricType === 'FN' && actual === 1 && pred === 0) isMatcher = true;
            else if (metricType === 'TN' && actual === 0 && pred === 0) isMatcher = true;
            
            if (isMatcher) {
                matches.push(`Row ${i + 1}: p=${d.p}, y=${d.y} → predicted=${pred}, actual=${actual}`);
            }
        });
        
        explanation += matches.join('\n');
        
        document.getElementById('feedback').innerHTML = explanation.replace(/\n/g, '<br>');
        document.getElementById('feedback').style.color = 'red';
        document.getElementById('feedback').style.whiteSpace = 'pre-wrap';
        document.getElementById('feedback').style.textAlign = 'left';
    }
}

// Update submit button to handle both types
const submitMatrixBtn = document.getElementById('submit-matrix');
submitMatrixBtn.addEventListener('click', function() {
    if (!currentQuestion) return;
    if (currentQuestion.type === 'graph') {
        // Graph submit logic already handled above
        const userTN = Number(document.getElementById('input-tn').value);
        const userFP = Number(document.getElementById('input-fp').value);
        const userFN = Number(document.getElementById('input-fn').value);
        const userTP = Number(document.getElementById('input-tp').value);
        const correct = calculateConfusionMatrix(currentQuestion.points, currentQuestion.threshold);
        if (userTN === correct.TN && userFP === correct.FP && userFN === correct.FN && userTP === correct.TP) {
            document.getElementById('feedback').textContent = 'Correct!';
            document.getElementById('feedback').style.color = 'green';
        } else {
            document.getElementById('feedback').textContent = `Incorrect. Correct values: TN=${correct.TN}, FP=${correct.FP}, FN=${correct.FN}, TP=${correct.TP}`;
            document.getElementById('feedback').style.color = 'red';
        }
    } else {
        submitMetricAnswer();
    }
});

document.getElementById('new-question').addEventListener('click', loadNewQuestion);

window.onload = loadNewQuestion;