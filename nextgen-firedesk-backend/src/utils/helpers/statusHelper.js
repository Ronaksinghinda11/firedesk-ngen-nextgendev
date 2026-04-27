/**
 * Get status badge CSS class based on status value and field type
 * Maps status values to theme colors (orange/slate theme)
 *
 * @param {string} status - Status value
 * @param {string} field - Field type ('status', 'healthStatus', etc.)
 * @returns {string} - CSS class name
 */
function getStatusClass(status, field = 'status') {
    if (!status || status === 'N/A') {
        return 'status-neutral';
    }

    const statusLower = status.toString().toLowerCase();

    // Health status mapping
    if (field === 'healthStatus') {
        if (statusLower.includes('healthy') || statusLower === 'good') {
            return 'status-ok';
        }
        if (statusLower.includes('not working') || statusLower === 'notworking' ||
            statusLower.includes('need attention') || statusLower === 'attentionrequired') {
            return 'status-overdue';
        }
        if (statusLower.includes('moderate') || statusLower.includes('inventory')) {
            return 'status-due-soon';
        }
    }

    // General status mapping
    if (statusLower === 'completed' || statusLower === 'passed' || statusLower === 'approved') {
        return 'status-ok';
    }
    if (statusLower === 'pending' || statusLower === 'scheduled' || statusLower === 'submitted') {
        return 'status-due-soon';
    }
    if (statusLower === 'failed' || statusLower === 'cancelled' || statusLower === 'rejected') {
        return 'status-overdue';
    }
    if (statusLower === 'in progress' || statusLower === 'in_progress') {
        return 'status-due-soon';
    }

    return 'status-neutral';
}

/**
 * Get test status for hydrostatic testing
 *
 * @param {Date|string} nextTestDate - Next test due date
 * @returns {Object} - Object with class and text
 */
function getTestStatus(nextTestDate) {
    if (!nextTestDate) {
        return { class: 'neutral', text: 'Not Set' };
    }

    const now = new Date();
    const dueDate = new Date(nextTestDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
        return { class: 'overdue', text: `Overdue by ${Math.abs(daysUntilDue)} days` };
    } else if (daysUntilDue <= 30) {
        return { class: 'due-soon', text: `Due in ${daysUntilDue} days` };
    } else {
        return { class: 'ok', text: 'OK' };
    }
}

/**
 * Get refill status
 *
 * @param {Date|string} refilledOn - Last refill date
 * @returns {Object} - Object with class and text
 */
function getRefillStatus(refilledOn) {
    if (!refilledOn) {
        return { class: 'warning', text: 'Never Refilled' };
    }

    const now = new Date();
    const lastRefill = new Date(refilledOn);
    const daysSinceRefill = Math.ceil((now - lastRefill) / (1000 * 60 * 60 * 24));

    if (daysSinceRefill <= 90) {
        return { class: 'ok', text: `${daysSinceRefill} days ago` };
    } else if (daysSinceRefill <= 365) {
        return { class: 'due-soon', text: `${daysSinceRefill} days ago` };
    } else {
        return { class: 'overdue', text: `${daysSinceRefill} days ago (Overdue)` };
    }
}

module.exports = {
    getStatusClass,
    getTestStatus,
    getRefillStatus
};
