// PayShield Guardian Frontend Application

const API_BASE = '/api';

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('payment-form');
    const refreshAuditBtn = document.getElementById('refresh-audit-btn');

    paymentForm.addEventListener('submit', handlePaymentSubmit);
    refreshAuditBtn.addEventListener('click', loadAuditHistory);

    // Load initial audit history
    loadAuditHistory();
});

/**
 * Handle payment form submission
 */
async function handlePaymentSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const request = {
        sender_id: formData.get('sender_id'),
        recipient_name: formData.get('recipient_name'),
        recipient_id: formData.get('recipient_id'),
        amount: parseFloat(formData.get('amount')),
        note: formData.get('note') || '',
    };

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Analyzing...';

    try {
        // Analyze payment
        console.log('Analyzing payment:', request);
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        console.log('Analysis response status:', response.status);
        const analysis = await response.json();
        console.log('Analysis response:', analysis);

        if (!response.ok) {
            throw new Error(analysis.detail || `API error: ${response.status}`);
        }

        // Display risk result
        displayRiskResult(analysis, request);

    } catch (error) {
        console.error('Analysis error:', error);
        alert(`Error analyzing payment: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * Display risk analysis result
 */
function displayRiskResult(analysis, request) {
    const resultSection = document.getElementById('risk-result-section');
    const riskDisplay = document.getElementById('risk-display');

    const actionText = getActionText(analysis.action);
    const riskClass = analysis.category.toLowerCase();

    let html = `
        <div class="risk-card ${riskClass}">
            <div class="risk-category">🔍 ${analysis.category.toUpperCase()}</div>
            <div class="risk-score">${analysis.risk_score.toFixed(0)}</div>
            <div style="color: #666; margin-bottom: 15px;">Risk Score out of 100</div>

            <div class="risk-explanation">${escapeHtml(analysis.llm_reasoning)}</div>
    `;

    if (analysis.factors && analysis.factors.length > 0) {
        html += `
            <div class="factors">
                <h4>Risk Factors Detected:</h4>
                <ul>
        `;
        for (const factor of analysis.factors) {
            const factorName = (factor.type || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            html += `<li>${factorName}</li>`;
        }
        html += `
                </ul>
            </div>
        `;
    }

    // Action buttons based on category
    if (analysis.action === 'auto_approve') {
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #d5f4e6; border-radius: 6px; border-left: 4px solid #27ae60;">
                ✓ This payment has been automatically approved and processed.
            </div>
        `;
        // Auto-log as completed
        confirmPayment(request, true);
    } else if (analysis.action === 'hard_block') {
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #fadbd8; border-radius: 6px; border-left: 4px solid #e74c3c;">
                ❌ This payment has been blocked due to high fraud risk. No override is available.
            </div>
        `;
        // Auto-log as blocked
        logTransaction(request, analysis, 'blocked');
    } else {
        // MEDIUM or HIGH: requires confirmation
        html += `
            <div class="confirmation-actions">
                <button class="btn btn-confirm" onclick="confirmPaymentAction('${encodeURIComponent(JSON.stringify(request))}', '${analysis.action}')">
                    ✓ Confirm & Proceed
                </button>
                <button class="btn btn-cancel" onclick="cancelPayment('${encodeURIComponent(JSON.stringify(request))}')">
                    ✗ Cancel Payment
                </button>
            </div>
        `;

        if (analysis.action === 'require_verification') {
            html = `
                <div style="margin: 15px 0; padding: 15px; background: #fef5e7; border-left: 4px solid #f39c12; border-radius: 6px;">
                    <strong>Identity Verification Required:</strong> Before proceeding, we need to verify your identity. This is a simulated step.
                </div>
            ` + html;
        }
    }

    html += `</div>`;

    riskDisplay.innerHTML = html;
    resultSection.classList.remove('hidden');

    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Confirm payment action
 */
async function confirmPaymentAction(encodedRequest, action) {
    const request = JSON.parse(decodeURIComponent(encodedRequest));

    if (action === 'require_verification') {
        // Simulate OTP verification
        const verified = confirm('Simulated OTP verification:\nEnter the code sent to your registered email.\n\n[In real scenario, this would be a proper OTP form]\n\nClick OK to proceed as verified.');
        if (!verified) return;
    }

    await confirmPayment(request, true);
}

/**
 * Cancel payment
 */
async function cancelPayment(encodedRequest) {
    const request = JSON.parse(decodeURIComponent(encodedRequest));
    await confirmPayment(request, false);
}

/**
 * Send confirmation to API
 */
async function confirmPayment(request, confirmed) {
    try {
        const confirmPayload = {
            request: request,
            confirmed: confirmed,
        };

        console.log('Sending confirmation:', confirmPayload);

        const response = await fetch(`${API_BASE}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(confirmPayload),
        });

        console.log('Confirmation response status:', response.status);
        const data = await response.json();
        console.log('Confirmation response data:', data);

        if (!response.ok) {
            const errorMsg = data.detail || data.message || 'Unknown error';
            if (confirmed) {
                alert(`Payment rejected: ${errorMsg}`);
            }
            return;
        }

        // Show confirmation message
        const resultDiv = document.getElementById('risk-display');
        if (confirmed) {
            resultDiv.innerHTML = `
                <div style="padding: 30px; background: #d5f4e6; border-radius: 8px; text-align: center; border: 2px solid #27ae60;">
                    <h3 style="color: #27ae60; margin-bottom: 10px;">✓ Payment Completed</h3>
                    <p style="color: #555;">Your payment has been successfully processed and logged.</p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="padding: 30px; background: #fadbd8; border-radius: 8px; text-align: center; border: 2px solid #e74c3c;">
                    <h3 style="color: #e74c3c; margin-bottom: 10px;">Payment Cancelled</h3>
                    <p style="color: #555;">The payment has been cancelled and not processed.</p>
                </div>
            `;
        }

        // Refresh audit history
        loadAuditHistory();

    } catch (error) {
        console.error('Confirmation error:', error);
        alert(`Error processing confirmation: ${error.message}`);
    }
}

/**
 * Log transaction to audit
 */
async function logTransaction(request, analysis, outcome) {
    // This is called by the backend /confirm endpoint, but we can track it on UI
    loadAuditHistory();
}

/**
 * Load and display audit history
 */
async function loadAuditHistory() {
    try {
        const response = await fetch(`${API_BASE}/audit-history?limit=10`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const entries = await response.json();

        const auditList = document.getElementById('audit-list');

        if (!entries || entries.length === 0) {
            auditList.innerHTML = '<p style="color: #999;">No transaction history yet.</p>';
            return;
        }

        let html = `
            <table class="audit-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Recipient</th>
                        <th>Amount</th>
                        <th>Risk Score</th>
                        <th>Category</th>
                        <th>Outcome</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const entry of entries) {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            const recipient = entry.request.recipient_name;
            const amount = `$${entry.request.amount.toFixed(2)}`;
            const score = entry.final_score.toFixed(0);
            const category = entry.category || 'unknown';
            const outcome = entry.outcome || 'unknown';

            html += `
                <tr>
                    <td>${escapeHtml(timestamp)}</td>
                    <td>${escapeHtml(recipient)}</td>
                    <td>${amount}</td>
                    <td>${score}</td>
                    <td><span class="badge ${category}">${category.toUpperCase()}</span></td>
                    <td><span class="badge ${outcome}">${outcome.toUpperCase()}</span></td>
                </tr>
            `;
        }

        html += `
                </tbody>
            </table>
        `;

        auditList.innerHTML = html;

    } catch (error) {
        console.error('Error loading audit history:', error);
        document.getElementById('audit-list').innerHTML = '<p style="color: #e74c3c;">Error loading audit history.</p>';
    }
}

/**
 * Utility: Get action description
 */
function getActionText(action) {
    const actions = {
        'auto_approve': 'Auto-Approved',
        'require_confirmation': 'Confirmation Required',
        'require_verification': 'Verification Required',
        'hard_block': 'Payment Blocked',
    };
    return actions[action] || action;
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
